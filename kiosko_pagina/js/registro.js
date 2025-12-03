const API_BASE = "http://localhost:3000/api";

const registerForm = document.getElementById("registerForm");
const registerError = document.getElementById("registerError");
const registerOk = document.getElementById("registerOk");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerError.textContent = "";
    registerOk.textContent = "";

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      // 🔹 Mandamos el MISMO body que Insomnia (solo cambiamos el id para que no choque)
      const body = {
        id: "1234",   // o un id de relleno cualquiera
        nombre: nombre,
        email: email,
        password: password
      };

      const resp = await fetch(`${API_BASE}/Usuarios/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await resp.text();
      console.log("REGISTRO -> status:", resp.status, "body:", text);

      if (!resp.ok) {
        registerError.textContent =
          text || `Error HTTP ${resp.status} al registrar.`;
        return;
      }

      registerOk.textContent =
        "Usuario registrado correctamente. Ahora puedes iniciar sesión.";

      // redirigir al login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } catch (err) {
      console.error("Error en fetch registro:", err);
      registerError.textContent =
        "No se pudo registrar el usuario (revisa la consola).";
    }
  });
}
