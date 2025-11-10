import { useState, useEffect, useRef } from "react";
import { getCookie } from "../utils/cookies";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatProps {
  ticketId: string;
  ticketTitle: string;
  ticketBody: string;
}

export default function AIChat({ ticketId, ticketTitle, ticketBody }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamTimeoutRef = useRef<number | null>(null);
  const messageIdCounter = useRef<number>(0);
  const isFinalizingMessage = useRef<boolean>(false);
  const currentStreamText = useRef<string>("");

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Conectar ao WebSocket quando o chat abrir
  useEffect(() => {
    if (!isOpen) return;

    const token = getCookie("token");
    if (!token) return;

    // Conectar ao WebSocket
    const ws = new WebSocket(`ws://localhost:8080/api/websocket/generic`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket conectado");
      setIsConnected(true);
      
      // Pré-preencher o campo de input com a mensagem inicial
      const initialPrompt = `me ajude com esse problema "${ticketBody}"`;
      setInputMessage(initialPrompt);
    };

    ws.onmessage = (event) => {
      const text = event.data;
      
      // Verifica se é o marcador de fim de stream
      if (text === "[FIM]") {
        if (isFinalizingMessage.current) return; // Evita dupla finalização
        isFinalizingMessage.current = true;
        
        // Adiciona a mensagem completa
        if (currentStreamText.current.trim()) {
          addMessage(currentStreamText.current, false);
        }
        
        // Limpa o streaming
        currentStreamText.current = "";
        setStreamingMessage("");
        setIsSending(false);
        isFinalizingMessage.current = false;
        return;
      }
      
      // Limpa timeout anterior
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      
      // Acumula os tokens que chegam em streaming
      currentStreamText.current += text;
      setStreamingMessage(currentStreamText.current);
      
      // Define timeout de segurança para finalizar a mensagem caso não receba [FIM]
      streamTimeoutRef.current = window.setTimeout(() => {
        if (isFinalizingMessage.current) return; // Evita dupla finalização
        isFinalizingMessage.current = true;
        
        // Adiciona a mensagem completa
        if (currentStreamText.current.trim()) {
          addMessage(currentStreamText.current, false);
        }
        
        // Limpa o streaming
        currentStreamText.current = "";
        setStreamingMessage("");
        setIsSending(false);
        isFinalizingMessage.current = false;
      }, 2000); // 2 segundos de timeout de segurança
    };

    ws.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
      setIsConnected(false);
      setIsSending(false);
    };

    ws.onclose = () => {
      console.log("WebSocket desconectado");
      setIsConnected(false);
      
      // Limpa estados ao fechar
      currentStreamText.current = "";
      setStreamingMessage("");
      setIsSending(false);
      isFinalizingMessage.current = false;
    };

    return () => {
      // Limpa timeout ao desmontar
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      ws.close();
    };
  }, [isOpen, ticketId, ticketTitle, ticketBody]);

  const addMessage = (text: string, isUser: boolean) => {
    messageIdCounter.current += 1;
    const newMessage: Message = {
      id: messageIdCounter.current,
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected || isSending) return;

    setIsSending(true);
    addMessage(inputMessage, true);

    // Enviar mensagem via WebSocket
    wsRef.current.send(
      JSON.stringify({
        prompt: inputMessage,
        ticketId: ticketId,
      })
    );

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#007bff",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Janela do chat */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "380px",
            height: "560px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#007bff",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>Assistente IA</div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {isConnected ? "Online" : "Desconectado"}
              </div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                // Limpar estados ao fechar o chat
                setMessages([]);
                setInputMessage("");
                currentStreamText.current = "";
                setStreamingMessage("");
                setIsSending(false);
                isFinalizingMessage.current = false;
              }}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "24px",
                lineHeight: "1",
                padding: "0",
              }}
            >
              ×
            </button>
          </div>

          {/* Mensagens */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: "#f8f9fa",
            }}
          >
            {messages.length === 0 && !streamingMessage ? (
              <div style={{ textAlign: "center", color: "#6c757d", marginTop: "40px" }}>
                <p>👋 Olá! Sou seu assistente de IA.</p>
                <p style={{ fontSize: "14px", marginTop: "8px" }}>
                  Como posso ajudar com este ticket?
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        backgroundColor: msg.isUser ? "#007bff" : "white",
                        color: msg.isUser ? "white" : "#212529",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow: msg.isUser ? "none" : "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {/* Mensagem em streaming (sendo recebida em tempo real) */}
                {streamingMessage && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        backgroundColor: "white",
                        color: "#212529",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    >
                      {streamingMessage}
                      <span style={{ opacity: 0.5 }}>▋</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid #dee2e6",
              backgroundColor: "white",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={!isConnected || isSending}
                rows={2}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid #ced4da",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "none",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!isConnected || isSending || !inputMessage.trim()}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    !isConnected || isSending || !inputMessage.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity:
                    !isConnected || isSending || !inputMessage.trim() ? 0.6 : 1,
                }}
              >
                {isSending ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
