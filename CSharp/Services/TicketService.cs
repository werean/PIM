// Equivalente a src/modules/tickets/ticket.service.ts
using CSharp.Entities;
using CSharp.DTOs;
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
            var tickets = await _context.Tickets.ToListAsync();
            return tickets.Select(t => new TicketListDTO
            {
                Id = t.Id,
                Title = t.Title,
                Urgency = (int)t.Urgency
            }).ToList();
        }

        public async Task<TicketDetailDTO?> GetByIdAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return null;
            return new TicketDetailDTO
            {
                Id = ticket.Id,
                Title = ticket.Title,
                TicketBody = ticket.TicketBody,
                Urgency = (int)ticket.Urgency
            };
        }

        public async Task<Ticket?> CreateAsync(TicketCreateDTO dto, Guid userId)
        {
            var ticket = new Ticket
            {
                Title = dto.Title,
                TicketBody = dto.TicketBody,
                Urgency = (Urgency)dto.Urgency,
                UserId = userId
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
    }
}
