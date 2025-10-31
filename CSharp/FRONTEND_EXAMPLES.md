# Exemplo Prático - Implementação Frontend

Este arquivo contém exemplos práticos e completos de como integrar o WebSocket no frontend.

## 📦 Exemplo 1: Hook React (Recomendado)

### `hooks/useTicketAI.ts`

```typescript
import { useEffect, useState, useRef } from "react";

export interface AIResponse {
  type: "stream" | "cached" | "done" | "error";
  content?: string;
  response?: string;
  message?: string;
}

interface UseTicketAIProps {
  ticketId: number;
  ticketBody: string;
  onComplete?: () => void;
}

export function useTicketAI({ ticketId, ticketBody, onComplete }: UseTicketAIProps) {
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!ticketId || !ticketBody) return;

    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:5000/api/websocket/chat/${ticketId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket conectado");
        setIsLoading(true);
        setError(null);
        setResponse("");

        // Enviar ticket body
        ws.send(JSON.stringify({ ticketBody }));
      };

      ws.onmessage = (event) => {
        try {
          const data: AIResponse = JSON.parse(event.data);

          switch (data.type) {
            case "stream":
              // Concatenar chunks de resposta
              setResponse((prev) => prev + (data.content || ""));
              break;

            case "cached":
              // Resposta em cache
              setResponse(data.response || "");
              setIsCached(true);
              console.log("📦 Usando resposta em cache");
              break;

            case "done":
              // Finalizar
              setIsLoading(false);
              console.log("✅ Processamento concluído");
              onComplete?.();
              break;

            case "error":
              // Erro
              setError(data.message || "Erro desconhecido");
              setIsLoading(false);
              break;
          }
        } catch (err) {
          console.error("❌ Erro ao parsear mensagem:", err);
          setError("Erro ao processar resposta");
        }
      };

      ws.onerror = (event) => {
        console.error("❌ Erro WebSocket:", event);
        setError("Erro ao conectar ao servidor");
        setIsLoading(false);
      };

      ws.onclose = () => {
        console.log("❌ WebSocket desconectado");
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    // Cleanup
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [ticketId, ticketBody]);

  return {
    response,
    isLoading,
    error,
    isCached,
  };
}
```

### Uso no Componente

```typescript
import { useTicketAI } from "@/hooks/useTicketAI";

export function TicketDetailPage({ ticketId }: { ticketId: number }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  // Buscar ticket
  useEffect(() => {
    fetch(`/api/tickets/${ticketId}`)
      .then((res) => res.json())
      .then(setTicket);
  }, [ticketId]);

  // Usar hook de IA
  const { response, isLoading, error, isCached } = useTicketAI({
    ticketId,
    ticketBody: ticket?.ticketBody || "",
  });

  if (!ticket) return <div>Carregando ticket...</div>;

  return (
    <div className="ticket-detail">
      <h1>{ticket.title}</h1>
      <p>{ticket.ticketBody}</p>

      <section className="ai-section">
        <h2>💡 Análise da IA</h2>

        {isLoading && <div className="spinner">Processando...</div>}

        {error && <div className="error">❌ {error}</div>}

        {isCached && <div className="badge">📦 Resposta em cache</div>}

        {response && (
          <div className="ai-response">
            <p>{response}</p>
          </div>
        )}
      </section>
    </div>
  );
}
```

---

## 📦 Exemplo 2: Context API

### `context/AIContext.tsx`

```typescript
import React, { createContext, useContext, useState } from "react";

interface AIContextType {
  ticketResponse: string;
  isLoading: boolean;
  error: string | null;
  fetchAIResponse: (ticketId: number, ticketBody: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [ticketResponse, setTicketResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIResponse = async (ticketId: number, ticketBody: string) => {
    return new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:5000/api/websocket/chat/${ticketId}`);

      ws.onopen = () => {
        setIsLoading(true);
        setError(null);
        setTicketResponse("");
        ws.send(JSON.stringify({ ticketBody }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "stream") {
          setTicketResponse((prev) => prev + (data.content || ""));
        } else if (data.type === "cached") {
          setTicketResponse(data.response || "");
        } else if (data.type === "done") {
          setIsLoading(false);
          resolve();
        } else if (data.type === "error") {
          setError(data.message);
          setIsLoading(false);
          resolve();
        }
      };

      ws.onerror = () => {
        setError("Erro de conexão");
        setIsLoading(false);
        resolve();
      };
    });
  };

  return (
    <AIContext.Provider value={{ ticketResponse, isLoading, error, fetchAIResponse }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI deve ser usado dentro de AIProvider");
  }
  return context;
}
```

---

## 📦 Exemplo 3: Componente Simples

### `components/TicketAIChat.tsx`

```typescript
import React, { useEffect, useState } from "react";

interface TicketAIChatProps {
  ticketId: number;
  ticketBody: string;
}

export function TicketAIChat({ ticketId, ticketBody }: TicketAIChatProps) {
  const [messages, setMessages] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:5000/api/websocket/chat/${ticketId}`);

    ws.onopen = () => {
      setIsLoading(true);
      ws.send(JSON.stringify({ ticketBody }));
    };

    ws.onmessage = (event) => {
      const { type, content, response } = JSON.parse(event.data);

      if (type === "stream") {
        setMessages((m) => m + content);
      } else if (type === "cached") {
        setMessages(response);
      } else if (type === "done") {
        setIsLoading(false);
      } else if (type === "error") {
        setError("Erro ao processar");
        setIsLoading(false);
      }
    };

    return () => ws.close();
  }, [ticketId, ticketBody]);

  return (
    <div>
      {isLoading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {messages && <pre>{messages}</pre>}
    </div>
  );
}
```

---

## 🛠️ Exemplo 4: Com Configuração Dinâmica

### `config/websocket.ts`

```typescript
export const WEBSOCKET_CONFIG = {
  // Desenvolvimento
  dev: "ws://localhost:5000",

  // Produção
  prod: "wss://api.seudominio.com",

  // Endpoint
  endpoint: "/api/websocket/chat",

  // Timeout
  timeout: 30000,

  // Retry
  maxRetries: 3,
  retryDelay: 1000,
};

export function getWebSocketUrl(ticketId: number, isDev = true): string {
  const baseUrl = isDev ? WEBSOCKET_CONFIG.dev : WEBSOCKET_CONFIG.prod;
  return `${baseUrl}${WEBSOCKET_CONFIG.endpoint}/${ticketId}`;
}
```

### Uso com Configuração

```typescript
import { getWebSocketUrl, WEBSOCKET_CONFIG } from "@/config/websocket";

const isDev = process.env.NODE_ENV === "development";
const wsUrl = getWebSocketUrl(ticketId, isDev);
const ws = new WebSocket(wsUrl);
```

---

## 📊 Exemplo 5: Com Tratamento de Reconexão

```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(ticketId: number, ticketBody: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(`ws://localhost:5000/api/websocket/chat/${ticketId}`);

        ws.onopen = () => {
          this.reconnectAttempts = 0;
          ws.send(JSON.stringify({ ticketBody }));
          resolve();
        };

        ws.onerror = () => {
          this.reconnect(ticketId, ticketBody, resolve, reject);
        };

        this.ws = ws;
      } catch (error) {
        reject(error);
      }
    });
  }

  private reconnect(
    ticketId: number,
    ticketBody: string,
    resolve: () => void,
    reject: (error: Error) => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(ticketId, ticketBody).then(resolve).catch(reject);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      reject(new Error("Falha ao conectar ao WebSocket"));
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.ws?.close();
  }
}
```

---

## ✅ Checklist de Implementação

- [ ] Escolher uma das estratégias acima
- [ ] Copiar código para o projeto frontend
- [ ] Importar em componentes que precisam
- [ ] Testar com diferentes tickets
- [ ] Verificar se cache está funcionando
- [ ] Tratar erros apropriadamente
- [ ] Adicionar loading state
- [ ] Estilizar a resposta da IA
- [ ] Testar em produção

---

## 🚀 Próximos Passos

1. Copie um dos exemplos acima
2. Adapte para sua estrutura de projeto
3. Teste localmente com wscat
4. Implemente nos componentes que precisam
5. Teste fluxo completo
6. Faça deploy com confiança

Para dúvidas, consulte `websocket.md` ou `TESTING_GUIDE.md`.
