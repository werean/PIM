# PIM - Sistema de Tickets Integrado com IA

Sistema completo de gerenciamento de tickets com assistente de IA integrado usando Ollama.

## 📋 Pré-requisitos

- **.NET 8 SDK** - [Download aqui](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js** (v18.0+) - [Download aqui](https://nodejs.org/)
- **Ollama** (opcional, para funcionalidade de IA) - [Download aqui](https://ollama.com/download)

## 🚀 Guia de Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/werean/PIM.git
cd PIM
```

### 2. Configurar o Backend (C#)

#### 2.1. Acessar a pasta do backend

```bash
cd CSharp
```

#### 2.2. Configurar o banco de dados SQLite

O projeto já vem configurado para usar **SQLite** por padrão. O banco de dados será criado automaticamente no arquivo `PIM.db`.

**Opcional:** Se você quiser usar SQL Server ao invés de SQLite, edite o arquivo `appsettings.json` e altere a connection string `DefaultConnection`.

#### 2.3. Instalar dependências e criar o banco de dados

```bash
# Restaurar dependências do .NET
dotnet restore

# Instalar a ferramenta de migrations do Entity Framework (se ainda não tiver)
dotnet tool install --global dotnet-ef

# Aplicar as migrations para criar o banco de dados
dotnet ef database update
```

Isso criará o arquivo `PIM.db` com todas as tabelas necessárias.

#### 2.4. Iniciar o servidor backend

```bash
dotnet run
```

O backend estará rodando em `http://localhost:8080`

**📚 Documentação da API:** Acesse `http://localhost:8080/swagger` para ver todos os endpoints disponíveis.

### 3. Configurar o Frontend (React)

#### 3.1. Abrir um novo terminal e acessar a pasta do frontend

```bash
cd frontend
```

#### 3.2. Instalar as dependências

```bash
npm install
```

#### 3.3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

### 4. Configurar o Ollama (Opcional - Para usar IA)

#### 4.1. Instalar o Ollama

- **Windows:** [Download do instalador](https://ollama.com/download/windows)
- **Mac/Linux:** Siga as instruções em [ollama.com](https://ollama.com/download)

#### 4.2. Baixar um modelo de IA

Após instalar o Ollama, você pode baixar modelos diretamente pela interface do sistema ou pelo terminal:

```bash
# Modelo recomendado (leve e rápido)
ollama pull gpt-oss:120b-cloud

# Outros modelos disponíveis
ollama pull llama3.2:1b
ollama pull gemma2:2b
```

**Nota:** Você também pode baixar modelos diretamente pela interface do chat no sistema!

---

## 🎯 Primeiro Acesso

1. Acesse `http://localhost:5173` no navegador
2. Faça login com as credenciais padrão ou crie um novo usuário
3. Na página de tickets, clique em qualquer ticket para abrir o assistente de IA

---

## 📦 Estrutura do Projeto

```
PIM/
├── CSharp/              # Backend em C# (.NET 8)
│   ├── Controllers/     # Controladores da API
│   ├── Services/        # Lógica de negócios
│   ├── Data/           # Contexto do banco de dados
│   ├── Entities/       # Modelos de dados
│   ├── DTOs/           # Data Transfer Objects
│   ├── Migrations/     # Migrations do Entity Framework
│   └── PIM.db          # Banco de dados SQLite (criado automaticamente)
│
└── frontend/           # Frontend em React + TypeScript
    ├── src/
    │   ├── components/ # Componentes React (AIChat, Ticket, etc)
    │   ├── pages/      # Páginas (Login, Tickets, TicketDetail)
    │   └── css/        # Estilos CSS
    └── package.json
```

---

## 🛠️ Tecnologias Utilizadas

### Backend

- **ASP.NET Core 8** - Framework web
- **Entity Framework Core** - ORM para acesso ao banco de dados
- **SQLite** - Banco de dados (pode ser substituído por SQL Server)
- **JWT** - Autenticação baseada em tokens
- **Swagger/OpenAPI** - Documentação interativa da API

### Frontend

- **React 18** - Biblioteca para interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **CSS Modules** - Estilos isolados por componente

### IA

- **Ollama** - Servidor local de modelos de linguagem
- Modelos suportados: Qwen, Llama, Gemma, e outros

---

## 🔧 Comandos Úteis

### Backend (C#)

```bash
# Criar uma nova migration
dotnet ef migrations add NomeDaMigration

# Aplicar migrations pendentes
dotnet ef database update

# Reverter última migration
dotnet ef migrations remove

# Limpar e reconstruir o projeto
dotnet clean && dotnet build

# Executar em modo de produção
dotnet run --configuration Release
```

### Frontend

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview
```

### Banco de Dados SQLite

O banco de dados `PIM.db` é criado automaticamente na primeira execução. Caso precise recriá-lo:

```bash
# Deletar o banco de dados
rm PIM.db

# Recriar aplicando as migrations
dotnet ef database update
```

---

## 🐛 Solução de Problemas

### Erro "dotnet: command not found"

- Instale o .NET 8 SDK: https://dotnet.microsoft.com/download

### Erro "dotnet-ef: command not found"

```bash
dotnet tool install --global dotnet-ef
```

### Erro de certificado HTTPS ao iniciar o backend

```
Unable to configure HTTPS endpoint. No server certificate was specified...
```

**Solução:**

```bash
dotnet dev-certs https --trust
```

Aceite a confirmação quando aparecer. Isso gerará e confiará no certificado de desenvolvimento.

### Porta 8080 já em uso

- Edite `Properties/launchSettings.json` e altere a porta do backend

### Frontend não conecta com o backend

- Verifique se o backend está rodando em `http://localhost:8080`
- Verifique as configurações de CORS no arquivo `Program.cs`

### Ollama não conecta

- Certifique-se que o Ollama está instalado e rodando
- Verifique se está acessível em `http://localhost:11434`
- O sistema permite baixar modelos pela interface mesmo que o Ollama não esteja rodando inicialmente

---

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.
