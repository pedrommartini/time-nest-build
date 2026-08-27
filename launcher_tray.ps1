# launcher_tray.ps1
# Time Nest - Gerenciador do Emulador Android com Icone na Bandeja (System Tray)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

$icoPath = "$EnvDir\timenest.ico"
if (-not (Test-Path $icoPath)) {
    $icoPath = "e:\AI\Antigravity\Time Nest\timenest.ico"
}

# Criar o icone na bandeja (System Tray)
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
if (Test-Path $icoPath) {
    $notifyIcon.Icon = New-Object System.Drawing.Icon($icoPath)
} else {
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}
$notifyIcon.Text = "Time Nest - Emulador Android (60 FPS)"
$notifyIcon.Visible = $true

# Criar Menu de Contexto (Botao Direito)
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# 1. Item: Abrir Time Nest
$itemOpen = $contextMenu.Items.Add("🚀 Abrir Time Nest")
$itemOpen.Font = New-Object System.Drawing.Font($itemOpen.Font, [System.Drawing.FontStyle]::Bold)
$itemOpen.add_Click({
    $adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
    & $adb shell am start -n io.timenest.app/io.timenest.app.MainActivity | Out-Null
})

# 2. Separador
$contextMenu.Items.Add("-") | Out-Null

# 3. Item: Reiniciar Emulador
$itemRestart = $contextMenu.Items.Add("🔄 Reiniciar Emulador")
$itemRestart.add_Click({
    $notifyIcon.ShowBalloonTip(3000, "Time Nest", "Reiniciando emulador...", [System.Windows.Forms.ToolTipIcon]::Info)
    Get-Process | Where-Object { $_.ProcessName -like "*qemu*" -or $_.ProcessName -like "*emulator*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    $emuArgs = @(
        "-avd", "TimeNest_Pixel",
        "-cores", "4",
        "-memory", "3584",
        "-gpu", "host",
        "-no-snapshot-save",
        "-no-snapshot-load",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full"
    )
    Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList $emuArgs | Out-Null
})

# 4. Separador
$contextMenu.Items.Add("-") | Out-Null

# 5. Item: Encerrar 100%
$itemExit = $contextMenu.Items.Add("❌ Encerrar Emulador 100%")
$itemExit.ForeColor = [System.Drawing.Color]::Red
$itemExit.Font = New-Object System.Drawing.Font($itemExit.Font, [System.Drawing.FontStyle]::Bold)
$itemExit.add_Click({
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    
    # Matar todos os processos do emulador e qemu
    Get-Process | Where-Object { $_.ProcessName -like "*qemu*" -or $_.ProcessName -like "*emulator*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Parar ADB daemon se necessario
    $adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
    if (Test-Path $adb) {
        & $adb kill-server | Out-Null
    }
    
    [System.Windows.Forms.Application]::Exit()
    Stop-Process -Id $PID -Force
})

# Duplo clique no icone da bandeja: abre o Time Nest
$notifyIcon.add_DoubleClick({
    $adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
    & $adb shell am start -n io.timenest.app/io.timenest.app.MainActivity | Out-Null
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Iniciar o Emulador se ainda nao estiver rodando
$running = Get-Process | Where-Object { $_.ProcessName -like "*qemu*" -or $_.ProcessName -like "*emulator*" }
if (-not $running) {
    $emuArgs = @(
        "-avd", "TimeNest_Pixel",
        "-cores", "4",
        "-memory", "3584",
        "-gpu", "host",
        "-no-snapshot-save",
        "-no-snapshot-load",
        "-no-boot-anim",
        "-netdelay", "none",
        "-netspeed", "full"
    )
    Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList $emuArgs | Out-Null
}

$notifyIcon.ShowBalloonTip(4000, "Time Nest", "Emulador iniciado em 60 FPS com RTX 3060 Ti. Clique com o botão direito para gerenciar ou encerrar 100%.", [System.Windows.Forms.ToolTipIcon]::Info)

# Manter o loop de eventos do Windows Forms rodando na bandeja
[System.Windows.Forms.Application]::Run()
