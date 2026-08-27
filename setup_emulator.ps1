# setup_emulator.ps1
# Configura o ambiente do Android SDK, aceita licencas e cria o AVD para testes no drive E:

$EnvDir = "E:\AI\Programas\Emulador Android"
$env:JAVA_HOME = "$EnvDir\jdk-17.0.11+9"
$env:ANDROID_HOME = "$EnvDir\sdk"
$env:ANDROID_AVD_HOME = "$EnvDir\avd"
$env:ANDROID_USER_HOME = "$EnvDir\.android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

# Garantir diretorios de AVD
if (-not (Test-Path "$EnvDir\avd")) {
    New-Item -ItemType Directory -Path "$EnvDir\avd" -Force | Out-Null
}
if (-not (Test-Path "$EnvDir\.android")) {
    New-Item -ItemType Directory -Path "$EnvDir\.android" -Force | Out-Null
}

Write-Host "================================================="
Write-Host "Configurando Android Emulator e AVD (TimeNest)"
Write-Host "================================================="
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "ANDROID_AVD_HOME: $env:ANDROID_AVD_HOME"

# Checar se o AVD ja existe
$avdName = "TimeNest_Pixel"
$existingAvds = avdmanager list avd
if ($existingAvds -match $avdName) {
    Write-Host "Dispositivo virtual '$avdName' ja existe."
} else {
    Write-Host "Criando dispositivo virtual '$avdName'..."
    "no" | avdmanager create avd -n $avdName -k "system-images;android-34;google_apis;x86_64" --device "pixel_6" --force
    Write-Host "Dispositivo virtual '$avdName' criado com sucesso!"
}

# Otimizacao do config.ini
$avdIniPath = "$env:ANDROID_AVD_HOME\$avdName.avd\config.ini"
if (Test-Path $avdIniPath) {
    Write-Host "Otimizando config.ini do AVD..."
    $config = Get-Content $avdIniPath
    $tweaks = @(
        "hw.ramSize = 2048",
        "hw.gpu.enabled = yes",
        "hw.gpu.mode = auto",
        "hw.keyboard = yes",
        "disk.dataPartition.size = 2048M"
    )
    foreach ($tweak in $tweaks) {
        $key = ($tweak -split "=")[0].Trim()
        if ($config -match "^$key") {
            $config = $config -replace "^$key.*", $tweak
        } else {
            $config += $tweak
        }
    }
    $config | Set-Content $avdIniPath
    Write-Host "config.ini otimizado!"
}

Write-Host "================================================="
Write-Host "Lista de AVDs disponiveis:"
avdmanager list avd
Write-Host "================================================="
