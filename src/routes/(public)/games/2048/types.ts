/**
 * TypeScript types and interfaces for the 2048 game
 */

/**
 * Game mode - determines tile generation and merge rules
 */
export type GameMode = 'classic' | 'multiplication' | 'equations' | 'fractions';

/**
 * Position on the game board (0-indexed)
 */
export interface Position {
	row: number;
	col: number;
}

/**
 * Represents a single tile on the game board
 */
export interface Tile {
	/** Unique identifier for animation tracking */
	id: string;
	/** Tile value (classic: powers of 2, educational modes: calculated value) */
	value: number;
	/** Current position on the board */
	position: Position;
	/** Whether this tile was just created (for animation) */
	isNew: boolean;
	/** IDs of tiles that merged to create this tile (for merge animation) */
	mergedFrom?: string[];
	/** Display value for educational modes (e.g., "2×3", "x+5", "1/2") */
	displayValue?: string;
}

/**
 * Direction of movement
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * 4x4 game board matrix
 * Each cell can contain a Tile or null (empty)
 */
export type GameBoard = (Tile | null)[][];

/**
 * Complete game state
 */
export interface GameState {
	/** The game board */
	board: GameBoard;
	/** Current score */
	score: number;
	/** Whether the game is over (no moves possible) */
	gameOver: boolean;
	/** Whether the player has won (reached 2048) */
	won: boolean;
	/** Whether undo is available */
	canUndo: boolean;
	/** Current game mode */
	mode: GameMode;
}

/**
 * Represents a move in the game
 */
export interface Move {
	/** Direction of the move */
	direction: Direction;
	/** Resulting game state after the move */
	resultingState: GameState;
	/** Previous state (for undo) */
	previousState: GameState;
}
