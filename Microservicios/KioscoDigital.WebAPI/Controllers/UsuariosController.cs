using Microsoft.AspNetCore.Mvc;
using Google.Cloud.Firestore;
using KioscoDigital.WebAPI.Models;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

// 👇 NUEVOS usings para el webhook
using System;
using System.Net.Http;
using System.Text.Json;
using System.Collections.Generic;
using System.IO;

namespace KioscoDigital.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;
        private readonly IConfiguration _config; // Variable para leer appsettings

        // 👇 NUEVO: cliente HTTP y URL del webhook
        private readonly HttpClient _httpClient;
        private const string WebhookNuevoUsuarioUrl = "http://localhost:5001/webhook/nuevo-usuario";

        public UsuariosController(IConfiguration config)
        {
            _config = config; // Guardamos la configuración recibida

            string credencialPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase_key.json");
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credencialPath);
            _firestoreDb = FirestoreDb.Create("apiwebkiosco");

            // 👇 inicializar HttpClient
            _httpClient = new HttpClient();
        }

        // POST: api/Usuarios/registro
        [HttpPost("registro")]
        public async Task<IActionResult> RegistrarUsuario([FromBody] Usuario nuevoUsuario)
        {
            try
            {
                CollectionReference usuariosRef = _firestoreDb.Collection("usuarios");
                DocumentReference docRef = await usuariosRef.AddAsync(nuevoUsuario);

                // 👇 NUEVO: llamar al webhook para notificación en Firebase (weebhook-5b7c6)
                var payload = new
                {
                    usuarioId = docRef.Id,              // ID real de Firestore
                    nombre = nuevoUsuario.Nombre,
                    email = nuevoUsuario.Email,
                    fechaRegistro = nuevoUsuario.FechaRegistro
                };

                string json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                try
                {
                    await _httpClient.PostAsync(WebhookNuevoUsuarioUrl, content);
                }
                catch (Exception ex)
                {
                    // No rompemos el registro si falla la notificación
                    Console.WriteLine("Error al llamar webhook nuevo usuario: " + ex.Message);
                }

                return Ok(new { mensaje = "Usuario registrado exitosamente", id = docRef.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }

        // POST: api/Usuarios/login
        [HttpPost("login")]
        public async Task<IActionResult> IniciarSesion([FromBody] Usuario loginData)
        {
            try
            {
                CollectionReference usuariosRef = _firestoreDb.Collection("usuarios");
                Query query = usuariosRef.WhereEqualTo("Email", loginData.Email);
                QuerySnapshot snapshot = await query.GetSnapshotAsync();

                if (snapshot.Count == 0) return Unauthorized("El correo no existe.");

                DocumentSnapshot documento = snapshot.Documents[0];
                Usuario usuarioEncontrado = documento.ConvertTo<Usuario>();

                // Verificación simple de contraseña
                if (usuarioEncontrado.Password != loginData.Password)
                {
                    return Unauthorized("Contraseña incorrecta.");
                }

                // ==========================================
                // GENERACIÓN DEL TOKEN (JWT)
                // ==========================================
                var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
                var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

                var claims = new[]
                {
                    new Claim("Id", documento.Id),
                    new Claim(JwtRegisteredClaimNames.Email, usuarioEncontrado.Email)
                };

                var token = new JwtSecurityToken(
                    _config["Jwt:Issuer"],
                    _config["Jwt:Audience"],
                    claims,
                    expires: DateTime.Now.AddMinutes(60),
                    signingCredentials: credentials);

                var jwtToken = new JwtSecurityTokenHandler().WriteToken(token);

                return Ok(new
                {
                    mensaje = "Login exitoso",
                    token = jwtToken, // <--- AQUÍ VA TU TOKEN
                    usuarioId = documento.Id,
                    nombre = usuarioEncontrado.Nombre
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }

        // PUT: api/Usuarios/notificaciones/{id}
        [HttpPut("notificaciones/{usuarioId}")]
        public async Task<IActionResult> DesactivarNotificaciones(string usuarioId)
        {
            try
            {
                DocumentReference usuarioRef = _firestoreDb.Collection("usuarios").Document(usuarioId);
                Dictionary<string, object> actualizacion = new Dictionary<string, object>
                {
                    { "RecibirNotificaciones", false }
                };
                await usuarioRef.UpdateAsync(actualizacion);
                return Ok(new { mensaje = "Notificaciones desactivadas." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }
    }
}
