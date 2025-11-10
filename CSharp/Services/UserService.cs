// Equivalente a src/modules/users/user.service.ts
using CSharp.Entities;
using CSharp.DTOs;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;

namespace CSharp.Services
{
    public class UserService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserService> _logger;

        public UserService(ApplicationDbContext context, ILogger<UserService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<UserListDTO>> GetAllAsync()
        {
            var users = await _context.Users.ToListAsync();
            return users.Select(u => new UserListDTO
            {
                Username = u.Username,
                Email = u.Email,
                Role = (int)u.Role
            }).ToList();
        }

        public async Task<UserDetailDTO?> GetByIdAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return null;
            return new UserDetailDTO
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = (int)user.Role
            };
        }

        public async Task<User?> CreateAsync(UserCreateDTO dto)
        {
            // Validar role (apenas 5 ou 10 são permitidos)
            if (dto.Role != 5 && dto.Role != 10)
            {
                _logger.LogWarning($"Tentativa de criar usuário com role inválida: {dto.Role}. Usando role padrão (5).");
                dto.Role = 5;
            }

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                Password = dto.Password, // Hash em AuthService
                Role = (UserRole)dto.Role
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<bool> UpdateAsync(Guid id, UserUpdateDTO dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;
            if (!string.IsNullOrEmpty(dto.Username)) user.Username = dto.Username;
            if (!string.IsNullOrEmpty(dto.Email)) user.Email = dto.Email;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
