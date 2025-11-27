using Microsoft.AspNetCore.Mvc;
using Google.Cloud.Firestore;
using KioscoDigital.WebAPI.Models;
using Microsoft.AspNetCore.Authorization; // Necesario para el candado

// 👇 NUEVOS usings para el webhook
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
using System.IO; // Para Directory.GetCurrentDirectory

namespace KioscoDigital.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // <--- ¡EL CANDADO DE SEGURIDAD! (Protege todas las funciones)
    public class SuscripcionesController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        // 👇 NUEVO: cliente HTTP y URL del webhook
        private readonly HttpClient _httpClient;
        private const string WebhookNuevaSuscripcionUrl = "http://localhost:5001/webhook/nueva-suscripcion";

        public SuscripcionesController()
        {
            // Configuración de la conexión a Firebase
            string credencialPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase_key.json");
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credencialPath);
            _firestoreDb = FirestoreDb.Create("apiwebkiosco");

            // 👇 inicializar HttpClient
            _httpClient = new HttpClient();
        }

        // ==========================================
        // 1. VENDER (Agregar Suscripción)
        // ==========================================
        [HttpPost("agregar")]
        public async Task<IActionResult> AgregarSuscripcion([FromBody] Suscripcion nuevaSuscripcion)
        {
            try
            {
                CollectionReference suscripcionesRef = _firestoreDb.Collection("suscripciones");
                DocumentReference docRef = await suscripcionesRef.AddAsync(nuevaSuscripcion);

                // 👇 NUEVO: llamar al webhook para notificación
                var payload = new
                {
                    suscripcionId = docRef.Id,
                    usuarioId = nuevaSuscripcion.UsuarioId,
                    tipoSuscripcion = nuevaSuscripcion.TipoSuscripcion,
                    fechaInicio = nuevaSuscripcion.FechaInicio
                };

                string json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                try
                {
                    await _httpClient.PostAsync(WebhookNuevaSuscripcionUrl, content);
                }
                catch (Exception ex)
                {
                    // No rompemos la venta si falla la notificación
                    Console.WriteLine("Error al llamar webhook nueva suscripción: " + ex.Message);
                }

                return Ok(new
                {
                    mensaje = "Suscripción agregada correctamente",
                    id = docRef.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }

        // ==========================================
        // 2. CANCELAR (Eliminar Suscripción)
        // ==========================================
        [HttpDelete("eliminar/{id}")]
        public async Task<IActionResult> EliminarSuscripcion(string id)
        {
            try
            {
                DocumentReference docRef = _firestoreDb.Collection("suscripciones").Document(id);
                await docRef.DeleteAsync();
                return Ok(new { mensaje = "Suscripción eliminada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }

        // ==========================================
        // 3. VER COMPRAS (Para probar la seguridad)
        // ==========================================
        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> VerSuscripcionesUsuario(string usuarioId)
        {
            try
            {
                CollectionReference suscripcionesRef = _firestoreDb.Collection("suscripciones");
                Query query = suscripcionesRef.WhereEqualTo("UsuarioId", usuarioId);
                QuerySnapshot snapshot = await query.GetSnapshotAsync();

                List<Suscripcion> lista = new List<Suscripcion>();

                foreach (DocumentSnapshot doc in snapshot.Documents)
                {
                    if (doc.Exists)
                    {
                        Suscripcion s = doc.ConvertTo<Suscripcion>();
                        s.Id = doc.Id;
                        lista.Add(s);
                    }
                }
                return Ok(lista);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }
    }
}
