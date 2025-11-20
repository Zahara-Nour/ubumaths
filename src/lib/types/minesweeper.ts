/**
 * Minesweeper game types and configuration
 */

/**
 * Game difficulty levels
 */
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

/**
 * Database-only status values (CHECK constraint: only these 3 are allowed)
 * Note: Client-side uses 'not_started' for UX, but database uses 'in_progress' for persistence
 */
export type DatabaseGameStatus = 'in_progress' | 'won' | 'lost';

/**
 * Client-side status includes 'not_started' for UX flow
 * Conversion: 'not_started' (client) → 'in_progress' (database)
 */
export type GameStatus = 'not_started' | DatabaseGameStatus;

export interface CellState {
	row: number;
	col: number;
	isMine: boolean;
	isRevealed: boolean;
	isFlagged: boolean;
	adjacentMines: number;
	isExploded?: boolean;
}

/**
 * Grid state DTO format for database storage and API communication
 * This matches the JSONB structure in the database schema
 */
export interface GridStateDTO {
	rows: number;
	cols: number;
	mines: [number, number][];
	revealed: [number, number][];
	flagged: [number, number][];
	adjacentCounts: Record<string, number>;
}

export interface GameState {
	id?: string; // UUID if saved to database
	difficulty: Difficulty;
	status: GameStatus;
	grid: CellState[][];
	rows: number;
	cols: number;
	minesCount: number;
	flagsUsed: number;
	cellsRevealed: number;
	timeElapsed: number;
	startedAt?: Date;
	seed?: string; // Optional seed for deterministic grid generation (daily challenges)
	hintsUsed?: number; // Number of hints used (0-3)
}

export interface DifficultyConfig {
	rows: number;
	cols: number;
	mines: number;
	baseGidouilles: number;
	baseTime: number; // Target time in seconds for bonus calculation
}

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
	beginner: {
		rows: 9,
		cols: 9,
		mines: 10,
		baseGidouilles: 10,
		baseTime: 180 // 3 minutes
	},
	intermediate: {
		rows: 16,
		cols: 16,
		mines: 40,
		baseGidouilles: 30,
		baseTime: 600 // 10 minutes
	},
	expert: {
		rows: 16,
		cols: 30,
		mines: 99,
		baseGidouilles: 60,
		baseTime: 1200 // 20 minutes
	}
};

export interface LeaderboardEntry {
	rank: number;
	name: string;
	time: number; // Time in seconds
	gidouilles: number;
	date: Date;
}

export interface GameStats {
	gamesPlayed: number;
	gamesWon: number;
	bestTime: number | null; // In seconds
	totalGidouilles: number;
	difficulty: string;
}
