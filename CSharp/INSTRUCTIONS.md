Você é um engenheiro de software experiente em C# e ASP.NET Core 8.

Contexto do projeto atual:
- Backend original em TypeScript: Fastify + Prisma + PostgreSQL + BetterAuth.
- Rotas existentes: /users, /tickets, /auth, /comments, /attachments.
- Padrões: middleware de autenticação, Services e DTOs separados, lógica de negócio já consolidada.
- Modelos Prisma: User, Ticket, Comment, Attachment.

Objetivo:
Criar uma nova pasta **/CSharp** na raiz do repositório e gerar **toda** a versão em C# do backend, preservando lógica, rotas e modularização do original.

Stack-alvo:
- Linguagem: C#
- Framework Web: ASP.NET Core 8 (Minimal APIs não; usar MVC com Controllers)
- ORM: Entity Framework Core
- Banco: **MS SQL Server**
- Autenticação: **JWT** (pode usar Identity Core + JWT Bearer, ou JWT puro com refresh)
- Padrões: Injeção de dependência, async/await, IActionResult, validações via DataAnnotations
- LGPD: aplicar boas práticas (mascaramento/omissão em logs, DTOs que evitam dados sensíveis desnecessários, políticas de retenção/comentários)

Estrutura de pastas a gerar dentro de /CSharp:
- /Controllers
- /Services
- /DTOs
- /Entities
- /Data
- /Migrations
- Program.cs
- appsettings.json
- README.md

Requisitos:
1) Converter os modelos Prisma para classes C# em **/Entities**: User, Ticket, Comment, Attachment (com relacionamentos, constraints e enums equivalentes).
2) Criar **ApplicationDbContext** em **/Data**, configurando EF Core para **SQL Server** (connection string via appsettings.json).
3) Implementar **migrations** do EF Core para SQL Server em **/Migrations** e incluir instruções no README para `dotnet ef database update`.
4) Implementar **DTOs** (Create/Update/List/Detail) em **/DTOs**, evitando expor dados sensíveis.
5) Implementar **Services** com a mesma lógica do TS (regras de negócio, validações, transações quando necessário).
6) Criar **Controllers** para /users, /tickets, /auth, /comments, /attachments com rotas e contratos equivalentes aos do projeto TS (GET/POST/PUT/DELETE onde existir).
7) Configurar autenticação **JWT**: endpoints de login/refresh/logout em **/auth**, políticas de autorização por rota e middleware correspondente.
8) Adicionar **tratamento de erros** consistente: filtro global (ExceptionFilter) + problem details; **logs** com Microsoft.Extensions.Logging (não logar PII).
9) Em cada arquivo gerado, inserir comentário curto indicando a origem no projeto TS (por exemplo, “// Equivalente a src/modules/tickets/service.ts”).
10) Criar **README.md** dentro de /CSharp com: pré-requisitos, como configurar `appsettings.json` (SQL Server), como rodar `dotnet restore/build/run`, como aplicar migrations e como testar as rotas.
11) Manter estritamente a **mesma lógica de negócio** do projeto original (não alterar regras), apenas traduzindo para C#.
12) **Não** criar frontend; somente backend em C# pronto para compilar em Windows com .NET 8 SDK e rodar em Windows Server.

Passos de execução:
- [1] Ler a árvore do repositório e mapear as entidades, DTOs e serviços no código TypeScript.
- [2] Criar a pasta **/CSharp** e toda a árvore de arquivos acima.
- [3] Gerar Entities com anotações de data (Key, Required, StringLength, etc.) e relacionamentos (One-to-Many/Many-to-One).
- [4] Implementar ApplicationDbContext + OnModelCreating com configurações equivalentes às do Prisma (índices, unique, cascade).
- [5] Preparar migrations e instruções no README para `dotnet tool install --global dotnet-ef`, `dotnet ef migrations add InitialCreate`, `dotnet ef database update`.
- [6] Gerar Services mantendo regras e validações originais (cite no topo a referência ao serviço TS).
- [7] Gerar Controllers com endpoints equivalentes (nomes, parâmetros e códigos HTTP).
- [8] Configurar Program.cs: Swagger, CORS, DI dos Services, EFCore SQL Server, AuthN/AuthZ com JWT Bearer, filtros globais.
- [9] Segurança/LGPD: não registrar PII em logs; DTOs restritos; comentários sobre retenção/minimização; mascarar e-mail/CPF se aparecer em logs.
- [10] Validar: compilar, subir Swagger, testar rotas /users, /tickets, /auth, /comments, /attachments.

Critérios de aceitação:
- O projeto compila com `dotnet build` e sobe com `dotnet run`.
- As rotas e a lógica respondem de forma equivalente ao backend TS.
- Migrations aplicam e criam o schema completo no SQL Server.
- README explica setup completo, incluindo connection string e comandos EF.

Agora: comece executando os passos [1] a [3], me mostre o plano e a árvore inicial de arquivos em /CSharp antes de gerar o restante.
