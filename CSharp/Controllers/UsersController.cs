// Equivalente a src/modules/users/user.controller.ts
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using CSharp.Entities;
using Microsoft.AspNetCore.Authorization;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("users")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _service;
        public UsersController(UserService service) => _service = service;

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<List<UserListDTO>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<UserDetailDTO>> GetById(Guid id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPost]
        public async Task<ActionResult<User>> Create(UserCreateDTO dto)
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
                if (dto.Password.Length < 6)
                {
                    return BadRequest(new { message = "Senha deve ter no mínimo 6 caracteres" });
                }

                if (dto.Username.Length < 3)
                {
                    return BadRequest(new { message = "Nome de usuário deve ter no mínimo 3 caracteres" });
                }

                // Validar role (apenas valores válidos: 5-Usuário, 10-Técnico)
                if (dto.Role != 5 && dto.Role != 10)
                {
                    return BadRequest(new { message = "Tipo de usuário inválido" });
                }

                var user = await _service.CreateAsync(dto);
                
                if (user == null)
                {
                    return BadRequest(new { message = "Não foi possível criar usuário. Email pode já estar em uso." });
                }

                return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao criar usuário", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(Guid id, UserUpdateDTO dto)
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

                if (dto.Username != null && dto.Username.Length < 3)
                {
                    return BadRequest(new { message = "Nome de usuário deve ter no mínimo 3 caracteres" });
                }

                var ok = await _service.UpdateAsync(id, dto);
                if (!ok) return NotFound(new { message = "Usuário não encontrado" });
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao atualizar usuário", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(Guid id)
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
