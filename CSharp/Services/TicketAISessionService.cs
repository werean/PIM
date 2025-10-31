using CSharp.Data;
using CSharp.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace CSharp.Services
{
    public class TicketAISessionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TicketAISessionService> _logger;

        public TicketAISessionService(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<TicketAISessionService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Obtém uma sessão existente de IA para um ticket
        /// </summary>
        public async Task<TicketAISession?> GetSessionByTicketIdAsync(int ticketId)
        {
            return await _context.TicketAISessions
                .FirstOrDefaultAsync(s => s.TicketId == ticketId);
        }

        /// <summary>
        /// Cria uma nova sessão de IA para um ticket
        /// </summary>
        public async Task<TicketAISession> CreateSessionAsync(int ticketId, string prompt)
        {
            var session = new TicketAISession
            {
                TicketId = ticketId,
                Prompt = prompt,
                CreatedAt = DateTime.UtcNow
            };

            _context.TicketAISessions.Add(session);
            await _context.SaveChangesAsync();

            return session;
        }

        /// <summary>
        /// Obtém ou cria uma sessão de IA para um ticket
        /// </summary>
        public async Task<TicketAISession> GetOrCreateSessionAsync(int ticketId, string prompt)
        {
            var existingSession = await GetSessionByTicketIdAsync(ticketId);

            if (existingSession != null)
            {
                return existingSession;
            }

            return await CreateSessionAsync(ticketId, prompt);
        }

        /// <summary>
        /// Envia o prompt para o Ollama e retorna a resposta em streaming
        /// </summary>
        public async Task ProcessAIRequestAsync(
            int ticketId,
            string prompt,
            Func<string, Task> onChunkReceived,
            Func<Task> onComplete)
        {
            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    _logger.LogError("OLLAMA_SERVER não configurado");
                    await onChunkReceived("Erro: Servidor Ollama não configurado");
                    return;
                }

                var requestBody = new
                {
                    model = "qwen3:0.6b",
                    prompt = prompt,
                    stream = true
                };

                var client = _httpClientFactory.CreateClient();
                var content = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json");

                using var response = await client.PostAsync(ollamaServer, content);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Erro ao conectar ao Ollama: {response.StatusCode}");
                    await onChunkReceived($"Erro ao conectar ao Ollama: {response.StatusCode}");
                    return;
                }

                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);

                var fullResponse = new StringBuilder();
                string? line;

                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    try
                    {
                        using var doc = JsonDocument.Parse(line);
                        var root = doc.RootElement;

                        if (root.TryGetProperty("response", out var responseProperty))
                        {
                            var responseText = responseProperty.GetString() ?? "";
                            
                            // Apenas enviar se o chunk não estiver vazio
                            if (!string.IsNullOrEmpty(responseText))
                            {
                                fullResponse.Append(responseText);
                                
                                // Enviar chunk e aguardar um pouco para simular streaming
                                await onChunkReceived(responseText);
                                await Task.Delay(10); // 10ms de delay entre chunks
                            }
                        }

                        if (root.TryGetProperty("done", out var doneProperty) && doneProperty.GetBoolean())
                        {
                            await onChunkReceived("[FIM]");
                            await UpdateSessionResponseAsync(ticketId, fullResponse.ToString());
                        }
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning($"Erro ao parsear JSON do Ollama: {ex.Message}");
                    }
                }

                await onComplete();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao processar requisição de IA: {ex.Message}");
                await onChunkReceived($"Erro ao processar requisição: {ex.Message}");
            }
        }

        /// <summary>
        /// Atualiza a resposta da IA para uma sessão
        /// </summary>
        private async Task UpdateSessionResponseAsync(int ticketId, string aiResponse)
        {
            var session = await GetSessionByTicketIdAsync(ticketId);
            if (session != null)
            {
                session.AiResponse = aiResponse;
                session.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
    }
}
