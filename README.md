# Battleships - Real-time Online Game

A complete implementation of the classic Battleships game for two players, featuring real-time communication via WebSockets, modern web technologies, and a clean agent-based architecture.

## 🎮 Features

- **Real-time multiplayer gameplay** via WebSocket connections
- **Responsive web interface** with HTML5, CSS3, and JavaScript
- **Drag-and-drop ship placement** with rotation support
- **Turn-based gameplay** with immediate feedback
- **Complete game flow** from connection to game end
- **Agent-based architecture** for scalable game logic
- **Input validation** and security measures
- **Visual feedback** with animations and notifications

## 🏗️ Project Structure

```
battleships/
├── index.html              # Main game interface
├── styles.css              # Complete styling and responsive design
├── battleships-agent.js    # Client-side game agent
├── server.js               # WebSocket backend server
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Setup

1. **Clone or download the project files**
2. **Install server dependencies:**
   ```bash
   cd battleships
   npm install
   ```

3. **Start the WebSocket server:**
   ```bash
   npm start
   ```
   The server will start on `ws://localhost:8080`

4. **Open the game in browser:**
   Open `index.html` in your web browser, or serve it via a local web server:
   ```bash
   # Using Python 3
   python -m http.server 3000
   
   # Using Node.js (install http-server globally first)
   npx http-server -p 3000
   ```

5. **Play the game:**
   - Open the game in two browser tabs/windows
   - Enter player names and join the game
   - Place your ships and start playing!

## 🎯 Game Rules

### Ship Types
- **Carrier** (5 cells)
- **Battleship** (4 cells)
- **Cruiser** (3 cells)
- **Submarine** (3 cells)
- **Destroyer** (2 cells)

### Gameplay
1. **Setup Phase:** Place all 5 ships on your 10×10 grid
2. **Battle Phase:** Take turns firing at opponent's grid
3. **Victory:** First player to sink all opponent ships wins

## 🔧 Technical Implementation

### Client-Side Agent (`battleships-agent.js`)

The client-side agent implements the complete game logic:

```javascript
class BattleshipsAgent {
    // Core responsibilities:
    // - WebSocket communication management
    // - Game state synchronization
    // - Ship placement validation
    // - Turn-based action handling
    // - UI interaction management
}
```

**Key Features:**
- **State Management:** Tracks own board, opponent board, ships, and game status
- **Event-Driven Architecture:** Handles WebSocket messages and UI events
- **Validation:** Client-side validation for ship placement and moves
- **Responsive Design:** Adapts to different screen sizes

### WebSocket Communication Protocol

#### Outgoing Events (Client → Server)
```javascript
// Join a game
{ type: 'join_game', playerName: 'PlayerName' }

// Complete ship setup
{ type: 'setup_complete', ships: [{ type: 'carrier', positions: [[0,0], [0,1], ...] }] }

// Fire at coordinates
{ type: 'fire', coordinates: [row, col] }

// Return fire result
{ type: 'fire_result', coordinates: [row, col], result: 'hit'|'miss', shipSunk: 'shipType'|null }
```

#### Incoming Events (Server → Client)
```javascript
// Game started with opponent
{ type: 'game_start', gameId: 'uuid', opponentName: 'OpponentName', turnOrder: 'first'|'second' }

// Opponent fired at your board
{ type: 'opponent_fire', coordinates: [row, col] }

// Result of your shot
{ type: 'shot_result', coordinates: [row, col], result: 'hit'|'miss', shipSunk: 'shipType'|null }

// Turn indicator
{ type: 'turn_change', isYourTurn: boolean }

// Game ended
{ type: 'game_end', winner: 'PlayerName', reason?: 'opponent_disconnected' }

// Error message
{ type: 'error', message: 'Error description' }
```

### Backend Server (`server.js`)

The Node.js WebSocket server coordinates game sessions:

```javascript
class BattleshipsServer {
    // Core responsibilities:
    // - Player matchmaking
    // - Game session management
    // - Turn coordination
    // - Message validation and routing
    // - Win condition detection
}
```

**Key Features:**
- **Automatic Matchmaking:** Pairs waiting players automatically
- **Game State Management:** Tracks active games and player states
- **Message Validation:** Validates ship placements and moves
- **Disconnection Handling:** Graceful handling of player disconnections
- **Security:** Server-side validation prevents cheating

## 🎨 User Interface

### Screens
1. **Connection Screen:** Player name input and server connection
2. **Waiting Screen:** Matchmaking in progress
3. **Setup Screen:** Ship placement with drag-and-drop
4. **Game Screen:** Dual-board battle interface
5. **End Screen:** Victory/defeat with play again option

### Ship Placement
- **Drag & Drop:** Drag ships from dock to board
- **Click Placement:** Alternative click-to-place method
- **Rotation:** Right-click to rotate ships
- **Visual Feedback:** Green/red preview for valid/invalid placement
- **Random Placement:** One-click random ship arrangement

### Battle Interface
- **Dual Boards:** Your fleet (left) and enemy waters (right)
- **Turn Indicators:** Clear visual feedback for whose turn it is
- **Click to Fire:** Click enemy waters to target coordinates
- **Hit/Miss Feedback:** Immediate visual feedback for shots
- **Toast Notifications:** Real-time game event notifications

## 🔒 Security & Validation

### Client-Side
- Input validation for player names and coordinates
- Ship placement validation (overlap, bounds, continuity)
- Turn validation (prevent out-of-turn actions)
- Connection state management

### Server-Side
- Message format validation
- Ship placement rule enforcement
- Turn order enforcement
- Game state consistency checks
- Disconnection handling

### Data Privacy
- No sensitive data transmission
- Player names only (no authentication required)
- Game state isolated between sessions
- Automatic cleanup on disconnection

## 📱 Responsive Design

The interface adapts to different screen sizes:
- **Desktop:** Full dual-board layout
- **Tablet:** Stacked board layout
- **Mobile:** Optimized touch interactions and smaller grid cells

## 🚀 Development & Customization

### Adding New Features
1. **New Ship Types:** Modify `shipTypes` in `battleships-agent.js`
2. **Custom Rules:** Update validation logic in both client and server
3. **UI Themes:** Modify CSS custom properties for different color schemes
4. **Sound Effects:** Add audio feedback for game events

### Server Configuration
```javascript
// server.js - Change port and other settings
const server = new BattleshipsServer(8080); // Custom port
```

### Client Configuration
```javascript
// battleships-agent.js - Change server URL
const wsUrl = 'ws://localhost:8080'; // Custom server URL
```

## 🔧 Troubleshooting

### Common Issues

**Connection Failed:**
- Ensure the server is running (`npm start`)
- Check firewall settings
- Verify WebSocket URL in client code

**Ships Not Placing:**
- Right-click to rotate ships
- Ensure ships don't overlap or go out of bounds
- Try the "Random Placement" button

**Game Not Starting:**
- Both players must complete ship placement
- Check server console for error messages
- Refresh browsers and reconnect

**Performance Issues:**
- Close unnecessary browser tabs
- Check network connection
- Ensure server has sufficient resources

## 📈 Future Enhancements

- **Spectator Mode:** Allow observers to watch games
- **Replay System:** Record and replay game sessions
- **Statistics:** Track win/loss records
- **Tournaments:** Multi-player elimination brackets
- **AI Opponents:** Computer players for single-player mode
- **Custom Game Modes:** Different board sizes, ship arrangements
- **Chat System:** In-game messaging between players
- **Sound Effects:** Audio feedback for game events

## 🤝 Contributing

This is a complete, functional implementation that can serve as a foundation for further development. Feel free to extend the codebase with additional features, improved graphics, or alternative game modes.

## 📄 License

This project is open source and available under the MIT License.

---

**Enjoy playing Battleships!** 🚢⚓
# Battleships
