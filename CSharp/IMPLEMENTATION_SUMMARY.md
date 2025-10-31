# Implementação de WebSocket - Sumário

## ✅ O que foi implementado

### 1. **Entidade de Banco de Dados**

- **Arquivo:** `Entities/TicketAISession.cs`
- **Funcionalidade:** Armazena histórico de sessões de IA por ticket com:
  - ID único
  - Referência ao Ticket
  - Prompt enviado para IA
  - Resposta da IA
  - Data de criação e atualização

### 2. **Serviço de Gerenciamento de Sessões**

- **Arquivo:** `Services/TicketAISessionService.cs`
- **Funcionalidades:**
  - `GetSessionByTicketIdAsync()` - Buscar sessão existente
  - `CreateSessionAsync()` - Criar nova sessão
  - `GetOrCreateSessionAsync()` - Obter ou criar sessão
  - `ProcessAIRequestAsync()` - Comunicar com Ollama em streaming
  - `UpdateSessionResponseAsync()` - Armazenar resposta em cache

### 3. **Controlador WebSocket**

- **Arquivo:** `Controllers/WebSocketController.cs`
- **Endpoint:** `GET /api/websocket/chat/{ticketId}`
- **Funcionalidades:**
  - Aceita conexões WebSocket
  - Recebe mensagens JSON com `ticketBody`
  - Verifica se existe sessão em cache
  - Se existir → Retorna resposta em cache
  - Se não existir → Processa com IA em streaming
  - Envia respostas em chunks ou completas

### 4. **DTOs para WebSocket**

- **Arquivo:** `DTOs/WebSocketMessageDto.cs`
- **Classes:**
  - `WebSocketMessageDto` - Requisição do cliente
  - `WebSocketResponseDto` - Resposta do servidor

### 5. **Configurações no Program.cs**

- ✅ Adicionado `TicketAISessionService` na injeção de dependência
- ✅ Adicionado `IHttpClientFactory` para comunicação com Ollama
- ✅ Habilitado `app.UseWebSockets()` no middleware
- ✅ Atualizado CORS para suportar WebSocket

### 6. **Configuração de Banco de Dados**

- ✅ Atualizado `ApplicationDbContext` com `DbSet<TicketAISession>`
- ✅ Configurado relacionamento com cascade delete
- ✅ Gerada migração: `AddTicketAISession`

### 7. **Configuração do Ollama**

- **Arquivo:** `appsettings.json`
- **Propriedade:** `OllamaServer = http://localhost:11434/api/generate`

---

## 📋 Protocolo de Comunicação WebSocket

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    TÉCNICO ABRE TICKET                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Frontend conecta WebSocket  │
        │  ws://localhost:5000/api/    │
        │  websocket/chat/{ticketId}   │
        └─────────────────┬───────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────┐
        │  Frontend envia:                        │
        │  { "ticketBody": "descrição..." }       │
        └─────────────────┬───────────────────────┘
                          │
        ┌─────────────────▼───────────────────────────┐
        │      Backend verifica sessão existente       │
        └─────────────────┬───────────────────────────┘
                          │
        ┌─────────────────┴───────────────────────────┐
        │                                             │
        ▼                                             ▼
   ┌─────────────┐                            ┌─────────────────┐
   │ JÁ EXISTE   │                            │ NÃO EXISTE      │
   │ COM RESPOSTA│                            │ OU SEM RESPOSTA │
   └──────┬──────┘                            └────────┬────────┘
          │                                            │
          ▼                                            ▼
  ┌──────────────────┐              ┌─────────────────────────────┐
  │ Enviar resposta  │              │ Criar nova sessão no BD      │
  │ em cache:        │              │ Enviar para Ollama          │
  │ type: "cached"   │              │ Receber em streaming        │
  │ response: "..."  │              │ Enviar chunks ao cliente:   │
  └──────┬───────────┘              │ type: "stream"              │
         │                           │ content: "pedaço..."        │
         ▼                           └────────────┬────────────────┘
  ┌──────────────────┐                           │
  │ type: "done"     │                           ▼
  └──────────────────┘              ┌──────────────────────────┐
                                    │ Salvar resposta no BD    │
                                    │ Enviar type: "done"      │
                                    └──────────────────────────┘
```

### Tipos de Resposta

| Tipo     | Uso                              | Exemplo                                                     |
| -------- | -------------------------------- | ----------------------------------------------------------- |
| `stream` | Chunks de resposta em tempo real | `{ "type": "stream", "content": "Olá..." }`                 |
| `cached` | Resposta armazenada em cache     | `{ "type": "cached", "response": "...", "message": "..." }` |
| `done`   | Sinal de conclusão               | `{ "type": "done" }`                                        |
| `error`  | Mensagem de erro                 | `{ "type": "error", "message": "..." }`                     |

---

## 🔧 Próximas Etapas para Frontend

### 1. Criar componente React para o Chat de IA

```typescript
const wsUrl = `ws://localhost:5000/api/websocket/chat/${ticketId}`;
const websocket = new WebSocket(wsUrl);
```

### 2. Implementar handlers

```typescript
websocket.onopen = () => {
  websocket.send(JSON.stringify({ ticketBody }));
};

websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Processar diferentes tipos
};
```

### 3. Renderizar resposta

- Mostrar loader enquanto `isLoading`
- Concatenar chunks de `type: "stream"`
- Exibir resposta completa para `type: "cached"`
- Mostrar erro para `type: "error"`

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

```
✅ Entities/TicketAISession.cs
✅ Services/TicketAISessionService.cs
✅ Controllers/WebSocketController.cs
✅ DTOs/WebSocketMessageDto.cs
✅ websocket.md (documentação para frontend)
✅ Migrations/[timestamp]_AddTicketAISession.cs
```

### Arquivos Modificados

```
✅ Data/ApplicationDbContext.cs
✅ Program.cs
✅ appsettings.json
```

---

## 🚀 Como Testar

### 1. Atualizar Banco de Dados

```bash
dotnet ef database update
```

### 2. Iniciar Backend

```bash
dotnet run
```

### 3. Usar wscat para Testar (opcional)

```bash
npm install -g wscat

# Conectar
wscat -c ws://localhost:5000/api/websocket/chat/1

# Enviar mensagem
{"ticketBody":"Qual é a melhor prática para...?"}
```

### 4. Frontend Tester

Veja arquivo `websocket.md` para código completo em React/TypeScript

---

## 💾 Estrutura do Banco de Dados

### Tabela: TicketAISessions

| Coluna     | Tipo                | Descrição                  |
| ---------- | ------------------- | -------------------------- |
| Id         | int (PK)            | Chave primária             |
| TicketId   | int (FK)            | Referência ao Ticket       |
| Prompt     | string              | Corpo do ticket enviado    |
| AiResponse | string (nullable)   | Resposta da IA             |
| CreatedAt  | datetime            | Data de criação            |
| UpdatedAt  | datetime (nullable) | Data da última atualização |

---

## ⚙️ Configurações Necessárias

### appsettings.json

```json
{
  "OllamaServer": "http://localhost:11434/api/generate"
}
```

### Variáveis de Ambiente (alternativa)

```bash
export OLLAMA_SERVER=http://localhost:11434/api/generate
```

---

## 🔒 Notas de Segurança

- ⚠️ A autenticação JWT no WebSocket ainda não foi implementada
- Adicione validação de `ticketId` no frontend
- Considere adicionar rate limiting no backend
- Valide o `ticketBody` antes de enviar para Ollama

---

## 📞 Suporte

Para dúvidas sobre a implementação frontend, consulte `websocket.md` na raiz do projeto.

Para testes de backend, use Postman com suporte a WebSocket ou ferramentas CLI como `wscat`.
