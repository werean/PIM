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
            // Recupera o userId do token JWT
            var claims = User.Claims.ToList();
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
            {
                // Debug: retornar os claims disponíveis
                return BadRequest(new { 
                    message = "User ID not found in token",
                    availableClaims = claims.Select(c => new { c.Type, c.Value }).ToList()
                });
            }
            
            if (!Guid.TryParse(userIdClaim, out var userId))
                return BadRequest(new { message = "Invalid user ID format" });
            
            var ticket = await _service.CreateAsync(dto, userId);
            return CreatedAtAction(nameof(GetById), new { id = ticket!.Id }, ticket);
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
            var userRoleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            // Apenas técnicos podem resolver tickets
            if (userRoleClaim != "10")
            {
                return Forbid();
            }
            
            var ok = await _service.ResolveTicketAsync(id, dto.ResolutionMessage);
            if (!ok) return NotFound();
            return Ok(new { message = "Ticket resolvido com sucesso" });
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
