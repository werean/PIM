#!/bin/sh
set -e

echo "==============================="
echo " Aguardando SQL Server iniciar..."
echo "==============================="

# Aguarda o SQL Server responder na porta 1433
until nc -z sqlserver 1433; do
  echo "SQL Server ainda não está pronto, aguardando..."
  sleep 3
done

echo "SQL Server pronto! Aplicando migrations..."
export PATH="$PATH:/root/.dotnet/tools"

dotnet ef database update --project /app/PIM.csproj || echo "⚠️  Migrations já aplicadas."

echo "==============================="
echo " Iniciando API ASP.NET Core..."
echo "==============================="

dotnet /app/publish/PIM.dll
