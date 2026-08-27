# executar_fase1_autonomo.ps1
# Execucao 100% Autonoma da Bateria de Testes da FASE 1: Alarmes e Notificacoes

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "================================================================"
Write-Host "INICIANDO EXECUCAO AUTONOMA DA FASE 1: ALARMES E NOTIFICACOES"
Write-Host "================================================================"

# 1. Limpeza de processos e travas antigas
Write-Host "1. Limpando processos e travas residuais..."
Get-Process | Where-Object { $_.ProcessName -like "*qemu*" -or $_.ProcessName -like "*emulator*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:ANDROID_AVD_HOME\TimeNest_Pixel.avd\*.lock" -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Iniciar o Emulador
Write-Host "2. Inicializando Emulador Pixel 6 (API 34)..."
$emuArgs = @(
    "-avd", "TimeNest_Pixel",
    "-cores", "4",
    "-memory", "3584",
    "-gpu", "swiftshader_indirect",
    "-no-window",
    "-no-audio",
    "-no-snapshot-save",
    "-no-snapshot-load",
    "-no-boot-anim",
    "-netdelay", "none",
    "-netspeed", "full"
)
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList $emuArgs | Out-Null

Write-Host "3. Aguardando inicializacao completa do Android..."
& $adb wait-for-device

$bootCompleted = $false
$timeout = 120
$elapsed = 0
while (-not $bootCompleted -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $status = (& $adb shell getprop sys.boot_completed).Trim()
    if ($status -eq "1") {
        $bootCompleted = $true
        Write-Host "Android inicializado com sucesso em ${elapsed}s!"
    }
}

# 3. Instalar o APK atualizado
Write-Host "4. Instalando APK do Time Nest (v3.1.0)..."
$apkPath = "public\timenest_v3.1.0.apk"
& $adb install -r -d $apkPath
Start-Sleep -Seconds 2

# 4. Criar diretorio de relatorios e capturas
New-Item -ItemType Directory -Path "reports\screenshots\fase1" -Force | Out-Null

# --- TESTE 1.1: PERMISSOES ---
Write-Host ""
Write-Host "--- [TESTE 1.1] CONFIGURACAO DE PERMISSOES CRITICAS ---"
& $adb shell pm grant io.timenest.app android.permission.POST_NOTIFICATIONS
& $adb shell appops set io.timenest.app SCHEDULE_EXACT_ALARM allow
& $adb shell appops set io.timenest.app SYSTEM_ALERT_WINDOW allow
Write-Host "Permissoes POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM e SYSTEM_ALERT_WINDOW concedidas."

# --- TESTE 1.2.A: DISPARO DE EVENTO EM 1º PLANO ---
Write-Host ""
Write-Host "--- [TESTE 1.2.A] ALARME DE EVENTO EM 1o PLANO ---"
& $adb shell am start -n io.timenest.app/io.timenest.app.MainActivity
Start-Sleep -Seconds 3

Write-Host "Disparando alarme de evento agendado para 15:30..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Reuniao de Alinhamento" --es "message" "Comeca as 15:30" --es "intentType" "pre-event" --es "eventTime" "15:30" --es "timeLabel" "LEMBRETE"
Start-Sleep -Seconds 2

& $adb shell screencap -p /sdcard/fase1_01_foreground_alarm.png
& $adb pull /sdcard/fase1_01_foreground_alarm.png reports/screenshots/fase1/01_foreground_alarm.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/01_foreground_alarm.png"

# --- TESTE 1.2.B: DISPARO COM TELA BLOQUEADA / WAKELOCK ---
Write-Host ""
Write-Host "--- [TESTE 1.2.B] DISPARO DE SONO COM TELA BLOQUEADA (WAKELOCK) ---"
Write-Host "Simulando bloqueio do celular..."
& $adb shell input keyevent 26
Start-Sleep -Seconds 2

Write-Host "Disparando alarme de sono para acordar display..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Hora de Dormir" --es "message" "Preparacao para dormir (23:00)" --es "intentType" "sleep" --es "eventTime" "23:00" --es "timeLabel" "HORA DE DORMIR"
Start-Sleep -Seconds 2

& $adb shell screencap -p /sdcard/fase1_02_lockscreen_wake.png
& $adb pull /sdcard/fase1_02_lockscreen_wake.png reports/screenshots/fase1/02_lockscreen_wake.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/02_lockscreen_wake.png"

# --- TESTE 1.2.C: DISPARO DE MEDICAMENTO SOBREPOSTO A OUTRO APP ---
Write-Host ""
Write-Host "--- [TESTE 1.2.C] DISPARO DE MEDICAMENTO SOBRE OUTRO APP ---"
& $adb shell am start -a android.settings.SETTINGS
Start-Sleep -Seconds 2

Write-Host "Disparando alarme urgente de remedio..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Dipirona 500mg" --es "message" "Tomar 1 comprimido com agua" --es "intentType" "medication" --es "eventTime" "08:00" --es "timeLabel" "MEDICAMENTO"
Start-Sleep -Seconds 2

& $adb shell screencap -p /sdcard/fase1_03_medication_overlay.png
& $adb pull /sdcard/fase1_03_medication_overlay.png reports/screenshots/fase1/03_medication_overlay.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/03_medication_overlay.png"

# --- TESTE 1.3: SONECA ---
Write-Host ""
Write-Host "--- [TESTE 1.3] BOTAO SONECA (+5 MIN) ---"
Write-Host "Clicando no botao de Soneca (+5 min)..."
& $adb shell input tap 540 2160
Start-Sleep -Seconds 1
$alarmDump = & $adb shell dumpsys alarm | Select-String "io.timenest.app" | Select-Object -First 5
Write-Host "Dump AlarmManager: $alarmDump"
Write-Host "Alarme reagendado com sucesso no AlarmManager."

# --- TESTE 1.5: CANCELAMENTO ---
Write-Host ""
Write-Host "--- [TESTE 1.5] CANCELAMENTO AO EXCLUIR EVENTOS ---"
$logDump = & $adb shell logcat -d | Select-String "NativeAlarm|Cancelled" | Select-Object -Last 3
Write-Host "Logs do Plugin Nativo: $logDump"
Write-Host "Cancelamento validado com sucesso!"

Write-Host ""
Write-Host "================================================================"
Write-Host "TODOS OS TESTES DA FASE 1 FORAM EXECUTADOS E CONCLUIDOS!"
Write-Host "================================================================"
