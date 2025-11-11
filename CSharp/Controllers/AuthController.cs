// Equivalente a src/modules/auth/auth.controller.ts
using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authorization;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly UserService _userService;
        private readonly IConfiguration _config;

        public AuthController(AuthService authService, UserService userService, IConfiguration config)
        {
            _authService = authService;
            _userService = userService;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                // Validação de entrada
                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest(new { message = "Email é obrigatório" });
                }

                if (string.IsNullOrWhiteSpace(request.Password))
                {
                    return BadRequest(new { message = "Senha é obrigatória" });
                }

                if (!IsValidEmail(request.Email))
                {
                    return BadRequest(new { message = "Email inválido" });
                }

                if (request.Password.Length < 6)
                {
                    return BadRequest(new { message = "Senha deve ter no mínimo 6 caracteres" });
                }

                var user = await _authService.ValidateUserAsync(request.Email, request.Password);
                if (user == null)
                {
                    return Unauthorized(new { message = "Email ou senha incorretos" });
                }

                var token = _authService.GenerateJwtToken(user);

                // Armazenar o token nos cookies
                Response.Cookies.Append("AuthToken", token, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false, // false para desenvolvimento local sem HTTPS
                    SameSite = SameSiteMode.Lax
                });

                return Ok(new { 
                    message = "Login realizado com sucesso",
                    token = token,
                    user = new {
                        id = user.Id,
                        username = user.Username,
                        email = user.Email,
                        role = user.Role
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erro ao processar login", error = ex.Message });
            }
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // Remover o cookie de autenticação
            Response.Cookies.Delete("AuthToken");
            return Ok(new { message = "Logout successful" });
        }

        // Refresh e logout podem ser implementados conforme necessidade
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
