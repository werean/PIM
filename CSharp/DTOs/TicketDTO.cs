// Equivalente a src/modules/tickets/dto/create-ticket.dto.ts
using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class TicketCreateDTO
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string TicketBody { get; set; } = string.Empty;

        [Required]
        public int Urgency { get; set; }
    }

    public class TicketUpdateDTO
    {
        [StringLength(200)]
        public string? Title { get; set; }
        public string? TicketBody { get; set; }
        public int? Urgency { get; set; }
    }

    public class TicketListDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int Urgency { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
        public Guid UserId { get; set; }
        public string? Username { get; set; }
    }

    public class TicketDetailDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string TicketBody { get; set; } = string.Empty;
        public int Urgency { get; set; }
        public int Status { get; set; }
        public string? ResolutionMessage { get; set; }
        public bool? ResolutionApproved { get; set; }
        public DateTime? ReopenedAt { get; set; }
        public bool? PendingDeletion { get; set; }
        public Guid? DeletionRequestedBy { get; set; }
        public DateTime? DeletionRequestedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        public Guid? EditedBy { get; set; }
        public string? EditedByUsername { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Guid UserId { get; set; }
        public string? Username { get; set; }
        public List<CommentListDTO>? Comments { get; set; }
    }

    public class ResolveTicketDTO
    {
        [Required]
        [MinLength(10, ErrorMessage = "A mensagem de resolução deve ter pelo menos 10 caracteres")]
        public string ResolutionMessage { get; set; } = string.Empty;
    }

    public class UpdateDescriptionDTO
    {
        [Required]
        [MinLength(10, ErrorMessage = "A descrição deve ter pelo menos 10 caracteres")]
        public string TicketBody { get; set; } = string.Empty;
    }
}
