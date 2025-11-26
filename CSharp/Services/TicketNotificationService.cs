using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace CSharp.Services
{
    /// <summary>
    /// Serviço para gerenciar conexões WebSocket e notificações em tempo real para tickets
    /// </summary>
    public class TicketNotificationService
    {
        private readonly ILogger<TicketNotificationService> _logger;
        
        // Opções de serialização para usar camelCase (compatível com JavaScript)
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        // Dicionário de conexões: ticketId -> lista de WebSockets conectados
        private readonly ConcurrentDictionary<int, ConcurrentBag<WebSocket>> _connections = new();

        public TicketNotificationService(ILogger<TicketNotificationService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Registra uma conexão WebSocket para um ticket específico
        /// </summary>
        public void AddConnection(int ticketId, WebSocket webSocket)
        {
            var connections = _connections.GetOrAdd(ticketId, _ => new ConcurrentBag<WebSocket>());
            connections.Add(webSocket);
            _logger.LogInformation($"[WS] Nova conexão registrada para ticket {ticketId}. Total: {connections.Count}");
        }

        /// <summary>
        /// Remove uma conexão WebSocket de um ticket
        /// </summary>
        public void RemoveConnection(int ticketId, WebSocket webSocket)
        {
            if (_connections.TryGetValue(ticketId, out var connections))
            {
                // ConcurrentBag não tem Remove, então recriamos sem o item
                var newBag = new ConcurrentBag<WebSocket>(connections.Where(ws => ws != webSocket));
                _connections.TryUpdate(ticketId, newBag, connections);
                _logger.LogInformation($"[WS] Conexão removida do ticket {ticketId}. Restantes: {newBag.Count}");
            }
        }

        /// <summary>
        /// Notifica todos os clientes conectados a um ticket sobre um novo comentário
        /// </summary>
        public async Task NotifyNewComment(int ticketId, object commentData)
        {
            if (!_connections.TryGetValue(ticketId, out var connections))
            {
                _logger.LogDebug($"[WS] Nenhuma conexão ativa para ticket {ticketId}");
                return;
            }

            var message = JsonSerializer.Serialize(new
            {
                type = "new_comment",
                ticketId,
                data = commentData
            }, _jsonOptions);

            var bytes = Encoding.UTF8.GetBytes(message);
            var deadConnections = new List<WebSocket>();

            foreach (var ws in connections)
            {
                try
                {
                    if (ws.State == WebSocketState.Open)
                    {
                        await ws.SendAsync(
                            new ArraySegment<byte>(bytes),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None);
                        _logger.LogDebug($"[WS] Notificação enviada para conexão do ticket {ticketId}");
                    }
                    else
                    {
                        deadConnections.Add(ws);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"[WS] Erro ao enviar para conexão: {ex.Message}");
                    deadConnections.Add(ws);
                }
            }

            // Limpar conexões mortas
            foreach (var dead in deadConnections)
            {
                RemoveConnection(ticketId, dead);
            }

            _logger.LogInformation($"[WS] Notificação de novo comentário enviada para {connections.Count - deadConnections.Count} clientes do ticket {ticketId}");
        }

        /// <summary>
        /// Notifica sobre atualização do ticket (status, urgência, etc)
        /// </summary>
        public async Task NotifyTicketUpdate(int ticketId, string updateType, object? data = null)
        {
            if (!_connections.TryGetValue(ticketId, out var connections))
            {
                return;
            }

            var message = JsonSerializer.Serialize(new
            {
                type = "ticket_update",
                updateType,
                ticketId,
                data
            }, _jsonOptions);

            var bytes = Encoding.UTF8.GetBytes(message);
            var deadConnections = new List<WebSocket>();

            foreach (var ws in connections)
            {
                try
                {
                    if (ws.State == WebSocketState.Open)
                    {
                        await ws.SendAsync(
                            new ArraySegment<byte>(bytes),
                            WebSocketMessageType.Text,
                            true,
                            CancellationToken.None);
                    }
                    else
                    {
                        deadConnections.Add(ws);
                    }
                }
                catch
                {
                    deadConnections.Add(ws);
                }
            }

            foreach (var dead in deadConnections)
            {
                RemoveConnection(ticketId, dead);
            }
        }
    }
}
