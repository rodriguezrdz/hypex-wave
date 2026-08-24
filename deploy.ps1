# ============================================================
# HYPEX WAVE — deploy.ps1
# Publica o projeto: GitHub (repo + push) e Vercel (produção)
# Uso:  .\deploy.ps1 -RepoName "hypex-wave"
# Requisitos: git instalado; vercel CLI será instalado se faltar.
# ============================================================
param(
    [string]$RepoName = "hypex-wave",
    [string]$Visibility = "private"
)
$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

function Get-GhToken {
    $out = "" | git credential fill 2>$null | Out-String
    foreach ($line in ($out -split "`n")) {
        if ($line -match "^password=(.+)$") { return $Matches[1].Trim() }
    }
    return $null
}

Write-Host "==> 1/5 Git init + commit" -ForegroundColor Cyan
if (-not (Test-Path ".git")) { git init | Out-Null }
git add -A
try { git commit -m "feat: HYPEX WAVE v1.0 — app completo com Supabase e deploy Vercel" 2>$null | Out-Null } catch {}
git branch -M main 2>$null

Write-Host "==> 2/5 Criando repositório no GitHub ($RepoName)" -ForegroundColor Cyan
$token = Get-GhToken
$repoUrl = $null
if ($token) {
    $headers = @{ Authorization = "token $token"; Accept = "application/vnd.github+json" }
    $body = @{ name = $RepoName; description = "HYPEX WAVE - Plataforma SaaS Empresarial"; "$($Visibility.ToLower())" = $true } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
        $repoUrl = $resp.clone_url
        Write-Host ("    Repositório criado: " + $resp.full_name) -ForegroundColor Green
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 422) {
            Write-Host "    Repositório já existe — seguindo." -ForegroundColor Yellow
            $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
            $repoUrl = "https://github.com/$($user.login)/$RepoName.git"
        } else { throw }
    }
} else {
    Write-Host "    Sem token do GitHub no gerenciador de credenciais. Crie o repo manualmente em github.com/new e rode o push." -ForegroundColor Yellow
}

if ($repoUrl) {
    Write-Host "==> 3/5 Push para GitHub" -ForegroundColor Cyan
    $remote = git remote 2>$null
    if ($remote -notcontains "origin") { git remote add origin $repoUrl }
    else { git remote set-url origin $repoUrl }
    git push -u origin main --force
}

Write-Host "==> 4/5 Instalando Vercel CLI (se necessário)" -ForegroundColor Cyan
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    npm install -g vercel
}

Write-Host "==> 5/5 Deploy Vercel (produção)" -ForegroundColor Cyan
Write-Host "    Se abrir o navegador, autorize o login na Vercel para concluir." -ForegroundColor Yellow
vercel --prod --yes

Write-Host ""
Write-Host "✔ Concluído! Lembre-se:" -ForegroundColor Green
Write-Host "   • Conectar o Supabase dentro do app (menu Banco de Dados) ou via config.js"
Write-Host "   • Para integração Git→Vercel automática: vercel.com/new → Import do repo"
