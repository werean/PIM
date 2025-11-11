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
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem marcar como pendente
                if (userRoleClaim != "10")
                {
                    return Forbid();
                }
                
                var ok = await _service.SetPendingAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket marcado como pendente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao marcar ticket como pendente", error = ex.Message });
            }
        }

        [HttpPost("{id}/reopen")]
        [Authorize]
        public async Task<IActionResult> ReopenTicket(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem reabrir tickets
                if (userRoleClaim != "10")
                {
                    return Forbid();
                }
                
                var ok = await _service.ReopenTicketAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket reaberto com sucesso" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao reabrir ticket", error = ex.Message });
            }
        }

        [HttpPost("{id}/approve-resolution")]
        [Authorize]
        public async Task<IActionResult> ApproveResolution(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();

                // Verificar se o usuário é o dono do ticket
                var ticket = await _service.GetByIdAsync(id);
                if (ticket == null) return NotFound(new { message = "Ticket não encontrado" });
                
                if (ticket.UserId != userId)
                    return Forbid();
                
                var ok = await _service.ApproveResolutionAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Solução aprovada com sucesso" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao aprovar solução", error = ex.Message });
            }
        }

        [HttpPost("{id}/reject-resolution")]
        [Authorize]
        public async Task<IActionResult> RejectResolution(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();

                // Verificar se o usuário é o dono do ticket
                var ticket = await _service.GetByIdAsync(id);
                if (ticket == null) return NotFound(new { message = "Ticket não encontrado" });
                
                if (ticket.UserId != userId)
                    return Forbid();
                
                var ok = await _service.RejectResolutionAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Solução rejeitada, ticket reaberto" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao rejeitar solução", error = ex.Message });
            }
        }

        [HttpDelete("{id}/soft-delete")]
        [Authorize]
        public async Task<IActionResult> SoftDelete(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem deletar tickets
                if (userRoleClaim != "10")
                    return Forbid();
                
                var ok = await _service.SoftDeleteAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket movido para lixeira" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao deletar ticket", error = ex.Message });
            }
        }

        [HttpPost("{id}/restore")]
        [Authorize]
        public async Task<IActionResult> Restore(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem restaurar tickets
                if (userRoleClaim != "10")
                    return Forbid();
                
                var ok = await _service.RestoreAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket restaurado da lixeira" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao restaurar ticket", error = ex.Message });
            }
        }

        [HttpGet("deleted")]
        [Authorize]
        public async Task<ActionResult<List<TicketListDTO>>> GetDeleted()
        {
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem ver lixeira
                if (userRoleClaim != "10")
                    return Forbid();
                
                return Ok(await _service.GetDeletedAsync());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao buscar tickets deletados", error = ex.Message });
            }
        }

        [HttpPut("{id}/description")]
        [Authorize]
        public async Task<IActionResult> UpdateDescription(int id, [FromBody] UpdateDescriptionDTO dto)
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

                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();

                // Verificar se o usuário é o dono do ticket
                var ticket = await _service.GetByIdAsync(id);
                if (ticket == null) return NotFound(new { message = "Ticket não encontrado" });
                
                if (ticket.UserId != userId)
                    return Forbid();
                
                var ok = await _service.UpdateDescriptionAsync(id, dto.TicketBody, userId);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Descrição atualizada com sucesso" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao atualizar descrição", error = ex.Message });
            }
        }

        // Endpoints de solicitação de exclusão
        [HttpPost("{id}/request-deletion")]
        [Authorize]
        public async Task<IActionResult> RequestDeletion(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();
                
                // Apenas técnicos podem solicitar exclusão
                if (userRoleClaim != "10")
                    return Forbid();
                
                var ok = await _service.RequestDeletionAsync(id, userId);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Solicitação de exclusão enviada ao usuário" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao solicitar exclusão", error = ex.Message });
            }
        }

        [HttpPost("{id}/approve-deletion")]
        [Authorize]
        public async Task<IActionResult> ApproveDeletion(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();
                
                // Verificar se o usuário é o dono do ticket
                var ticket = await _service.GetByIdAsync(id);
                if (ticket == null) return NotFound(new { message = "Ticket não encontrado" });
                
                if (ticket.UserId != userId)
                    return Forbid();
                
                var ok = await _service.ApproveDeletionAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Ticket movido para lixeira" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao aprovar exclusão", error = ex.Message });
            }
        }

        [HttpPost("{id}/reject-deletion")]
        [Authorize]
        public async Task<IActionResult> RejectDeletion(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("sub")?.Value;
                
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized();
                
                // Verificar se o usuário é o dono do ticket
                var ticket = await _service.GetByIdAsync(id);
                if (ticket == null) return NotFound(new { message = "Ticket não encontrado" });
                
                if (ticket.UserId != userId)
                    return Forbid();
                
                var ok = await _service.RejectDeletionAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado" });
                return Ok(new { message = "Solicitação de exclusão rejeitada" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao rejeitar exclusão", error = ex.Message });
            }
        }

        [HttpDelete("{id}/permanent-delete")]
        [Authorize]
        public async Task<IActionResult> PermanentDelete(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem deletar permanentemente
                if (userRoleClaim != "10")
                    return Forbid();
                
                var ok = await _service.PermanentDeleteAsync(id);
                if (!ok) return NotFound(new { message = "Ticket não encontrado ou não está na lixeira" });
                return Ok(new { message = "Ticket deletado permanentemente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao deletar ticket permanentemente", error = ex.Message });
            }
        }
    }
}
