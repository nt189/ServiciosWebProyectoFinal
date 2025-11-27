using Google.Cloud.Firestore;

namespace KioscoDigital.WebAPI.Models
{
    [FirestoreData]
    public class Publicacion
    {
        // Este ID se llenará automáticamente cuando leamos de Firebase
        public string? Id { get; set; }

        [FirestoreProperty]
        public string Titulo { get; set; } // Ej: "National Geographic"

        [FirestoreProperty]
        public string Tipo { get; set; } // Ej: "Revista", "Libro", "Periódico"

        [FirestoreProperty]
        public string Editorial { get; set; } // Ej: "Planeta", "NY Times"

        [FirestoreProperty]
        public double Precio { get; set; } // Ej: 150.50

        [FirestoreProperty]
        public string ImagenUrl { get; set; } // URL de la portada
    }
}