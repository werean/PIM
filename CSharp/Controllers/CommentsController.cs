// Equivalente à lógica de /comments
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("comments")]
    public class CommentsController : ControllerBase
    {
        private readonly CommentService _service;
        public CommentsController(CommentService service) => _service = service;

        [HttpGet("ticket/{ticketId}")]
        [Authorize]
        public async Task<ActionResult<List<CommentListDTO>>> GetByTicket(int ticketId)
            => Ok(await _service.GetByTicketAsync(ticketId));

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> Create(CommentCreateDTO dto)
        {
            var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? "");
            var comment = await _service.CreateAsync(dto, userId);
            return CreatedAtAction(nameof(GetByTicket), new { ticketId = comment!.TicketId }, comment);
        }
    }
}
