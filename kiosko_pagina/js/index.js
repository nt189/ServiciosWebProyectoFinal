// ===== Config locales =====
const API_CONTENIDOS = "http://localhost:3000"; // Flask contenidos

const userNameSpan = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const booksContainer = document.getElementById("booksContainer");
const notifList = document.getElementById("notifList");
const notifEmpty = document.getElementById("notifEmpty");

// ===== Sesión =====
function ensureSession() {
  const token = localStorage.getItem("token");
  const nombre = localStorage.getItem("nombreUsuario") || "Invitado";

  if (!token) {
    // si quieres dejar entrar sin login, comenta esta línea
    window.location.href = "login.html";
    return;
  }
  if (userNameSpan) {
    userNameSpan.textContent = nombre;
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("nombreUsuario");
    window.location.href = "login.html";
  });
}

// ===== Catálogo de libros =====
async function loadCatalog() {
  if (!booksContainer) return;

  try {
    const resp = await fetch(`${API_CONTENIDOS}/contenidos?tipo=libro`);
    if (!resp.ok) throw new Error("Error al cargar contenidos");

    const data = await resp.json();
    const lista = data.contenidos || [];

    if (!lista.length) {
      booksContainer.innerHTML =
        '<p class="empty-msg">No hay libros registrados en este momento.</p>';
      return;
    }

    const grid = document.createElement("div");
    grid.className = "books-grid";

    lista.forEach((c) => {
      const card = document.createElement("article");
      card.className = "book-card";

      const tipo = c.tipo || "contenido";
      const titulo = c.titulo || "Sin título";
      const autor = c.autor || c.editorial || "Autor desconocido";
      const categoria = c.categoria || "general";
      const precio = c.precio ?? 0;
      const stock = c.stock ?? 0;

      card.innerHTML = `
        <div class="book-type">${tipo.toUpperCase()}</div>
        <div class="book-title">${titulo}</div>
        <div class="book-meta">Autor/Editorial: ${autor}</div>
        <div class="book-meta">Categoría: ${categoria}</div>
        <div class="book-meta">Precio: $${precio} MXN</div>
        <div class="book-meta badge-stock">Stock: ${stock}</div>
      `;
      grid.appendChild(card);
    });

    booksContainer.innerHTML = "";
    booksContainer.appendChild(grid);
  } catch (err) {
    console.error(err);
    booksContainer.innerHTML =
      '<p class="empty-msg">Error al cargar el catálogo.</p>';
  }
}

// ===== Firebase Notificaciones =====
// Usamos las versiones por URL (no "firebase/app" plano)
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onChildAdded
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// 🔹 AQUÍ va tu firebaseConfig (el que pegaste):
const firebaseConfig = {
  apiKey: "AIzaSyBJLq6Bdt-Thr6lMWRazm2_2xUJKLnVp7I",
  authDomain: "weebhook-5b7c6.firebaseapp.com",
  databaseURL: "https://weebhook-5b7c6-default-rtdb.firebaseio.com",
  projectId: "weebhook-5b7c6",
  storageBucket: "weebhook-5b7c6.firebasestorage.app",
  messagingSenderId: "887458765718",
  appId: "1:887458765718:web:46c47bc22574f22ffb1bb7",
  measurementId: "G-MT1TXQXPRQ"
};

// Inicializar Firebase y DB
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const notifRef = ref(db, "notificaciones");

function addNotification(data) {
  if (!notifList) return;

  if (notifEmpty) notifEmpty.style.display = "none";

  const li = document.createElement("li");
  li.className = "notif-item";

  const fecha = data.fecha ? new Date(data.fecha) : new Date();
  const fechaStr = fecha.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });

  li.innerHTML = `
    <div class="notif-icon">📚</div>
    <div>
      <div class="notif-title">${data.titulo || "Nuevo contenido"}</div>
      <div class="notif-msg">${
        data.mensaje || "Se agregó un nuevo título al kiosko."
      }</div>
      <div class="notif-time">${fechaStr} · Categoría: ${
    data.categoria || "general"
  }</div>
    </div>
  `;

  notifList.prepend(li);

  // Limitar a las últimas 15 notificaciones
  const items = notifList.querySelectorAll(".notif-item");
  if (items.length > 15) {
    items[items.length - 1].remove();
  }
}

// Escuchar en tiempo real /notificaciones
onChildAdded(notifRef, (snapshot) => {
  const data = snapshot.val() || {};
  if (data.tipo === "nuevo_titulo") {
    addNotification(data);
  }
});

// ===== Inicializar página =====
ensureSession();
loadCatalog();
