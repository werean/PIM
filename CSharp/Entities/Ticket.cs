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
        Open = 1,                  // Aberto
        Pending = 2,               // Pendente
        Resolved = 3,              // Resolvido
        Reopened = 4,              // Reaberto (usuário rejeitou solução)
        PendingApproval = 5,       // Aguardando aprovação do usuário
        PendingDeletion = 6,       // Aguardando aprovação de exclusão
        Deleted = 7                // Apagado (aprovado pelo usuário)
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

        public string? ResolutionMessage { get; set; } // Mensagem de resolução do técnico
        public bool? ResolutionApproved { get; set; } // null = pendente, true = aprovado, false = rejeitado
        public DateTime? ReopenedAt { get; set; } // Data de reabertura após rejeição

        public bool IsDeleted { get; set; } = false; // Soft delete
        public DateTime? DeletedAt { get; set; } // Data de exclusão

        public bool? PendingDeletion { get; set; } // null = não solicitado, true = aguardando aprovação
        public Guid? DeletionRequestedBy { get; set; } // Técnico que solicitou exclusão
        public DateTime? DeletionRequestedAt { get; set; } // Data da solicitação de exclusão

        public DateTime? EditedAt { get; set; } // Data da última edição da descrição
        public Guid? EditedBy { get; set; } // Usuário que editou

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Relacionamentos
        public Guid UserId { get; set; }
        public User? User { get; set; }
        public ICollection<Comment>? Comments { get; set; }
        public ICollection<Attachment>? Attachments { get; set; }
    }
}
