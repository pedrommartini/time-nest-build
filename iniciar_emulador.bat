@echo off
title Android Emulator - Pixel 6 (60 FPS RTX Accelerated)

set "ENV_DIR=E:\AI\Programas\Emulador Android"
set "JAVA_HOME=%ENV_DIR%\jdk-17.0.11+9"
set "ANDROID_HOME=%ENV_DIR%\sdk"
set "ANDROID_AVD_HOME=%ENV_DIR%\avd"
set "ANDROID_USER_HOME=%ENV_DIR%\.android"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

echo =========================================================
echo  Iniciando Emulador Pixel 6 (60 FPS - RTX GPU Acelerada)
echo  RAM: 3.5 GB | Cores: 4 | GPU: Host Hardware (RTX 3060 Ti)
echo =========================================================

"%ANDROID_HOME%\emulator\emulator.exe" -avd TimeNest_Pixel -cores 4 -memory 3584 -gpu host -no-snapshot-save -no-snapshot-load -no-boot-anim -netdelay none -netspeed full

pause
