@echo off
setlocal

title Hartaku - Development Server
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm tidak ditemukan.
  echo Pastikan Node.js sudah terpasang, lalu coba klik file ini lagi.
  echo.
  pause
  exit /b 1
)

echo.
echo Menjalankan Hartaku...
echo Tekan Ctrl+C untuk menghentikan server.
echo.

call npm run dev

if errorlevel 1 (
  echo.
  echo Server gagal dijalankan. Periksa pesan error di atas.
  echo.
  pause
)
