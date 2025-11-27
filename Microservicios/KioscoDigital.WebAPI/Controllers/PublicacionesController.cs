using Microsoft.AspNetCore.Mvc;
using Google.Cloud.Firestore;
using KioscoDigital.WebAPI.Models;

namespace KioscoDigital.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublicacionesController : ControllerBase
    {
        private readonly FirestoreDb _firestoreDb;

        public PublicacionesController()
        {
            // 1. CONEXIÓN: Buscamos la llave que ya configuraste antes
            string credencialPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase_key.json");
            Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credencialPath);

            // 2. PROYECTO: Tu ID de Firebase
            _firestoreDb = FirestoreDb.Create("apiwebkiosco");
        }

        // ==========================================
        // POST: Sirve para AGREGAR una nueva revista
        // ==========================================
        [HttpPost("agregar")]
        public async Task<IActionResult> AgregarPublicacion([FromBody] Publicacion nuevaPublicacion)
        {
            try
            {
                // Guardamos en la colección "catalogo"
                CollectionReference coleccion = _firestoreDb.Collection("catalogo");
                DocumentReference docRef = await coleccion.AddAsync(nuevaPublicacion);

                return Ok(new
                {
                    mensaje = "Publicación guardada correctamente",
                    id_generado = docRef.Id,
                    titulo = nuevaPublicacion.Titulo
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error: " + ex.Message);
            }
        }

        // ==========================================
        // GET: Sirve para VER todo el catálogo
        // ==========================================
        [HttpGet("catalogo")]
        public async Task<IActionResult> ObtenerCatalogo()
        {
            try
            {
                CollectionReference coleccion = _firestoreDb.Collection("catalogo");
                QuerySnapshot snapshot = await coleccion.GetSnapshotAsync();

                List<Publicacion> lista = new List<Publicacion>();

                foreach (DocumentSnapshot documento in snapshot.Documents)
                {
                    if (documento.Exists)
                    {
                        // Convertimos el documento de Firebase a nuestra clase C#
                        Publicacion publicacion = documento.ConvertTo<Publicacion>();
                        publicacion.Id = documento.Id; // Asignamos el ID real
                        lista.Add(publicacion);
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