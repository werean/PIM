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
                .Where(t => !t.IsDeleted) // Não incluir tickets deletados
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

        public async Task<List<TicketListDTO>> GetDeletedAsync()
        {
            var tickets = await _context.Tickets
                .Include(t => t.User)
                .Where(t => t.IsDeleted) // Apenas tickets deletados
                .ToListAsync();
            return tickets.Select(t => new TicketListDTO
            {
                Id = t.Id,
                Title = t.Title,
                Urgency = (int)t.Urgency,
                Status = (int)t.Status,
                CreatedAt = t.CreatedAt,
                DeletedAt = t.DeletedAt,
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

            // Buscar nome do usuário que editou
            string? editedByUsername = null;
            if (ticket.EditedBy.HasValue)
            {
                var editor = await _context.Users.FindAsync(ticket.EditedBy.Value);
                editedByUsername = editor?.Username;
            }

            return new TicketDetailDTO
            {
                Id = ticket.Id,
                Title = ticket.Title,
                TicketBody = ticket.TicketBody,
                Urgency = (int)ticket.Urgency,
                Status = (int)ticket.Status,
                ResolutionMessage = ticket.ResolutionMessage,
                ResolutionApproved = ticket.ResolutionApproved,
                ReopenedAt = ticket.ReopenedAt,
                PendingDeletion = ticket.PendingDeletion,
                DeletionRequestedBy = ticket.DeletionRequestedBy,
                DeletionRequestedAt = ticket.DeletionRequestedAt,
                IsDeleted = ticket.IsDeleted,
                DeletedAt = ticket.DeletedAt,
                EditedAt = ticket.EditedAt,
                EditedBy = ticket.EditedBy,
                EditedByUsername = editedByUsername,
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
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            // Quando técnico resolve, fica aguardando aprovação do usuário
            ticket.Status = TicketStatus.PendingApproval;
            ticket.ResolutionMessage = resolutionMessage;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetPendingAsync(int id)
        {
            return await SetStatusAsync(id, TicketStatus.Pending);
        }

        public async Task<bool> ReopenTicketAsync(int id)
        {
            return await SetStatusAsync(id, TicketStatus.Open);
        }

        public async Task<bool> ApproveResolutionAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.Status = TicketStatus.Resolved;
            ticket.ResolutionApproved = true;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectResolutionAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.Status = TicketStatus.Reopened;
            ticket.ResolutionApproved = false;
            ticket.ReopenedAt = DateTimeHelper.GetBrasiliaTime();
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SoftDeleteAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.IsDeleted = true;
            ticket.DeletedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.IsDeleted = false;
            ticket.DeletedAt = null;
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateDescriptionAsync(int id, string newDescription, Guid editedBy)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.TicketBody = newDescription;
            ticket.EditedAt = DateTimeHelper.GetBrasiliaTime();
            ticket.EditedBy = editedBy;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        // Métodos de solicitação de exclusão
        public async Task<bool> RequestDeletionAsync(int id, Guid technicianId)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.PendingDeletion = true;
            ticket.DeletionRequestedBy = technicianId;
            ticket.DeletionRequestedAt = DateTimeHelper.GetBrasiliaTime();
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveDeletionAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.IsDeleted = true;
            ticket.DeletedAt = DateTimeHelper.GetBrasiliaTime();
            ticket.PendingDeletion = false;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectDeletionAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            ticket.PendingDeletion = false;
            ticket.DeletionRequestedBy = null;
            ticket.DeletionRequestedAt = null;
            ticket.UpdatedAt = DateTimeHelper.GetBrasiliaTime();
            
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> PermanentDeleteAsync(int id)
        {
            var ticket = await _context.Tickets.FindAsync(id);
            if (ticket == null) return false;
            
            // Só permite deletar permanentemente se já estiver na lixeira
            if (!ticket.IsDeleted) return false;
            
            _context.Tickets.Remove(ticket);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
