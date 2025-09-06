/**
 * Battleships Game Agent
 * Real-time, two-player online game implementation
 * Handles WebSocket communication, game state, and UI interactions
 */

class BattleshipsAgent {
    constructor() {
        this.websocket = null;
        this.gameState = {
            status: 'disconnected', // disconnected, connecting, waiting, setup, in_progress, finished
            playerName: '',
            opponentName: '',
            isMyTurn: false,
            gameId: null
        };

        // Game boards: 10x10 grid (1-indexed for display)
        this.ownBoard = this.createEmptyBoard();
        this.opponentBoard = this.createEmptyBoard();

        // Ship definitions
        this.shipTypes = {
            carrier: { length: 5, count: 1 },
            battleship: { length: 4, count: 1 },
            cruiser: { length: 3, count: 1 },
            submarine: { length: 3, count: 1 },
            destroyer: { length: 2, count: 1 }
        };

        // Placed ships tracking
        this.placedShips = [];
        this.currentDraggedShip = null;
        this.shipOrientation = 'horizontal'; // horizontal or vertical

        this.initializeEventListeners();
        this.showScreen('connection-screen');
    }

    // Board Management
    createEmptyBoard() {
        const board = [];
        for (let i = 0; i < 10; i++) {
            board[i] = [];
            for (let j = 0; j < 10; j++) {
                board[i][j] = {
                    hasShip: false,
                    isHit: false,
                    shipType: null,
                    shipId: null
                };
            }
        }
        return board;
    }

    // WebSocket Communication
    connectToServer() {
        const playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        this.gameState.playerName = playerName;
        this.gameState.status = 'connecting';
        this.updateConnectionStatus('Connecting...');

        // WebSocket connection (adjust URL as needed)
        const wsUrl = 'ws://localhost:8080';
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            this.gameState.status = 'waiting';
            this.updateConnectionStatus('Connected');
            this.sendMessage('join_game', { playerName: this.gameState.playerName });
            this.showScreen('waiting-screen');
        };

        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        };

        this.websocket.onclose = () => {
            this.gameState.status = 'disconnected';
            this.updateConnectionStatus('Disconnected');
            this.showToast('Connection lost', 'error');
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showToast('Connection failed', 'error');
            this.gameState.status = 'disconnected';
            this.updateConnectionStatus('Connection Failed');
        };
    }

    sendMessage(type, data) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type, ...data }));
        }
    }

    // Server Message Handling
    handleServerMessage(message) {
        switch (message.type) {
            case 'game_start':
                this.handleGameStart(message);
                break;
            case 'opponent_fire':
                this.handleOpponentFire(message);
                break;
            case 'shot_result':
                this.handleShotResult(message);
                break;
            case 'game_end':
                this.handleGameEnd(message);
                break;
            case 'turn_change':
                this.handleTurnChange(message);
                break;
            case 'error':
                this.showToast(message.message || 'Server error', 'error');
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    handleGameStart(message) {
        this.gameState.status = 'setup';
        this.gameState.opponentName = message.opponentName;
        this.gameState.gameId = message.gameId;
        this.gameState.isMyTurn = message.turnOrder === 'first';

        document.getElementById('opponent-display').textContent = this.gameState.opponentName;
        this.showScreen('setup-screen');
        this.initializeSetupBoard();
        this.showToast(`Game found! Opponent: ${this.gameState.opponentName}`, 'success');
    }

    handleOpponentFire(message) {
        const { coordinates } = message;
        const [x, y] = coordinates;
        const cell = this.ownBoard[x][y];

        cell.isHit = true;
        const result = cell.hasShip ? 'hit' : 'miss';

        // Check if ship is sunk
        let shipSunk = null;
        if (result === 'hit') {
            const ship = this.placedShips.find(s => s.id === cell.shipId);
            if (ship && this.isShipSunk(ship)) {
                shipSunk = ship.type;
            }
        }

        // Update own board display
        this.updatePlayerBoard();

        // Send result back to server
        this.sendMessage('fire_result', {
            coordinates,
            result,
            shipSunk
        });

        this.showToast(`Opponent ${result === 'hit' ? 'hit' : 'missed'}!`,
            result === 'hit' ? 'error' : 'info');
    }

    handleShotResult(message) {
        const { coordinates, result, shipSunk } = message;
        const [x, y] = coordinates;

        this.opponentBoard[x][y].isHit = true;
        if (result === 'hit') {
            this.opponentBoard[x][y].hasShip = true;
        }

        this.updateOpponentBoard();

        let toastMessage = `You ${result}!`;
        if (shipSunk) {
            toastMessage += ` ${shipSunk} sunk!`;
        }

        this.showToast(toastMessage, result === 'hit' ? 'success' : 'info');
    }

    handleTurnChange(message) {
        this.gameState.isMyTurn = message.isYourTurn;
        this.updateTurnIndicator();
    }

    handleGameEnd(message) {
        this.gameState.status = 'finished';
        const isWinner = message.winner === this.gameState.playerName;

        document.getElementById('game-result').textContent = isWinner ? 'Victory!' : 'Defeat';
        document.getElementById('game-result-message').textContent =
            isWinner ? 'Congratulations! You sunk all enemy ships!' : 'Better luck next time!';

        const gameEndContent = document.querySelector('.game-end-content');
        gameEndContent.className = `game-end-content ${isWinner ? 'victory' : 'defeat'}`;

        this.showScreen('game-end-screen');
        this.showToast(isWinner ? 'You won!' : 'Game over', isWinner ? 'success' : 'error');
    }

    // Ship Placement (Setup Phase)
    initializeSetupBoard() {
        const setupBoard = document.getElementById('setup-board');
        setupBoard.innerHTML = '';

        // Create 11x11 grid (including headers)
        for (let row = 0; row <= 10; row++) {
            for (let col = 0; col <= 10; col++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';

                if (row === 0 && col === 0) {
                    // Top-left corner
                    cell.textContent = '';
                    cell.className += ' header';
                } else if (row === 0) {
                    // Column headers (A-J)
                    cell.textContent = String.fromCharCode(64 + col);
                    cell.className += ' header';
                } else if (col === 0) {
                    // Row headers (1-10)
                    cell.textContent = row.toString();
                    cell.className += ' header';
                } else {
                    // Game cells
                    cell.dataset.row = row - 1;
                    cell.dataset.col = col - 1;
                    cell.className += ' water';

                    // Add event listeners for ship placement
                    cell.addEventListener('click', (e) => this.handleCellClick(e));
                    cell.addEventListener('dragover', (e) => this.handleDragOver(e));
                    cell.addEventListener('drop', (e) => this.handleDrop(e));
                    cell.addEventListener('mouseenter', (e) => this.handleCellHover(e));
                    cell.addEventListener('mouseleave', (e) => this.handleCellLeave(e));
                }

                setupBoard.appendChild(cell);
            }
        }

        this.initializeShipDock();
    }

    initializeShipDock() {
        const shipItems = document.querySelectorAll('.ship-item');
        shipItems.forEach(shipItem => {
            shipItem.draggable = true;
            shipItem.addEventListener('dragstart', (e) => this.handleDragStart(e));
            shipItem.addEventListener('contextmenu', (e) => this.handleShipRotate(e));
            shipItem.classList.remove('placed');
        });

        document.getElementById('random-placement').addEventListener('click', () => this.randomPlacement());
        document.getElementById('setup-complete').addEventListener('click', () => this.completeSetup());
    }

    handleDragStart(e) {
        const shipItem = e.target.closest('.ship-item');
        if (shipItem.classList.contains('placed')) {
            e.preventDefault();
            return;
        }

        this.currentDraggedShip = {
            type: shipItem.dataset.ship,
            length: parseInt(shipItem.dataset.length),
            element: shipItem
        };

        shipItem.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.currentDraggedShip) return;

        const cell = e.target;
        if (!cell.dataset.row) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        this.clearPlacementPreview();
        this.showPlacementPreview(row, col, this.currentDraggedShip.length, this.shipOrientation);
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.currentDraggedShip) return;

        const cell = e.target;
        if (!cell.dataset.row) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.canPlaceShip(row, col, this.currentDraggedShip.length, this.shipOrientation)) {
            this.placeShip(row, col, this.currentDraggedShip.type, this.currentDraggedShip.length, this.shipOrientation);
            this.currentDraggedShip.element.classList.add('placed');
        }

        this.clearPlacementPreview();
        this.currentDraggedShip.element.classList.remove('dragging');
        this.currentDraggedShip = null;

        this.updateSetupCompleteButton();
    }

    handleCellClick(e) {
        // Alternative placement method - click to place
        if (!this.currentDraggedShip) return;

        const cell = e.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.canPlaceShip(row, col, this.currentDraggedShip.length, this.shipOrientation)) {
            this.placeShip(row, col, this.currentDraggedShip.type, this.currentDraggedShip.length, this.shipOrientation);
            this.currentDraggedShip.element.classList.add('placed');
            this.currentDraggedShip = null;
            this.updateSetupCompleteButton();
        }
    }

    handleCellHover(e) {
        if (!this.currentDraggedShip) return;

        const cell = e.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        this.clearPlacementPreview();
        this.showPlacementPreview(row, col, this.currentDraggedShip.length, this.shipOrientation);
    }

    handleCellLeave(e) {
        if (!this.currentDraggedShip) return;
        this.clearPlacementPreview();
    }

    handleShipRotate(e) {
        e.preventDefault();
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        this.showToast(`Ship orientation: ${this.shipOrientation}`, 'info');
    }

    canPlaceShip(row, col, length, orientation) {
        if (orientation === 'horizontal') {
            if (col + length > 10) return false;
            for (let i = 0; i < length; i++) {
                if (this.ownBoard[row][col + i].hasShip) return false;
            }
        } else {
            if (row + length > 10) return false;
            for (let i = 0; i < length; i++) {
                if (this.ownBoard[row + i][col].hasShip) return false;
            }
        }
        return true;
    }

    placeShip(row, col, type, length, orientation) {
        const shipId = `${type}_${Date.now()}`;
        const positions = [];

        if (orientation === 'horizontal') {
            for (let i = 0; i < length; i++) {
                this.ownBoard[row][col + i].hasShip = true;
                this.ownBoard[row][col + i].shipType = type;
                this.ownBoard[row][col + i].shipId = shipId;
                positions.push([row, col + i]);
            }
        } else {
            for (let i = 0; i < length; i++) {
                this.ownBoard[row + i][col].hasShip = true;
                this.ownBoard[row + i][col].shipType = type;
                this.ownBoard[row + i][col].shipId = shipId;
                positions.push([row + i, col]);
            }
        }

        this.placedShips.push({
            id: shipId,
            type,
            positions,
            orientation
        });

        this.updateSetupBoard();
    }

    showPlacementPreview(row, col, length, orientation) {
        const setupBoard = document.getElementById('setup-board');
        const canPlace = this.canPlaceShip(row, col, length, orientation);
        const className = canPlace ? 'valid-placement' : 'invalid-placement';

        if (orientation === 'horizontal') {
            for (let i = 0; i < length && col + i < 10; i++) {
                const cellIndex = (row + 1) * 11 + (col + i + 1);
                const cell = setupBoard.children[cellIndex];
                if (cell) cell.classList.add(className);
            }
        } else {
            for (let i = 0; i < length && row + i < 10; i++) {
                const cellIndex = (row + i + 1) * 11 + (col + 1);
                const cell = setupBoard.children[cellIndex];
                if (cell) cell.classList.add(className);
            }
        }
    }

    clearPlacementPreview() {
        const setupBoard = document.getElementById('setup-board');
        const cells = setupBoard.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            cell.classList.remove('valid-placement', 'invalid-placement');
        });
    }

    updateSetupBoard() {
        const setupBoard = document.getElementById('setup-board');
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cellIndex = (row + 1) * 11 + (col + 1);
                const cell = setupBoard.children[cellIndex];

                if (this.ownBoard[row][col].hasShip) {
                    cell.className = 'board-cell ship';
                } else {
                    cell.className = 'board-cell water';
                }
            }
        }
    }

    randomPlacement() {
        // Clear existing placements
        this.clearAllPlacements();

        // Place ships randomly
        Object.entries(this.shipTypes).forEach(([type, config]) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';

                if (this.canPlaceShip(row, col, config.length, orientation)) {
                    this.placeShip(row, col, type, config.length, orientation);

                    // Mark ship as placed in dock
                    const shipItem = document.querySelector(`[data-ship="${type}"]`);
                    shipItem.classList.add('placed');

                    placed = true;
                }
                attempts++;
            }
        });

        this.updateSetupCompleteButton();
        this.showToast('Ships placed randomly!', 'success');
    }

    clearAllPlacements() {
        this.ownBoard = this.createEmptyBoard();
        this.placedShips = [];

        // Reset dock
        document.querySelectorAll('.ship-item').forEach(item => {
            item.classList.remove('placed');
        });

        this.updateSetupBoard();
        this.updateSetupCompleteButton();
    }

    updateSetupCompleteButton() {
        const button = document.getElementById('setup-complete');
        const allShipsPlaced = this.placedShips.length === Object.keys(this.shipTypes).length;
        button.disabled = !allShipsPlaced;
    }

    completeSetup() {
        if (this.placedShips.length !== Object.keys(this.shipTypes).length) {
            this.showToast('Please place all ships first', 'error');
            return;
        }

        // Send ship placement to server
        const ships = this.placedShips.map(ship => ({
            type: ship.type,
            positions: ship.positions
        }));

        this.sendMessage('setup_complete', { ships });
        this.gameState.status = 'in_progress';

        this.initializeGameScreen();
        this.showScreen('game-screen');
        this.showToast('Setup complete! Game starting...', 'success');
    }

    // Game Phase
    initializeGameScreen() {
        document.getElementById('player-display').textContent = this.gameState.playerName;
        document.getElementById('opponent-display').textContent = this.gameState.opponentName;

        this.createGameBoard('player-board', false);
        this.createGameBoard('opponent-board', true);

        this.updatePlayerBoard();
        this.updateOpponentBoard();
        this.updateTurnIndicator();
    }

    createGameBoard(boardId, isTargeting) {
        const boardElement = document.getElementById(boardId);
        boardElement.innerHTML = '';

        // Create 11x11 grid (including headers)
        for (let row = 0; row <= 10; row++) {
            for (let col = 0; col <= 10; col++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';

                if (row === 0 && col === 0) {
                    cell.textContent = '';
                    cell.className += ' header';
                } else if (row === 0) {
                    cell.textContent = String.fromCharCode(64 + col);
                    cell.className += ' header';
                } else if (col === 0) {
                    cell.textContent = row.toString();
                    cell.className += ' header';
                } else {
                    cell.dataset.row = row - 1;
                    cell.dataset.col = col - 1;

                    if (isTargeting) {
                        cell.addEventListener('click', (e) => this.handleTargetClick(e));
                    }
                }

                boardElement.appendChild(cell);
            }
        }
    }

    handleTargetClick(e) {
        if (!this.gameState.isMyTurn) {
            this.showToast("It's not your turn!", 'error');
            return;
        }

        const cell = e.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.opponentBoard[row][col].isHit) {
            this.showToast('Already targeted this cell', 'error');
            return;
        }

        // Send fire command
        this.sendMessage('fire', { coordinates: [row, col] });
        this.gameState.isMyTurn = false;
        this.updateTurnIndicator();
    }

    updatePlayerBoard() {
        const playerBoard = document.getElementById('player-board');
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cellIndex = (row + 1) * 11 + (col + 1);
                const cell = playerBoard.children[cellIndex];
                const boardCell = this.ownBoard[row][col];

                if (boardCell.isHit && boardCell.hasShip) {
                    cell.className = 'board-cell hit';
                    cell.textContent = 'X';
                } else if (boardCell.isHit) {
                    cell.className = 'board-cell miss';
                    cell.textContent = '•';
                } else if (boardCell.hasShip) {
                    cell.className = 'board-cell ship';
                } else {
                    cell.className = 'board-cell water';
                }
            }
        }
    }

    updateOpponentBoard() {
        const opponentBoard = document.getElementById('opponent-board');
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cellIndex = (row + 1) * 11 + (col + 1);
                const cell = opponentBoard.children[cellIndex];
                const boardCell = this.opponentBoard[row][col];

                if (boardCell.isHit && boardCell.hasShip) {
                    cell.className = 'board-cell hit';
                    cell.textContent = 'X';
                } else if (boardCell.isHit) {
                    cell.className = 'board-cell miss';
                    cell.textContent = '•';
                } else {
                    cell.className = 'board-cell water';
                }
            }
        }
    }

    updateTurnIndicator() {
        const gameStatus = document.getElementById('game-status');
        const turnIndicator = document.getElementById('turn-indicator');

        if (this.gameState.isMyTurn) {
            gameStatus.textContent = 'Your Turn';
            gameStatus.className = 'your-turn';
            turnIndicator.textContent = 'Your Turn';
            turnIndicator.className = 'your-turn';
        } else {
            gameStatus.textContent = 'Opponent\'s Turn';
            gameStatus.className = 'opponent-turn';
            turnIndicator.textContent = 'Opponent\'s Turn';
            turnIndicator.className = 'opponent-turn';
        }
    }

    // Utility Functions
    isShipSunk(ship) {
        return ship.positions.every(([row, col]) => this.ownBoard[row][col].isHit);
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        statusElement.textContent = status;
        statusElement.className = status.toLowerCase().includes('connect') ? 'connected' : 'disconnected';
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Event Listeners
    initializeEventListeners() {
        document.getElementById('join-game').addEventListener('click', () => {
            this.connectToServer();
        });

        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.connectToServer();
            }
        });

        document.getElementById('play-again').addEventListener('click', () => {
            location.reload();
        });

        // Right-click to rotate ships globally
        document.addEventListener('contextmenu', (e) => {
            if (this.gameState.status === 'setup') {
                e.preventDefault();
                this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
                this.showToast(`Ship orientation: ${this.shipOrientation}`, 'info');
            }
        });
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.battleshipsAgent = new BattleshipsAgent();
});
