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
	/**
	 * Tile value - encoding varies by game mode:
	 *
	 * **Classic mode**: Powers of 2 (2, 4, 8, 16, 32, ..., 2048, 4096, ...)
	 *
	 * **Multiplication mode**: Product of factors (2, 4, 6, 8, 12, 16, ..., 144)
	 *   - Win condition: 144 (12×12, highest in standard multiplication tables)
	 *   - Values > 144 display as numbers (no factor pairs in range 1-12)
	 *
	 * **Equations mode**: Solution value (2, 4, 6, 8, ..., 100)
	 *   - Win condition: 100
	 *   - displayValue shows equation format (e.g., "x+5", "2x", "x-3")
	 *
	 * **Fractions mode**: Encoded as `(numerator × 1000) + denominator`
	 *   - Win condition: 1001 (encodes 1/1, which equals 1)
	 *   - Example encodings:
	 *     * 1/2 → 1002 (1 × 1000 + 2)
	 *     * 1/4 → 1004 (1 × 1000 + 4)
	 *     * 3/4 → 3004 (3 × 1000 + 4)
	 *     * 2/3 → 2003 (2 × 1000 + 3)
	 *   - Decoding: `numerator = Math.floor(value / 1000)`, `denominator = value % 1000`
	 *   - Constraint: Denominator must be < 1000 for correct encoding/decoding
	 *   - displayValue shows equivalent fractions (e.g., "2/4", "3/6" for 1/2)
	 *
	 * @see {@link educational-modes.ts} for tile generation logic
	 */
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
	/** Display value for educational modes */
	displayValue?: string;
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
