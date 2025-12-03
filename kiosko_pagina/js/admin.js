// admin.js

// URL base del backend Flask
const API_CONTENIDOS = "http://localhost:5000";

// Referencias al DOM
const tbody = document.getElementById("productosBody");
const catalogoError = document.getElementById("catalogoError");
const catalogoOk = document.getElementById("catalogoOk");
const btnRefrescar = document.getElementById("btnRefrescar");

const form = document.getElementById("productoForm");
const formTitulo = document.getElementById("formTitulo");
const formOk = document.getElementById("formOk");
const formError = document.getElementById("formError");
const btnLimpiar = document.getElementById("btnLimpiar");

// Campos del formulario
const inputId = document.getElementById("productoId");
const inputTitulo = document.getElementById("titulo");
const inputTipo = document.getElementById("tipo");
const inputCategoria = document.getElementById("categoria");
const inputPrecio = document.getElementById("precio");
const inputStock = document.getElementById("stock");
const inputDescripcion = document.getElementById("descripcion");
const inputAutor = document.getElementById("autor");
const inputIsbn = document.getElementById("isbn");
const inputPaginas = document.getElementById("paginas");

// ================== UTILIDADES ==================

function limpiarMensajes() {
  catalogoError.textContent = "";
  catalogoOk.textContent = "";
  formOk.textContent = "";
  formError.textContent = "";
}

function limpiarFormulario() {
  inputId.value = "";
  form.reset();
  formTitulo.textContent = "Nuevo producto";
  formOk.textContent = "";
  formError.textContent = "";
}

// ================== CARGAR LISTA ==================

async function cargarProductos() {
  limpiarMensajes();
  tbody.innerHTML = `<tr><td colspan="7">Cargando catálogo...</td></tr>`;

  try {
    const resp = await fetch(`${API_CONTENIDOS}/contenidos`);
    if (!resp.ok) {
      tbody.innerHTML = "";
      catalogoError.textContent = "No se pudo cargar el catálogo (Flask respondió error).";
      return;
    }

    const data = await resp.json();
    const lista = data.contenidos || data || [];

    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7">No hay productos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    lista.forEach((item) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = item.id;
      tr.appendChild(tdId);

      const tdTitulo = document.createElement("td");
      tdTitulo.textContent = item.titulo || "";
      tr.appendChild(tdTitulo);

      const tdTipo = document.createElement("td");
      const spanTipo = document.createElement("span");
      const tipo = item.tipo || "";
      spanTipo.textContent = tipo;
      spanTipo.className =
        "tag " +
        (tipo === "libro"
          ? "tag-libro"
          : tipo === "revista"
          ? "tag-revista"
          : "tag-periodico");
      tdTipo.appendChild(spanTipo);
      tr.appendChild(tdTipo);

      const tdCategoria = document.createElement("td");
      tdCategoria.textContent = item.categoria || "";
      tr.appendChild(tdCategoria);

      const tdPrecio = document.createElement("td");
      tdPrecio.textContent = `$${Number(item.precio || 0).toFixed(2)}`;
      tr.appendChild(tdPrecio);

      const tdStock = document.createElement("td");
      tdStock.textContent = item.stock ?? 0;
      tr.appendChild(tdStock);

      const tdAcciones = document.createElement("td");
      const btnEditar = document.createElement("button");
      btnEditar.textContent = "Editar";
      btnEditar.className = "btn btn-xs btn-secondary";
      btnEditar.addEventListener("click", () => cargarEnFormulario(item));

      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.className = "btn btn-xs btn-danger";
      btnEliminar.style.marginLeft = "0.5rem";
      btnEliminar.addEventListener("click", () => eliminarProducto(item.id));

      tdAcciones.appendChild(btnEditar);
      tdAcciones.appendChild(btnEliminar);
      tr.appendChild(tdAcciones);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = "";
    catalogoError.textContent =
      "Error al conectar con http://localhost:5000. ¿Está corriendo app.py?";
  }
}

function cargarEnFormulario(item) {
  limpiarMensajes();
  formTitulo.textContent = `Editar producto #${item.id}`;
  inputId.value = item.id;
  inputTitulo.value = item.titulo || "";
  inputTipo.value = item.tipo || "";
  inputCategoria.value = item.categoria || "";
  inputPrecio.value = item.precio ?? "";
  inputStock.value = item.stock ?? "";
  inputDescripcion.value = item.descripcion || "";
  inputAutor.value = item.autor || "";
  inputIsbn.value = item.isbn || "";
  inputPaginas.value = item.paginas ?? "";
}

// ================== GUARDAR (CREAR / EDITAR) ==================

async function guardarProducto(event) {
  event.preventDefault();
  limpiarMensajes();

  const id = inputId.value.trim();
  const cuerpo = {
    titulo: inputTitulo.value.trim(),
    tipo: inputTipo.value,
    categoria: inputCategoria.value.trim() || "general",
    precio: Number(inputPrecio.value || 0),
    stock: Number(inputStock.value || 0),
    descripcion: inputDescripcion.value.trim(),
  };

  // Campos extra si es libro
  if (cuerpo.tipo === "libro") {
    cuerpo.autor = inputAutor.value.trim();
    cuerpo.isbn = inputIsbn.value.trim();
    cuerpo.paginas = Number(inputPaginas.value || 0);
  }

  try {
    let url = `${API_CONTENIDOS}/contenidos`;
    let method = "POST";

    if (id) {
      // edición
      url = `${API_CONTENIDOS}/contenidos/${id}`;
      method = "PUT";
    }

    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    const text = await resp.text();
    console.log("GUARDAR ->", resp.status, text);

    if (!resp.ok) {
      formError.textContent =
        text || "Error al guardar el producto en el backend.";
      return;
    }

    formOk.textContent = id
      ? "Producto actualizado correctamente."
      : "Producto creado correctamente.";

    await cargarProductos();
    if (!id) {
      limpiarFormulario();
    }
  } catch (err) {
    console.error(err);
    formError.textContent =
      "No se pudo contactar al servidor Flask (revisa app.py).";
  }
}

// ================== ELIMINAR ==================

async function eliminarProducto(id) {
  if (!id) return;

  const confirmar = window.confirm(
    `¿Seguro que quieres eliminar el producto #${id}?`
  );
  if (!confirmar) return;

  limpiarMensajes();

  try {
    const resp = await fetch(`${API_CONTENIDOS}/contenidos/${id}`, {
      method: "DELETE",
    });

    const text = await resp.text();
    console.log("ELIMINAR ->", resp.status, text);

    if (!resp.ok) {
      catalogoError.textContent = text || "No se pudo eliminar el producto.";
      return;
    }

    catalogoOk.textContent = "Producto eliminado correctamente.";
    await cargarProductos();

    // si estabas editando ese id, limpia el formulario
    if (inputId.value === String(id)) {
      limpiarFormulario();
    }
  } catch (err) {
    console.error(err);
    catalogoError.textContent =
      "Error al conectar con el servidor Flask al eliminar.";
  }
}

// ================== EVENTOS ==================

if (form) {
  form.addEventListener("submit", guardarProducto);
}
if (btnLimpiar) {
  btnLimpiar.addEventListener("click", (e) => {
    e.preventDefault();
    limpiarFormulario();
  });
}
if (btnRefrescar) {
  btnRefrescar.addEventListener("click", cargarProductos);
}

// Cargar al abrir la página
cargarProductos();
