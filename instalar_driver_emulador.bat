@echo off
title Instalador do Driver de Aceleracao do Emulador Android (AEHD)

:: Verificar permissoes de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo =========================================================
    echo Solicitando permissoes de Administrador...
    echo Clique em 'SIM' na janela do Windows que vai abrir.
    echo =========================================================
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =========================================================
echo 🚀 Instalando Driver de Aceleracao do Android Emulator
echo =========================================================

REM 1. Parar servico antigo HAXM se existir
echo [1/3] Removendo driver legado HAXM...
sc stop intelhaxm >nul 2>&1
sc delete intelhaxm >nul 2>&1

REM 2. Instalar o novo AEHD (Android Emulator Hypervisor Driver)
echo [2/3] Instalando driver moderno AEHD do Google...
cd /d "E:\AI\Programas\Emulador Android\sdk\extras\google\Android_Emulator_Hypervisor_Driver"
RUNDLL32.EXE SETUPAPI.DLL,InstallHinfSection DefaultInstall 132 .\aehd.Inf

REM 3. Iniciar servico AEHD
echo [3/3] Iniciando o servico de virtualizacao AEHD...
sc start aehd

echo =========================================================
echo ✅ Driver instalado e configurado com sucesso!
echo =========================================================
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
