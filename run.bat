@echo off
setlocal

rem LAYERS dev server. Double-click, or run from anywhere.
rem npm is a .cmd, so every npm call needs "call" or this script exits early.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [run] node not found on PATH.
  echo       Install Node 24 LTS: winget install OpenJS.NodeJS.LTS
  goto :fail
)

for /f "delims=" %%v in ('node -v') do set NODE_V=%%v
echo [run] node %NODE_V%

netstat -ano | findstr /r /c:":5180 .*LISTENING" >nul
if not errorlevel 1 (
  echo [run] port 5180 is already in use - the server is probably already up.
  echo       Open http://localhost:5180/ or close the other instance first.
  goto :fail
)

if not exist "node_modules\" (
  echo [run] node_modules missing, installing...
  call npm install
  if errorlevel 1 (
    echo [run] npm install failed. If it says "edgesOut", your npm is too old:
    echo       npm i -g npm@latest    ^(needs Node 22.22.2+ or 24.15.0+^)
    goto :fail
  )
)

echo [run] starting Vite on http://localhost:5180/  ^(Ctrl+C to stop^)
echo.
call npm run dev
if errorlevel 1 goto :fail

endlocal
exit /b 0

:fail
echo.
echo [run] stopped with an error.
pause
endlocal
exit /b 1
