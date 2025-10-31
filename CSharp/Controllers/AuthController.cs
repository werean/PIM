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
            var user = await _authService.ValidateUserAsync(request.Email, request.Password);
            if (user == null) return Unauthorized();

            var token = _authService.GenerateJwtToken(user);

            // Armazenar o token nos cookies
            Response.Cookies.Append("AuthToken", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Certifique-se de usar HTTPS em produção
                SameSite = SameSiteMode.Strict
            });

            return Ok(new { message = "Login successful" });
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
