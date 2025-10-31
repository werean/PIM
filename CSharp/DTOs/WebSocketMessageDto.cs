namespace CSharp.DTOs
{
    /// <summary>
    /// DTO para requisição WebSocket do cliente
    /// </summary>
    public class WebSocketMessageDto
    {
        public string? TicketBody { get; set; }
    }

    /// <summary>
    /// DTO para resposta WebSocket do servidor
    /// </summary>
    public class WebSocketResponseDto
    {
        public string Type { get; set; } = string.Empty; // "stream", "cached", "done", "error"
        public string? Content { get; set; }
        public string? Response { get; set; }
        public string? Message { get; set; }
    }
}
