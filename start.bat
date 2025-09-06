@echo off
REM Battleships Game Launcher for Windows

echo 🚢 Starting Battleships Game Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js to run the server.
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the server
echo 🌐 Starting WebSocket server on port 8080...
echo 🎮 Open index.html in your browser to play!
echo 📖 For multiple players, open the game in separate browser windows/tabs
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
