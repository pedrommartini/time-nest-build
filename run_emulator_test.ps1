# run_emulator_test.ps1
# Inicia o Emulador Android, instala o APK do Time Nest e executa a suite de diagnosticos

param(
    [switch]$NoGui = $false,
    [switch]$Rebuild = $false,
    [string]$AvdName = "TimeNest_Pixel"
)

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host "================================================="
Write-Host "Iniciando Ambiente de Teste Android (Time Nest)"
Write-Host "================================================="

# 1. Verificar se ja existe um dispositivo conectado via ADB
$devices = (adb devices) | Where-Object { $_ -match "\tdevice$" }
if ($devices) {
    Write-Host "Dispositivo ja detectado no ADB: $($devices[0])"
} else {
    $emuArgs = @(
        "-avd", $AvdName,
        "-cores", "2",
        "-memory", "2048",
        "-gpu", "angle_indirect",
        "-no-snapshot-save",
        "-no-snapshot-load",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full"
    )
    if ($NoGui) {
        $emuArgs += @("-no-window", "-no-audio")
    }
    
    # Inicia o emulador em segundo plano
    Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList $emuArgs -PassThru | Out-Null
    
    Write-Host "Aguardando inicializacao do dispositivo (boot)..."
    adb wait-for-device
    
    $bootCompleted = $false
    $timeout = 180
    $elapsed = 0
    while (-not $bootCompleted -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        $status = (adb shell getprop sys.boot_completed).Trim()
        if ($status -eq "1") {
            $bootCompleted = $true
            Write-Host "Dispositivo Android inicializado com sucesso em ${elapsed}s!"
        } else {
            Write-Host "Inicializando sistema Android ($elapsed/${timeout}s)..."
        }
    }
    
    if (-not $bootCompleted) {
        Write-Warning "Tempo limite de espera pelo boot esgotado. Tentando prosseguir..."
    }
}

# 2. Recompilar se solicitado
if ($Rebuild) {
    Write-Host "Recompilando APK do Time Nest..."
    & ".\build_apk.ps1"
}

# 3. Localizar e Instalar o APK mais recente
$apkPath = "public\timenest_v3.1.0.apk"
if (-not (Test-Path $apkPath)) {
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
}

if (Test-Path $apkPath) {
    Write-Host "Instalando APK no dispositivo: $apkPath"
    adb install -r -d $apkPath
} else {
    Write-Warning "APK nao encontrado. Execute .\build_apk.ps1 primeiro."
}

# 4. Iniciar o aplicativo Time Nest
Write-Host "Abrindo Time Nest (io.timenest.app)..."
adb shell am start -n io.timenest.app/io.timenest.app.MainActivity

# 5. Executar Script de Diagnostico e Captura
if (Test-Path "test_app_diagnostics.cjs") {
    Write-Host "Executando bateria de diagnosticos e capturas..."
    node test_app_diagnostics.cjs
}

Write-Host "================================================="
Write-Host "Ciclo de testes e inicializacao concluido!"
Write-Host "================================================="
