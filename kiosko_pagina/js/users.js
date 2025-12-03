// users.js

const API_BASE = "http://localhost:3000";

const usuariosBody = document.getElementById("usuariosBody");
const usuariosError = document.getElementById("usuariosError");
const usuariosOk = document.getElementById("usuariosOk");
const btnRefrescarUsers = document.getElementById("btnRefrescarUsers");

const usuarioForm = document.getElementById("usuarioForm");
const formUsuarioTitulo = document.getElementById("formUsuarioTitulo");
const formUserOk = document.getElementById("formUserOk");
const formUserError = document.getElementById("formUserError");
const btnLimpiarUser = document.getElementById("btnLimpiarUser");

const inputUsuarioId = document.getElementById("usuarioId");
const inputNombre = document.getElementById("nombre");
const inputEmail = document.getElementById("email");
const inputRol = document.getElementById("rol");

function limpiarMensajesUsers() {
  usuariosError.textContent = "";
  usuariosOk.textContent = "";
  formUserOk.textContent = "";
  formUserError.textContent = "";
}

function limpiarFormularioUser() {
  inputUsuarioId.value = "";
  usuarioForm.reset();
  formUsuarioTitulo.textContent = "Nuevo usuario";
}

async function cargarUsuarios() {
  limpiarMensajesUsers();
  usuariosBody.innerHTML = `<tr><td colspan="6">Cargando usuarios...</td></tr>`;

  try {
    const resp = await fetch(`${API_BASE}/usuarios`);
    if (!resp.ok) {
      usuariosBody.innerHTML = "";
      usuariosError.textContent = "No se pudo cargar la lista de usuarios.";
      return;
    }

    const data = await resp.json();
    const lista = data.usuarios || data || [];

    if (!lista.length) {
      usuariosBody.innerHTML = `<tr><td colspan="6">No hay usuarios registrados.</td></tr>`;
      return;
    }

    usuariosBody.innerHTML = "";
    lista.forEach((u) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = u.id ?? "";
      tr.appendChild(tdId);

      const tdNombre = document.createElement("td");
      tdNombre.textContent = u.nombre || u.name || "";
      tr.appendChild(tdNombre);

      const tdEmail = document.createElement("td");
      tdEmail.textContent = u.email || "";
      tr.appendChild(tdEmail);

      const tdRol = document.createElement("td");
      tdRol.textContent = u.rol || u.role || "user";
      tr.appendChild(tdRol);

      const tdReg = document.createElement("td");
      tdReg.textContent = u.registrado || u.created_at || "-";
      tr.appendChild(tdReg);

      const tdAcc = document.createElement("td");
      const btnEliminar = document.createElement("button");
      btnEliminar.textContent = "Eliminar";
      btnEliminar.className = "btn btn-xs btn-danger";
      btnEliminar.addEventListener("click", () => eliminarUsuario(u.id));

      const btnEditar = document.createElement("button");
      btnEditar.textContent = "Editar";
      btnEditar.className = "btn btn-xs btn-secondary";
      btnEditar.style.marginLeft = "0.5rem";
      btnEditar.addEventListener("click", () => cargarEnFormularioUser(u));

      tdAcc.appendChild(btnEditar);
      tdAcc.appendChild(btnEliminar);
      tr.appendChild(tdAcc);

      usuariosBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    usuariosBody.innerHTML = "";
    usuariosError.textContent = "Error al conectar con el servidor.";
  }
}

function cargarEnFormularioUser(u) {
  limpiarMensajesUsers();
  formUsuarioTitulo.textContent = `Editar usuario #${u.id}`;
  inputUsuarioId.value = u.id ?? "";
  inputNombre.value = u.nombre || u.name || "";
  inputEmail.value = u.email || "";
  inputRol.value = u.rol || u.role || "user";
}

async function guardarUsuario(e) {
  e.preventDefault();
  limpiarMensajesUsers();

  const id = inputUsuarioId.value.trim();
  const cuerpo = {
    nombre: inputNombre.value.trim(),
    email: inputEmail.value.trim(),
    rol: inputRol.value,
  };

  try {
    let url = `${API_BASE}/usuarios`;
    let method = "POST";
    if (id) {
      url = `${API_BASE}/usuarios/${id}`;
      method = "PUT";
    }

    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    const text = await resp.text();
    if (!resp.ok) {
      formUserError.textContent = text || "Error al guardar usuario.";
      return;
    }

    formUserOk.textContent = id ? "Usuario actualizado." : "Usuario creado.";
    await cargarUsuarios();
    if (!id) limpiarFormularioUser();
  } catch (err) {
    console.error(err);
    formUserError.textContent = "No se pudo contactar al servidor.";
  }
}

async function eliminarUsuario(id) {
  if (!id) return;
  const confirmar = window.confirm(`¿Eliminar usuario #${id}?`);
  if (!confirmar) return;

  limpiarMensajesUsers();
  try {
    const resp = await fetch(`${API_BASE}/usuarios/${id}`, { method: "DELETE" });
    const text = await resp.text();
    if (!resp.ok) {
      usuariosError.textContent = text || "No se pudo eliminar.";
      return;
    }
    usuariosOk.textContent = "Usuario eliminado.";
    await cargarUsuarios();
  } catch (err) {
    console.error(err);
    usuariosError.textContent = "Error al conectar al servidor.";
  }
}

if (usuarioForm) usuarioForm.addEventListener("submit", guardarUsuario);
if (btnLimpiarUser) btnLimpiarUser.addEventListener("click", (e) => {
  e.preventDefault();
  limpiarFormularioUser();
});
if (btnRefrescarUsers) btnRefrescarUsers.addEventListener("click", cargarUsuarios);

// Cargar al abrir
cargarUsuarios();
