using Google.Cloud.Firestore;

namespace KioscoDigital.WebAPI.Models
{
    [FirestoreData]
    public class Usuario
    {
        // El ID lo genera Firestore, aquí solo lo leemos
        public string? Id { get; set; }

        [FirestoreProperty]
        public string Nombre { get; set; }

        [FirestoreProperty]
        public string Email { get; set; }

        [FirestoreProperty]
        public string Password { get; set; }

        [FirestoreProperty]
        public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
    }
}