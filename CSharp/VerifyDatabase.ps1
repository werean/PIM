# Script para verificar a estrutura da tabela Tickets
$dbPath = "C:\Users\lucas\www\PIM\CSharp\PIM.db"

Write-Host "Verificando banco de dados: $dbPath" -ForegroundColor Cyan
Write-Host "Tamanho do arquivo: $((Get-Item $dbPath).Length) bytes" -ForegroundColor Yellow
Write-Host "Última modificação: $((Get-Item $dbPath).LastWriteTime)" -ForegroundColor Yellow
Write-Host ""

# Carregar o assembly do SQLite
Add-Type -Path "C:\Users\lucas\.nuget\packages\microsoft.data.sqlite.core\9.0.0\lib\net8.0\Microsoft.Data.Sqlite.dll" -ErrorAction SilentlyContinue

try {
    # Tentar com System.Data.SQLite se disponível
    $connection = New-Object -TypeName System.Data.SQLite.SQLiteConnection
    $connection.ConnectionString = "Data Source=$dbPath"
    $connection.Open()

    $command = $connection.CreateCommand()
    $command.CommandText = "PRAGMA table_info(Tickets);"
    
    $reader = $command.ExecuteReader()
    
    Write-Host "Colunas da tabela Tickets:" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    
    while ($reader.Read()) {
        $cid = $reader["cid"]
        $name = $reader["name"]
        $type = $reader["type"]
        $notnull = $reader["notnull"]
        $dflt_value = $reader["dflt_value"]
        
        Write-Host "[$cid] $name ($type) - NotNull: $notnull, Default: $dflt_value"
    }
    
    $reader.Close()
    $connection.Close()
    
    Write-Host "===========================================" -ForegroundColor Green
} catch {
    Write-Host "Erro ao conectar com System.Data.SQLite: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, feche qualquer ferramenta que esteja acessando o banco PIM.db" -ForegroundColor Yellow
    Write-Host "e execute: dotnet run" -ForegroundColor Cyan
}
