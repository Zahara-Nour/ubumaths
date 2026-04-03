/**
 * TypeScript types and interfaces for the 2048 game
 */

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
	/** Tile value - powers of 2 (2, 4, 8, 16, 32, ..., 2048, 4096, ...) */
	value: number;
	/** Current position on the board */
	position: Position;
	/** Whether this tile was just created (for animation) */
	isNew: boolean;
	/** IDs of tiles that merged to create this tile (for merge animation) */
	mergedFrom?: string[];
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

/**
 * Represents a tile that is animating towards a merge
 * These "ghost" tiles slide to the merge position before disappearing
 */
export interface GhostTile {
	/** Original tile ID */
	id: string;
	/** Tile value */
	value: number;
	/** Starting position (before animation) */
	fromPosition: Position;
	/** Ending position (merge destination) */
	toPosition: Position;
}

/**
 * Information about a merge animation
 */
export interface MergeAnimation {
	/** The two tiles that are merging */
	tiles: [GhostTile, GhostTile];
	/** The resulting merged tile */
	resultTile: Tile;
}

/**
 * Result of a move operation, including animation data
 */
export interface MoveResult {
	/** The new game state after the move */
	state: GameState;
	/** Whether any movement occurred */
	moved: boolean;
	/** Merge animations to play (empty if no merges) */
	mergeAnimations: MergeAnimation[];
}
