/**
 * Minesweeper game types and configuration
 */

/**
 * Game difficulty levels
 */
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

/**
 * Difficulty labels in French for UI display
 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
	beginner: 'Débutant',
	intermediate: 'Intermédiaire',
	expert: 'Expert'
} as const;

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

/**
 * Strategy D: Proportional reward system with decimal gidouilles
 *
 * FORMULA: gidouilles = base × time_mult × (1 - hint_penalty) × daily_mult
 *
 * TIME MULTIPLIER (continuous):
 *   ratio = time / referenceTime
 *   time_mult = 1.3 - 0.5 × min(1, ratio)
 *   Range: 1.3 (instant) → 0.8 (at/beyond reference)
 *
 * HINT PENALTY (progressive):
 *   Gidouilles hints: 10% / 22% / 35% for 1/2/3 hints
 *   Item hints:       5% / 11% / 17% for 1/2/3 hints
 *
 * DAILY DEGRESSIVE:
 *   Win 1: 100%, Win 2: 85%, Win 3: 70%, Win 4: 55%, Win 5: 40%, Win 6+: 30%
 *
 * BOUNDS: min 0.3, max 8.0 gidouilles per game
 */
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
	beginner: {
		rows: 9,
		cols: 9,
		mines: 10,
		baseGidouilles: 1.0, // Strategy D: scaled /10
		baseTime: 180 // 3 minutes (reference time)
	},
	intermediate: {
		rows: 16,
		cols: 16,
		mines: 40,
		baseGidouilles: 3.0, // Strategy D: scaled /10
		baseTime: 600 // 10 minutes (reference time)
	},
	expert: {
		rows: 16,
		cols: 30,
		mines: 99,
		baseGidouilles: 6.0, // Strategy D: scaled /10
		baseTime: 1200 // 20 minutes (reference time)
	}
};

/**
 * Strategy D reward calculation constants
 */
export const REWARD_CONSTANTS = {
	// Time multiplier bounds
	TIME_MULT_MAX: 1.3, // Bonus for instant completion
	TIME_MULT_MIN: 0.8, // Penalty floor for slow completion

	// Progressive hint penalties (cumulative percentages)
	HINT_PENALTIES_GIDOUILLES: [0, 0.1, 0.22, 0.35], // Index = hints used
	HINT_PENALTIES_ITEMS: [0, 0.05, 0.11, 0.17], // Half penalty for shop items

	// Daily degressive
	DAILY_REDUCTION_PER_WIN: 0.15, // -15% per additional win
	DAILY_MIN_MULTIPLIER: 0.3, // Floor at 30%

	// Bounds
	MIN_REWARD: 0.3, // You still won something!
	MAX_REWARD: 8.0, // Cap per game

	// Hint cost
	HINT_COST: 1.0 // Was 10, now 1.0 gidouille
} as const;

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

/**
 * Reward breakdown from Strategy D calculation
 * Returned by complete_minesweeper_game RPC for VictoryModal display
 */
export interface RewardBreakdown {
	base_reward: number; // 1.0 / 3.0 / 6.0
	reference_time: number; // 180 / 600 / 1200 seconds
	time_seconds: number; // Actual completion time
	time_mult: number; // 0.8 to 1.3
	hints_used: number; // Total hints used
	hints_from_items: number; // Hints from shop items (half penalty)
	hint_penalty: number; // 0 to 0.50
	wins_today: number; // Wins before this one (same day)
	daily_mult: number; // 0.3 to 1.0
}
