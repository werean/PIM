using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class AIMessageDTO
    {
        public int Id { get; set; }
        public int TicketId { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public Guid? UserId { get; set; }
        public string? Username { get; set; }
    }

    public class AIMessageCreateDTO
    {
        [Required]
        public int TicketId { get; set; }
        
        [Required]
        [StringLength(20)]
        public string Role { get; set; } = string.Empty; // "user" ou "assistant"
        
        [Required]
        public string Content { get; set; } = string.Empty;
    }
}
