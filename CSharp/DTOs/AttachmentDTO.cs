// Equivalente à lógica de /attachments
using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class AttachmentCreateDTO
    {
        [Required]
        public int TicketId { get; set; }
        [Required]
        [StringLength(255)]
        public string Filename { get; set; } = string.Empty;
        [Required]
        [StringLength(500)]
        public string Filepath { get; set; } = string.Empty;
    }

    public class AttachmentListDTO
    {
        public int Id { get; set; }
        public int TicketId { get; set; }
        public string Filename { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
    }
}
