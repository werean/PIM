# PIM - Projeto de sistema de tickets integrado com IA

---

## Como rodar o projeto

### Pré-requisitos
- Bun Runtime ou Node.js (v18.0+) 
- bun, npm ou yarn
- Banco de dados SQLite3 ou PostgreSQL.

### 1. Clonar o repositório
```bash
git clone https://github.com/werean/PIM.git
cd PIM
```

### 2. Configurar o backend

1. Acesse a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   bun install
   # ou
   npm install
   # ou
   yarn
   ```
3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edite o arquivo `.env` com as informações do seu banco de dados e outras configurações necessárias.
4. Execute as migrações do banco de dados:
   ```bash
   bun knex migrate:latest
   # ou
   npx knex migrate:latest
   ```
5. Inicie o servidor backend:
   ```bash
   bun run dev
   # ou
   npm run dev
   # ou
   yarn dev
   ```
   O backend estará rodando normalmente em `http://localhost:8080` (ou porta configurada).

### 3. Configurar o frontend

1. Acesse a pasta do frontend:
   ```bash
   cd ../frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   yarn dev
   ```
   O frontend estará disponível em `http://localhost:5173` (ou porta configurada).

---

## Sobre o projeto

### Backend
- API RESTful para autenticação, gerenciamento de usuários e tickets.
- Utiliza Knex.js para migrations e queries SQL.
- Estrutura modular com controllers, services, middlewares e rotas.
- Suporte a WebSocket para interação com Ollama em tempo real.

### Frontend
- Interface desenvolvida em React com Vite.
- Páginas de login e gerenciamento de tickets.
- Consome a API do backend para autenticação e operações CRUD.

### Estrutura de Pastas
- `backend/`: Código-fonte do servidor, configurações, migrations e rotas da API.
- `frontend/`: Código-fonte da interface web, assets, páginas e estilos.


