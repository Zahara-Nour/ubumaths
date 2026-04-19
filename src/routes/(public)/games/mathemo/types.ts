/**
 * TypeScript type definitions for Mathemo game
 *
 * Mathemo is a Wordle-style game for learning French mathematical vocabulary.
 * Players guess math terms appropriate to their grade level.
 */

import type { GradeCode } from '$lib/types/grades';

/**
 * Feedback types for each letter in a guess
 * - 'x': Letter is in the correct position (exact match)
 * - 'c': Letter is in the word but wrong position (close)
 * - '_': Letter is not in the word (missing)
 */
export type FeedbackType = 'x' | 'c' | '_';

/**
 * Grade levels available in Mathemo
 * Middle school through high school specialty
 */
export const MATHEMO_GRADES: GradeCode[] = ['6', '5', '4', '3', '2', '1_SPE', 'T_SPE'];

/**
 * Display labels for each grade level (French)
 */
export const GRADE_LABELS: Record<string, string> = {
	'6': '6ème',
	'5': '5ème',
	'4': '4ème',
	'3': '3ème',
	'2': '2nde',
	'1_SPE': '1ère',
	T_SPE: 'Tale'
};

/**
 * Complete game state for a single Mathemo session
 * Serialized to localStorage for persistence across page refreshes
 */
export interface GameState {
	/** The target word to guess */
	answer: string;
	/** All guesses submitted by the player (may be shorter than answer) */
	guesses: string[];
	/** Feedback strings for each guess (using FeedbackType characters) */
	answers: string[];
	/** Letters that have been identified as correct */
	correctLetters: string[];
	/** Maximum number of attempts allowed (adjustable 3-10) */
	maxAttempts: number;
	/** Current difficulty level (GradeCode) */
	difficulty: GradeCode;
	/** Current row being edited (0-indexed) */
	currentRow: number;
}
