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
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<TicketDetailDTO>> GetById(int id)
        {
            var ticket = await _service.GetByIdAsync(id);
            if (ticket == null) return NotFound();
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
    }
}
