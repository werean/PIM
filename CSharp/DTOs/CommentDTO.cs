// Equivalente à lógica de /comments
using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class CommentCreateDTO
    {
        [Required]
        public int TicketId { get; set; }
        [Required]
        public string CommentBody { get; set; } = string.Empty;
    }

    public class CommentListDTO
    {
        public int Id { get; set; }
        public int TicketId { get; set; }
        public string CommentBody { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public Guid UserId { get; set; }
        public string Username { get; set; } = string.Empty;
    }
}
