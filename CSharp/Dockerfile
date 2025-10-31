# Usa a imagem completa do SDK (tem runtime + ferramentas)
FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app

# Copia tudo
COPY . .

# Instala netcat (pra checar SQL Server) e EF Core CLI
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd && rm -rf /var/lib/apt/lists/*
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Restaura, compila e publica
RUN dotnet restore "./PIM.csproj"
RUN dotnet build "./PIM.csproj" -c Release -o /app/build
RUN dotnet publish "./PIM.csproj" -c Release -o /app/publish

# Copia entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
