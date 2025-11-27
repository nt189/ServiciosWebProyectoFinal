from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime

import firebase_admin
from firebase_admin import credentials, db

# ================== CONFIGURACIÓN FIREBASE (NUEVO PROYECTO) ==================

# Nombre del archivo de la llave que descargaste
RUTA_KEY = "weebhook-5b7c6-firebase-adminsdk-fbsvc-f8d7a12981.json"

# URL de tu Realtime Database NUEVA
DATABASE_URL = "https://weebhook-5b7c6-default-rtdb.firebaseio.com/"

# Inicializar app de Firebase para este proyecto
cred = credentials.Certificate(RUTA_KEY)
firebase_admin.initialize_app(cred, {
    "databaseURL": DATABASE_URL
})

# Referencia a la rama de notificaciones
def get_notificaciones_ref():
    return db.reference("notificaciones")

# ================== FLASK (WEBHOOK) ==================

app = Flask(__name__)
CORS(app)


@app.route("/webhook/nuevo-titulo", methods=["POST"])
def webhook_nuevo_titulo():
    data = request.get_json() or {}

    notif = {
        "tipo": "nuevo_titulo",
        "titulo": data.get("titulo"),
        "categoria": data.get("categoria", "general"),
        "mensaje": f"Se agregó un nuevo {data.get('tipo', 'contenido')}: {data.get('titulo')}",
        "fecha": datetime.datetime.utcnow().isoformat(),
        "visto": False
    }

    get_notificaciones_ref().push(notif)
    return jsonify({"ok": True}), 200


@app.route("/webhook/nuevo-usuario", methods=["POST"])
def webhook_nuevo_usuario():
    data = request.get_json() or {}

    notif = {
        "tipo": "nuevo_usuario",
        "usuarioId": data.get("usuarioId"),
        "nombre": data.get("nombre"),
        "mensaje": f"Nuevo usuario registrado: {data.get('nombre')}",
        "fecha": datetime.datetime.utcnow().isoformat(),
        "visto": False
    }

    get_notificaciones_ref().push(notif)
    return jsonify({"ok": True}), 200


@app.route("/webhook/nueva-suscripcion", methods=["POST"])
def webhook_nueva_suscripcion():
    data = request.get_json() or {}

    notif = {
        "tipo": "nueva_suscripcion",
        "suscripcionId": data.get("suscripcionId"),
        "usuarioId": data.get("usuarioId"),
        "tipoSuscripcion": data.get("tipoSuscripcion"),
        "fechaInicio": data.get("fechaInicio"),
        "mensaje": f"El usuario {data.get('usuarioId')} realizó una nueva suscripción ({data.get('tipoSuscripcion')}).",
        "fecha": datetime.datetime.utcnow().isoformat(),
        "visto": False
    }

    get_notificaciones_ref().push(notif)
    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    print("=== Webhook de Notificaciones corriendo en http://localhost:5001 ===")
    app.run(host="0.0.0.0", port=5001, debug=True)
