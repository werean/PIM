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
        private readonly TicketNotificationService _notificationService;
        private readonly ILogger<WebSocketController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public WebSocketController(
            TicketAISessionService aiSessionService,
            TicketNotificationService notificationService,
            ILogger<WebSocketController> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _aiSessionService = aiSessionService;
            _notificationService = notificationService;
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

        /// <summary>
        /// Endpoint WebSocket para notificações em tempo real de um ticket (comentários, atualizações)
        /// </summary>
        [HttpGet("ticket/{ticketId}/notifications")]
        public async Task GetTicketNotifications(int ticketId)
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await HandleTicketNotificationConnection(webSocket, ticketId);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }

        /// <summary>
        /// Mantém conexão WebSocket aberta para receber notificações do ticket
        /// </summary>
        private async Task HandleTicketNotificationConnection(WebSocket webSocket, int ticketId)
        {
            _logger.LogInformation($"[WS Notifications] Cliente conectado ao ticket {ticketId}");
            
            // Registrar conexão no serviço de notificações
            _notificationService.AddConnection(ticketId, webSocket);

            var buffer = new byte[1024];
            
            try
            {
                // Enviar confirmação de conexão
                var welcomeMessage = JsonSerializer.Serialize(new
                {
                    type = "connected",
                    ticketId,
                    message = "Conectado às notificações do ticket"
                });
                await webSocket.SendAsync(
                    new ArraySegment<byte>(Encoding.UTF8.GetBytes(welcomeMessage)),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None);

                // Manter conexão aberta até cliente desconectar
                while (webSocket.State == WebSocketState.Open)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    
                    if (result.CloseStatus.HasValue)
                    {
                        _logger.LogInformation($"[WS Notifications] Cliente desconectou do ticket {ticketId}");
                        break;
                    }

                    // Processar ping/pong para manter conexão viva
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        if (message == "ping")
                        {
                            await webSocket.SendAsync(
                                new ArraySegment<byte>(Encoding.UTF8.GetBytes("pong")),
                                WebSocketMessageType.Text,
                                true,
                                CancellationToken.None);
                        }
                    }
                }
            }
            catch (WebSocketException ex)
            {
                _logger.LogWarning($"[WS Notifications] WebSocket error para ticket {ticketId}: {ex.Message}");
            }
            finally
            {
                // Remover conexão ao desconectar
                _notificationService.RemoveConnection(ticketId, webSocket);
                
                if (webSocket.State == WebSocketState.Open)
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Conexão encerrada", CancellationToken.None);
                }
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
                        string modelName = "gpt-oss:120b-cloud"; // modelo padrão

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

                            // System prompt definindo a persona de Técnico de TI
                            var systemPrompt = @"Você é um assistente técnico especializado em TI e suporte técnico. 
Sua missão é ajudar técnicos a resolver problemas reportados em chamados de suporte.

REGRAS CRÍTICAS:
- Seja EXTREMAMENTE objetivo e direto
- Respostas CURTAS e PONTUAIS (máximo 3-4 parágrafos)
- Vá direto ao ponto, sem introduções longas
- Use passos numerados APENAS quando necessário (máximo 5 passos)
- Evite explicações excessivas ou redundantes
- Foque APENAS no problema específico

Comportamento:
- Identifique a causa raiz rapidamente
- Sugira a solução mais direta
- Use comandos ou verificações quando relevante
- Linguagem técnica mas clara

Sempre priorize BREVIDADE e AÇÃO imediata.";

                            // Usar API /api/chat com messages array (nova API do Ollama)
                            var requestBody = new
                            {
                                model = modelName,
                                messages = new[]
                                {
                                    new { role = "system", content = systemPrompt },
                                    new { role = "user", content = promptText }
                                },
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

                                    // API /api/chat retorna message.content em vez de response
                                    if (root.TryGetProperty("message", out var messageProperty))
                                    {
                                        if (messageProperty.TryGetProperty("content", out var contentProperty))
                                        {
                                            var responseText = contentProperty.GetString();
                                            if (!string.IsNullOrEmpty(responseText))
                                            {
                                                _logger.LogInformation($"[STREAM] Enviando para WebSocket: {responseText.Substring(0, Math.Min(30, responseText.Length))}");
                                                await SendRawMessage(webSocket, responseText);
                                            }
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

        /// <summary>
        /// Endpoint WebSocket para triagem inicial com IA
        /// </summary>
        [HttpGet("triage")]
        public async Task GetTriage()
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await HandleTriageWebSocketConnection(webSocket);
            }
            else
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        }

        private async Task HandleTriageWebSocketConnection(WebSocket webSocket)
        {
            var buffer = new byte[1024 * 4];
            var conversationHistory = new List<object>();
            string? ticketTitle = null;
            string? ticketDescription = null;
            int ticketUrgency = 1;

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
                            using var doc = JsonDocument.Parse(message);
                            var root = doc.RootElement;

                            // Verificar se é mensagem inicial ou mensagem do usuário
                            if (root.TryGetProperty("type", out var typeProperty))
                            {
                                var messageType = typeProperty.GetString();

                                if (messageType == "initial")
                                {
                                    // Mensagem inicial com dados do problema
                                    ticketTitle = root.GetProperty("title").GetString();
                                    ticketDescription = root.GetProperty("description").GetString();
                                    ticketUrgency = root.GetProperty("urgency").GetInt32();

                                    // System prompt para a IA
                                    var systemPrompt = $@"Você é um assistente técnico inteligente responsável por ajudar usuários na triagem de chamados.
Seu papel é tentar resolver o problema antes que o ticket seja criado.

Informações do problema:
- Título: {ticketTitle}
- Descrição: {ticketDescription}
- Urgência: {(ticketUrgency == 3 ? "Alta" : ticketUrgency == 2 ? "Média" : "Baixa")}

Regras:
1. Na sua primeira resposta, apresente uma solução direta e prática para o problema descrito.
2. Caso o usuário indique que o problema não foi resolvido, nas próximas respostas investigue possíveis causas, solicitando informações adicionais, logs, prints ou resultados de testes conforme necessário.
3. Mantenha uma linguagem profissional, clara e objetiva, com foco em diagnóstico e resolução.
4. Evite respostas genéricas.
5. Seja conciso e direto ao ponto.
6. Use APENAS texto puro, sem formatação Markdown (sem **, sem ##, sem ```). Escreva de forma simples e direta.

Forneça agora sua primeira resposta tentando resolver o problema descrito.";

                                    conversationHistory.Add(new { role = "system", content = systemPrompt });

                                    // Enviar primeira resposta da IA
                                    var ollamaServer = _configuration["OllamaServer"] 
                                        ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER")
                                        ?? "http://localhost:11434/api/chat";
                                    using var httpClient = _httpClientFactory.CreateClient();
                                    httpClient.Timeout = TimeSpan.FromMinutes(5);

                                    var requestBody = new
                                    {
                                        model = "gpt-oss:120b-cloud",
                                        messages = conversationHistory,
                                        stream = true,
                                        options = new
                                        {
                                            temperature = 0.7,
                                            top_p = 0.9,
                                            num_predict = 512
                                        }
                                    };

                                    var json = JsonSerializer.Serialize(requestBody);
                                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                                    _logger.LogInformation("[TRIAGE INITIAL] Enviando request para Ollama...");
                                    
                                    // IMPORTANTE: Usar ResponseHeadersRead para streaming real
                                    var request = new HttpRequestMessage(HttpMethod.Post, ollamaServer)
                                    {
                                        Content = content
                                    };
                                    var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                                    response.EnsureSuccessStatusCode();

                                    _logger.LogInformation("[TRIAGE INITIAL] Iniciando streaming da primeira resposta");
                                    var fullResponse = "";
                                    using (var stream = await response.Content.ReadAsStreamAsync())
                                    using (var reader = new StreamReader(stream, Encoding.UTF8))
                                    {
                                        string? line;
                                        while ((line = await reader.ReadLineAsync()) != null)
                                        {
                                                if (string.IsNullOrWhiteSpace(line)) continue;

                                                try
                                                {
                                                    using var responseDoc = JsonDocument.Parse(line);
                                                    var responseRoot = responseDoc.RootElement;

                                                    if (responseRoot.TryGetProperty("message", out var messageProperty))
                                                    {
                                                        if (messageProperty.TryGetProperty("content", out var contentProperty))
                                                        {
                                                            var chunk = contentProperty.GetString();
                                                            if (!string.IsNullOrEmpty(chunk))
                                                            {
                                                                // Filtrar tokens especiais ANTES de enviar
                                                                var cleanChunk = chunk
                                                                    .Replace("<|im_start|>", "")
                                                                    .Replace("<|im_end|>", "")
                                                                    .Replace("<|endoftext|>", "")
                                                                    .Replace("<|system|>", "")
                                                                    .Replace("<|user|>", "")
                                                                    .Replace("<|assistant|>", "");
                                                                
                                                                if (cleanChunk.Length > 0)
                                                                {
                                                                    fullResponse += cleanChunk;
                                                                    await SendRawMessage(webSocket, cleanChunk);
                                                                    _logger.LogDebug($"[STREAM] Enviado chunk: {cleanChunk.Length} chars");
                                                                }
                                                            }
                                                        }
                                                    }

                                                    if (responseRoot.TryGetProperty("done", out var doneProperty) && doneProperty.GetBoolean())
                                                    {
                                                        break;
                                                    }
                                                }
                                                catch (Exception ex)
                                                {
                                                    _logger.LogError($"[ERROR PARSE] {ex.Message}");
                                                }
                                        }
                                    }

                                    // Adicionar resposta da IA ao histórico
                                    conversationHistory.Add(new { role = "assistant", content = fullResponse });
                                    
                                    _logger.LogInformation("[TRIAGE INITIAL] Streaming completo, enviando [FIM]");
                                    // Enviar marcador de fim
                                    await SendRawMessage(webSocket, "[FIM]");
                                }
                                else if (messageType == "message")
                                {
                                    // Mensagem do usuário durante a conversa
                                    var userMessage = root.GetProperty("prompt").GetString() ?? "";
                                    
                                    // Adicionar mensagem do usuário ao histórico
                                    conversationHistory.Add(new { role = "user", content = userMessage });

                                    // Enviar para a IA
                                    var ollamaServer = _configuration["OllamaServer"] 
                                        ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER")
                                        ?? "http://localhost:11434/api/chat";
                                    using var httpClient = _httpClientFactory.CreateClient();
                                    httpClient.Timeout = TimeSpan.FromMinutes(5);

                                    var requestBody = new
                                    {
                                        model = "gpt-oss:120b-cloud",
                                        messages = conversationHistory,
                                        stream = true,
                                        options = new
                                        {
                                            temperature = 0.7,
                                            top_p = 0.9,
                                            num_predict = 512
                                        }
                                    };

                                    var json = JsonSerializer.Serialize(requestBody);
                                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                                    _logger.LogInformation("[TRIAGE MESSAGE] Enviando request para Ollama...");
                                    
                                    // IMPORTANTE: Usar ResponseHeadersRead para streaming real
                                    var request = new HttpRequestMessage(HttpMethod.Post, ollamaServer)
                                    {
                                        Content = content
                                    };
                                    var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                                    response.EnsureSuccessStatusCode();

                                    _logger.LogInformation("[TRIAGE MESSAGE] Iniciando streaming da resposta");
                                    var fullResponse = "";
                                    using (var stream = await response.Content.ReadAsStreamAsync())
                                    using (var reader = new StreamReader(stream, Encoding.UTF8))
                                    {
                                        string? line;
                                        while ((line = await reader.ReadLineAsync()) != null)
                                        {
                                                if (string.IsNullOrWhiteSpace(line)) continue;

                                                try
                                                {
                                                    using var responseDoc = JsonDocument.Parse(line);
                                                    var responseRoot = responseDoc.RootElement;

                                                    if (responseRoot.TryGetProperty("message", out var messageProperty))
                                                    {
                                                        if (messageProperty.TryGetProperty("content", out var contentProperty))
                                                        {
                                                            var chunk = contentProperty.GetString();
                                                            if (!string.IsNullOrEmpty(chunk))
                                                            {
                                                                // Filtrar tokens especiais ANTES de enviar
                                                                var cleanChunk = chunk
                                                                    .Replace("<|im_start|>", "")
                                                                    .Replace("<|im_end|>", "")
                                                                    .Replace("<|endoftext|>", "")
                                                                    .Replace("<|system|>", "")
                                                                    .Replace("<|user|>", "")
                                                                    .Replace("<|assistant|>", "");
                                                                
                                                                if (cleanChunk.Length > 0)
                                                                {
                                                                    fullResponse += cleanChunk;
                                                                    await SendRawMessage(webSocket, cleanChunk);
                                                                    _logger.LogDebug($"[STREAM] Enviado chunk: {cleanChunk.Length} chars");
                                                                }
                                                            }
                                                        }
                                                    }

                                                    if (responseRoot.TryGetProperty("done", out var doneProperty) && doneProperty.GetBoolean())
                                                    {
                                                        break;
                                                    }
                                                }
                                                catch (Exception ex)
                                                {
                                                    _logger.LogError($"[ERROR PARSE] {ex.Message}");
                                                }
                                        }
                                    }

                                    // Adicionar resposta da IA ao histórico
                                    conversationHistory.Add(new { role = "assistant", content = fullResponse });
                                    
                                    _logger.LogInformation("[TRIAGE MESSAGE] Streaming completo, enviando [FIM]");
                                    // Enviar marcador de fim
                                    await SendRawMessage(webSocket, "[FIM]");
                                }
                                else if (messageType == "message")
                                {
                                    // Mensagem normal do usuário
                                    var userPrompt = root.GetProperty("prompt").GetString();
                                    var model = root.TryGetProperty("model", out var modelProp) 
                                        ? modelProp.GetString() 
                                        : "qwen2.5-coder:0.5b";

                                    // Adicionar mensagem do usuário ao histórico
                                    conversationHistory.Add(new { role = "user", content = userPrompt });

                                    // Enviar para Ollama
                                    var ollamaUrl = _configuration["Ollama:ServerUrl"] ?? "http://localhost:11434";
                                    using var httpClient = _httpClientFactory.CreateClient();

                                    var requestBody = new
                                    {
                                        model = model,
                                        messages = conversationHistory,
                                        stream = true,
                                        options = new
                                        {
                                            temperature = 0.7,
                                            top_p = 0.9,
                                            num_predict = 512
                                        }
                                    };

                                    var json = JsonSerializer.Serialize(requestBody);
                                    var content = new StringContent(json, Encoding.UTF8, "application/json");

                                    var response = await httpClient.PostAsync($"{ollamaUrl}/api/chat", content);
                                    response.EnsureSuccessStatusCode();

                                    var fullResponse = "";
                                    using (var stream = await response.Content.ReadAsStreamAsync())
                                    using (var reader = new StreamReader(stream))
                                    {
                                        while (!reader.EndOfStream)
                                        {
                                            var line = await reader.ReadLineAsync();
                                            if (string.IsNullOrWhiteSpace(line)) continue;

                                            try
                                            {
                                                using var responseDoc = JsonDocument.Parse(line);
                                                var responseRoot = responseDoc.RootElement;

                                                if (responseRoot.TryGetProperty("message", out var messageProperty))
                                                {
                                                    if (messageProperty.TryGetProperty("content", out var contentProperty))
                                                    {
                                                        var chunk = contentProperty.GetString();
                                                        if (!string.IsNullOrEmpty(chunk))
                                                        {
                                                            fullResponse += chunk;
                                                            await SendRawMessage(webSocket, chunk);
                                                        }
                                                    }
                                                }

                                                if (responseRoot.TryGetProperty("done", out var doneProperty) && doneProperty.GetBoolean())
                                                {
                                                    break;
                                                }
                                            }
                                            catch { }
                                        }
                                    }

                                    // Adicionar resposta da IA ao histórico
                                    conversationHistory.Add(new { role = "assistant", content = fullResponse });
                                    
                                    // Enviar marcador de fim
                                    await SendRawMessage(webSocket, "[FIM]");
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError($"Erro ao processar mensagem de triagem: {ex.Message}");
                            await SendRawMessage(webSocket, "Erro ao processar mensagem. Tente novamente.");
                            await SendRawMessage(webSocket, "[FIM]");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro no WebSocket de triagem: {ex.Message}");
            }
            finally
            {
                if (webSocket.State == WebSocketState.Open)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Conexão encerrada",
                        CancellationToken.None);
                }
            }
        }

        private async Task SendRawMessage(WebSocket webSocket, string message)
        {
            if (webSocket.State == WebSocketState.Open && message.Length > 0)
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
