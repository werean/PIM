using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;
using CSharp.DTOs;
using CSharp.Entities;
using System.Security.Claims;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requer autenticação
    public class KnowledgeBaseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<KnowledgeBaseController> _logger;

        public KnowledgeBaseController(ApplicationDbContext context, ILogger<KnowledgeBaseController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// GET /api/knowledgebase - Lista todos os artigos (apenas técnicos)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<KnowledgeBaseArticleListDto>>> GetAll()
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos (role 10) podem acessar
                if (userRoleClaim != "10")
                    return Forbid();

                var articles = await _context.KnowledgeBaseArticles
                    .Include(a => a.CreatedByUser)
                    .OrderByDescending(a => a.UpdatedAt)
                    .Select(a => new KnowledgeBaseArticleListDto
                    {
                        Id = a.Id,
                        Title = a.Title,
                        CreatedByName = a.CreatedByUser != null ? a.CreatedByUser.Username : "Usuário Desconhecido",
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt
                    })
                    .ToListAsync();

                return Ok(articles);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao listar artigos: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao listar artigos" });
            }
        }

        /// <summary>
        /// GET /api/knowledgebase/{id} - Obtém um artigo específico (apenas técnicos)
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<KnowledgeBaseArticleDto>> GetById(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos (role 10) podem acessar
                if (userRoleClaim != "10")
                    return Forbid();

                var article = await _context.KnowledgeBaseArticles
                    .Include(a => a.CreatedByUser)
                    .Where(a => a.Id == id)
                    .Select(a => new KnowledgeBaseArticleDto
                    {
                        Id = a.Id,
                        Title = a.Title,
                        Body = a.Body,
                        CreatedBy = a.CreatedBy,
                        CreatedByName = a.CreatedByUser != null ? a.CreatedByUser.Username : "Usuário Desconhecido",
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (article == null)
                {
                    return NotFound(new { error = "Artigo não encontrado" });
                }

                return Ok(article);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao obter artigo {id}: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao obter artigo" });
            }
        }

        /// <summary>
        /// POST /api/knowledgebase - Cria um novo artigo (apenas técnicos)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<KnowledgeBaseArticleDto>> Create([FromBody] CreateKnowledgeBaseArticleDto dto)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos (role 10) podem criar artigos
                if (userRoleClaim != "10")
                    return Forbid();

                // Obter ID do usuário autenticado
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Usuário não autenticado" });
                }

                var article = new KnowledgeBaseArticle
                {
                    Title = dto.Title.Trim(),
                    Body = dto.Body.Trim(),
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.KnowledgeBaseArticles.Add(article);
                await _context.SaveChangesAsync();

                // Recarregar com o CreatedByUser para retornar o nome
                var createdArticle = await _context.KnowledgeBaseArticles
                    .Include(a => a.CreatedByUser)
                    .Where(a => a.Id == article.Id)
                    .Select(a => new KnowledgeBaseArticleDto
                    {
                        Id = a.Id,
                        Title = a.Title,
                        Body = a.Body,
                        CreatedBy = a.CreatedBy,
                        CreatedByName = a.CreatedByUser != null ? a.CreatedByUser.Username : "Usuário Desconhecido",
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                return CreatedAtAction(nameof(GetById), new { id = article.Id }, createdArticle);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao criar artigo: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao criar artigo" });
            }
        }

        /// <summary>
        /// PUT /api/knowledgebase/{id} - Atualiza um artigo existente (apenas técnicos)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<KnowledgeBaseArticleDto>> Update(int id, [FromBody] UpdateKnowledgeBaseArticleDto dto)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos (role 10) podem atualizar artigos
                if (userRoleClaim != "10")
                    return Forbid();

                var article = await _context.KnowledgeBaseArticles.FindAsync(id);

                if (article == null)
                {
                    return NotFound(new { error = "Artigo não encontrado" });
                }

                article.Title = dto.Title.Trim();
                article.Body = dto.Body.Trim();
                article.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Recarregar com o CreatedByUser
                var updatedArticle = await _context.KnowledgeBaseArticles
                    .Include(a => a.CreatedByUser)
                    .Where(a => a.Id == id)
                    .Select(a => new KnowledgeBaseArticleDto
                    {
                        Id = a.Id,
                        Title = a.Title,
                        Body = a.Body,
                        CreatedBy = a.CreatedBy,
                        CreatedByName = a.CreatedByUser != null ? a.CreatedByUser.Username : "Usuário Desconhecido",
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                return Ok(updatedArticle);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao atualizar artigo {id}: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao atualizar artigo" });
            }
        }

        /// <summary>
        /// DELETE /api/knowledgebase/{id} - Deleta um artigo (apenas técnicos)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos (role 10) podem deletar artigos
                if (userRoleClaim != "10")
                    return Forbid();

                var article = await _context.KnowledgeBaseArticles.FindAsync(id);

                if (article == null)
                {
                    return NotFound(new { error = "Artigo não encontrado" });
                }

                _context.KnowledgeBaseArticles.Remove(article);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Artigo excluído com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao deletar artigo {id}: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao deletar artigo" });
            }
        }
    }
}
