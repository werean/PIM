// Equivalente a src/interfaces/ticket.ts e db/migrations/20251002235745_create_ticket.ts
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CSharp.Entities
{
    public enum Urgency
    {
        Low = 1,
        Medium = 2,
        High = 3
    }

    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string TicketBody { get; set; } = string.Empty;

        [Required]
        public Urgency Urgency { get; set; } = Urgency.Low;

        // Relacionamentos
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public ICollection<Comment>? Comments { get; set; }
        public ICollection<Attachment>? Attachments { get; set; }
    }
}
