# ==============================================================================
# TimeNest - Script de Publicação Automática de Atualizações (1-Clique para Usuários)
# ==============================================================================

param (
    [string]$NewVersion = "",
    [string]$Notes = "",
    [switch]$BuildApk = $true,
    [switch]$SkipPush = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       TimeNest - Publicador de Atualizações      " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Obter versão atual de src/version.ts
$VersionFile = "src\version.ts"
$CurrentVersion = "3.1.0"
if (Test-Path $VersionFile) {
    $content = Get-Content $VersionFile -Raw
    if ($content -match "APP_VERSION\s*=\s*['""]([^'""]+)['""]") {
        $CurrentVersion = $matches[1]
    }
}

Write-Host "Versao atual instalada: v$CurrentVersion" -ForegroundColor Gray

# 2. Solicitar versão se não fornecida
if (-not $NewVersion) {
    $inputVersion = Read-Host "Digite a NOVA versao (atual: $CurrentVersion) [Enter para manter]"
    if ($inputVersion) {
        $NewVersion = $inputVersion.Trim()
    } else {
        $NewVersion = $CurrentVersion
    }
}

# 3. Solicitar notas da versão se não fornecidas
if (-not $Notes) {
    $inputNotes = Read-Host "Descreva as novidades desta versao (separadas por ponto e virgula ';')"
    if ($inputNotes) {
        $Notes = $inputNotes.Trim()
    } else {
        $Notes = "Melhorias de estabilidade e novas funcionalidades"
    }
}

$notesList = $Notes.Split(';') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
$notesJsonArray = ($notesList | ForEach-Object { "    `"$_`"" }) -join ",`n"

Write-Host "`n[1/5] Atualizando arquivos de configuracao para v$NewVersion..." -ForegroundColor Green

# Atualiza src/version.ts
if (Test-Path $VersionFile) {
    $vContent = Get-Content $VersionFile -Raw
    $vContent = $vContent -replace "APP_VERSION\s*=\s*['""][^'""]+['""]", "APP_VERSION = '$NewVersion'"
    Set-Content $VersionFile -Value $vContent -NoNewline
    Write-Host "  -> src/version.ts atualizado" -ForegroundColor Gray
}

# Atualiza package.json
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw
    $pkg = $pkg -replace '("version":\s*")[^"]+(")', "`${1}$NewVersion`${2}"
    Set-Content "package.json" -Value $pkg -NoNewline
    Write-Host "  -> package.json atualizado" -ForegroundColor Gray
}

# Atualiza public/version.json
$today = (Get-Date).ToString("yyyy-MM-dd")
$versionJsonContent = @"
{
  "version": "$NewVersion",
  "releaseDate": "$today",
  "title": "TimeNest v$NewVersion",
  "notes": [
$notesJsonArray
  ],
  "apkUrl": "https://time-nest-two.vercel.app/timenest.apk",
  "forceUpdate": false
}
"@
Set-Content "public\version.json" -Value $versionJsonContent
Write-Host "  -> public/version.json atualizado" -ForegroundColor Gray

# Atualiza android/app/build.gradle (versionName e incrementa versionCode)
$gradlePath = "android\app\build.gradle"
if (Test-Path $gradlePath) {
    $gradle = Get-Content $gradlePath -Raw
    if ($gradle -match 'versionCode\s+(\d+)') {
        $currentCode = [int]$matches[1]
        $nextCode = $currentCode + 1
        $gradle = $gradle -replace 'versionCode\s+\d+', "versionCode $nextCode"
        Write-Host "  -> android versionCode incrementado de $currentCode para $nextCode" -ForegroundColor Gray
    }
    $gradle = $gradle -replace 'versionName\s+"[^"]+"', "versionName `"$NewVersion`""
    Set-Content $gradlePath -Value $gradle -NoNewline
    Write-Host "  -> android versionName atualizado para `"$NewVersion`"" -ForegroundColor Gray
}

# 4. Compila o web bundle
Write-Host "`n[2/5] Compilando web bundle (npm run build)..." -ForegroundColor Green
npm run build

# 5. Opcional: Compilação de APK
if ($BuildApk) {
    Write-Host "`n[3/5] Compilando novo APK Android..." -ForegroundColor Green
    if (Test-Path "build_apk.ps1") {
        & .\build_apk.ps1
    }
} else {
    Write-Host "`n[3/5] Pulando compilacao nativa de APK (use -BuildApk para gerar novo APK)." -ForegroundColor Yellow
    # Garante que public\timenest.apk esteja em dist
    if (Test-Path "public\timenest.apk") {
        Copy-Item "public\timenest.apk" "dist\timenest.apk" -Force -ErrorAction SilentlyContinue
    }
}

# 6. Commit e Push no Git
Write-Host "`n[4/5] Registrando atualizacao no Git..." -ForegroundColor Green

# Encontra executavel do Git
$gitCmd = "git"
if (Test-Path "mingit\cmd\git.exe") {
    $gitCmd = ".\mingit\cmd\git.exe"
}

try {
    & $gitCmd add .
    & $gitCmd commit -m "release: v$NewVersion - $Notes"
    
    if (-not $SkipPush) {
        Write-Host "`n[5/5] Enviando atualizacao para o repositorio remoto (GitHub/Vercel)..." -ForegroundColor Green
        & $gitCmd push origin master
        & $gitCmd push origin master:main
        Write-Host "`n>>> SUCESSO! Atualizacao v$NewVersion publicada com sucesso em master e main! <<<" -ForegroundColor Cyan
        Write-Host "O Vercel realizara o deploy automaticamente a partir da branch principal." -ForegroundColor White
        Write-Host "Todos os usuarios que abrirem o TimeNest poderao atualizar com 1 clique!" -ForegroundColor Yellow
    } else {
        Write-Host "`n[5/5] Push ignorado conforme solicitado (-SkipPush)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Aviso no Git: $_" -ForegroundColor DarkYellow
}
