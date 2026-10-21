@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor_local.ps1" -AbrirNavegador
if errorlevel 1 pause
