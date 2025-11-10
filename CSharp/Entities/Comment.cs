// Equivalente à rota /comments
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CSharp.Entities
{
    public class Comment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TicketId { get; set; }
        public Ticket? Ticket { get; set; }

        [Required]
        public Guid UserId { get; set; }
        public User? User { get; set; }

        [Required]
        public string CommentBody { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
