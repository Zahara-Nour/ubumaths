/**
 * Client-side game logic for Mathemo (Wordle-style math vocabulary game)
 *
 * This file implements the core game mechanics using Svelte 5 runes:
 * - State management with $state
 * - Word validation with accent normalization
 * - Feedback calculation (exact/close/missing)
 * - localStorage persistence
 * - Adjustable difficulty and attempts
 */
import { browser } from '$app/environment'
import type { GameState, Difficulty, FeedbackType } from './types'
import { getAllowedWords, getRandomWord, normalizeString } from './words'

/** localStorage key for game state persistence */
const STORAGE_KEY = 'mathemo_state'

/** Minimum allowed attempts (configurable via +/- buttons) */
const MIN_ATTEMPTS = 3

/** Maximum allowed attempts (configurable via +/- buttons) */
const MAX_ATTEMPTS = 10

/** Default starting attempts (classic Wordle has 6) */
const DEFAULT_ATTEMPTS = 6

/**
 * Main game class using Svelte 5 runes for reactivity
 * Singleton instance exported at bottom of file
 */
class MathemoGame {
	// ===== Reactive State (Svelte 5 Runes) =====

	/** Target word to guess (randomly selected from difficulty level) */
	answer = $state('')

	/** Array of all guesses entered so far (includes empty strings for future rows) */
	guesses = $state<string[]>([])

	/** Feedback strings for submitted guesses ('x', 'c', '_' characters) */
	answers = $state<string[]>([])

	/** Letters correctly identified in their exact positions */
	correctLetters = $state<string[]>([])

	/** Current maximum attempts allowed (adjustable 3-10) */
	maxAttempts = $state(DEFAULT_ATTEMPTS)

	/** Current difficulty level (grade level) */
	difficulty = $state<Difficulty>('6ème')

	/** Current row being edited (0-indexed) */
	currentRow = $state(0)

	// ===== Constructor =====

	constructor() {
		// Try to restore saved game from localStorage
		if (browser) {
			this.loadFromLocalStorage()
		}

		// If no saved game exists, start a new one
		if (!this.answer) {
			this.startNewGame('6ème', DEFAULT_ATTEMPTS)
		}
	}

	// ===== Game Control Methods =====

	/**
	 * Start a new game with specified difficulty and max attempts
	 * @param difficulty - Grade level (6ème through Tale)
	 * @param maxAttempts - Number of attempts allowed (3-10)
	 */
	startNewGame(difficulty: Difficulty, maxAttempts: number = DEFAULT_ATTEMPTS) {
		this.difficulty = difficulty
		// Clamp attempts to valid range
		this.maxAttempts = Math.max(MIN_ATTEMPTS, Math.min(MAX_ATTEMPTS, maxAttempts))
		// Select random word from difficulty level
		this.answer = getRandomWord(difficulty)
		// Initialize empty guesses array
		this.guesses = Array(this.maxAttempts).fill('')
		// Clear previous feedback
		this.answers = []
		// Reset correct letters tracking
		this.correctLetters = Array(this.answer.length).fill('')
		// Start at first row
		this.currentRow = 0

		this.saveToLocalStorage()
	}

	// ===== Guess Management =====

	/**
	 * Get the current guess being typed (may be incomplete)
	 * @returns Current row's guess string
	 */
	getCurrentGuess(): string {
		return this.guesses[this.currentRow] || ''
	}

	/**
	 * Update current guess with a key press (letter or backspace)
	 * Restricts typing to target word length
	 * @param key - Letter to add or 'backspace' to delete
	 */
	updateGuess(key: string) {
		if (this.isGameOver()) return

		const guess = this.getCurrentGuess()

		if (key === 'backspace') {
			// Remove last character
			this.guesses[this.currentRow] = guess.slice(0, -1)
		} else if (guess.length < this.answer.length) {
			// Add letter if not at max length
			this.guesses[this.currentRow] += key.toLowerCase()
		}

		this.saveToLocalStorage()
	}

	/**
	 * Submit current guess for validation and feedback
	 * Validates word against ALL difficulty levels (permissive)
	 * Accepts words shorter than target, rejects longer words
	 * @returns true if valid and submitted, false if invalid
	 */
	enterGuess(): boolean {
		if (this.isGameOver()) return false

		const guess = this.getCurrentGuess()
		const letters = guess.split('')

		// Must have at least one letter
		if (letters.length === 0) {
			return false
		}

		// Reject words longer than the target (shorter words are OK)
		if (letters.length > this.answer.length) {
			return false
		}

		// Validate with accent normalization across ALL difficulty levels
		const normalizedGuess = normalizeString(guess)
		const isValid = this.isValidWord(normalizedGuess)

		if (!isValid) {
			return false // Word not in dictionary
		}

		// Pad shorter words with empty strings for feedback calculation
		const paddedLetters = [...letters]
		while (paddedLetters.length < this.answer.length) {
			paddedLetters.push('')
		}

		// Calculate and store feedback
		const answer = this.calculateFeedback(paddedLetters)
		this.answers.push(answer)
		this.currentRow++

		this.saveToLocalStorage()
		return true
	}

	// ===== Validation =====

	/**
	 * Check if a word is valid in ANY difficulty level
	 * Uses accent normalization so "algebre" matches "algèbre"
	 * @param normalizedGuess - Guess with accents removed and lowercased
	 * @returns true if word exists in any difficulty level
	 */
	private isValidWord(normalizedGuess: string): boolean {
		const difficulties: Difficulty[] = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tale']

		// Check each difficulty level until word is found
		for (const diff of difficulties) {
			const words = getAllowedWords(diff)
			const found = Array.from(words).some(
				(word) => normalizeString(word) === normalizedGuess,
			)
			if (found) return true
		}

		return false
	}

	// ===== Feedback Calculation =====

	/**
	 * Calculate feedback for a guess using Wordle algorithm
	 * Two-pass approach ensures correct handling of duplicate letters
	 * @param letters - Padded guess letters (empty strings for missing letters)
	 * @returns Feedback string: 'x' (exact), 'c' (close), '_' (missing)
	 */
	private calculateFeedback(letters: string[]): string {
		const available = Array.from(this.answer)
		const feedback: FeedbackType[] = Array(this.answer.length).fill('_')

		// FIRST PASS: Find exact matches (correct letter in correct position)
		for (let i = 0; i < this.answer.length; i++) {
			if (normalizeString(letters[i]) === normalizeString(available[i])) {
				feedback[i] = 'x'
				available[i] = ' ' // Mark as used
				this.correctLetters[i] = letters[i]
			}
		}

		// SECOND PASS: Find close matches (correct letter in wrong position)
		for (let i = 0; i < this.answer.length; i++) {
			if (feedback[i] === '_') {
				const index = available.findIndex(
					(char) => normalizeString(char) === normalizeString(letters[i]),
				)
				if (index !== -1) {
					feedback[i] = 'c'
					available[index] = ' ' // Mark as used
				}
			}
		}

		return feedback.join('')
	}

	// ===== Game State Checks =====

	/**
	 * Check if player has won (all letters exact matches)
	 * @returns true if last guess was completely correct
	 */
	hasWon(): boolean {
		const lastAnswer = this.answers[this.answers.length - 1]
		return lastAnswer === 'x'.repeat(this.answer.length)
	}

	/**
	 * Check if player has lost (used all attempts without winning)
	 * @returns true if no attempts remain and hasn't won
	 */
	hasLost(): boolean {
		return this.currentRow >= this.maxAttempts && !this.hasWon()
	}

	/**
	 * Check if game is over (either won or lost)
	 * @returns true if game has ended
	 */
	isGameOver(): boolean {
		return this.hasWon() || this.hasLost()
	}

	// ===== Attempt Adjustment =====

	/**
	 * Adjust maximum attempts by +1 or -1
	 * Cannot reduce below current row or outside 3-10 range
	 * @param delta - Amount to change (+1 or -1)
	 */
	adjustAttempts(delta: number) {
		if (this.isGameOver()) return

		const newAttempts = this.maxAttempts + delta

		// Enforce min/max bounds
		if (newAttempts < MIN_ATTEMPTS || newAttempts > MAX_ATTEMPTS) {
			return
		}

		// Can't reduce attempts below current progress
		if (newAttempts < this.currentRow) {
			return
		}

		this.maxAttempts = newAttempts

		// Adjust guesses array to match new size
		if (delta > 0) {
			// Add empty rows
			this.guesses.push(...Array(delta).fill(''))
		} else {
			// Remove rows from end
			this.guesses = this.guesses.slice(0, newAttempts)
		}

		this.saveToLocalStorage()
	}

	// ===== Utility Methods =====

	/**
	 * Get the target word length
	 * @returns Number of letters in answer
	 */
	getSize(): number {
		return this.answer.length
	}

	// ===== Persistence (localStorage) =====

	/**
	 * Save current game state to localStorage
	 * Called automatically after state changes
	 */
	private saveToLocalStorage() {
		if (!browser) return

		const state: GameState = {
			answer: this.answer,
			guesses: this.guesses,
			answers: this.answers,
			correctLetters: this.correctLetters,
			maxAttempts: this.maxAttempts,
			difficulty: this.difficulty,
			currentRow: this.currentRow,
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	}

	/**
	 * Load game state from localStorage on initialization
	 * Restores in-progress games after page refresh
	 */
	private loadFromLocalStorage() {
		if (!browser) return

		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (!saved) return

			const state: GameState = JSON.parse(saved)

			// Restore all state properties
			this.answer = state.answer
			this.guesses = state.guesses
			this.answers = state.answers
			this.correctLetters = state.correctLetters
			this.maxAttempts = state.maxAttempts
			this.difficulty = state.difficulty
			this.currentRow = state.currentRow
		} catch (error) {
			console.error('Failed to load game state:', error)
		}
	}

	/**
	 * Clear saved game from localStorage (used when starting fresh)
	 */
	clearSaved() {
		if (!browser) return
		localStorage.removeItem(STORAGE_KEY)
	}
}

// ===== Export Singleton =====
export const game = new MathemoGame()
