/**
 * Client-side game logic for Mathemo (Wordle-style math vocabulary game)
 *
 * This file implements the core game mechanics using Svelte 5 runes:
 * - State management with $state
 * - Word validation with accent normalization
 * - Feedback calculation (exact/close/missing)
 * - localStorage persistence
 * - Adjustable difficulty and attempts
 *
 * Uses the math dictionary as word source instead of a hardcoded word list.
 */
import { browser } from '$app/environment';
import type { GradeCode } from '$lib/types/grades';
import type { GameState, FeedbackType } from './types';
import MATH_DICTIONARY, { getTermsForGrade } from '$lib/data/math-dictionary-fr';

/** localStorage key for game state persistence */
const STORAGE_KEY = 'mathemo_state';

/** Minimum allowed attempts (configurable via +/- buttons) */
const MIN_ATTEMPTS = 3;

/** Maximum allowed attempts (configurable via +/- buttons) */
const MAX_ATTEMPTS = 10;

/** Default starting attempts (classic Wordle has 6) */
const DEFAULT_ATTEMPTS = 6;

/**
 * Normalize string by removing accents and converting to lowercase.
 * Allows players to type without accents.
 */
function normalizeString(str: string): string {
	return str
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

/** Pre-computed set of all single-word terms (normalized) for fast validation */
const allWordsNormalized = new Set(
	MATH_DICTIONARY.filter((t) => !t.term.includes(' ')).map((t) => normalizeString(t.term))
);

/**
 * Get single-word terms for a given grade level.
 * Returns normalized term strings (without accents) for the game.
 */
function getWordsForLevel(level: GradeCode): string[] {
	return getTermsForGrade(level)
		.filter((t) => !t.term.includes(' '))
		.map((t) => normalizeString(t.term));
}

/**
 * Get a random word for a given grade level.
 */
function getRandomWord(level: GradeCode): string {
	const words = getWordsForLevel(level);
	return words[Math.floor(Math.random() * words.length)];
}

/**
 * Main game class using Svelte 5 runes for reactivity
 * Singleton instance exported at bottom of file
 */
class MathemoGame {
	// ===== Reactive State (Svelte 5 Runes) =====

	/** Target word to guess (normalized, without accents) */
	answer = $state('');

	/** Array of all guesses entered so far (includes empty strings for future rows) */
	guesses = $state<string[]>([]);

	/** Feedback strings for submitted guesses ('x', 'c', '_' characters) */
	answers = $state<string[]>([]);

	/** Letters correctly identified in their exact positions */
	correctLetters = $state<string[]>([]);

	/** Current maximum attempts allowed (adjustable 3-10) */
	maxAttempts = $state(DEFAULT_ATTEMPTS);

	/** Current difficulty level (GradeCode) */
	difficulty = $state<GradeCode>('6');

	/** Current row being edited (0-indexed) */
	currentRow = $state(0);

	// ===== Constructor =====

	constructor() {
		// Try to restore saved game from localStorage
		if (browser) {
			this.loadFromLocalStorage();
		}

		// If no saved game exists, start a new one
		if (!this.answer) {
			this.startNewGame('6', DEFAULT_ATTEMPTS);
		}
	}

	// ===== Game Control Methods =====

	/**
	 * Start a new game with specified difficulty and max attempts
	 * @param difficulty - GradeCode (e.g., '6', '5', '4', '3', '2', '1_SPE', 'T_SPE')
	 * @param maxAttempts - Number of attempts allowed (3-10)
	 */
	startNewGame(difficulty: GradeCode, maxAttempts: number = DEFAULT_ATTEMPTS) {
		this.difficulty = difficulty;
		this.maxAttempts = Math.max(MIN_ATTEMPTS, Math.min(MAX_ATTEMPTS, maxAttempts));
		this.answer = getRandomWord(difficulty);
		this.guesses = Array(this.maxAttempts).fill('');
		this.answers = [];
		this.correctLetters = Array(this.answer.length).fill('');
		this.currentRow = 0;

		this.saveToLocalStorage();
	}

	// ===== Guess Management =====

	getCurrentGuess(): string {
		return this.guesses[this.currentRow] || '';
	}

	updateGuess(key: string) {
		if (this.isGameOver()) return;

		const guess = this.getCurrentGuess();

		if (key === 'backspace') {
			this.guesses[this.currentRow] = guess.slice(0, -1);
		} else if (guess.length < this.answer.length) {
			this.guesses[this.currentRow] += key.toLowerCase();
		}

		this.saveToLocalStorage();
	}

	/**
	 * Submit current guess for validation and feedback
	 * Validates word against all terms in the dictionary (permissive)
	 */
	enterGuess(): boolean {
		if (this.isGameOver()) return false;

		const guess = this.getCurrentGuess();
		const letters = guess.split('');

		if (letters.length === 0) return false;
		if (letters.length > this.answer.length) return false;

		// Validate with accent normalization against entire dictionary
		const normalizedGuess = normalizeString(guess);
		if (!allWordsNormalized.has(normalizedGuess)) return false;

		// Pad shorter words with empty strings for feedback calculation
		const paddedLetters = [...letters];
		while (paddedLetters.length < this.answer.length) {
			paddedLetters.push('');
		}

		const answer = this.calculateFeedback(paddedLetters);
		this.answers.push(answer);
		this.currentRow++;

		this.saveToLocalStorage();
		return true;
	}

	// ===== Feedback Calculation =====

	private calculateFeedback(letters: string[]): string {
		const available = Array.from(this.answer);
		const feedback: FeedbackType[] = Array(this.answer.length).fill('_');

		// FIRST PASS: Find exact matches
		for (let i = 0; i < this.answer.length; i++) {
			if (normalizeString(letters[i]) === normalizeString(available[i])) {
				feedback[i] = 'x';
				available[i] = ' ';
				this.correctLetters[i] = letters[i];
			}
		}

		// SECOND PASS: Find close matches
		for (let i = 0; i < this.answer.length; i++) {
			if (feedback[i] === '_') {
				const index = available.findIndex(
					(char) => normalizeString(char) === normalizeString(letters[i])
				);
				if (index !== -1) {
					feedback[i] = 'c';
					available[index] = ' ';
				}
			}
		}

		return feedback.join('');
	}

	// ===== Game State Checks =====

	hasWon(): boolean {
		const lastAnswer = this.answers[this.answers.length - 1];
		return lastAnswer === 'x'.repeat(this.answer.length);
	}

	hasLost(): boolean {
		return this.currentRow >= this.maxAttempts && !this.hasWon();
	}

	isGameOver(): boolean {
		return this.hasWon() || this.hasLost();
	}

	// ===== Attempt Adjustment =====

	adjustAttempts(delta: number) {
		if (this.isGameOver()) return;

		const newAttempts = this.maxAttempts + delta;
		if (newAttempts < MIN_ATTEMPTS || newAttempts > MAX_ATTEMPTS) return;
		if (newAttempts < this.currentRow) return;

		this.maxAttempts = newAttempts;

		if (delta > 0) {
			this.guesses.push(...Array(delta).fill(''));
		} else {
			this.guesses = this.guesses.slice(0, newAttempts);
		}

		this.saveToLocalStorage();
	}

	// ===== VIP Power Methods =====

	revealRandomLetter(): number {
		const unrevealed: number[] = [];
		for (let i = 0; i < this.answer.length; i++) {
			if (!this.correctLetters[i]) {
				unrevealed.push(i);
			}
		}
		if (unrevealed.length === 0) return -1;

		const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
		this.correctLetters[idx] = this.answer[idx];
		this.saveToLocalStorage();
		return idx;
	}

	revealVowels(): number[] {
		const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
		const normalizedAnswer = normalizeString(this.answer);

		const unrevealedVowels: number[] = [];
		for (let i = 0; i < normalizedAnswer.length; i++) {
			if (vowels.has(normalizedAnswer[i]) && !this.correctLetters[i]) {
				unrevealedVowels.push(i);
			}
		}

		const revealed: number[] = [];
		const count = Math.min(2, unrevealedVowels.length);
		const shuffled = [...unrevealedVowels].sort(() => Math.random() - 0.5);
		for (let i = 0; i < count; i++) {
			const idx = shuffled[i];
			this.correctLetters[idx] = this.answer[idx];
			revealed.push(idx);
		}

		this.saveToLocalStorage();
		return revealed;
	}

	undoLastGuess(): boolean {
		if (this.currentRow === 0) return false;
		if (this.isGameOver()) return false;

		this.currentRow--;
		this.answers.pop();
		this.guesses[this.currentRow] = '';
		this.saveToLocalStorage();
		return true;
	}

	// ===== Utility Methods =====

	getSize(): number {
		return this.answer.length;
	}

	getCompletionData(): {
		word_length: number;
		attempts_used: number;
		max_attempts: number;
		won: boolean;
		found_first_try: boolean;
	} {
		const won = this.hasWon();
		return {
			word_length: this.answer.length,
			attempts_used: this.currentRow,
			max_attempts: this.maxAttempts,
			won,
			found_first_try: won && this.currentRow === 1
		};
	}

	// ===== Persistence (localStorage) =====

	private saveToLocalStorage() {
		if (!browser) return;

		const state: GameState = {
			answer: this.answer,
			guesses: this.guesses,
			answers: this.answers,
			correctLetters: this.correctLetters,
			maxAttempts: this.maxAttempts,
			difficulty: this.difficulty,
			currentRow: this.currentRow
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

	private loadFromLocalStorage() {
		if (!browser) return;

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			const state: GameState = JSON.parse(saved);

			this.answer = state.answer;
			this.guesses = state.guesses;
			this.answers = state.answers;
			this.correctLetters = state.correctLetters;
			this.maxAttempts = state.maxAttempts;
			this.difficulty = state.difficulty;
			this.currentRow = state.currentRow;
		} catch (error) {
			console.error('Failed to load game state:', error);
		}
	}

	clearSaved() {
		if (!browser) return;
		localStorage.removeItem(STORAGE_KEY);
	}
}

// ===== Export Singleton =====
export const game = new MathemoGame();
