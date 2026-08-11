@echo off
echo ====================================================
echo Starting Approval Management System Servers
echo ====================================================

echo [1/4] Starting Vite Dev Server (npm run dev)...
start "Vite Dev Server" cmd /k "npm run dev"

echo [2/4] Starting Laravel Server (php artisan serve)...
start "Laravel Server" cmd /k "php artisan serve"

echo [3/4] Starting Reverb Server (php artisan reverb:start)...
start "Reverb Server" cmd /k "php artisan reverb:start"

echo [4/4] Starting Queue Worker (php artisan queue:work)...
start "Queue Worker" cmd /k "php artisan queue:work"

echo.
echo All servers have been started in separate windows!
echo You can minimize those windows while working.
echo ====================================================
pause
