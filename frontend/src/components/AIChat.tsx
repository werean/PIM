import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "../hooks/useConfirm";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPost } from "../services/api";
import { getCookie } from "../utils/cookies";
import ConfirmModal from "./ConfirmModal";

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

interface OllamaModel {
  name: string;
  description?: string;
  size?: string;
  downloaded?: boolean;
}

interface OllamaStatus {
  isRunning: boolean;
  isInstalled: boolean;
  message: string;
  serverUrl?: string;
  ollamaPath?: string;
}

export default function AIChat({
  ticketId,
  ticketTitle,
  ticketBody,
}: AIChatProps) {
  const { showSuccess, showError, showInfo, showWarning } = useToast();
  const { confirm, confirmState, handleCancel } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedModel, setSelectedModel] = useState("qwen3:0.6b");
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [pullProgress, setPullProgress] = useState<{
    model: string;
    status: string;
    progress: number;
    error?: string;
  } | null>(null);
  const [isDeletingModel, setIsDeletingModel] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [isManagingOllama, setIsManagingOllama] = useState(false);
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
      messages: messages.map((m) => ({
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

      const session = JSON.parse(saved) as {
        messages: Array<{ text: string; isUser: boolean; timestamp: string }>;
      };
      const restoredMessages: Message[] = session.messages.map(
        (msg, index: number) => ({
          id: index + 1,
          text: msg.text,
          isUser: msg.isUser,
          timestamp: new Date(msg.timestamp),
        })
      );

      if (restoredMessages.length > 0) {
        messageIdCounter.current = restoredMessages.length;
        setMessages(restoredMessages);
        console.log(
          `✅ Sessão restaurada (${restoredMessages.length} mensagens)`
        );
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

      console.log(
        `✅ Sessão sincronizada com banco (${messages.length} mensagens)`
      );
    } catch (error) {
      console.error("❌ Erro ao sincronizar com banco:", error);
    }
  }, [messages, ticketId]);

  // Verificar status do Ollama ao abrir o chat
  const checkOllamaStatus = useCallback(async () => {
    setIsCheckingOllama(true);
    try {
      const status = await apiGet<OllamaStatus>("/api/ollama/status");
      setOllamaStatus(status);
      return status;
    } catch (error) {
      console.error("Erro ao verificar status do Ollama:", error);
      setOllamaStatus({
        isRunning: false,
        isInstalled: false,
        message: "Erro ao verificar status",
      });
      return null;
    } finally {
      setIsCheckingOllama(false);
    }
  }, []);

  // Iniciar servidor Ollama
  const startOllama = async () => {
    setIsManagingOllama(true);
    try {
      await apiPost("/api/ollama/start", {});
      showSuccess("Servidor Ollama iniciado! Aguarde alguns segundos...");

      // Aguardar 3 segundos e verificar status novamente
      setTimeout(async () => {
        await checkOllamaStatus();
        // Carregar lista de modelos após Ollama iniciar
        console.log("[startOllama] Ollama iniciado, carregando modelos...");
        await loadModels();
        setIsManagingOllama(false);
      }, 3000);
    } catch (error) {
      console.error("Erro ao iniciar Ollama:", error);
      showError("Erro ao iniciar servidor Ollama");
      setIsManagingOllama(false);
    }
  };

  // Parar servidor Ollama
  const stopOllama = async () => {
    setIsManagingOllama(true);
    try {
      await apiPost("/api/ollama/stop", {});
      showSuccess("Servidor Ollama parado!");
      await checkOllamaStatus();
    } catch (error) {
      console.error("Erro ao parar Ollama:", error);
      showError("Erro ao parar servidor Ollama");
    } finally {
      setIsManagingOllama(false);
    }
  };

  // Abrir página de download do Ollama
  const downloadOllama = async () => {
    try {
      const response = await apiGet<{ url: string }>(
        "/api/ollama/download-url"
      );
      window.open(response.url, "_blank");
      showInfo(
        "Após instalar o Ollama, reinicie o chat para verificar o status."
      );
    } catch (error) {
      console.error("Erro ao obter URL de download:", error);
      window.open("https://ollama.com/download/windows", "_blank");
    }
  };

  // Função para carregar modelos (pode ser chamada de qualquer lugar)
  const loadModels = useCallback(async () => {
    console.log("[loadModels] Carregando lista de modelos...");
    setIsLoadingModels(true);

    let localModels: OllamaModel[] = [];
    let availableModelsForDownload: OllamaModel[] = [];

    try {
      // Tentar listar modelos locais (pode falhar se Ollama não estiver rodando)
      const localResponse = await apiGet<{ models: OllamaModel[] }>(
        "/api/ollama/models"
      );
      localModels = localResponse.models || [];
      console.log("[loadModels] Modelos locais:", localModels.length);
    } catch {
      // Ollama pode não estar rodando
      console.log("[loadModels] Não foi possível listar modelos locais");
    }

    try {
      // Sempre buscar modelos disponíveis para download
      const availableResponse = await apiGet<{ models: OllamaModel[] }>(
        "/api/ollama/models/available"
      );
      availableModelsForDownload = availableResponse.models || [];
      console.log(
        "[loadModels] Modelos disponíveis:",
        availableModelsForDownload.length
      );
    } catch (error) {
      console.error("Erro ao buscar modelos disponíveis:", error);
      // Se falhar, usar lista padrão
      availableModelsForDownload = [
        {
          name: "qwen3:0.6b",
          description: "600MB (recomendado)",
          size: "600MB",
        },
        {
          name: "llama3.2:1b",
          description: "1.3GB (recomendado)",
          size: "1.3GB",
        },
        {
          name: "gemma2:2b",
          description: "1.6GB (recomendado)",
          size: "1.6GB",
        },
        { name: "llama3.2:3b", description: "2GB", size: "2GB" },
        { name: "phi3:mini", description: "2.3GB", size: "2.3GB" },
        { name: "mistral:7b", description: "4.1GB", size: "4.1GB" },
        { name: "llama3.1:8b", description: "4.7GB", size: "4.7GB" },
      ];
    }

    // Combinar modelos locais (baixados) com disponíveis para download
    const allModels = [
      // Modelos já baixados (com badge de baixado, sem tamanho)
      ...localModels.map((m) => ({
        name: m.name,
        description: "✅ Baixado",
        size: undefined, // Não mostrar tamanho para modelos já baixados
        downloaded: true,
      })),
      // Modelos disponíveis para download (com tamanho, sem badge de baixado)
      ...availableModelsForDownload
        .filter((am) => !localModels.some((lm) => lm.name === am.name))
        .map((m) => ({
          name: m.name,
          description: m.description,
          size: m.size,
          downloaded: false,
        })),
    ];

    if (allModels.length > 0) {
      setAvailableModels(allModels as OllamaModel[]);
      console.log(
        "[loadModels] Total de modelos configurados:",
        allModels.length
      );
    } else {
      // Último fallback
      setAvailableModels([
        {
          name: "qwen3:0.6b",
          description: "600MB (recomendado)",
          size: "600MB",
        },
      ]);
    }

    setIsLoadingModels(false);
  }, []);

  // Carregar modelos disponíveis ao abrir o chat
  useEffect(() => {
    if (!isOpen) return;

    // Verificar status do Ollama primeiro
    checkOllamaStatus();

    // Carregar modelos
    loadModels();
  }, [isOpen, checkOllamaStatus, loadModels]);

  // Função para verificar e baixar modelo se necessário
  const ensureModelAvailable = async (modelName: string): Promise<boolean> => {
    try {
      console.log(`[ensureModelAvailable] Verificando modelo: ${modelName}`);

      // Verificar se modelo existe
      const response = await apiPost<{ exists: boolean }>(
        "/api/ollama/models/check",
        {
          model: modelName,
        }
      );

      console.log(`[ensureModelAvailable] Modelo existe:`, response.exists);

      if (response.exists) {
        return true;
      }

      // Se não existe, perguntar para baixar
      const confirmDownload = await confirm({
        title: "Modelo não encontrado",
        message: `O modelo "${modelName}" não está baixado.\n\nDeseja baixar agora?\n\n⚠️ O download pode demorar alguns minutos. Após concluído, você poderá enviar sua mensagem.`,
        confirmText: "Sim, baixar",
        cancelText: "Cancelar",
        variant: "info",
      });

      console.log(
        `[ensureModelAvailable] Usuário confirmou download:`,
        confirmDownload
      );

      if (!confirmDownload) {
        return false;
      }

      // Iniciar download com progresso
      console.log(
        `[ensureModelAvailable] Iniciando download do modelo ${modelName}...`
      );
      setIsPullingModel(true);
      setPullProgress({
        model: modelName,
        status: "Iniciando download...",
        progress: 0,
      });

      let progressInterval: number | null = null;

      try {
        // Simular progresso realista baseado no tempo
        let progress = 0;

        console.log(
          `[ensureModelAvailable] Configurando intervalo de progresso...`
        );
        progressInterval = window.setInterval(() => {
          // Progresso mais lento no início, mais rápido no meio, muito lento no final
          if (progress < 10) {
            progress += 2; // Muito lento no início (0-10%)
          } else if (progress < 70) {
            progress += 3; // Mais rápido no meio (10-70%)
          } else if (progress < 90) {
            progress += 1; // Lento perto do fim (70-90%)
          } else if (progress < 95) {
            progress += 0.5; // Muito lento no final (90-95%)
          }

          if (progress <= 95) {
            const statusMessages = [
              "Baixando modelo...",
              "Baixando modelo... Pode demorar alguns minutos",
              "Processando download...",
              "Quase lá...",
            ];
            const statusIndex = Math.floor(progress / 25);
            setPullProgress((prev) =>
              prev
                ? {
                    ...prev,
                    progress,
                    status: statusMessages[statusIndex] || "Baixando modelo...",
                  }
                : null
            );
          }
        }, 3000); // Atualizar a cada 3 segundos

        // Aguardar o download completo (backend agora aguarda)
        console.log(
          `[ensureModelAvailable] Enviando requisição de pull para o backend...`
        );
        const pullResponse = await apiPost("/api/ollama/models/pull", {
          model: modelName,
        });
        console.log(`[ensureModelAvailable] Resposta do pull:`, pullResponse);

        if (progressInterval) clearInterval(progressInterval);
        setPullProgress({
          model: modelName,
          status: "Download concluído! Agora você pode enviar sua mensagem.",
          progress: 100,
        });

        console.log(`[ensureModelAvailable] Download concluído com sucesso!`);

        setTimeout(async () => {
          setPullProgress(null);
          setIsPullingModel(false);
          // Recarregar lista de modelos para mostrar o modelo como baixado
          console.log(
            "[ensureModelAvailable] Recarregando lista de modelos..."
          );
          await loadModels();
        }, 3000);

        // Retornar false para NÃO enviar a mensagem automaticamente
        // Usuário precisa clicar em enviar novamente
        return false;
      } catch (error: unknown) {
        if (progressInterval) clearInterval(progressInterval);

        const err = error as {
          response?: { data?: { error?: string; details?: string } };
          message?: string;
        };
        const errorMessage =
          err.response?.data?.error ||
          err.response?.data?.details ||
          err.message ||
          "Erro desconhecido ao baixar modelo";

        setPullProgress({
          model: modelName,
          status: "Erro no download",
          progress: 0,
          error: errorMessage,
        });

        setIsPullingModel(false);
        console.error("Erro ao baixar modelo:", errorMessage);
        return false;
      }
    } catch (error: unknown) {
      console.error("Erro ao verificar/baixar modelo:", error);
      setIsPullingModel(false);
      setPullProgress(null);
      return false;
    }
  };

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
        const history = await apiGet<AIMessageFromDB[]>(
          `/api/tickets/${ticketId}/ai-messages`
        );

        if (history.length > 0) {
          // Converter histórico do banco para formato do chat
          const loadedMessages: Message[] = history.map((msg) => ({
            id: msg.id,
            text: msg.content,
            isUser: msg.role === "user",
            timestamp: new Date(msg.createdAt),
          }));

          // Atualizar contador de IDs
          messageIdCounter.current = Math.max(
            ...loadedMessages.map((m) => m.id)
          );
          setMessages(loadedMessages);
          console.log(
            `✅ Histórico carregado do banco (${loadedMessages.length} mensagens)`
          );

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

  const handleSend = async () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected || isSending)
      return;

    // Bloquear envio se está baixando modelo
    if (isPullingModel) {
      showWarning(
        "Aguarde o download do modelo terminar antes de enviar mensagens."
      );
      return;
    }

    // Verificar se o modelo está disponível
    const modelAvailable = await ensureModelAvailable(selectedModel);
    if (!modelAvailable) {
      // Não envia a mensagem - usuário precisa aguardar o download
      return;
    }

    setIsSending(true);
    addMessage(inputMessage, true);

    // Enviar mensagem via WebSocket com o modelo selecionado
    wsRef.current.send(
      JSON.stringify({
        prompt: inputMessage,
        model: selectedModel,
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
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              Assistente IA
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>
              {messages.length > 0
                ? `${messages.length} mensagens`
                : "Clique para abrir"}
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
              <div style={{ fontWeight: "600", fontSize: "16px" }}>
                Assistente IA
              </div>
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

          {/* Status do Ollama */}
          {ollamaStatus && !ollamaStatus.isRunning && (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#fff3cd",
                borderBottom: "2px solid #ffc107",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#856404",
                }}
              >
                ⚠️ {ollamaStatus.message}
              </div>

              {!ollamaStatus.isInstalled ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={downloadOllama}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    📥 Instalar Ollama
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={startOllama}
                    disabled={isManagingOllama}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: isManagingOllama ? "not-allowed" : "pointer",
                      opacity: isManagingOllama ? 0.6 : 1,
                    }}
                  >
                    {isManagingOllama ? "⏳ Iniciando..." : "▶️ Iniciar Ollama"}
                  </button>
                  <button
                    onClick={async () => {
                      await checkOllamaStatus();
                      // Recarregar lista de modelos ao verificar status
                      console.log(
                        "[RefreshButton] Verificando status e recarregando modelos..."
                      );
                      await loadModels();
                    }}
                    disabled={isCheckingOllama || isLoadingModels}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor:
                        isCheckingOllama || isLoadingModels
                          ? "not-allowed"
                          : "pointer",
                      opacity: isCheckingOllama || isLoadingModels ? 0.6 : 1,
                    }}
                  >
                    {isCheckingOllama || isLoadingModels ? "⏳" : "🔄"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botão de Parar Ollama (quando rodando) */}
          {ollamaStatus && ollamaStatus.isRunning && (
            <div
              style={{
                padding: "8px 16px",
                backgroundColor: "#d4edda",
                borderBottom: "1px solid #c3e6cb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#155724",
                }}
              >
                ✅ Ollama rodando
              </span>
              <button
                onClick={stopOllama}
                disabled={isManagingOllama}
                style={{
                  padding: "4px 12px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "500",
                  cursor: isManagingOllama ? "not-allowed" : "pointer",
                  opacity: isManagingOllama ? 0.6 : 1,
                }}
              >
                {isManagingOllama ? "⏳" : "⏹️ Parar"}
              </button>
            </div>
          )}

          {/* Seletor de Modelo - Sempre visível */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #dee2e6",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <label
              htmlFor="model-select"
              style={{
                fontSize: "12px",
                fontWeight: "500",
                color: "#6c757d",
              }}
            >
              🤖 Modelo:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={
                isPullingModel ||
                isLoadingModels ||
                (ollamaStatus !== null && !ollamaStatus.isRunning)
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #ced4da",
                fontSize: "12px",
                backgroundColor: "white",
                cursor:
                  isPullingModel || (ollamaStatus && !ollamaStatus.isRunning)
                    ? "not-allowed"
                    : "pointer",
                opacity: ollamaStatus && !ollamaStatus.isRunning ? 0.6 : 1,
              }}
            >
              {isLoadingModels ? (
                <option>Carregando...</option>
              ) : availableModels.length > 0 ? (
                availableModels.map((model) => {
                  // Para modelos baixados: "nome - ✅ Baixado"
                  // Para modelos não baixados: "nome (tamanho) (recomendado)"
                  let displayText = model.name;

                  if (model.downloaded) {
                    displayText += " - ✅ Baixado";
                  } else {
                    // Adicionar tamanho se disponível
                    if (model.size) {
                      displayText += ` (${model.size})`;
                    }
                    // Adicionar (recomendado) se a descrição contiver isso
                    if (
                      model.description &&
                      model.description.includes("recomendado")
                    ) {
                      displayText += " (recomendado)";
                    }
                  }

                  return (
                    <option key={model.name} value={model.name}>
                      {displayText}
                    </option>
                  );
                })
              ) : (
                <option>Nenhum modelo disponível</option>
              )}
            </select>
            {isPullingModel && !pullProgress?.error && (
              <span style={{ fontSize: "12px", color: "#ffc107" }}>
                ⏳ Baixando...
              </span>
            )}
            {/* Botão de remover modelo (só aparece se o modelo selecionado estiver baixado) */}
            {availableModels.find((m) => m.name === selectedModel)
              ?.downloaded && (
              <button
                onClick={async () => {
                  const confirmDelete = await confirm({
                    title: "Remover Modelo",
                    message: `Tem certeza que deseja remover o modelo "${selectedModel}"?\n\nEsta ação não pode ser desfeita.`,
                    confirmText: "Sim, remover",
                    cancelText: "Cancelar",
                    variant: "danger",
                  });
                  if (!confirmDelete) return;

                  setIsDeletingModel(true);
                  try {
                    console.log(
                      `[DeleteModel] Removendo modelo: ${selectedModel}`
                    );
                    const response = await fetch(
                      "http://localhost:8080/api/ollama/models/delete",
                      {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ model: selectedModel }),
                      }
                    );

                    console.log(
                      `[DeleteModel] Status da resposta:`,
                      response.status
                    );

                    // Tentar ler o JSON, mas não falhar se estiver vazio
                    let responseData = null;
                    const responseText = await response.text();
                    console.log(
                      `[DeleteModel] Resposta em texto:`,
                      responseText
                    );

                    if (responseText) {
                      try {
                        responseData = JSON.parse(responseText);
                      } catch (jsonError) {
                        console.warn(
                          `[DeleteModel] Resposta não é JSON válido:`,
                          jsonError
                        );
                      }
                    }

                    if (!response.ok) {
                      const errorMessage =
                        responseData?.error ||
                        responseData?.details ||
                        "Erro ao remover modelo";
                      throw new Error(errorMessage);
                    }

                    console.log(`[DeleteModel] Modelo removido com sucesso!`);
                    showSuccess(
                      `Modelo "${selectedModel}" removido com sucesso!`
                    );

                    // Recarregar lista de modelos para refletir a remoção
                    console.log(
                      "[DeleteModel] Recarregando lista de modelos..."
                    );
                    await loadModels();

                    // Se o modelo removido era o selecionado, selecionar o primeiro disponível
                    setSelectedModel("qwen3:0.6b");
                  } catch (error: unknown) {
                    console.error(`[DeleteModel] Erro:`, error);
                    const err = error as { message?: string };
                    const errorMessage =
                      err.message || "Erro ao remover modelo";
                    showError(`Erro ao remover modelo: ${errorMessage}`);
                  } finally {
                    setIsDeletingModel(false);
                  }
                }}
                disabled={isPullingModel || isLoadingModels || isDeletingModel}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "500",
                  cursor:
                    isPullingModel || isLoadingModels || isDeletingModel
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isPullingModel || isLoadingModels || isDeletingModel
                      ? 0.6
                      : 1,
                }}
                title="Remover modelo"
              >
                {isDeletingModel ? "⏳ Removendo..." : "🗑️ Remover"}
              </button>
            )}
          </div>

          {/* Barra de Progresso de Download */}
          {pullProgress && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: pullProgress.error ? "#f8d7da" : "#e7f3ff",
                borderBottom: "1px solid #dee2e6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      color: pullProgress.error ? "#721c24" : "#004085",
                    }}
                  >
                    {pullProgress.error ? "❌" : "📥"} {pullProgress.model}
                  </span>
                  {pullProgress.error && (
                    <div
                      style={{
                        position: "relative",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        backgroundColor: "#dc3545",
                        borderRadius: "50%",
                        cursor: "help",
                      }}
                      title={pullProgress.error}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "white",
                          fontWeight: "bold",
                          lineHeight: "1",
                        }}
                      >
                        i
                      </span>
                    </div>
                  )}
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: pullProgress.error ? "#721c24" : "#004085",
                    }}
                  >
                    {pullProgress.status}
                  </span>
                  {pullProgress.error && (
                    <button
                      onClick={() => {
                        setPullProgress(null);
                        setIsPullingModel(false);
                      }}
                      style={{
                        padding: "2px 8px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        fontSize: "10px",
                        cursor: "pointer",
                        fontWeight: "500",
                      }}
                    >
                      ✕ Fechar
                    </button>
                  )}
                </div>
              </div>
              {!pullProgress.error && (
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "#d1ecf1",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pullProgress.progress}%`,
                      height: "100%",
                      backgroundColor:
                        pullProgress.progress === 100 ? "#28a745" : "#007bff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}
              {pullProgress.error && (
                <div
                  style={{
                    marginTop: "6px",
                    padding: "8px",
                    backgroundColor: "#fff",
                    border: "1px solid #f5c6cb",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#721c24",
                    wordBreak: "break-word",
                  }}
                >
                  <strong>Detalhes do erro:</strong> {pullProgress.error}
                </div>
              )}
            </div>
          )}

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
              <div
                style={{
                  textAlign: "center",
                  color: "#6c757d",
                  marginTop: "40px",
                }}
              >
                <p>⏳ Carregando histórico...</p>
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6c757d",
                  marginTop: "40px",
                }}
              >
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
                        boxShadow: msg.isUser
                          ? "none"
                          : "0 1px 2px rgba(0,0,0,0.1)",
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
            <div
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isPullingModel
                    ? "Aguarde o download do modelo..."
                    : "Digite sua mensagem..."
                }
                disabled={!isConnected || isSending || isPullingModel}
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
                disabled={
                  !isConnected ||
                  isSending ||
                  !inputMessage.trim() ||
                  isPullingModel
                }
                style={{
                  padding: "10px 16px",
                  backgroundColor: isPullingModel ? "#ffc107" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    !isConnected ||
                    isSending ||
                    !inputMessage.trim() ||
                    isPullingModel
                      ? "not-allowed"
                      : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity:
                    !isConnected ||
                    isSending ||
                    !inputMessage.trim() ||
                    isPullingModel
                      ? 0.6
                      : 1,
                }}
              >
                {isPullingModel
                  ? "⏳ Baixando..."
                  : isSending
                  ? "..."
                  : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
