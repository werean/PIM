// Equivalente à lógica de /comments
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("comments")]
    public class CommentsController : ControllerBase
    {
        private readonly CommentService _service;
        private readonly TicketNotificationService _notificationService;
        
        public CommentsController(CommentService service, TicketNotificationService notificationService)
        {
            _service = service;
            _notificationService = notificationService;
        }

        [HttpGet("ticket/{ticketId}")]
        [Authorize]
        public async Task<ActionResult<List<CommentListDTO>>> GetByTicket(int ticketId)
            => Ok(await _service.GetByTicketAsync(ticketId));

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> Create(CommentCreateDTO dto)
        {
            try
            {
                // Validação do ModelState
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();
                    return BadRequest(new { message = "Dados inválidos", errors });
                }

                // Validações adicionais
                if (string.IsNullOrWhiteSpace(dto.CommentBody))
                {
                    return BadRequest(new { message = "Comentário não pode estar vazio" });
                }

                if (dto.CommentBody.Length < 3)
                {
                    return BadRequest(new { message = "Comentário deve ter no mínimo 3 caracteres" });
                }

                if (dto.TicketId <= 0)
                {
                    return BadRequest(new { message = "ID do ticket inválido" });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized(new { message = "Usuário não autenticado" });
                }

                if (!Guid.TryParse(userIdClaim, out var userId))
                {
                    return BadRequest(new { message = "ID de usuário inválido" });
                }

                var comment = await _service.CreateAsync(dto, userId);
                
                if (comment == null)
                {
                    return BadRequest(new { message = "Não foi possível criar o comentário" });
                }

                // Buscar o username para o DTO
                var user = await _service.GetUserById(userId);
                var commentDto = new CommentListDTO
                {
                    Id = comment.Id,
                    TicketId = comment.TicketId,
                    CommentBody = comment.CommentBody,
                    CreatedAt = comment.CreatedAt,
                    UserId = comment.UserId,
                    Username = user?.Username ?? "Usuário"
                };

                // Notificar clientes conectados via WebSocket
                await _notificationService.NotifyNewComment(dto.TicketId, commentDto);

                // Retornar OK com o comentário (evita redirects do CreatedAtAction)
                return Ok(commentDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao criar comentário", error = ex.Message });
            }
        }
    }
}
