using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace CSharp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OllamaController : ControllerBase
    {
        private readonly ILogger<OllamaController> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public OllamaController(
            ILogger<OllamaController> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// GET /api/ollama/models - Lista todos os modelos disponíveis localmente
        /// </summary>
        [HttpGet("models")]
        public async Task<IActionResult> GetModels()
        {
            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    return BadRequest(new { error = "OLLAMA_SERVER não configurado" });
                }

                var baseUrl = ollamaServer.Replace("/api/chat", "/api/tags");

                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync(baseUrl);

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new { error = "Erro ao conectar ao Ollama" });
                }

                var content = await response.Content.ReadAsStringAsync();
                var jsonDoc = JsonDocument.Parse(content);
                
                var models = new List<object>();
                if (jsonDoc.RootElement.TryGetProperty("models", out var modelsArray))
                {
                    foreach (var model in modelsArray.EnumerateArray())
                    {
                        if (model.TryGetProperty("name", out var name))
                        {
                            var modelInfo = new
                            {
                                name = name.GetString(),
                                size = model.TryGetProperty("size", out var size) ? size.GetInt64() : 0,
                                modified = model.TryGetProperty("modified_at", out var modified) ? modified.GetString() : null
                            };
                            models.Add(modelInfo);
                        }
                    }
                }

                return Ok(new { models });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao listar modelos: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao listar modelos", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ollama/models/available - Lista modelos populares disponíveis para download
        /// Ordenados do mais leve ao mais pesado (prioridade para < 1B)
        /// </summary>
        [HttpGet("models/available")]
        public IActionResult GetAvailableModels()
        {
            var availableModels = new[]
            {
                // Modelos ultra-leves (< 1B) - PRIORITÁRIOS
                new { name = "gpt-oss:120b-cloud", description = "120B Cloud (recomendado)", size = "Cloud" },
                
                // Modelos leves (1B)
                new { name = "llama3.2:1b", description = "1.3GB (recomendado)", size = "1.3GB" },
                
                // Modelos médios (2-3B)
                new { name = "gemma2:2b", description = "1.6GB (recomendado)", size = "1.6GB" },
                new { name = "llama3.2:3b", description = "2GB", size = "2GB" },
                new { name = "phi3:mini", description = "2.3GB", size = "2.3GB" },
                
                // Modelos pesados (7B+) - Melhor qualidade, mais lentos
                new { name = "mistral:7b", description = "4.1GB", size = "4.1GB" },
                new { name = "llama3.1:8b", description = "4.7GB", size = "4.7GB" }
            };

            return Ok(new { models = availableModels });
        }

        /// <summary>
        /// POST /api/ollama/models/pull - Baixa um modelo do Ollama
        /// Body: { "model": "gpt-oss:120b-cloud" }
        /// </summary>
        [HttpPost("models/pull")]
        public async Task<IActionResult> PullModel([FromBody] PullModelRequest request)
        {
            if (string.IsNullOrEmpty(request.Model))
            {
                return BadRequest(new { error = "Nome do modelo é obrigatório" });
            }

            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    return BadRequest(new { error = "OLLAMA_SERVER não configurado" });
                }

                var baseUrl = ollamaServer.Replace("/api/chat", "/api/pull");

                var requestBody = new { name = request.Model };
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromMinutes(30); // Download pode demorar

                var httpRequest = new HttpRequestMessage(HttpMethod.Post, baseUrl)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(requestBody),
                        Encoding.UTF8,
                        "application/json")
                };

                var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Erro ao baixar modelo: {response.StatusCode} - {errorContent}");
                    return StatusCode((int)response.StatusCode, new { error = "Erro ao baixar modelo", details = errorContent });
                }

                // Ler o stream completo para garantir que o download aconteça
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var reader = new StreamReader(stream))
                {
                    string? line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        // Apenas consumir o stream - Ollama envia progresso linha por linha
                        _logger.LogInformation($"[PULL] {line}");
                    }
                }

                _logger.LogInformation($"Download do modelo '{request.Model}' concluído com sucesso");
                
                return Ok(new { 
                    message = $"Download do modelo '{request.Model}' concluído com sucesso",
                    status = "completed"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao baixar modelo: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao baixar modelo", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ollama/models/check - Verifica se um modelo existe localmente
        /// Body: { "model": "gpt-oss:120b-cloud" }
        /// </summary>
        [HttpPost("models/check")]
        public async Task<IActionResult> CheckModel([FromBody] CheckModelRequest request)
        {
            if (string.IsNullOrEmpty(request.Model))
            {
                return BadRequest(new { error = "Nome do modelo é obrigatório" });
            }

            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    return BadRequest(new { error = "OLLAMA_SERVER não configurado" });
                }

                var baseUrl = ollamaServer.Replace("/api/chat", "/api/show");

                var requestBody = new { name = request.Model };
                var client = _httpClientFactory.CreateClient();

                var httpRequest = new HttpRequestMessage(HttpMethod.Post, baseUrl)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(requestBody),
                        Encoding.UTF8,
                        "application/json")
                };

                var response = await client.SendAsync(httpRequest);

                if (response.IsSuccessStatusCode)
                {
                    return Ok(new { exists = true, model = request.Model });
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return Ok(new { exists = false, model = request.Model });
                }
                else
                {
                    return StatusCode((int)response.StatusCode, new { error = "Erro ao verificar modelo" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao verificar modelo: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao verificar modelo", details = ex.Message });
            }
        }

        /// <summary>
        /// DELETE /api/ollama/models/delete - Remove um modelo do Ollama
        /// Body: { "model": "gpt-oss:120b-cloud" }
        /// </summary>
        [HttpDelete("models/delete")]
        public async Task<IActionResult> DeleteModel([FromBody] DeleteModelRequest request)
        {
            if (string.IsNullOrEmpty(request.Model))
            {
                return BadRequest(new { error = "Nome do modelo é obrigatório" });
            }

            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    return BadRequest(new { error = "OLLAMA_SERVER não configurado" });
                }

                var baseUrl = ollamaServer.Replace("/api/chat", "/api/delete");

                var requestBody = new { name = request.Model };
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromMinutes(5);

                var httpRequest = new HttpRequestMessage(HttpMethod.Delete, baseUrl)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(requestBody),
                        Encoding.UTF8,
                        "application/json")
                };

                var response = await client.SendAsync(httpRequest);

                // Ler conteúdo da resposta (pode estar vazio)
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"Resposta do Ollama DELETE: Status={response.StatusCode}, Content={responseContent}");

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Erro ao remover modelo: {response.StatusCode} - {responseContent}");
                    return StatusCode((int)response.StatusCode, new { error = "Erro ao remover modelo", details = responseContent });
                }

                _logger.LogInformation($"Modelo '{request.Model}' removido com sucesso");
                
                return Ok(new { 
                    message = $"Modelo '{request.Model}' removido com sucesso",
                    status = "deleted",
                    model = request.Model
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao remover modelo: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao remover modelo", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ollama/status - Verifica se o Ollama está rodando e instalado
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                var ollamaServer = _configuration["OllamaServer"] 
                    ?? Environment.GetEnvironmentVariable("OLLAMA_SERVER");

                if (string.IsNullOrEmpty(ollamaServer))
                {
                    return Ok(new { 
                        isRunning = false, 
                        isInstalled = false,
                        message = "OLLAMA_SERVER não configurado" 
                    });
                }

                // Tentar conectar ao servidor Ollama
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(2);
                
                try
                {
                    var response = await client.GetAsync(ollamaServer.Replace("/api/chat", "/api/tags"));
                    
                    if (response.IsSuccessStatusCode)
                    {
                        return Ok(new { 
                            isRunning = true, 
                            isInstalled = true,
                            serverUrl = ollamaServer,
                            message = "Ollama rodando corretamente" 
                        });
                    }
                }
                catch (TaskCanceledException)
                {
                    // Timeout - servidor não respondeu
                }
                catch (HttpRequestException)
                {
                    // Erro de conexão - servidor não está rodando
                }

                // Verificar se o executável existe (Windows)
                var ollamaPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Programs", "Ollama", "ollama.exe"
                );

                var isInstalled = System.IO.File.Exists(ollamaPath);

                return Ok(new { 
                    isRunning = false, 
                    isInstalled = isInstalled,
                    ollamaPath = isInstalled ? ollamaPath : null,
                    message = isInstalled ? "Ollama instalado mas não está rodando" : "Ollama não está instalado" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao verificar status: {ex.Message}");
                return Ok(new { 
                    isRunning = false, 
                    isInstalled = false,
                    message = "Erro ao verificar status do Ollama" 
                });
            }
        }

        /// <summary>
        /// POST /api/ollama/start - Inicia o servidor Ollama
        /// </summary>
        [HttpPost("start")]
        public IActionResult StartServer()
        {
            try
            {
                // Caminho padrão do Ollama no Windows
                var ollamaPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Programs", "Ollama", "ollama.exe"
                );

                if (!System.IO.File.Exists(ollamaPath))
                {
                    return BadRequest(new { error = "Ollama não está instalado" });
                }

                // Iniciar o processo do Ollama
                var processInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = ollamaPath,
                    Arguments = "serve",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = false,
                    RedirectStandardError = false
                };

                var process = System.Diagnostics.Process.Start(processInfo);

                if (process != null)
                {
                    _logger.LogInformation($"Ollama server iniciado (PID: {process.Id})");
                    return Ok(new { 
                        message = "Servidor Ollama iniciado com sucesso",
                        pid = process.Id
                    });
                }

                return StatusCode(500, new { error = "Falha ao iniciar o servidor Ollama" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao iniciar servidor: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao iniciar servidor", details = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/ollama/stop - Para o servidor Ollama
        /// </summary>
        [HttpPost("stop")]
        public IActionResult StopServer()
        {
            try
            {
                // Encontrar e matar processos do Ollama
                var processes = System.Diagnostics.Process.GetProcessesByName("ollama");
                var killedCount = 0;

                foreach (var process in processes)
                {
                    try
                    {
                        process.Kill(true);
                        process.WaitForExit(3000);
                        killedCount++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Erro ao parar processo {process.Id}: {ex.Message}");
                    }
                }

                if (killedCount > 0)
                {
                    _logger.LogInformation($"{killedCount} processo(s) do Ollama parado(s)");
                    return Ok(new { 
                        message = $"Servidor Ollama parado com sucesso ({killedCount} processo(s))",
                        killedCount = killedCount
                    });
                }

                return Ok(new { 
                    message = "Nenhum processo do Ollama encontrado",
                    killedCount = 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Erro ao parar servidor: {ex.Message}");
                return StatusCode(500, new { error = "Erro ao parar servidor", details = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/ollama/download-url - Retorna URL de download do Ollama
        /// </summary>
        [HttpGet("download-url")]
        public IActionResult GetDownloadUrl()
        {
            return Ok(new { 
                url = "https://ollama.com/download/windows",
                message = "Faça o download e instale o Ollama para Windows" 
            });
        }
    }

    public class PullModelRequest
    {
        public string Model { get; set; } = string.Empty;
    }

    public class CheckModelRequest
    {
        public string Model { get; set; } = string.Empty;
    }

    public class DeleteModelRequest
    {
        public string Model { get; set; } = string.Empty;
    }
}
