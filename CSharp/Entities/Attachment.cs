// Equivalente à rota /attachments
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CSharp.Entities
{
    public class Attachment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TicketId { get; set; }
        public Ticket? Ticket { get; set; }

        [Required]
        [StringLength(255)]
        public string Filename { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Filepath { get; set; } = string.Empty;

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
