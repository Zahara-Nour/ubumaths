/**
 * Minesweeper game types and configuration
 */

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
	difficulty: 'beginner' | 'intermediate' | 'expert';
	status: 'not_started' | 'in_progress' | 'won' | 'lost';
	grid: CellState[][];
	rows: number;
	cols: number;
	minesCount: number;
	flagsUsed: number;
	cellsRevealed: number;
	timeElapsed: number;
	startedAt?: Date;
	seed?: string; // Optional seed for deterministic grid generation (daily challenges)
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
