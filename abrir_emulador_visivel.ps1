# abrir_emulador_visivel.ps1
# Inicia a janela interativa do Emulador Pixel e abre o Time Nest

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host "================================================="
Write-Host "Abrindo Emulador Android Visivel (Time Nest)..."
Write-Host "================================================="

# 1. Verificar se o emulador ja esta rodando
$devices = (adb devices) | Where-Object { $_ -match "\tdevice$" }
if (-not $devices) {
    Write-Host "Iniciando janela do emulador Pixel 6..."
    $emuArgs = @(
        "-avd", "TimeNest_Pixel",
        "-cores", "2",
        "-memory", "2048",
        "-gpu", "angle_indirect",
        "-no-snapshot-save",
        "-no-snapshot-load",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full"
    )
    
    Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList $emuArgs
    
    Write-Host "Aguardando inicializacao do dispositivo..."
    adb wait-for-device
    
    $bootCompleted = $false
    $timeout = 120
    $elapsed = 0
    while (-not $bootCompleted -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        $status = (adb shell getprop sys.boot_completed).Trim()
        if ($status -eq "1") {
            $bootCompleted = $true
            Write-Host "Android inicializado com sucesso em ${elapsed}s!"
        }
    }
} else {
    Write-Host "Dispositivo ja ativo e conectado!"
}

# 2. Instalar o APK mais recente com todas as correcoes
$apkPath = "public\timenest_v3.1.0.apk"
if (Test-Path $apkPath) {
    Write-Host "Instalando APK corrigido: $apkPath"
    adb install -r -d $apkPath
}

# 3. Conceder permissoes essenciais de alarmes e notificacoes
Write-Host "Configurando permissoes de sistema..."
adb shell pm grant io.timenest.app android.permission.POST_NOTIFICATIONS
adb shell appops set io.timenest.app SCHEDULE_EXACT_ALARM allow
adb shell appops set io.timenest.app SYSTEM_ALERT_WINDOW allow

# 4. Abrir o aplicativo
Write-Host "Abrindo Time Nest na tela..."
adb shell am start -n io.timenest.app/io.timenest.app.MainActivity

Write-Host "================================================="
Write-Host "Emulador visivel e pronto na sua tela!"
Write-Host "================================================="
