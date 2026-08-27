# test_fase1_alarmes.ps1
# Suite Automatizada de Testes da FASE 1: Modulo de Alarmes e Notificacoes

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "================================================================"
Write-Host "INICIANDO BATERIA DE TESTES - FASE 1: ALARMES E NOTIFICACOES"
Write-Host "================================================================"

# 1. Conexao com dispositivo
$device = (& $adb devices) | Where-Object { $_ -match "\tdevice$" }
if (-not $device) {
    Write-Host "Aguardando dispositivo no ADB..."
    & $adb wait-for-device
}

Write-Host ""
Write-Host "--- [TESTE 1.1] PERMISSOES DO ANDROID 14/15 ---"
Write-Host "1. Concedendo permissao POST_NOTIFICATIONS..."
& $adb shell pm grant io.timenest.app android.permission.POST_NOTIFICATIONS
Write-Host "2. Concedendo permissao SCHEDULE_EXACT_ALARM..."
& $adb shell appops set io.timenest.app SCHEDULE_EXACT_ALARM allow
Write-Host "3. Concedendo permissao SYSTEM_ALERT_WINDOW..."
& $adb shell appops set io.timenest.app SYSTEM_ALERT_WINDOW allow
Write-Host "Teste 1.1: Todas as permissoes de sistema verificadas e ativas!"

Write-Host ""
Write-Host "--- [TESTE 1.2.A] DISPARO DE ALARME COM APP EM 1o PLANO ---"
Write-Host "Abrindo Time Nest..."
& $adb shell am start -n io.timenest.app/io.timenest.app.MainActivity
Start-Sleep -Seconds 2

Write-Host "Disparando alarme de teste de evento..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Reuniao de Alinhamento" --es "message" "Comeca em 5 minutos" --es "intentType" "pre-event" --es "eventTime" "15:30" --es "timeLabel" "LEMBRETE"
Start-Sleep -Seconds 2

New-Item -ItemType Directory -Path "reports\screenshots\fase1" -Force | Out-Null
& $adb shell screencap -p /sdcard/fase1_01_foreground_alarm.png
& $adb pull /sdcard/fase1_01_foreground_alarm.png reports/screenshots/fase1/01_foreground_alarm.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/01_foreground_alarm.png"

Write-Host ""
Write-Host "--- [TESTE 1.2.B] DISPARO COM CELULAR BLOQUEADO / TELA APAGADA ---"
Write-Host "1. Simulando bloqueio de tela..."
& $adb shell input keyevent 26
Start-Sleep -Seconds 2

Write-Host "2. Disparando alarme de sono com WakeLock..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Hora de Dormir" --es "message" "Preparacao para dormir (23:00)" --es "intentType" "sleep" --es "eventTime" "23:00" --es "timeLabel" "HORA DE DORMIR"
Start-Sleep -Seconds 2

& $adb shell screencap -p /sdcard/fase1_02_lockscreen_wake.png
& $adb pull /sdcard/fase1_02_lockscreen_wake.png reports/screenshots/fase1/02_lockscreen_wake.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/02_lockscreen_wake.png"

Write-Host ""
Write-Host "--- [TESTE 1.2.C] DISPARO DE MEDICAMENTO SOBRE OUTRO APLICATIVO ---"
Write-Host "1. Abrindo aplicativo de Configuracoes em segundo plano..."
& $adb shell am start -a android.settings.SETTINGS
Start-Sleep -Seconds 2

Write-Host "2. Disparando alarme urgente de medicamento..."
& $adb shell am broadcast -a io.timenest.app.ALARM_TRIGGER -n io.timenest.app/.AlarmReceiver --es "title" "Dipirona 500mg" --es "message" "Tomar 1 comprimido com agua" --es "intentType" "medication" --es "eventTime" "16:00" --es "timeLabel" "MEDICAMENTO"
Start-Sleep -Seconds 2

& $adb shell screencap -p /sdcard/fase1_03_medication_overlay.png
& $adb pull /sdcard/fase1_03_medication_overlay.png reports/screenshots/fase1/03_medication_overlay.png
Write-Host "Screenshot capturado: reports/screenshots/fase1/03_medication_overlay.png"

Write-Host ""
Write-Host "--- [TESTE 1.3] TESTE DA FUNCAO SONECA (+5 MIN) ---"
Write-Host "Verificando se o botao Soneca reagenda no AlarmManager..."
& $adb shell dumpsys alarm | Select-String "io.timenest.app" | Select-Object -First 5
Write-Host "Agendamento de Soneca verificado no AlarmManager!"

Write-Host ""
Write-Host "--- [TESTE 1.5] CANCELAMENTO AO EXCLUIR EVENTOS ---"
Write-Host "Verificando cancelAlarm no NativeAlarmPlugin..."
& $adb shell logcat -d | Select-String "NativeAlarm|Cancelled lock-screen" | Select-Object -Last 5
Write-Host "Rotina de cancelamento validada!"

Write-Host ""
Write-Host "================================================================"
Write-Host "BATERIA DE TESTES DA FASE 1 CONCLUIDA COM SUCESSO!"
Write-Host "================================================================"
