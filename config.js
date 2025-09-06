/**
 * Battleships Game Configuration
 * Modify these settings to customize the game behavior
 */

const GameConfig = {
    // Server Settings
    server: {
        port: 8080,
        host: 'localhost'
    },

    // Game Rules
    board: {
        size: 10, // 10x10 grid
        coordinates: {
            rows: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            cols: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        }
    },

    // Ship Configuration
    ships: {
        carrier: { length: 5, count: 1, name: 'Carrier' },
        battleship: { length: 4, count: 1, name: 'Battleship' },
        cruiser: { length: 3, count: 1, name: 'Cruiser' },
        submarine: { length: 3, count: 1, name: 'Submarine' },
        destroyer: { length: 2, count: 1, name: 'Destroyer' }
    },

    // UI Settings
    ui: {
        cellSize: 35, // pixels
        cellSizeMobile: 25, // pixels for mobile
        animationDuration: 300, // milliseconds
        toastDuration: 3000, // milliseconds

        // Color scheme
        colors: {
            water: 'rgba(135, 206, 235, 0.3)',
            ship: 'rgba(70, 130, 180, 0.8)',
            hit: 'rgba(255, 69, 0, 0.8)',
            miss: 'rgba(255, 255, 255, 0.6)',
            sunk: 'rgba(139, 0, 0, 0.9)',
            validPlacement: 'rgba(76, 175, 80, 0.5)',
            invalidPlacement: 'rgba(244, 67, 54, 0.5)'
        }
    },

    // Game Mechanics
    gameplay: {
        setupTimeLimit: null, // null for unlimited time
        turnTimeLimit: null, // null for unlimited time
        allowRandomPlacement: true,
        allowManualRotation: true,
        showOpponentShipsWhenSunk: false
    },

    // Network Settings
    network: {
        reconnectAttempts: 3,
        reconnectDelay: 2000, // milliseconds
        heartbeatInterval: 30000, // milliseconds
        messageTimeout: 5000 // milliseconds
    },

    // Development Settings
    debug: {
        enableLogging: true,
        showCoordinates: false,
        enableCheats: false
    }
};

// Export for Node.js (server) or browser (client)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
} else {
    window.GameConfig = GameConfig;
}
