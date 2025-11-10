// Equivalente a src/modules/tickets/ticket.service.ts
using CSharp.Entities;
using CSharp.DTOs;
using CSharp.Helpers;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;

namespace CSharp.Services
{
    public class TicketService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TicketService> _logger;

        public TicketService(ApplicationDbContext context, ILogger<TicketService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<TicketListDTO>> GetAllAsync()
        {
            var tickets = await _context.Tickets
                .Include(t => t.User)
                .ToListAsync();
            return tickets.Select(t => new TicketListDTO
            {
                Id = t.Id,
                Title = t.Title,
                Urgency = (int)t.Urgency,
                Status = (int)t.Status,
                CreatedAt = t.CreatedAt,
                UserId = t.UserId,
                Username = t.User?.Username
            }).ToList();
        }

        public async Task<List<TicketListDTO>> GetUserTicketsAsync(Guid userId)
        {
            var tickets = await _context.Tickets
                .Include(t => t.User)
                .Where(t => t.UserId == userId)
                .ToListAsync();
            return tickets.Select(t => new TicketListDTO
            {
                Id = t.Id,
                Title = t.Title,
                Urgency = (int)t.Urgency,
                Status = (int)t.Status,
                CreatedAt = t.CreatedAt,
                UserId = t.UserId,
                Username = t.User?.Username
            }).ToList();
        }

        public async Task<TicketDetailDTO?> GetByIdAsync(int id)
        {
            var ticket = await _context.Tickets
                .Include(t => t.User)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.User)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (ticket == null) return null;
            return new TicketDetailDTO
            {
                Id = ticket.Id,
                Title = ticket.Title,
                TicketBody = ticket.TicketBody,
                Urgency = (int)ticket.Urgency,
                Status = (int)ticket.Status,
                ResolutionMessage = ticket.ResolutionMessage,
                CreatedAt = ticket.CreatedAt,
                UpdatedAt = ticket.UpdatedAt,
                UserId = ticket.UserId,
                Username = ticket.User?.Username,
                Comments = ticket.Comments?
                    .OrderBy(c => c.CreatedAt)
                    .Select(c => new CommentListDTO
                    {
                        Id = c.Id,
                        TicketId = c.TicketId,
                        CommentBody = c.CommentBody,
                        CreatedAt = c.CreatedAt,
                        UserId = c.UserId,
                        Username = c.User?.Username ?? "Desconhecido"
                    }).ToList()
            };
        }

        public async Task<Ticket?> CreateAsync(TicketCreateDTO dto, Guid userId)
        {
            var now = DateTimeHelper.GetBrasiliaTime();
            var ticket = new Ticket
            {
                Title = dto.Title,
                TicketBody = dto.TicketBody,
                Urgency = (Urgency)dto.Urgency,
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();
            return ticket;
        }

        public async Task<bool> UpdateAsync(int id, TicketUpdateDTO dto)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            if (!string.IsNullOrEmpty(dto.Title)) ticket.Title = dto.Title;
            if (!string.IsNullOrEmpty(dto.TicketBody)) ticket.TicketBody = dto.TicketBody;
            if (dto.Urgency.HasValue) ticket.Urgency = (Urgency)dto.Urgency.Value;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetStatusAsync(int id, TicketStatus status, string? resolutionMessage = null)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.Status = status;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            if (status == TicketStatus.Resolved && !string.IsNullOrEmpty(resolutionMessage))
            {
                ticket.ResolutionMessage = resolutionMessage;
            }
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ResolveTicketAsync(int id, string resolutionMessage)
        {
            return await SetStatusAsync(id, TicketStatus.Resolved, resolutionMessage);
        }

        public async Task<bool> SetPendingAsync(int id)
        {
            return await SetStatusAsync(id, TicketStatus.Pending);
        }
    }
}
