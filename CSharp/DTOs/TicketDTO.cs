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
    }

    public class TicketDetailDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string TicketBody { get; set; } = string.Empty;
        public int Urgency { get; set; }
    }
}
