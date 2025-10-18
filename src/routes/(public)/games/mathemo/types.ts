/**
 * TypeScript type definitions for Mathemo game
 *
 * Mathemo is a Wordle-style game for learning French mathematical vocabulary.
 * Players guess math terms appropriate to their grade level.
 */

/**
 * Difficulty levels corresponding to French grade levels
 * - 6ème/5ème: Middle school (basic arithmetic, geometry)
 * - 4ème/3ème: Middle school (algebra, functions)
 * - 2nde/1ère/Tale: High school (advanced algebra, calculus, statistics)
 */
export type Difficulty = '6ème' | '5ème' | '4ème' | '3ème' | '2nde' | '1ère' | 'Tale'

/**
 * Feedback types for each letter in a guess
 * - 'x': Letter is in the correct position (exact match)
 * - 'c': Letter is in the word but wrong position (close)
 * - '_': Letter is not in the word (missing)
 */
export type FeedbackType = 'x' | 'c' | '_'

/**
 * Complete game state for a single Mathemo session
 * Serialized to localStorage for persistence across page refreshes
 */
export interface GameState {
	/** The target word to guess */
	answer: string
	/** All guesses submitted by the player (may be shorter than answer) */
	guesses: string[]
	/** Feedback strings for each guess (using FeedbackType characters) */
	answers: string[]
	/** Letters that have been identified as correct */
	correctLetters: string[]
	/** Maximum number of attempts allowed (adjustable 3-10) */
	maxAttempts: number
	/** Current difficulty level */
	difficulty: Difficulty
	/** Current row being edited (0-indexed) */
	currentRow: number
}

/**
 * Mathematical vocabulary organized by grade level
 * Each difficulty level contains an array of French math terms
 */
export interface WordLists {
	'6ème': string[]
	'5ème': string[]
	'4ème': string[]
	'3ème': string[]
	'2nde': string[]
	'1ère': string[]
	Tale: string[]
}
