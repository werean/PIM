// Equivalente a src/modules/users/dto/user.dto.ts
using System.ComponentModel.DataAnnotations;

namespace CSharp.DTOs
{
    public class UserCreateDTO
    {
        [Required]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public int Role { get; set; } = 5; // Default: User
    }

    public class UserUpdateDTO
    {
        [StringLength(100)]
        public string? Username { get; set; }

        [EmailAddress]
        [StringLength(255)]
        public string? Email { get; set; }
    }

    public class UserListDTO
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty; // Mascarar em logs
        public int Role { get; set; }
    }

    public class UserDetailDTO
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int Role { get; set; }
        public string? ProfileImage { get; set; }
    }

    public class UserProfileUpdateDTO
    {
        [StringLength(100)]
        public string? Username { get; set; }

        [EmailAddress]
        [StringLength(255)]
        public string? Email { get; set; }

        public string? ProfileImage { get; set; }
    }

    public class ChangePasswordDTO
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
