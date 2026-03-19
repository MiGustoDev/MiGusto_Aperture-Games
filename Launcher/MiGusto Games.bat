@echo off
:: Navegar a la carpeta raíz del proyecto (donde está package.json)
cd /d "%~dp0.."

:: Iniciar el servidor de desarrollo en segundo plano
echo Iniciando servidor MiGusto Games...
start /b npm run dev

:: Esperar 5 segundos para que Vite esté listo
timeout /t 5 /nobreak > nul

:: Abrir en Google Chrome en modo Pantalla Completa (Kiosko) usando un perfil temporal
:: Esto fuerza la pantalla completa aunque ya tengas Chrome abierto en otras ventanas
echo Abriendo juego en Chrome (Pantalla Completa)...
start chrome --kiosk http://localhost:5173 --user-data-dir="%TEMP%\chrome-kiosk-profile"

:: Mantener la ventana abierta en caso de error
pause
