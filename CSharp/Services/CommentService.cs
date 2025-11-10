// Equivalente à lógica de /comments
using CSharp.Entities;
using CSharp.DTOs;
using CSharp.Helpers;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;

namespace CSharp.Services
{
    public class CommentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CommentService> _logger;

        public CommentService(ApplicationDbContext context, ILogger<CommentService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<CommentListDTO>> GetByTicketAsync(int ticketId)
        {
            var comments = await _context.Comments
                .Include(c => c.User)
                .Where(c => c.TicketId == ticketId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
            
            return comments.Select(c => new CommentListDTO
            {
                Id = c.Id,
                TicketId = c.TicketId,
                CommentBody = c.CommentBody,
                CreatedAt = c.CreatedAt,
                UserId = c.UserId,
                Username = c.User?.Username ?? "Desconhecido"
            }).ToList();
        }

        public async Task<Comment?> CreateAsync(CommentCreateDTO dto, Guid userId)
        {
            var comment = new Comment
            {
                TicketId = dto.TicketId,
                UserId = userId,
                CommentBody = dto.CommentBody,
                CreatedAt = DateTimeHelper.GetBrasiliaTime()
            };
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();
            return comment;
        }
    }
}
