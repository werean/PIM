// Equivalente à lógica de /comments
using CSharp.Entities;
using CSharp.DTOs;
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
            var comments = await _context.Comments.Where(c => c.TicketId == ticketId).ToListAsync();
            return comments.Select(c => new CommentListDTO
            {
                Id = c.Id,
                TicketId = c.TicketId,
                CommentBody = c.CommentBody,
                CreatedAt = c.CreatedAt
            }).ToList();
        }

        public async Task<Comment?> CreateAsync(CommentCreateDTO dto, Guid userId)
        {
            var comment = new Comment
            {
                TicketId = dto.TicketId,
                UserId = userId,
                CommentBody = dto.CommentBody
            };
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();
            return comment;
        }
    }
}
