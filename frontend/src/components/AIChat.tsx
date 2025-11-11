import { useState, useEffect, useRef, useCallback } from "react";
import { getCookie } from "../utils/cookies";
import { apiGet, apiPost } from "../services/api";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIMessageFromDB {
  id: number;
  ticketId: number;
  role: string;
  content: string;
  createdAt: string;
  userId?: string;
  username?: string;
}

interface AIChatProps {
  ticketId: string;
  ticketTitle: string;
  ticketBody: string;
}

export default function AIChat({ ticketId, ticketTitle, ticketBody }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamTimeoutRef = useRef<number | null>(null);
  const messageIdCounter = useRef<number>(0);
  const isFinalizingMessage = useRef<boolean>(false);
  const currentStreamText = useRef<string>("");
  const historyLoaded = useRef<boolean>(false);
  const initialPromptSet = useRef<boolean>(false);
  const sessionKey = `chat_session_${ticketId}`;

  // Função para adicionar mensagem
  const addMessage = useCallback((text: string, isUser: boolean) => {
    messageIdCounter.current += 1;
    const newMessage: Message = {
      id: messageIdCounter.current,
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  // Salvar sessão no localStorage
  const saveSessionToStorage = useCallback(() => {
    if (messages.length === 0) return;
    
    const session = {
      messages: messages.map(m => ({
        text: m.text,
        isUser: m.isUser,
        timestamp: m.timestamp.toISOString(),
      })),
      lastUpdate: new Date().toISOString(),
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(session));
    console.log(`✅ Sessão salva localmente (${messages.length} mensagens)`);
  }, [messages, sessionKey]);

  // Restaurar sessão do localStorage
  const restoreSessionFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(sessionKey);
      if (!saved) return false;

      const session = JSON.parse(saved) as { messages: Array<{ text: string; isUser: boolean; timestamp: string }> };
      const restoredMessages: Message[] = session.messages.map((msg, index: number) => ({
        id: index + 1,
        text: msg.text,
        isUser: msg.isUser,
        timestamp: new Date(msg.timestamp),
      }));

      if (restoredMessages.length > 0) {
        messageIdCounter.current = restoredMessages.length;
        setMessages(restoredMessages);
        console.log(`✅ Sessão restaurada (${restoredMessages.length} mensagens)`);
        // Se restaurou mensagens, não deve mostrar prompt inicial
        initialPromptSet.current = true;
        return true;
      }
    } catch (error) {
      console.error("Erro ao restaurar sessão:", error);
    }
    return false;
  }, [sessionKey]);

  // Sincronizar com o banco (assíncrono, em background)
  const syncToDatabase = useCallback(async () => {
    if (messages.length === 0) return;

    try {
      // Limpar histórico anterior
      await apiPost(`/api/tickets/${ticketId}/ai-messages/clear`, {});

      // Salvar todas as mensagens
      for (const msg of messages) {
        await apiPost(`/api/tickets/${ticketId}/ai-messages`, {
          ticketId: parseInt(ticketId),
          role: msg.isUser ? "user" : "assistant",
          content: msg.text,
        });
      }

      console.log(`✅ Sessão sincronizada com banco (${messages.length} mensagens)`);
    } catch (error) {
      console.error("❌ Erro ao sincronizar com banco:", error);
    }
  }, [messages, ticketId]);

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Auto-salvar sessão no localStorage sempre que mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      saveSessionToStorage();
    }
  }, [messages, saveSessionToStorage]);

  // Carregar sessão ao montar o componente (mesmo com chat minimizado)
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;

    // 1. Tentar restaurar do localStorage primeiro (instantâneo)
    const hasLocalSession = restoreSessionFromStorage();

    // 2. Carregar do banco em background (assíncrono, não bloqueia)
    const loadFromDatabase = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await apiGet<AIMessageFromDB[]>(`/api/tickets/${ticketId}/ai-messages`);
        
        if (history.length > 0) {
          // Converter histórico do banco para formato do chat
          const loadedMessages: Message[] = history.map((msg) => ({
            id: msg.id,
            text: msg.content,
            isUser: msg.role === "user",
            timestamp: new Date(msg.createdAt),
          }));

          // Atualizar contador de IDs
          messageIdCounter.current = Math.max(...loadedMessages.map(m => m.id));
          setMessages(loadedMessages);
          console.log(`✅ Histórico carregado do banco (${loadedMessages.length} mensagens)`);
          
          // Se tem histórico, marca que o prompt inicial não deve ser mostrado
          initialPromptSet.current = true;
        } else if (!hasLocalSession) {
          // Se não tem nada, permite mostrar o prompt inicial
          initialPromptSet.current = false;
        }
      } catch (error) {
        console.error("❌ Erro ao carregar histórico do banco:", error);
        if (!hasLocalSession) {
          initialPromptSet.current = false;
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadFromDatabase();
  }, [ticketId, ticketBody, restoreSessionFromStorage]);

  // Sincronizar com banco quando sair da página ou fechar navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0) {
        saveSessionToStorage();
        // Sincronizar com banco (pode não completar se página fechar rápido)
        syncToDatabase();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [messages, saveSessionToStorage, syncToDatabase]);

  // Conectar ao WebSocket quando o chat abrir
  useEffect(() => {
    if (!isOpen) return;
    
    // Se já tem WebSocket conectado, não criar outro
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = getCookie("token");
    if (!token) return;

    // Capturar o estado atual das mensagens
    const hasMessages = messages.length > 0;

    // Conectar ao WebSocket
    const ws = new WebSocket(`ws://localhost:8080/api/websocket/generic`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket conectado");
      setIsConnected(true);

      // Pré-preencher APENAS se não houver mensagens E ainda não foi definido
      if (!hasMessages && !initialPromptSet.current) {
        const initialPrompt = `me ajude com esse problema "${ticketBody}"`;
        setInputMessage(initialPrompt);
        initialPromptSet.current = true;
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ticketId, ticketTitle, ticketBody, addMessage]);

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
      {/* Botão flutuante (quando fechado) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
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

      {/* Chat minimizado */}
      {isOpen && isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "280px",
            padding: "16px 20px",
            backgroundColor: "#007bff",
            color: "white",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            cursor: "pointer",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>Assistente IA</div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>
              {messages.length > 0 ? `${messages.length} mensagens` : "Clique para abrir"}
            </div>
          </div>
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}

      {/* Janela do chat (maximizado) */}
      {isOpen && !isMinimized && (
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
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>Assistente IA</div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {isConnected ? "Online" : "Desconectado"}
                {messages.length > 0 && ` • ${messages.length} mensagens`}
              </div>
            </div>
            
            {/* Botão Minimizar */}
            <button
              onClick={() => setIsMinimized(true)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "20px",
                lineHeight: "1",
                padding: "4px 8px",
                marginRight: "8px",
              }}
              title="Minimizar chat"
            >
              ➖
            </button>

            {/* Botão Fechar */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
                // Ao fechar, salva e sincroniza
                if (messages.length > 0) {
                  saveSessionToStorage();
                  syncToDatabase();
                }
                // Limpar WebSocket
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
                setIsConnected(false);
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
            {isLoadingHistory ? (
              <div style={{ textAlign: "center", color: "#6c757d", marginTop: "40px" }}>
                <p>⏳ Carregando histórico...</p>
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
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
                    !isConnected || isSending || !inputMessage.trim() ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: !isConnected || isSending || !inputMessage.trim() ? 0.6 : 1,
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
