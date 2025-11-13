import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated, getCookie } from "../utils/cookies";
import { apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";
import PageLayout from "../components/PageLayout";
import PageHeader from "../components/PageHeader";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface LocationState {
  title: string;
  ticketBody: string;
  urgency: number;
}

export default function TicketTriagePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const state = location.state as LocationState | null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isCreatingResolvedTicket, setIsCreatingResolvedTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageIdCounter = useRef<number>(0);
  const currentStreamText = useRef<string>("");
  const isFinalizingMessage = useRef<boolean>(false);
  const streamTimeoutRef = useRef<number | null>(null);
  const initialPromptSent = useRef<boolean>(false);

  // Proteção de rota
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (!state || !state.title || !state.ticketBody) {
      navigate("/tickets/register");
      return;
    }
  }, [navigate, state]);

  // Função para adicionar mensagem
  const addMessage = (text: string, isUser: boolean) => {
    messageIdCounter.current += 1;
    const newMessage: Message = {
      id: messageIdCounter.current,
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Incrementar contador quando IA responde
    if (!isUser) {
      setAiResponseCount((prev) => prev + 1);
    }
  };

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Conectar ao WebSocket
  useEffect(() => {
    if (!state) return;

    const token = getCookie("token");
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080/api/websocket/triage`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket de triagem conectado");
      setIsConnected(true);

      // Enviar informações iniciais do problema automaticamente
      if (!initialPromptSent.current) {
        const systemPrompt = {
          type: "initial",
          title: state.title,
          description: state.ticketBody,
          urgency: state.urgency,
        };

        ws.send(JSON.stringify(systemPrompt));
        initialPromptSent.current = true;
      }
    };

    ws.onmessage = (event) => {
      const text = event.data;
      console.log("[WS RECEIVED]", text.substring(0, 50)); // DEBUG

      if (text === "[FIM]") {
        console.log("[WS] Recebeu [FIM], finalizando mensagem"); // DEBUG
        if (isFinalizingMessage.current) return;
        isFinalizingMessage.current = true;

        if (currentStreamText.current.trim()) {
          addMessage(currentStreamText.current, false);
        }

        currentStreamText.current = "";
        setStreamingMessage("");
        setIsSending(false);
        isFinalizingMessage.current = false;
        return;
      }

      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }

      currentStreamText.current += text;
      setStreamingMessage(currentStreamText.current);
      console.log("[WS] Stream atual:", currentStreamText.current.length, "chars"); // DEBUG

      streamTimeoutRef.current = window.setTimeout(() => {
        if (isFinalizingMessage.current) return;
        isFinalizingMessage.current = true;

        if (currentStreamText.current.trim()) {
          addMessage(currentStreamText.current, false);
        }

        currentStreamText.current = "";
        setStreamingMessage("");
        setIsSending(false);
        isFinalizingMessage.current = false;
      }, 2000);
    };

    ws.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
      setIsConnected(false);
      setIsSending(false);
    };

    ws.onclose = () => {
      console.log("WebSocket desconectado");
      setIsConnected(false);
      currentStreamText.current = "";
      setStreamingMessage("");
      setIsSending(false);
      isFinalizingMessage.current = false;
    };

    return () => {
      if (streamTimeoutRef.current) {
        clearTimeout(streamTimeoutRef.current);
      }
      ws.close();
    };
  }, [state]);

  const handleSend = () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected || isSending) return;

    setIsSending(true);
    addMessage(inputMessage, true);

    wsRef.current.send(
      JSON.stringify({
        type: "message",
        prompt: inputMessage,
        model: "qwen2.5-coder:0.5b",
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

  const handleContactTechnician = async () => {
    if (!state) return;

    setIsCreatingTicket(true);

    try {
      // 1. Criar o ticket
      const ticketResponse = await apiPost<{ id: number }>("/tickets", {
        title: state.title,
        ticketBody: state.ticketBody,
        urgency: state.urgency,
      });

      const ticketId = ticketResponse.id;

      // 2. Enviar histórico da conversa para gerar resumo em background
      const conversationHistory = messages.map((msg) => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text,
      }));

      await apiPost(`/tickets/${ticketId}/ai-summary`, {
        conversationHistory,
      });

      showSuccess("Chamado criado! Você será atendido por um técnico.");
      navigate("/home");
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
      showError("Erro ao criar chamado. Tente novamente.");
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleProblemResolved = async () => {
    if (!state) return;

    setIsCreatingResolvedTicket(true);

    try {
      // 1. Criar o ticket
      const ticketResponse = await apiPost<{ id: number }>("/tickets", {
        title: state.title,
        ticketBody: state.ticketBody,
        urgency: state.urgency,
      });

      const ticketId = ticketResponse.id;

      // 2. Formatar histórico do chat como solução
      const chatHistory = messages
        .map((msg) => `${msg.isUser ? "Você" : "IA"}: ${msg.text}`)
        .join("\n\n");

      const resolutionMessage = `Problema resolvido pela triagem inteligente.\n\n📝 Histórico da conversa:\n\n${chatHistory}`;

      // 3. Resolver o ticket imediatamente
      await apiPost(`/tickets/${ticketId}/resolve`, {
        resolutionMessage,
      });

      showSuccess("Ótimo! Seu problema foi marcado como resolvido.");
      navigate("/home");
    } catch (error) {
      console.error("Erro ao criar ticket resolvido:", error);
      showError("Erro ao criar chamado. Tente novamente.");
    } finally {
      setIsCreatingResolvedTicket(false);
    }
  };

  if (!state) {
    return null;
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumbs={[
          { label: "Chamados", path: "/home" },
          { label: "Novo Chamado", path: "/tickets/register" },
          { label: "Triagem Inteligente" },
        ]}
      />

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        {/* Informações do problema */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600" }}>
            Seu problema
          </h2>
          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "14px", color: "#6c757d" }}>Título:</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px" }}>{state.title}</p>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "14px", color: "#6c757d" }}>Descrição:</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", whiteSpace: "pre-wrap" }}>
              {state.ticketBody}
            </p>
          </div>
          <div>
            <strong style={{ fontSize: "14px", color: "#6c757d" }}>Urgência:</strong>
            <span
              style={{
                marginLeft: "8px",
                padding: "4px 12px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "500",
                backgroundColor:
                  state.urgency === 3 ? "#dc3545" : state.urgency === 2 ? "#ffc107" : "#28a745",
                color: "white",
              }}
            >
              {state.urgency === 3 ? "Alta" : state.urgency === 2 ? "Média" : "Baixa"}
            </span>
          </div>
        </div>

        {/* Chat com IA */}
        <div
          style={{
            background: "#fff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            height: "500px",
          }}
        >
          {/* Header do chat */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e9ecef",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                Assistente de Triagem
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6c757d" }}>
                {isConnected ? "🟢 Online" : "🔴 Desconectado"}
                {aiResponseCount > 0 &&
                  ` • ${aiResponseCount} resposta${aiResponseCount > 1 ? "s" : ""}`}
              </p>
            </div>
            {aiResponseCount >= 3 && (
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleProblemResolved}
                  disabled={isCreatingResolvedTicket || isCreatingTicket}
                  className="btn btn--success"
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      isCreatingResolvedTicket || isCreatingTicket ? "not-allowed" : "pointer",
                    opacity: isCreatingResolvedTicket || isCreatingTicket ? 0.6 : 1,
                  }}
                >
                  {isCreatingResolvedTicket ? "Criando..." : "✓ Meu problema foi resolvido"}
                </button>
                <button
                  onClick={handleContactTechnician}
                  disabled={isCreatingTicket || isCreatingResolvedTicket}
                  className="btn btn--primary"
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                  }}
                >
                  {isCreatingTicket ? "Criando..." : "Falar com um técnico"}
                </button>
              </div>
            )}
          </div>

          {/* Mensagens */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "#f8f9fa",
            }}
          >
            {messages.length === 0 && !streamingMessage ? (
              <div style={{ textAlign: "center", color: "#6c757d", marginTop: "60px" }}>
                <p style={{ fontSize: "16px", marginBottom: "8px" }}>👋 Olá!</p>
                <p style={{ fontSize: "14px" }}>
                  Vou tentar ajudar você a resolver este problema antes de criar um chamado.
                </p>
                <p style={{ fontSize: "14px", marginTop: "8px", color: "#999" }}>
                  Aguarde enquanto analiso seu problema...
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
                        maxWidth: "75%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        backgroundColor: msg.isUser ? "#007bff" : "white",
                        color: msg.isUser ? "white" : "#212529",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow: msg.isUser ? "none" : "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {streamingMessage && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        backgroundColor: "white",
                        color: "#212529",
                        fontSize: "14px",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
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
              padding: "16px 20px",
              borderTop: "1px solid #e9ecef",
              backgroundColor: "white",
            }}
          >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua resposta..."
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
                className="btn btn--primary"
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                }}
              >
                {isSending ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>

        {/* Informação sobre o botão */}
        {aiResponseCount < 3 && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#e7f3ff",
              border: "1px solid #b3d9ff",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#004085",
            }}
          >
            ℹ️ O botão "Falar com um técnico" será liberado após 3 respostas da IA.
            <br />
            Atualmente: {aiResponseCount}/3 respostas
          </div>
        )}
      </div>
    </PageLayout>
  );
}
