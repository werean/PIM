using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CSharp.Entities
{
    public class AIMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TicketId { get; set; }

        [Required]
        [StringLength(20)]
        public string Role { get; set; } = string.Empty; // "user" ou "assistant"

        [Required]
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public Guid? UserId { get; set; } // Quem enviou (se role='user')

        // Relacionamentos
        public Ticket? Ticket { get; set; }
        public User? User { get; set; }
    }
}
