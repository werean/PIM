# PIM Backend C# (.NET 8)

## Pré-requisitos

- .NET 8 SDK
- SQL Server (local ou remoto)

## Configuração

1. Edite `appsettings.json` com sua connection string do SQL Server.
2. Recomenda-se usar usuário dedicado e senha forte.

## Instalação

```powershell
cd CSharp
# Restaurar dependências
 dotnet restore
# Compilar
 dotnet build
```

## Migrations

```powershell
# Instale a ferramenta global do EF Core
 dotnet tool install --global dotnet-ef
# Crie a migration inicial
 dotnet ef migrations add InitialCreate
# Aplique ao banco
 dotnet ef database update
```

## Executando

```powershell
 dotnet run
```

## Testando rotas

- Acesse `/swagger` para documentação interativa.
- Teste endpoints: `/users`, `/tickets`, `/auth`, `/comments`, `/attachments`.

## Segurança e LGPD

- Dados sensíveis (senha, e-mail, etc.) nunca são logados.
- DTOs expõem apenas informações necessárias.
- Comentários e instruções sobre retenção/minimização presentes no código.

---

> Para dúvidas sobre estrutura, consulte os comentários nos arquivos indicando a origem no projeto TypeScript.
