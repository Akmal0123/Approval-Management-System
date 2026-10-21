@echo off
setlocal enabledelayedexpansion
echo ====================================================
echo Starting Approval Management System Servers
echo ====================================================

:: Ambil IP LAN aktif melalui default gateway adapter
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -ExpandProperty InterfaceIndex -First 1)).IPAddress"` ) do set "LOCAL_IP=%%i"

if "%LOCAL_IP%"=="" set "LOCAL_IP=127.0.0.1"

echo [1/4] Starting Vite Dev Server (Port 5173)...
start "Vite Dev Server (Port 5173)" cmd /k "npm run dev -- --host 0.0.0.0"

echo [2/4] Starting Laravel Server (Port 8000)...
start "Laravel Server (Port 8000)" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"

echo [3/4] Starting Reverb Server (Port 8080)...
start "Reverb Server (Port 8080)" cmd /k "php artisan reverb:start --host=0.0.0.0 --port=8080"

echo [4/4] Starting Queue Worker...
start "Queue Worker" cmd /k "php artisan queue:work"

echo.
echo ====================================================
echo Application is ready to be accessed:
echo ====================================================
echo - Komputer ini (Localhost):     http://localhost:8000
echo - Perangkat Lain (HP / Laptop): http://%LOCAL_IP%:8000
echo ====================================================
echo [TIPS] Pastikan HP/Laptop terhubung ke Wi-Fi / Hotspot yang sama.
echo        Layanan pendukung (Microservice 5000 ^& EIS 9000)
echo        dapat dijalankan via start-all.bat di root project.
echo ====================================================
pause
