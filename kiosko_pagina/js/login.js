const API_BASE = "http://localhost:3000";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      // 🔹 Body igual que Insomnia (id y nombre de relleno)
      const body = {
        id: "1234",
        nombre: "relleno",
        email: email,
        password: password
      };

      const resp = await fetch(`${API_BASE}/Usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await resp.text();
      console.log("LOGIN -> status:", resp.status, "body:", text);

      if (!resp.ok) {
        loginError.textContent =
          text || `Error HTTP ${resp.status} al iniciar sesión.`;
        return;
      }

      const data = JSON.parse(text);

      localStorage.setItem("token", data.token || "");
      localStorage.setItem("usuarioId", data.usuarioId);
      localStorage.setItem("nombreUsuario", data.nombre);

      window.location.href = "index.html";
    } catch (err) {
      console.error("Error en fetch login:", err);
      loginError.textContent =
        "No se pudo iniciar sesión (revisa la consola).";
    }
  });
}
