using CSharp.Entities;
using CSharp.DTOs;
using CSharp.Helpers;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;

namespace CSharp.Services
{
    public class AIMessageService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AIMessageService> _logger;

        public AIMessageService(ApplicationDbContext context, ILogger<AIMessageService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Busca histórico de mensagens de IA por ticket
        /// Otimizado: AsNoTracking para leitura rápida + ordenação no banco
        /// </summary>
        public async Task<List<AIMessageDTO>> GetByTicketIdAsync(int ticketId)
        {
            var messages = await _context.AIMessages
                .AsNoTracking() // Performance: não rastreia mudanças
                .Include(m => m.User)
                .Where(m => m.TicketId == ticketId)
                .OrderBy(m => m.CreatedAt) // Ordenação no banco (mais rápido)
                .Select(m => new AIMessageDTO
                {
                    Id = m.Id,
                    TicketId = m.TicketId,
                    Role = m.Role,
                    Content = m.Content,
                    CreatedAt = m.CreatedAt,
                    UserId = m.UserId,
                    Username = m.User != null ? m.User.Username : null
                })
                .ToListAsync();

            _logger.LogInformation($"[AI_HISTORY] Carregadas {messages.Count} mensagens do ticket #{ticketId}");
            return messages;
        }

        /// <summary>
        /// Cria nova mensagem (usuário ou assistente)
        /// Otimizado: SaveChangesAsync apenas uma vez
        /// </summary>
        public async Task<AIMessageDTO> CreateAsync(AIMessageCreateDTO dto, Guid? userId = null)
        {
            var message = new AIMessage
            {
                TicketId = dto.TicketId,
                Role = dto.Role,
                Content = dto.Content,
                CreatedAt = DateTimeHelper.GetBrasiliaTime(),
                UserId = dto.Role == "user" ? userId : null
            };

            _context.AIMessages.Add(message);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"[AI_MESSAGE] Nova mensagem salva: Ticket #{dto.TicketId}, Role: {dto.Role}");

            return new AIMessageDTO
            {
                Id = message.Id,
                TicketId = message.TicketId,
                Role = message.Role,
                Content = message.Content,
                CreatedAt = message.CreatedAt,
                UserId = message.UserId
            };
        }

        /// <summary>
        /// Limpa histórico de conversa de um ticket (opcional)
        /// </summary>
        public async Task<bool> ClearHistoryAsync(int ticketId)
        {
            var messages = await _context.AIMessages
                .Where(m => m.TicketId == ticketId)
                .ToListAsync();

            if (messages.Any())
            {
                _context.AIMessages.RemoveRange(messages);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"[AI_HISTORY] Histórico limpo: {messages.Count} mensagens do ticket #{ticketId}");
                return true;
            }

            return false;
        }

        /// <summary>
        /// Busca últimas N mensagens (para otimizar carregamento)
        /// </summary>
        public async Task<List<AIMessageDTO>> GetRecentMessagesAsync(int ticketId, int limit = 50)
        {
            var messages = await _context.AIMessages
                .AsNoTracking()
                .Include(m => m.User)
                .Where(m => m.TicketId == ticketId)
                .OrderByDescending(m => m.CreatedAt) // Mais recentes primeiro
                .Take(limit)
                .Select(m => new AIMessageDTO
                {
                    Id = m.Id,
                    TicketId = m.TicketId,
                    Role = m.Role,
                    Content = m.Content,
                    CreatedAt = m.CreatedAt,
                    UserId = m.UserId,
                    Username = m.User != null ? m.User.Username : null
                })
                .ToListAsync();

            messages.Reverse(); // Inverte para ordem cronológica
            return messages;
        }
    }
}
