// 1. Configura Firebase (usa tus datos reales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "apiwebkiosco",        // el mismo de Firestore
  // ...
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const cont = document.getElementById("notificaciones-count");
const list = document.getElementById("notificaciones-list");

// Si algún día quieres filtrar por usuario:
const usuarioActualId = null; // o el id que te devuelve tu API de login

let query = db.collection("notificaciones").orderBy("fecha", "desc");

// Ejemplo: si quieres solo las no vistas
query = query.where("visto", "==", false);

// 2. Escucha en tiempo real
query.onSnapshot((snapshot) => {
  list.innerHTML = "";

  let total = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    total++;

    const div = document.createElement("div");
    div.className = "notif-item";
    div.textContent = data.mensaje;
    list.appendChild(div);
  });

  cont.textContent = total;
});
