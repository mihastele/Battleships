/**
 * Battleships WebSocket Server
 * Handles real-time game coordination between clients
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class BattleshipsServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = new WebSocket.Server({ port: this.port });
        this.waitingPlayers = [];
        this.activeGames = new Map();
        this.players = new Map();

        console.log(`Battleships server started on port ${this.port}`);
        this.initializeServer();
    }

    initializeServer() {
        this.wss.on('connection', (ws) => {
            console.log('New client connected');

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleClientMessage(ws, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                    this.sendError(ws, 'Invalid message format');
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                this.handleDisconnection(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    }

    handleClientMessage(ws, message) {
        console.log('Received message:', message.type);

        switch (message.type) {
            case 'join_game':
                this.handleJoinGame(ws, message);
                break;
            case 'setup_complete':
                this.handleSetupComplete(ws, message);
                break;
            case 'fire':
                this.handleFire(ws, message);
                break;
            case 'fire_result':
                this.handleFireResult(ws, message);
                break;
            default:
                console.log('Unknown message type:', message.type);
                this.sendError(ws, 'Unknown message type');
        }
    }

    handleJoinGame(ws, message) {
        const playerId = uuidv4();
        const playerData = {
            id: playerId,
            name: message.playerName,
            ws: ws,
            gameId: null,
            ships: null,
            setupComplete: false
        };

        this.players.set(ws, playerData);

        // Try to match with waiting player
        if (this.waitingPlayers.length > 0) {
            const opponent = this.waitingPlayers.shift();
            this.createGame(playerData, opponent);
        } else {
            this.waitingPlayers.push(playerData);
            console.log(`Player ${message.playerName} waiting for opponent`);
        }
    }

    createGame(player1, player2) {
        const gameId = uuidv4();
        const game = {
            id: gameId,
            players: [player1, player2],
            currentTurn: 0, // Index of player whose turn it is
            status: 'setup', // setup, in_progress, finished
            winner: null
        };

        player1.gameId = gameId;
        player2.gameId = gameId;

        this.activeGames.set(gameId, game);

        // Notify players about game start
        this.sendMessage(player1.ws, 'game_start', {
            gameId: gameId,
            opponentName: player2.name,
            turnOrder: 'first'
        });

        this.sendMessage(player2.ws, 'game_start', {
            gameId: gameId,
            opponentName: player1.name,
            turnOrder: 'second'
        });

        console.log(`Game created: ${player1.name} vs ${player2.name}`);
    }

    handleSetupComplete(ws, message) {
        const player = this.players.get(ws);
        if (!player || !player.gameId) {
            this.sendError(ws, 'Player not in a game');
            return;
        }

        const game = this.activeGames.get(player.gameId);
        if (!game) {
            this.sendError(ws, 'Game not found');
            return;
        }

        // Validate ship placement
        if (!this.validateShipPlacement(message.ships)) {
            this.sendError(ws, 'Invalid ship placement');
            return;
        }

        player.ships = message.ships;
        player.setupComplete = true;

        // Check if both players are ready
        const allReady = game.players.every(p => p.setupComplete);
        if (allReady) {
            game.status = 'in_progress';

            // Notify players that game has started
            game.players.forEach((p, index) => {
                this.sendMessage(p.ws, 'turn_change', {
                    isYourTurn: index === game.currentTurn
                });
            });

            console.log(`Game ${game.id} started`);
        }
    }

    handleFire(ws, message) {
        const player = this.players.get(ws);
        if (!player || !player.gameId) {
            this.sendError(ws, 'Player not in a game');
            return;
        }

        const game = this.activeGames.get(player.gameId);
        if (!game || game.status !== 'in_progress') {
            this.sendError(ws, 'Game not in progress');
            return;
        }

        const playerIndex = game.players.findIndex(p => p.id === player.id);
        if (playerIndex !== game.currentTurn) {
            this.sendError(ws, 'Not your turn');
            return;
        }

        const opponent = game.players[1 - playerIndex];

        // Forward fire to opponent
        this.sendMessage(opponent.ws, 'opponent_fire', {
            coordinates: message.coordinates
        });

        console.log(`${player.name} fired at ${message.coordinates}`);
    }

    handleFireResult(ws, message) {
        const player = this.players.get(ws);
        if (!player || !player.gameId) {
            this.sendError(ws, 'Player not in a game');
            return;
        }

        const game = this.activeGames.get(player.gameId);
        if (!game) {
            this.sendError(ws, 'Game not found');
            return;
        }

        const playerIndex = game.players.findIndex(p => p.id === player.id);
        const opponent = game.players[1 - playerIndex];

        // Send result back to the firing player
        this.sendMessage(opponent.ws, 'shot_result', {
            coordinates: message.coordinates,
            result: message.result,
            shipSunk: message.shipSunk
        });

        // Check for game end condition
        if (message.result === 'hit' && this.checkAllShipsSunk(player.ships, ws)) {
            this.endGame(game, opponent.id);
        } else {
            // Switch turns
            game.currentTurn = 1 - game.currentTurn;

            game.players.forEach((p, index) => {
                this.sendMessage(p.ws, 'turn_change', {
                    isYourTurn: index === game.currentTurn
                });
            });
        }
    }

    checkAllShipsSunk(ships, defenderWs) {
        // This is a simplified check - in a real implementation,
        // you'd track hits more precisely
        // For now, we'll implement a basic win condition check
        return false; // Implement based on your game state tracking needs
    }

    endGame(game, winnerId) {
        game.status = 'finished';
        game.winner = winnerId;

        const winner = game.players.find(p => p.id === winnerId);
        const loser = game.players.find(p => p.id !== winnerId);

        this.sendMessage(winner.ws, 'game_end', {
            winner: winner.name
        });

        this.sendMessage(loser.ws, 'game_end', {
            winner: winner.name
        });

        console.log(`Game ${game.id} ended. Winner: ${winner.name}`);

        // Clean up
        this.activeGames.delete(game.id);
    }

    handleDisconnection(ws) {
        const player = this.players.get(ws);
        if (!player) return;

        // Remove from waiting players
        const waitingIndex = this.waitingPlayers.findIndex(p => p.id === player.id);
        if (waitingIndex !== -1) {
            this.waitingPlayers.splice(waitingIndex, 1);
        }

        // Handle active game disconnection
        if (player.gameId) {
            const game = this.activeGames.get(player.gameId);
            if (game) {
                const opponent = game.players.find(p => p.id !== player.id);
                if (opponent) {
                    this.sendMessage(opponent.ws, 'game_end', {
                        winner: opponent.name,
                        reason: 'opponent_disconnected'
                    });
                }
                this.activeGames.delete(player.gameId);
            }
        }

        this.players.delete(ws);
        console.log(`Player ${player.name} disconnected`);
    }

    validateShipPlacement(ships) {
        const expectedShips = {
            carrier: { length: 5, count: 1 },
            battleship: { length: 4, count: 1 },
            cruiser: { length: 3, count: 1 },
            submarine: { length: 3, count: 1 },
            destroyer: { length: 2, count: 1 }
        };

        const shipCounts = {};
        const occupiedCells = new Set();

        for (const ship of ships) {
            // Count ships by type
            shipCounts[ship.type] = (shipCounts[ship.type] || 0) + 1;

            // Validate length
            const expectedLength = expectedShips[ship.type]?.length;
            if (!expectedLength || ship.positions.length !== expectedLength) {
                return false;
            }

            // Check for overlapping positions
            for (const position of ship.positions) {
                const posKey = `${position[0]},${position[1]}`;
                if (occupiedCells.has(posKey)) {
                    return false; // Overlapping ships
                }
                occupiedCells.add(posKey);

                // Validate position bounds
                const [row, col] = position;
                if (row < 0 || row >= 10 || col < 0 || col >= 10) {
                    return false; // Out of bounds
                }
            }

            // Validate ship continuity (adjacent positions)
            if (!this.validateShipContinuity(ship.positions)) {
                return false;
            }
        }

        // Validate ship counts
        for (const [type, expected] of Object.entries(expectedShips)) {
            if (shipCounts[type] !== expected.count) {
                return false;
            }
        }

        return true;
    }

    validateShipContinuity(positions) {
        if (positions.length <= 1) return true;

        positions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        // Check if horizontal
        const isHorizontal = positions.every(pos => pos[0] === positions[0][0]);
        const isVertical = positions.every(pos => pos[1] === positions[0][1]);

        if (!isHorizontal && !isVertical) return false;

        // Check continuity
        for (let i = 1; i < positions.length; i++) {
            const prev = positions[i - 1];
            const curr = positions[i];

            if (isHorizontal) {
                if (curr[1] - prev[1] !== 1) return false;
            } else {
                if (curr[0] - prev[0] !== 1) return false;
            }
        }

        return true;
    }

    sendMessage(ws, type, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, ...data }));
        }
    }

    sendError(ws, message) {
        this.sendMessage(ws, 'error', { message });
    }
}

// Start the server
const server = new BattleshipsServer(8080);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
