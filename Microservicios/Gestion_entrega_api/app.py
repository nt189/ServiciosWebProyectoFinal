from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import requests  

# Firebase
import firebase_admin
from firebase_admin import credentials, db

# URL de tu servicio webhook en Python
WEBHOOK_NUEVO_TITULO = "http://localhost:5001/webhook/nuevo-titulo"


# ========= Configuración Firebase =========
cred = credentials.Certificate("gestion-entrega-api-firebase-adminsdk-fbsvc-56f9065a6d.json")

firebase_admin.initialize_app(cred, {
    "databaseURL": "https://gestion-entrega-api-default-rtdb.firebaseio.com/"
})

# ========= Helpers de Firebase =========
def get_contenidos_ref():
    """Referencia a /contenidos_digitales"""
    return db.reference("contenidos_digitales")


def get_categorias_ref():
    """Referencia a /contenidos_por_categoria"""
    return db.reference("contenidos_por_categoria")


def normalizar_contenidos(raw):
    """
    Convierte lo que venga de Firebase (dict o list) a lista de dicts.
    """
    if isinstance(raw, dict):
        return list(raw.values())
    if isinstance(raw, list):
        return [c for c in raw if isinstance(c, dict)]
    return []


def actualizar_contenidos_por_categoria():
    """
    Vuelve a generar /contenidos_por_categoria agrupando los contenidos
    de /contenidos_digitales por su campo 'categoria'.

    Resultado en Firebase:
    contenidos_por_categoria: {
        "literatura": [ {...}, {...} ],
        "noticias":   [ {...} ],
        "ciencia":    [ {...} ]
    }
    """
    raw = get_contenidos_ref().get() or {}
    contenidos = normalizar_contenidos(raw)

    categorias = {}

    for c in contenidos:
        cat = c.get('categoria', 'general')
        # opcional: normalizar a minúsculas
        # cat = cat.lower()
        if cat not in categorias:
            categorias[cat] = []
        categorias[cat].append(c)

    # Asegurar que existan estas 3 aunque estén vacías
    for base in ['ciencia', 'noticias', 'literatura']:
        categorias.setdefault(base, [])

    get_categorias_ref().set(categorias)
# ========= Flask =========

app = Flask(__name__)
CORS(app)

next_id = 1


def inicializar_next_id():
    """Calcula el siguiente ID según los datos existentes en Firebase."""
    global next_id
    raw = get_contenidos_ref().get() or {}
    contenidos = normalizar_contenidos(raw)

    ids = []
    for v in contenidos:
        if "id" in v:
            try:
                ids.append(int(v["id"]))
            except (ValueError, TypeError):
                pass

    next_id = max(ids) + 1 if ids else 1


@app.route('/')
def index():
    return jsonify({
        'mensaje': 'API de Gestión de Contenidos Digitales',
        'descripcion': 'Sistema para gestionar periódicos, revistas y libros digitales',
        'operaciones': {
            'agregar_contenido': 'POST /contenidos',
            'listar_contenidos': 'GET /contenidos',
            'obtener_detalles': 'GET /contenidos/<id>',
            'actualizar_contenido': 'PUT /contenidos/<id>',
            'eliminar_contenido': 'DELETE /contenidos/<id>'
        }
    })


# 1. Agregar contenido
@app.route('/contenidos', methods=['POST'])
def agregar_contenido():
    try:
        global next_id
        data = request.get_json()

        if not data or 'titulo' not in data or 'tipo' not in data:
            return jsonify({'error': 'Los campos titulo y tipo son requeridos'}), 400

        tipos_validos = ['periódico', 'revista', 'libro']
        if data['tipo'] not in tipos_validos:
            return jsonify({'error': f'Tipo debe ser uno de: {", ".join(tipos_validos)}'}), 400

        nuevo_contenido = {
            "id": next_id,
            "titulo": data['titulo'],
            "tipo": data['tipo'],
            "precio": data.get('precio', 0),
            "stock": data.get('stock', 0),
            "descripcion": data.get('descripcion', ''),
            "categoria": data.get('categoria', 'general'),
            "activo": data.get('activo', True),
            "fecha_publicacion": data.get(
                'fecha_publicacion',
                datetime.datetime.now().date().isoformat()
            ),
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }

        if data['tipo'] in ['periódico', 'revista']:
            nuevo_contenido["frecuencia"] = data.get('frecuencia', 'mensual')
            nuevo_contenido["editorial"] = data.get('editorial', '')
        elif data['tipo'] == 'libro':
            nuevo_contenido["autor"] = data.get('autor', '')
            nuevo_contenido["isbn"] = data.get('isbn', '')
            nuevo_contenido["paginas"] = data.get('paginas', 0)

        # Guardar en Firebase (BD original)
        get_contenidos_ref().child(str(next_id)).set(nuevo_contenido)
        next_id += 1

        # 🔁 Actualizar agrupación por categoría
        actualizar_contenidos_por_categoria()

        # 🎯 NOTIFICAR AL WEBHOOK si es un libro
        if nuevo_contenido["tipo"] == "libro":
            try:
                requests.post(
                    WEBHOOK_NUEVO_TITULO,
                    json={
                        "id": nuevo_contenido["id"],
                        "titulo": nuevo_contenido["titulo"],
                        "tipo": nuevo_contenido["tipo"],
                        "categoria": nuevo_contenido.get("categoria", "general")
                    },
                    timeout=3
                )
            except Exception as e:
                print("Error al llamar webhook nuevo título:", e)

        return jsonify({
            'mensaje': 'Contenido agregado exitosamente',
            'contenido': nuevo_contenido
        }), 201

    except Exception as e:
        return jsonify({'error': f'Error al agregar contenido: {str(e)}'}), 500



# 2. Listar contenidos
@app.route('/contenidos', methods=['GET'])
def listar_contenidos():
    try:
        tipo = request.args.get('tipo', type=str)
        categoria = request.args.get('categoria', type=str)
        activo = request.args.get('activo', type=str)

        raw = get_contenidos_ref().get() or {}
        contenidos = normalizar_contenidos(raw)

        if tipo:
            contenidos = [c for c in contenidos if c.get('tipo') == tipo]

        if categoria:
            contenidos = [
                c for c in contenidos
                if c.get('categoria', '').lower() == categoria.lower()
            ]

        if activo is not None:
            if activo.lower() == 'true':
                contenidos = [c for c in contenidos if c.get('activo') is True]
            elif activo.lower() == 'false':
                contenidos = [c for c in contenidos if c.get('activo') is False]

        return jsonify({
            'total': len(contenidos),
            'contenidos': contenidos
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error al listar contenidos: {str(e)}'}), 500


# 3. Obtener detalles
@app.route('/contenidos/<int:contenido_id>', methods=['GET'])
def obtener_detalles(contenido_id):
    try:
        contenido = get_contenidos_ref().child(str(contenido_id)).get()

        if not contenido:
            return jsonify({'error': 'Contenido no encontrado'}), 404

        return jsonify({'contenido': contenido}), 200

    except Exception as e:
        return jsonify({'error': f'Error al obtener detalles: {str(e)}'}), 500


# 4. Actualizar contenido
@app.route('/contenidos/<int:contenido_id>', methods=['PUT'])
def actualizar_contenido(contenido_id):
    try:
        ref = get_contenidos_ref().child(str(contenido_id))
        contenido = ref.get()

        if not contenido:
            return jsonify({'error': 'Contenido no encontrado'}), 404

        data = request.get_json() or {}

        campos_actualizables = [
            'titulo', 'precio', 'stock',
            'descripcion', 'categoria', 'activo', 'fecha_publicacion'
        ]
        for campo in campos_actualizables:
            if campo in data:
                contenido[campo] = data[campo]

        if contenido.get('tipo') in ['periódico', 'revista']:
            if 'frecuencia' in data:
                contenido['frecuencia'] = data['frecuencia']
            if 'editorial' in data:
                contenido['editorial'] = data['editorial']
        elif contenido.get('tipo') == 'libro':
            if 'autor' in data:
                contenido['autor'] = data['autor']
            if 'isbn' in data:
                contenido['isbn'] = data['isbn']
            if 'paginas' in data:
                contenido['paginas'] = data['paginas']

        contenido['updated_at'] = datetime.datetime.now().isoformat()
        ref.set(contenido)

        # 🔁 Actualizar agrupación por categoría
        actualizar_contenidos_por_categoria()

        return jsonify({
            'mensaje': 'Contenido actualizado exitosamente',
            'contenido': contenido
        }), 200

    except Exception as e:
        return jsonify({'error': f'Error al actualizar contenido: {str(e)}'}), 500


# 5. Eliminar contenido
@app.route('/contenidos/<int:contenido_id>', methods=['DELETE'])
def eliminar_contenido(contenido_id):
    try:
        ref = get_contenidos_ref().child(str(contenido_id))
        contenido = ref.get()

        if not contenido:
            return jsonify({'error': 'Contenido no encontrado'}), 404

        ref.delete()

        # 🔁 Actualizar agrupación por categoría
        actualizar_contenidos_por_categoria()

        return jsonify({'mensaje': 'Contenido eliminado exitosamente'}), 200

    except Exception as e:
        return jsonify({'error': f'Error al eliminar contenido: {str(e)}'}), 500


# ========= Main =========

if __name__ == '__main__':
    print("=== API de Gestión de Contenidos Digitales (Firebase) ===")

    inicializar_next_id()
    # Sincroniza el nodo contenidos_por_categoria al arrancar
    actualizar_contenidos_por_categoria()

    raw = get_contenidos_ref().get() or {}
    lista = normalizar_contenidos(raw)

    print("\nContenidos iniciales cargados desde Firebase:")
    for contenido in lista:
        tipo = contenido.get('tipo', '')
        icon = "📰" if tipo == 'periódico' else "📚" if tipo == 'revista' else "📖"
        print(f"  {icon} {contenido.get('titulo', 'Sin título')}: "
              f"${contenido.get('precio', 0)} (Stock: {contenido.get('stock', 0)})")

    print(f"\nTotal: {len(lista)} contenidos digitales")
    print("Servidor iniciado en: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
