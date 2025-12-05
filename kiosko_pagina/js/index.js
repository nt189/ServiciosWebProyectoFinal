// ===== Config locales =====
const API_CONTENIDOS = "http://localhost:3000"; // API Gateway base

const userNameSpan = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const booksContainer = document.getElementById("booksContainer");
const notifList = document.getElementById("notifList");
const notifEmpty = document.getElementById("notifEmpty");
const purchasesContainer = document.getElementById("purchasesContainer");
const purchasesEmpty = document.getElementById("purchasesEmpty");

// Cache del cliente
let catalogCache = [];
let purchasedByUser = [];
let purchasedIsbns = new Set();

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
    const resp = await fetch(`${API_CONTENIDOS}/contenidos`);
    if (!resp.ok) throw new Error("Error al cargar contenidos");

    const data = await resp.json();
    const lista = data.contenidos || [];
    catalogCache = lista;

    if (!lista.length) {
      booksContainer.innerHTML =
        '<p class="empty-msg">No hay contenidos registrados en este momento.</p>';
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
      const isbn = (c.isbn || "").toString();
      const isLibro = (c.tipo === "libro");
      const sku = isbn || String(c.id || "");
      const yaComprado = sku ? purchasedIsbns.has(sku.toUpperCase()) : false;

      card.innerHTML = `
        <div class="book-type">${tipo.toUpperCase()}</div>
        <div class="book-title">${titulo}</div>
        <div class="book-meta">Autor/Editorial: ${autor}</div>
        <div class="book-meta">Categoría: ${categoria}</div>
        <div class="book-meta">Precio: $${precio} MXN</div>
        <div class="book-meta badge-stock">Stock: ${stock}</div>
      `;
      const canBuy = stock > 0 && !!sku;
      if (canBuy) {
        const buyBtn = document.createElement("button");
        buyBtn.className = "btn btn-primary";
        buyBtn.textContent = yaComprado ? "Comprado" : "Comprar";
        buyBtn.disabled = yaComprado || stock <= 0;
        buyBtn.addEventListener("click", async () => {
          if (isLibro) {
            await comprarLibro({ titulo, precio, isbn: sku });
          } else {
            await comprarArticulo({ titulo, precio, sku });
          }
        });
        card.appendChild(buyBtn);
      }
      grid.appendChild(card);
    });
    console.log('Catalog loaded:', lista);
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

// ===== Compras =====
async function loadMyPurchases() {
  if (!purchasesContainer) return;
  try {
    const nombre = localStorage.getItem("nombreUsuario") || "";
    purchasedByUser = [];
    purchasedIsbns = new Set();

    const resp = await fetch(`${API_CONTENIDOS}/compras`);
    if (!resp.ok) throw new Error("Error al cargar compras");
    const data = await resp.json();
    const comprasMap = data || {};

    Object.entries(comprasMap).forEach(([isbnKey, compras]) => {
      if (!compras || typeof compras !== 'object') return;
      Object.values(compras).forEach((cmp) => {
        const comprador = cmp?.Comprador || cmp?.comprador || "";
        if (comprador === nombre) {
          purchasedByUser.push({
            isbn: isbnKey,
            precio: cmp?.Precio ?? cmp?.precio ?? 0,
            fecha: cmp?.FechaCompra || cmp?.fechaCompra || null
          });
          purchasedIsbns.add((isbnKey || "").toString().toUpperCase());
        }
      });
    });

    renderPurchases();
  } catch (err) {
    console.error(err);
    if (purchasesContainer)
      purchasesContainer.innerHTML = '<p class="empty-msg">Error al cargar tus compras.</p>';
  }
}

function renderPurchases() {
  if (!purchasesContainer) return;
  if (!purchasedByUser.length) {
    if (purchasesEmpty) purchasesEmpty.style.display = "block";
    return;
  }
  if (purchasesEmpty) purchasesEmpty.style.display = "none";

  const list = document.createElement('div');
  list.className = 'books-grid';

  purchasedByUser.forEach((p) => {
    const info = catalogCache.find(c => {
      const isbnMatch = (c.isbn || "").toString().toUpperCase() === (p.isbn || "").toUpperCase();
      const idMatch = String(c.id || "").toUpperCase() === (p.isbn || "").toUpperCase();
      return isbnMatch || idMatch;
    });
    const titulo = info?.titulo || `ID: ${p.isbn}`;
    const autor = info?.autor || info?.editorial || "Autor desconocido";
    const precio = p?.precio ?? info?.precio ?? 0;
    const tipo = (info?.tipo || 'contenido').toUpperCase();

    const card = document.createElement('article');
    card.className = 'book-card';
    card.innerHTML = `
      <div class=\"book-type\">MIS ${tipo}</div>
      <div class=\"book-title\">${titulo}</div>
      <div class=\"book-meta\">Autor/Editorial: ${autor}</div>
      <div class=\"book-meta\">Precio pagado: $${precio} MXN</div>
      <div class=\"book-meta\">ISBN: ${p.isbn}</div>
      <div class=\"book-meta\">Fecha compra: ${p.fecha ? new Date(p.fecha).toLocaleString('es-MX') : '-'}</div>
    `;
    list.appendChild(card);
  });
  console.log('Rendered purchases:', purchasedByUser);
  purchasesContainer.innerHTML = '';
  purchasesContainer.appendChild(list);
}

async function comprarLibro({ titulo, precio, isbn }) {
  try {
    const comprador = localStorage.getItem("nombreUsuario") || "";
    if (!comprador) {
      alert("Debes iniciar sesión para comprar.");
      return;
    }
    if (!isbn) {
      alert("Este libro no tiene ISBN disponible.");
      return;
    }

    const payload = {
      Comprador: comprador,
      Precio: precio ?? 0,
      FechaCompra: new Date().toISOString(),
      ISBN: isbn.toUpperCase()
    };

    const resp = await fetch(`${API_CONTENIDOS}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err || 'Error realizando compra');
    }
    await loadMyPurchases();
    await loadCatalog();
    alert(`Compra realizada: ${titulo}`);
  } catch (e) {
    console.error(e);
    alert('Ocurrió un error al comprar.');
  }
}

async function comprarArticulo({ titulo, precio, sku }) {
  try {
    const comprador = localStorage.getItem("nombreUsuario") || "";
    if (!comprador) {
      alert("Debes iniciar sesión para comprar.");
      return;
    }
    if (!sku) {
      alert("Este artículo no tiene identificador disponible.");
      return;
    }

    const payload = {
      Comprador: comprador,
      Precio: precio ?? 0,
      FechaCompra: new Date().toISOString(),
      ISBN: sku.toUpperCase()
    };

    const resp = await fetch(`${API_CONTENIDOS}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err || 'Error realizando compra');
    }
    await loadMyPurchases();
    await loadCatalog();
    alert(`Compra realizada: ${titulo}`);
  } catch (e) {
    console.error(e);
    alert('Ocurrió un error al comprar.');
  }
}

// ===== Inicializar página =====
async function init() {
  ensureSession();
  // Cargar catálogo primero para tener detalles disponibles al renderizar compras
  await loadCatalog();
  await loadMyPurchases();
  await loadCatalog();
}

init();
