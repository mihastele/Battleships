#!/bin/bash

# Battleships Game Launcher
echo "🚢 Starting Battleships Game Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run the server."
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🌐 Starting WebSocket server on port 8080..."
echo "🎮 Open index.html in your browser to play!"
echo "📖 For multiple players, open the game in separate browser windows/tabs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
