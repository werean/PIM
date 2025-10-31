// Equivalente a src/interfaces/user.ts e db/migrations/20251002181413_create_users.ts
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CSharp.Entities
{
    public enum UserRole
    {
        User = 5,
        Moderator = 10,
        Admin = 15
    }

    public class User
    {
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public UserRole Role { get; set; } = UserRole.User;

        // Relacionamentos
        public ICollection<Ticket>? Tickets { get; set; }
        public ICollection<Comment>? Comments { get; set; }
    }
}
