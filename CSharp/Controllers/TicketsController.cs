// Equivalente a src/modules/tickets/ticket.controller.ts
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using CSharp.Entities;
using Microsoft.AspNetCore.Authorization;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("tickets")]
    public class TicketsController : ControllerBase
    {
        private readonly TicketService _service;
        public TicketsController(TicketService service) => _service = service;

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<List<TicketListDTO>>> GetAll()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;
            var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized();
            
            if (!Guid.TryParse(userIdClaim, out var userId))
                return BadRequest(new { message = "Invalid user ID format" });
            
            // Se o usuário for técnico (role 10), pode ver todos os tickets
            if (userRoleClaim == "10")
            {
                return Ok(await _service.GetAllAsync());
            }
            
            // Se for usuário comum (role 5), só pode ver seus próprios tickets
            return Ok(await _service.GetUserTicketsAsync(userId));
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<TicketDetailDTO>> GetById(int id)
        {
            var ticket = await _service.GetByIdAsync(id);
            if (ticket == null) return NotFound();
            
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;
            var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized();
            
            if (!Guid.TryParse(userIdClaim, out var userId))
                return BadRequest(new { message = "Invalid user ID format" });
            
            // Técnico pode ver qualquer ticket, usuário só pode ver seus próprios
            if (userRoleClaim != "10" && ticket.UserId != userId)
            {
                return Forbid();
            }
            
            return Ok(ticket);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Ticket>> Create(TicketCreateDTO dto)
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
                if (string.IsNullOrWhiteSpace(dto.Title))
                {
                    return BadRequest(new { message = "Título é obrigatório" });
                }

                if (string.IsNullOrWhiteSpace(dto.TicketBody))
                {
                    return BadRequest(new { message = "Descrição é obrigatória" });
                }

                if (dto.Title.Length < 5)
                {
                    return BadRequest(new { message = "Título deve ter no mínimo 5 caracteres" });
                }

                if (dto.TicketBody.Length < 10)
                {
                    return BadRequest(new { message = "Descrição deve ter no mínimo 10 caracteres" });
                }

                // Validar urgência (1-Baixa, 2-Média, 3-Alta, 4-Crítica)
                if (dto.Urgency < 1 || dto.Urgency > 4)
                {
                    return BadRequest(new { message = "Nível de urgência inválido" });
                }

                // Recupera o userId do token JWT
                var claims = User.Claims.ToList();
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized(new { message = "Usuário não autenticado" });
                }
                
                if (!Guid.TryParse(userIdClaim, out var userId))
                {
                    return BadRequest(new { message = "ID de usuário inválido" });
                }
                
                var ticket = await _service.CreateAsync(dto, userId);
                
                if (ticket == null)
                {
                    return BadRequest(new { message = "Não foi possível criar o ticket" });
                }

                return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, ticket);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao criar ticket", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, TicketUpdateDTO dto)
        {
            var ok = await _service.UpdateAsync(id, dto);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/resolve")]
        [Authorize]
        public async Task<IActionResult> ResolveTicket(int id, [FromBody] ResolveTicketDTO dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();
                    return BadRequest(new { message = "Dados inválidos", errors });
                }

                if (string.IsNullOrWhiteSpace(dto.ResolutionMessage))
                {
                    return BadRequest(new { message = "Mensagem de resolução é obrigatória" });
                }

                if (dto.ResolutionMessage.Length < 10)
                {
                    return BadRequest(new { message = "Mensagem de resolução deve ter no mínimo 10 caracteres" });
                }

                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem resolver tickets
                if (userRoleClaim != "10")
                {
                    return Forbid();
                }
                
                var ok = await _service.ResolveTicketAsync(id, dto.ResolutionMessage);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket resolvido com sucesso" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao resolver ticket", error = ex.Message });
            }
        }

        [HttpPost("{id}/pending")]
        [Authorize]
        public async Task<IActionResult> SetPending(int id)
        {
            var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            // Apenas técnicos podem marcar como pendente
            if (userRoleClaim != "10")
            {
                return Forbid();
            }
            
            var ok = await _service.SetPendingAsync(id);
            if (!ok) return NotFound();
            return Ok(new { message = "Ticket marcado como pendente" });
        }
    }
}
