using Google.Cloud.Firestore;

namespace KioscoDigital.WebAPI.Models
{
    [FirestoreData]
    public class Suscripcion
    {
        public string? Id { get; set; } // ID de la suscripción

        [FirestoreProperty]
        public string? UsuarioId { get; set; } // ¿Quién se suscribe?

        [FirestoreProperty]
        public string? TipoSuscripcion { get; set; } // Ej: "Mensual", "Anual", "VIP"

        [FirestoreProperty]
        public DateTime FechaInicio { get; set; } = DateTime.UtcNow;
    }
}