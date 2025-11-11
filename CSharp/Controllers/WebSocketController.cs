using Microsoft.AspNetCore.Mvc;
using CSharp.Services;
using CSharp.DTOs;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WebSocketController : ControllerBase
    {
        private readonly TicketAISessionService _aiSessionService;
        private readonly ILogger<WebSocketController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public WebSocketController(
            TicketAISessionService aiSessionService,
            ILogger<WebSocketController> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _aiSessionService = aiSessionService;
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Endpoint WebSocket para comunicação em tempo real com IA (vinculado a ticket)
        /// </summary>
        [HttpGet("chat/{ticketId}")]
        public async Task Get(int ticketId)
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await HandleWebSocketConnection(webSocket, ticketId);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }

        /// <summary>
        /// Endpoint WebSocket para consultas genéricas com IA (sem vinculação a ticket)
        /// </summary>
        [HttpGet("generic")]
        public async Task GetGeneric()
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await HandleGenericWebSocketConnection(webSocket);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }

        private async Task HandleWebSocketConnection(WebSocket webSocket, int ticketId)
        {
            var buffer = new byte[1024 * 4];
            
            try
            {
                while (webSocket.State == WebSocketState.Open)
                {
                    var receiveResult = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None);

                    if (receiveResult.CloseStatus.HasValue)
                    {
                        break;
                    }

                    if (receiveResult.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, receiveResult.Count);

                        try
                        {
                            // Parse da mensagem JSON
                            using var doc = JsonDocument.Parse(message);
                            var root = doc.RootElement;

                            if (root.TryGetProperty("ticketBody", out var ticketBodyProperty))
                            {
                                var ticketBody = ticketBodyProperty.GetString() ?? "";

                                // Verifica se já existe uma sessão para esse ticket
                                var existingSession = await _aiSessionService.GetSessionByTicketIdAsync(ticketId);

                                if (existingSession?.AiResponse != null)
                                {
                                    // Se já existe resposta, enviar a resposta anterior
                                    await SendWebSocketMessage(webSocket, new WebSocketResponseDto
                                    {
                                        Type = "cached",
                                        Response = existingSession.AiResponse,
                                        Message = "Resposta em cache - ticket já foi processado anteriormente"
                                    });
                                    await SendWebSocketMessage(webSocket, new WebSocketResponseDto { Type = "done" });
                                }
                                else
                                {
                                    // Criar nova sessão ou usar existente
                                    var session = await _aiSessionService.GetOrCreateSessionAsync(ticketId, ticketBody);

                                    // Processar requisição de IA
                                    await _aiSessionService.ProcessAIRequestAsync(
                                        ticketId,
                                        ticketBody,
                                        async (chunk) =>
                                        {
                                            if (chunk != "[FIM]" && webSocket.State == WebSocketState.Open)
                                            {
                                                await SendWebSocketMessage(webSocket, new WebSocketResponseDto
                                                {
                                                    Type = "stream",
                                                    Content = chunk
                                                });
                                            }
                                        },
                                        async () =>
                                        {
                                            if (webSocket.State == WebSocketState.Open)
                                            {
                                                await SendWebSocketMessage(webSocket, new WebSocketResponseDto { Type = "done" });
                                            }
                                        });
                                }
                            }
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogError($"Erro ao parsear JSON: {ex.Message}");
                            await SendWebSocketMessage(webSocket, new WebSocketResponseDto
                            {
                                Type = "error",
                                Message = "JSON inválido. Use: {\"ticketBody\":\"sua descrição\"}"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro geral WebSocket ticket {ticketId}: {ex.Message}");
            }
            finally
            {
                if (webSocket.State != WebSocketState.Closed)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Fechando",
                        CancellationToken.None);
                }
                webSocket.Dispose();
                _logger.LogInformation($"WebSocket fechado para ticket {ticketId}");
            }
        }

        private async Task HandleGenericWebSocketConnection(WebSocket webSocket)
        {
            var buffer = new byte[1024 * 4];
            
            try
            {
                while (webSocket.State == WebSocketState.Open)
                {
                    var receiveResult = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None);

                    if (receiveResult.CloseStatus.HasValue)
                    {
                        break;
                    }

                    if (receiveResult.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, receiveResult.Count);
                        string promptText = message;
                        string modelName = "qwen3:0.6b"; // modelo padrão

                        // Tentar parsear como JSON para extrair os campos "prompt" e "model"
                        try
                        {
                            using var doc = JsonDocument.Parse(message);
                            var root = doc.RootElement;
                            if (root.TryGetProperty("prompt", out var promptProperty))
                            {
                                promptText = promptProperty.GetString() ?? message;
                            }
                            if (root.TryGetProperty("model", out var modelProperty))
                            {
                                modelName = modelProperty.GetString() ?? modelName;
                            }
                        }
                        catch
                        {
                            // Se não for JSON válido, usa a mensagem como está
                            promptText = message;
                        }

                        try
                        {
                            var ollamaServer = _configuration["OllamaServer"] 
                                ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                            if (string.IsNullOrEmpty(ollamaServer))
                            {
                                await SendRawMessage(webSocket, "Configure a OLLAMA_SERVER");
                                continue;
                            }

                            var requestBody = new
                            {
                                model = modelName,
                                prompt = promptText,
                                stream = true
                            };

                            var client = _httpClientFactory.CreateClient();
                            var requestMessage = new HttpRequestMessage(HttpMethod.Post, ollamaServer)
                            {
                                Content = new StringContent(
                                    JsonSerializer.Serialize(requestBody),
                                    Encoding.UTF8,
                                    "application/json")
                            };

                            using var response = await client.SendAsync(
                                requestMessage,
                                HttpCompletionOption.ResponseHeadersRead);

                            if (!response.IsSuccessStatusCode)
                            {
                                var errorContent = await response.Content.ReadAsStringAsync();
                                _logger.LogError($"[OLLAMA] Erro na resposta: Status={response.StatusCode}, Content={errorContent}");
                                await SendRawMessage(webSocket, $"Erro ao conectar ao Ollama: {response.StatusCode}");
                                continue;
                            }

                            using var stream = await response.Content.ReadAsStreamAsync();
                            
                            // Ler stream line by line para processar JSON imediatamente
                            using var reader = new StreamReader(stream, Encoding.UTF8, false, bufferSize: 1024);
                            string line;
                            var chunkCount = 0;
                            var streamStartTime = DateTime.UtcNow;
                            
                            while ((line = await reader.ReadLineAsync()) != null)
                            {
                                if (string.IsNullOrWhiteSpace(line))
                                    continue;

                                chunkCount++;
                                var timeSinceStart = (DateTime.UtcNow - streamStartTime).TotalSeconds;
                                _logger.LogInformation($"[STREAM] Chunk #{chunkCount} recebido em {timeSinceStart:F2}s: {line.Substring(0, Math.Min(50, line.Length))}...");
                                
                                // Tentar parsear como JSON
                                try
                                {
                                    using var doc = JsonDocument.Parse(line);
                                    var root = doc.RootElement;

                                    // Enviar o chunk de resposta imediatamente
                                    if (root.TryGetProperty("response", out var responseProperty))
                                    {
                                        var responseText = responseProperty.GetString();
                                        if (!string.IsNullOrEmpty(responseText))
                                        {
                                            _logger.LogInformation($"[STREAM] Enviando para WebSocket: {responseText.Substring(0, Math.Min(30, responseText.Length))}");
                                            await SendRawMessage(webSocket, responseText);
                                        }
                                    }

                                    // Verificar se terminou
                                    if (root.TryGetProperty("done", out var doneProperty) && doneProperty.GetBoolean())
                                    {
                                        _logger.LogInformation($"[STREAM] Stream finalizado. Total de chunks: {chunkCount}. Tempo total: {(DateTime.UtcNow - streamStartTime).TotalSeconds:F2}s");
                                        await SendRawMessage(webSocket, "[FIM]");
                                    }
                                }
                                catch (JsonException ex)
                                {
                                    _logger.LogWarning($"[STREAM] Erro ao parsear JSON do chunk #{chunkCount}: {ex.Message}");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError($"Erro ao processar: {ex.Message}");
                            await SendRawMessage(webSocket, $"Erro ao conectar ao Ollama");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro geral WebSocket genérico: {ex.Message}");
            }
            finally
            {
                if (webSocket.State != WebSocketState.Closed)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Fechando",
                        CancellationToken.None);
                }
                webSocket.Dispose();
                _logger.LogInformation($"WebSocket genérico fechado");
            }
        }

        private async Task SendRawMessage(WebSocket webSocket, string message)
        {
            if (webSocket.State == WebSocketState.Open)
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                await webSocket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None);
            }
        }

        private async Task SendWebSocketMessage(WebSocket webSocket, WebSocketResponseDto data)
        {
            if (webSocket.State == WebSocketState.Open)
            {
                var jsonMessage = JsonSerializer.Serialize(data);
                var bytes = Encoding.UTF8.GetBytes(jsonMessage);
                await webSocket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None);
            }
        }
    }
}
