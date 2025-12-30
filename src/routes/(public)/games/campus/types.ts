/**
 * TypeScript type definitions for Campus game
 *
 * Campus is a dice-based board game where players flip numbered tokens.
 * The goal is to flip all tokens using as few dice rolls as possible.
 */

/**
 * Token types on the board
 * - 'number': Regular numbered token (1-24)
 * - 'star': Star token worth 25 points (only flipped by chain reaction)
 */
export type TokenType = 'number' | 'star';

/**
 * Represents a single token on the board
 */
export interface Token {
	/** Token value (1-24 for numbers, 25 for stars) */
	value: number;
	/** Token type */
	type: TokenType;
	/** Whether the token has been flipped (face down) */
	flipped: boolean;
	/** Row position (0-5) */
	row: number;
	/** Column position (0-5) */
	col: number;
}

/**
 * Dice roll result
 */
export interface DiceRoll {
	/** First die value (1-6) */
	die1: number;
	/** Second die value (1-6) */
	die2: number;
	/** Whether it's a double (both dice show same value) */
	isDouble: boolean;
	/** Available points to spend (sum, or sum*2 if double, max 20) */
	availablePoints: number;
}

/**
 * Position on the board
 */
export interface Position {
	row: number;
	col: number;
}

/**
 * Chain reaction step (for animation)
 */
export interface ChainReactionStep {
	/** Positions of tokens flipped in this step */
	positions: Position[];
	/** The alignment that triggered this flip (for display) */
	alignment: 'row' | 'col' | 'diagonal';
	/** Index of the alignment (0-5 for row/col, 0-1 for diagonals) */
	alignmentIndex: number;
}

/**
 * Game status
 */
export type GameStatus = 'not_started' | 'rolling' | 'selecting' | 'animating' | 'won';

/**
 * Complete game state for a Campus session
 * Serialized to localStorage for persistence
 */
export interface GameState {
	/** 6x6 grid of tokens */
	grid: Token[][];
	/** Current game status */
	status: GameStatus;
	/** Number of dice rolls made */
	rollCount: number;
	/** Total points used (sum of selected tokens) */
	totalPointsUsed: number;
	/** Current dice roll (null if not rolled yet) */
	currentRoll: DiceRoll | null;
	/** Currently selected token positions */
	selectedPositions: Position[];
	/** Points remaining from current roll */
	pointsRemaining: number;
	/** Chain reaction history (for replay/animation) */
	chainReactions: ChainReactionStep[];
	/** Timestamp when game started */
	startedAt: number;
	/** Timestamp when game ended (null if ongoing) */
	endedAt: number | null;
}

/**
 * All available tokens in the game (44 total)
 * Draw 36 randomly to fill the 6x6 grid
 */
export const ALL_TOKENS: { value: number; type: TokenType }[] = [
	// 3 stars (worth 25 points each)
	{ value: 25, type: 'star' },
	{ value: 25, type: 'star' },
	{ value: 25, type: 'star' },
	// 3 sets of 1-5
	{ value: 1, type: 'number' },
	{ value: 2, type: 'number' },
	{ value: 3, type: 'number' },
	{ value: 4, type: 'number' },
	{ value: 5, type: 'number' },
	{ value: 1, type: 'number' },
	{ value: 2, type: 'number' },
	{ value: 3, type: 'number' },
	{ value: 4, type: 'number' },
	{ value: 5, type: 'number' },
	{ value: 1, type: 'number' },
	{ value: 2, type: 'number' },
	{ value: 3, type: 'number' },
	{ value: 4, type: 'number' },
	{ value: 5, type: 'number' },
	// 1 extra 4
	{ value: 4, type: 'number' },
	// 3 sets of 6-10
	{ value: 6, type: 'number' },
	{ value: 7, type: 'number' },
	{ value: 8, type: 'number' },
	{ value: 9, type: 'number' },
	{ value: 10, type: 'number' },
	{ value: 6, type: 'number' },
	{ value: 7, type: 'number' },
	{ value: 8, type: 'number' },
	{ value: 9, type: 'number' },
	{ value: 10, type: 'number' },
	{ value: 6, type: 'number' },
	{ value: 7, type: 'number' },
	{ value: 8, type: 'number' },
	{ value: 9, type: 'number' },
	{ value: 10, type: 'number' },
	// 1 extra 8
	{ value: 8, type: 'number' },
	// 11-15
	{ value: 11, type: 'number' },
	{ value: 12, type: 'number' },
	{ value: 13, type: 'number' },
	{ value: 14, type: 'number' },
	{ value: 15, type: 'number' },
	// 16, 18, 20, 22, 24
	{ value: 16, type: 'number' },
	{ value: 18, type: 'number' },
	{ value: 20, type: 'number' },
	{ value: 22, type: 'number' },
	{ value: 24, type: 'number' }
];

/**
 * Grid dimensions
 */
export const GRID_SIZE = 6;

/**
 * Calculate final score (lower is better)
 * Score = rollCount * 100 + totalPointsUsed
 */
export function calculateScore(rollCount: number, totalPointsUsed: number): number {
	return rollCount * 100 + totalPointsUsed;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
	id: string;
	userId: string;
	username: string;
	rollCount: number;
	totalPointsUsed: number;
	score: number;
	completedAt: string;
}
