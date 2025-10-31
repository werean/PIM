// Equivalente à lógica de /attachments
using CSharp.Entities;
using CSharp.DTOs;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;

namespace CSharp.Services
{
    public class AttachmentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AttachmentService> _logger;

        public AttachmentService(ApplicationDbContext context, ILogger<AttachmentService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<AttachmentListDTO>> GetByTicketAsync(int ticketId)
        {
            var attachments = await _context.Attachments.Where(a => a.TicketId == ticketId).ToListAsync();
            return attachments.Select(a => new AttachmentListDTO
            {
                Id = a.Id,
                TicketId = a.TicketId,
                Filename = a.Filename,
                UploadedAt = a.UploadedAt
            }).ToList();
        }

        public async Task<Attachment?> CreateAsync(AttachmentCreateDTO dto)
        {
            var attachment = new Attachment
            {
                TicketId = dto.TicketId,
                Filename = dto.Filename,
                Filepath = dto.Filepath
            };
            _context.Attachments.Add(attachment);
            await _context.SaveChangesAsync();
            return attachment;
        }
    }
}
