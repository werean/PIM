using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("api/tickets/{ticketId}/ai-messages")]
    [Authorize]
    public class AIMessagesController : ControllerBase
    {
        private readonly AIMessageService _service;
        private readonly ILogger<AIMessagesController> _logger;

        public AIMessagesController(AIMessageService service, ILogger<AIMessagesController> logger)
        {
            _service = service;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/tickets/{ticketId}/ai-messages
        /// Retorna histórico completo de mensagens da IA
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<AIMessageDTO>>> GetHistory(int ticketId)
        {
            try
            {
                var messages = await _service.GetByTicketIdAsync(ticketId);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar histórico de IA do ticket #{ticketId}");
                return StatusCode(500, "Erro ao buscar histórico");
            }
        }

        /// <summary>
        /// GET /api/tickets/{ticketId}/ai-messages/recent?limit=50
        /// Retorna últimas N mensagens (otimizado para performance)
        /// </summary>
        [HttpGet("recent")]
        public async Task<ActionResult<List<AIMessageDTO>>> GetRecent(int ticketId, [FromQuery] int limit = 50)
        {
            try
            {
                if (limit > 100) limit = 100; // Limita máximo para evitar sobrecarga
                
                var messages = await _service.GetRecentMessagesAsync(ticketId, limit);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao buscar mensagens recentes do ticket #{ticketId}");
                return StatusCode(500, "Erro ao buscar mensagens");
            }
        }

        /// <summary>
        /// POST /api/tickets/{ticketId}/ai-messages
        /// Salva nova mensagem (user ou assistant)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<AIMessageDTO>> Create(int ticketId, [FromBody] AIMessageCreateDTO dto)
        {
            try
            {
                // Garantir que o ticketId da rota seja usado
                dto.TicketId = ticketId;

                // Pegar UserId do token JWT (se for mensagem do usuário)
                Guid? userId = null;
                if (dto.Role == "user")
                {
                    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (userIdClaim != null)
                    {
                        userId = Guid.Parse(userIdClaim);
                    }
                }

                var message = await _service.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetHistory), new { ticketId }, message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao salvar mensagem de IA no ticket #{ticketId}");
                return StatusCode(500, "Erro ao salvar mensagem");
            }
        }

        /// <summary>
        /// POST /api/tickets/{ticketId}/ai-messages/clear
        /// Limpa histórico de conversa antes de salvar nova
        /// </summary>
        [HttpPost("clear")]
        public async Task<ActionResult> ClearHistoryPost(int ticketId)
        {
            try
            {
                await _service.ClearHistoryAsync(ticketId);
                return Ok(new { message = "Histórico limpo" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao limpar histórico de IA do ticket #{ticketId}");
                return StatusCode(500, "Erro ao limpar histórico");
            }
        }

        /// <summary>
        /// DELETE /api/tickets/{ticketId}/ai-messages
        /// Limpa histórico de conversa (opcional)
        /// </summary>
        [HttpDelete]
        public async Task<ActionResult> ClearHistory(int ticketId)
        {
            try
            {
                var cleared = await _service.ClearHistoryAsync(ticketId);
                if (cleared)
                {
                    return Ok(new { message = "Histórico limpo com sucesso" });
                }
                return NotFound(new { message = "Nenhuma mensagem encontrada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erro ao limpar histórico de IA do ticket #{ticketId}");
                return StatusCode(500, "Erro ao limpar histórico");
            }
        }
    }
}
