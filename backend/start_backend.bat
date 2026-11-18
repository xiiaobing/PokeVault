
@echo off
echo ==================================
echo       Starting PokeVault Backend
echo ==================================

cd /d "%~dp0"

set PYTHON=venv\Scripts\python.exe

if not exist "%PYTHON%" (
    echo ERROR: Virtual environment not found.
    pause
    exit /b 1
)

echo.
echo Checking today's USD/MYR exchange rate...
"%PYTHON%" manage.py update_exchange_rate

if errorlevel 1 (
    echo WARNING: Exchange rate update failed.
    echo Continuing with the existing database rate...
)

echo.
echo Starting Django server...
"%PYTHON%" manage.py runserver

pause
