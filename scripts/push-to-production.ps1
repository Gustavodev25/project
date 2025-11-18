# Script para fazer push para backend e frontend simultaneamente
# Uso: .\scripts\push-to-production.ps1 "mensagem de commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

$ErrorActionPreference = "Stop"

# Função para escrever com cores
function Write-Color {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Color "🚀 Deploy para Produção" "Blue"
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Host ""

# Verificar se há mudanças para commitar
$status = git status -s
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Color "⚠️  Nenhuma mudança detectada" "Yellow"
    $response = Read-Host "Deseja fazer push das mudanças já commitadas? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 0
    }
} else {
    Write-Color "📝 Commitando mudanças..." "Green"
    git add .
    git commit -m $CommitMessage
}

Write-Host ""
Write-Color "🔍 Verificando remotes configurados..." "Green"

# Verificar se remotes existem
try {
    $backendUrl = git remote get-url backend 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Backend remote não encontrado"
    }
} catch {
    Write-Color "❌ Remote 'backend' não encontrado" "Red"
    Write-Color "Adicione com: git remote add backend https://github.com/Gustavodev25/project-backend.git" "Yellow"
    exit 1
}

try {
    $frontendUrl = git remote get-url frontend 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend remote não encontrado"
    }
} catch {
    Write-Color "❌ Remote 'frontend' não encontrado" "Red"
    Write-Color "Adicione com: git remote add frontend https://github.com/Gustavodev25/project.git" "Yellow"
    exit 1
}

Write-Color "✅ Backend: " "Green" -NoNewline
Write-Host $backendUrl
Write-Color "✅ Frontend: " "Green" -NoNewline
Write-Host $frontendUrl
Write-Host ""

# Push para backend
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Color "🔧 Fazendo push para BACKEND (Render)..." "Green"
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Host ""

try {
    git push backend main
    Write-Host ""
    Write-Color "✅ Backend push concluído!" "Green"
} catch {
    Write-Host ""
    Write-Color "❌ Erro ao fazer push para backend" "Red"
    exit 1
}

Write-Host ""

# Push para frontend
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Color "🌐 Fazendo push para FRONTEND (Vercel)..." "Green"
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Host ""

try {
    git push frontend main
    Write-Host ""
    Write-Color "✅ Frontend push concluído!" "Green"
} catch {
    Write-Host ""
    Write-Color "❌ Erro ao fazer push para frontend" "Red"
    exit 1
}

Write-Host ""
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Color "✨ Deploy iniciado com sucesso!" "Green"
Write-Color "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Blue"
Write-Host ""
Write-Color "📊 Próximos passos:" "Yellow"
Write-Host ""
Write-Color "1. " -NoNewline
Write-Color "Render:" "Blue" -NoNewline
Write-Host "   https://dashboard.render.com"
Write-Host "   → Aguarde build completar (~5-10 min)"
Write-Host ""
Write-Color "2. " -NoNewline
Write-Color "Vercel:" "Blue" -NoNewline
Write-Host "   https://vercel.com/dashboard"
Write-Host "   → Aguarde build completar (~2-5 min)"
Write-Host ""
Write-Color "3. " -NoNewline
Write-Color "Testar:" "Blue" -NoNewline
Write-Host "   Abra seu frontend e teste o login"
Write-Host ""
Write-Color "🎉 Pronto para monitorar os deploys!" "Green"
Write-Host ""
