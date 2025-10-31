// Equivalente à lógica de /attachments
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("attachments")]
    public class AttachmentsController : ControllerBase
    {
        private readonly AttachmentService _service;
        public AttachmentsController(AttachmentService service) => _service = service;

        [HttpGet("ticket/{ticketId}")]
        [Authorize]
        public async Task<ActionResult<List<AttachmentListDTO>>> GetByTicket(int ticketId)
            => Ok(await _service.GetByTicketAsync(ticketId));

        [HttpPost]
        [Authorize]
        public async Task<ActionResult> Create(AttachmentCreateDTO dto)
        {
            var attachment = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetByTicket), new { ticketId = attachment!.TicketId }, attachment);
        }
    }
}
