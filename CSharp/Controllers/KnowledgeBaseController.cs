using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CSharp.Data;
using CSharp.DTOs;
using CSharp.Entities;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Requer autenticação
    public class KnowledgeBaseController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<KnowledgeBaseController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public KnowledgeBaseController(
            ApplicationDbContext context, 
            ILogger<KnowledgeBaseController> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
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
        /// POST /api/knowledgebase/generate-from-ticket - Gera um artigo a partir de um ticket usando IA
        /// </summary>
        [HttpPost("generate-from-ticket")]
        public async Task<ActionResult<GeneratedArticleDto>> GenerateFromTicket([FromBody] GenerateArticleFromTicketDto dto)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                
                // Apenas técnicos podem gerar artigos
                if (userRoleClaim != "10")
                    return Forbid();

                // Buscar o ticket
                var ticket = await _context.Tickets.FindAsync(dto.TicketId);
                if (ticket == null)
                    return NotFound(new { error = "Ticket não encontrado" });

                // Verificar se o ticket está fechado e tem solução
                if (ticket.Status != TicketStatus.Resolved)
                    return BadRequest(new { error = "Apenas tickets resolvidos podem gerar artigos" });

                if (string.IsNullOrWhiteSpace(ticket.ResolutionMessage))
                    return BadRequest(new { error = "O ticket não possui uma solução registrada" });

                // Montar o prompt para a IA
                var prompt = $@"Você é responsável por transformar soluções de tickets de suporte técnico em artigos para a base de conhecimento de uma empresa.

A seguir estão as informações do ticket encerrado:

Título: {ticket.Title}
Descrição: {ticket.TicketBody}
Solução: {ticket.ResolutionMessage}

Com base nesses dados, gere:
1. Um título claro e conciso para o artigo.
2. Um conteúdo completo em formato de artigo técnico, com linguagem objetiva e estruturada.

O conteúdo deve:
- Explicar o problema enfrentado.
- Descrever o procedimento de solução adotado.
- Apontar boas práticas ou observações que possam ajudar outros técnicos ou usuários em casos semelhantes.
- Evitar menções a pessoas, datas ou IDs específicos.

Responda no seguinte formato:
Título: [título gerado]
Conteúdo: [conteúdo gerado]";

                // Chamar a IA (Ollama)
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER")
                    ?? "http://localhost:11434/api/chat";

                using var httpClient = _httpClientFactory.CreateClient();

                var requestBody = new
                {
                    model = "qwen3-coder:480b-cloud",
                    messages = new[]
                    {
                        new { role = "user", content = prompt }
                    },
                    stream = false,
                    options = new
                    {
                        temperature = 0.7,
                        top_p = 0.9,
                        num_predict = 2048
                    }
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await httpClient.PostAsync(ollamaServer, content);
                response.EnsureSuccessStatusCode();

                var responseText = await response.Content.ReadAsStringAsync();
                var responseDoc = JsonDocument.Parse(responseText);
                var aiResponse = responseDoc.RootElement.GetProperty("message").GetProperty("content").GetString() ?? "";

                // Parsear a resposta da IA
                var titleMatch = Regex.Match(aiResponse, @"Título:\s*(.+?)(?:\n|$)", RegexOptions.IgnoreCase);
                var contentMatch = Regex.Match(aiResponse, @"Conteúdo:\s*(.+)", RegexOptions.IgnoreCase | RegexOptions.Singleline);

                var generatedTitle = titleMatch.Success 
                    ? titleMatch.Groups[1].Value.Trim() 
                    : ticket.Title;

                var generatedContent = contentMatch.Success 
                    ? contentMatch.Groups[1].Value.Trim() 
                    : aiResponse;

                return Ok(new GeneratedArticleDto
                {
                    Title = generatedTitle,
                    Content = generatedContent
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao gerar artigo do ticket {dto.TicketId}: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao gerar artigo com IA" });
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
