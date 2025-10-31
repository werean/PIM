# WebSocket - Instruções para Frontend

## Visão Geral

O backend implementa um endpoint WebSocket que permite comunicação em tempo real com a IA (Ollama) para processar tickets. Cada ticket tem sua própria sessão independente, e as respostas são armazenadas em cache para evitar reprocessamento.

---

## Fluxo de Funcionamento

```
1. Técnico abre um ticket
2. Frontend verifica se existe sessão de IA para esse ticket
3. Se existir com resposta em cache → Exibir resposta anterior
4. Se não existir → Enviar ticket body via WebSocket
5. Backend cria sessão e envia para Ollama
6. Resposta é retornada em chunks (streaming)
7. Resposta é armazenada no banco para futuras consultas
```

---

## Endpoint WebSocket

**URL:** `ws://localhost:5000/api/websocket/chat/{ticketId}`

- Substitua `{ticketId}` pelo ID do ticket
- Substitua `localhost:5000` pela URL e porta corretos do seu backend

### Exemplo:

```
ws://localhost:5000/api/websocket/chat/123
```

---

## Formato de Mensagem - Cliente → Servidor

Envie um JSON com o corpo do ticket:

```json
{
  "ticketBody": "Descrição do problema reportado pelo usuário..."
}
```

**Quando enviar:**

- Quando o técnico abrir um ticket
- Uma única vez por ticket (após a primeira abertura, o backend retornará a resposta em cache)

---

## Formato de Mensagem - Servidor → Cliente

O backend retorna diferentes tipos de mensagens:

### 1. **Streaming (tipo: "stream")**

Resposta da IA em tempo real, enviada em chunks:

```json
{
  "type": "stream",
  "content": "Texto parcial da resposta..."
}
```

**O que fazer:** Concatenar os chunks de resposta na interface do usuário.

### 2. **Resposta em Cache (tipo: "cached")**

Ticket já foi processado anteriormente:

```json
{
  "type": "cached",
  "response": "Resposta completa da IA armazenada em cache...",
  "message": "Resposta em cache - ticket já foi processado anteriormente"
}
```

**O que fazer:** Exibir a resposta em cache completa imediatamente.

### 3. **Conclusão (tipo: "done")**

Sinal de que o processamento foi concluído:

```json
{
  "type": "done"
}
```

**O que fazer:** Finalizar o processamento, desabilitar loader/spinner.

### 4. **Erro (tipo: "error")**

Erro durante o processamento:

```json
{
  "type": "error",
  "message": "Descrição do erro..."
}
```

**O que fazer:** Exibir mensagem de erro para o usuário.

---

## Exemplo de Implementação (React/TypeScript)

```typescript
import { useEffect, useState } from "react";

interface WebSocketMessage {
  type: "stream" | "cached" | "done" | "error";
  content?: string;
  response?: string;
  message?: string;
}

export function TicketAIChat({ ticketId, ticketBody }: { ticketId: number; ticketBody: string }) {
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Conectar ao WebSocket
    const wsUrl = `ws://localhost:5000/api/websocket/chat/${ticketId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket conectado");
      setIsLoading(true);
      setError(null);

      // Enviar ticket body
      websocket.send(JSON.stringify({ ticketBody }));
    };

    websocket.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.type) {
          case "stream":
            // Concatenar chunks de resposta
            setAiResponse((prev) => prev + (data.content || ""));
            break;

          case "cached":
            // Resposta em cache
            setAiResponse(data.response || "");
            console.log(data.message);
            break;

          case "done":
            // Finalizar
            setIsLoading(false);
            console.log("Processamento concluído");
            break;

          case "error":
            // Erro
            setError(data.message || "Erro desconhecido");
            setIsLoading(false);
            break;
        }
      } catch (err) {
        console.error("Erro ao parsear mensagem:", err);
      }
    };

    websocket.onerror = (error) => {
      console.error("Erro WebSocket:", error);
      setError("Erro ao conectar ao servidor WebSocket");
      setIsLoading(false);
    };

    websocket.onclose = () => {
      console.log("WebSocket desconectado");
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [ticketId, ticketBody]);

  return (
    <div className="ai-chat-container">
      {isLoading && <div className="loader">Processando...</div>}
      {error && <div className="error">{error}</div>}
      {aiResponse && (
        <div className="ai-response">
          <h3>Resposta da IA:</h3>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Checklist para Implementação

- [ ] Conectar ao WebSocket quando o ticket é aberto
- [ ] Enviar `ticketBody` como JSON quando a conexão for estabelecida
- [ ] Escutar mensagens de tipo "stream" e concatenar a resposta
- [ ] Escutar mensagens de tipo "cached" e exibir resposta completa
- [ ] Tratar mensagens de tipo "error" e exibir para o usuário
- [ ] Finalizar o carregamento quando receber "done"
- [ ] Fechar a conexão WebSocket quando o componente for desmontado
- [ ] Testar com múltiplos tickets para verificar sessões independentes
- [ ] Testar abrindo um ticket já processado e verificar resposta em cache

---

## Dicas de Desenvolvimento

1. **URL do Backend:** Certifique-se de que está usando a URL correta. Se desenvolver localmente, use `localhost`. Se estiver em Docker, pode ser necessário usar o nome do container.

2. **Porta:** O backend está rodando na porta configurada no `appsettings.json` ou variáveis de ambiente. Verifique qual porta está sendo usada.

3. **Protocolo:** Use `ws://` para conexões sem SSL ou `wss://` para conexões seguras (HTTPS).

4. **Requisição Única:** Envie o `ticketBody` apenas uma vez, quando a conexão for estabelecida. Não reenvie na mesma sessão.

5. **Estado da Conexão:** Sempre verifique `websocket.readyState` antes de enviar mensagens:

   - `WebSocket.CONNECTING` = 0
   - `WebSocket.OPEN` = 1
   - `WebSocket.CLOSING` = 2
   - `WebSocket.CLOSED` = 3

6. **Tratamento de Erros:** Sempre implemente handlers para `onerror` e `onclose`.

7. **Limpeza:** Feche a conexão WebSocket em `useEffect cleanup` ou quando o componente for desmontado.

---

## Variáveis de Ambiente Backend

Para que o WebSocket funcione corretamente, certifique-se de que as seguintes variáveis estão configuradas:

**appsettings.json:**

```json
{
  "OllamaServer": "http://localhost:11434/api/generate"
}
```

Ou via variável de ambiente:

```bash
export OLLAMA_SERVER=http://localhost:11434/api/generate
```

---

## Troubleshooting

### WebSocket retorna erro 400

- Verifique se a URL está correta
- Confirme se o servidor está rodando
- Verifique se o proxy/firewall não está bloqueando WebSocket

### Mensagem "OLLAMA_SERVER não configurado"

- Adicione a configuração no `appsettings.json`
- Ou configure a variável de ambiente `OLLAMA_SERVER`

### Resposta vazia

- Verifique se o Ollama está rodando e acessível
- Confira os logs do backend para mais detalhes

### Conexão fechada inesperadamente

- Verifique os logs do servidor
- Confirme se há timeout configurado
- Teste com ferramentas como Postman ou wscat

---

## Próximas Melhorias (Futuro)

- [ ] Implementar autenticação JWT no WebSocket
- [ ] Adicionar rate limiting por usuário
- [ ] Implementar reconnect automático no cliente
- [ ] Adicionar compressão de mensagens
- [ ] Implementar múltiplos modelos de IA para escolher
- [ ] Adicionar histórico de conversas
