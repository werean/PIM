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

    public enum TicketStatus
    {
        Open = 1,      // Aberto
        Pending = 2,   // Pendente
        Resolved = 3   // Resolvido
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

        [Required]
        public TicketStatus Status { get; set; } = TicketStatus.Open;

        public string? ResolutionMessage { get; set; } // Mensagem de resolução

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Relacionamentos
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public ICollection<Comment>? Comments { get; set; }
        public ICollection<Attachment>? Attachments { get; set; }
    }
}
