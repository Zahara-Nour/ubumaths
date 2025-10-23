/**
 * FSRS (Free Spaced Repetition Scheduler) Implementation
 * =======================================================
 *
 * Implements the FSRS-6 algorithm for optimal spaced repetition scheduling.
 *
 * Algorithm: FSRS v4/v6
 * Model: DSR (Difficulty, Stability, Retrievability)
 * Reference: FSRS_GUIDE.md
 *
 * Key Features:
 * - 30% fewer reviews than SM-2 (Anki's old algorithm)
 * - Adaptive learning (learns user's memory patterns)
 * - Smart handling of review delays
 * - Adjustable retention target (70%-97%)
 *
 * @example
 * ```typescript
 * const fsrs = new FSRS();
 * const cardStats = fsrs.initCard();
 * const updated = fsrs.reviewCard(cardStats, Grade.GOOD);
 * console.log(`Next review in ${fsrs.calculateInterval(updated.stability)} days`);
 * ```
 */

import {
	DEFAULT_FSRS_PARAMS,
	DEFAULT_DESIRED_RETENTION,
	DEFAULT_MAXIMUM_INTERVAL,
	DECAY_PARAMETER
} from './config';
import type { CardStats, Grade, CardState, ReviewHistoryEntry } from './types';

/**
 * FSRS Scheduler Class
 */
export class FSRS {
	/**
	 * FSRS-6 parameters (21 values)
	 */
	private w: number[];

	/**
	 * Desired retention rate (0.7 - 0.97)
	 */
	private desiredRetention: number;

	/**
	 * Decay parameter for forgetting curve
	 */
	private decay: number;

	/**
	 * Maximum interval in days
	 */
	private maxInterval: number;

	/**
	 * Create a new FSRS scheduler
	 *
	 * @param parameters - FSRS-6 parameters (default: DEFAULT_FSRS_PARAMS)
	 * @param desiredRetention - Target retention rate (default: 0.9)
	 * @param maximumInterval - Max days between reviews (default: 36500)
	 */
	constructor(
		parameters: number[] = DEFAULT_FSRS_PARAMS,
		desiredRetention: number = DEFAULT_DESIRED_RETENTION,
		maximumInterval: number = DEFAULT_MAXIMUM_INTERVAL
	) {
		if (parameters.length !== 21) {
			throw new Error('FSRS parameters must have exactly 21 values');
		}

		if (desiredRetention < 0.7 || desiredRetention > 0.97) {
			throw new Error('Desired retention must be between 0.7 and 0.97');
		}

		this.w = parameters;
		this.desiredRetention = desiredRetention;
		this.decay = DECAY_PARAMETER;
		this.maxInterval = maximumInterval;
	}

	/**
	 * Initialize a new card with default values
	 *
	 * @returns CardStats with initial FSRS values
	 */
	initCard(
		userId: string,
		cardReferenceType: 'template' | 'custom',
		cardReferenceId: string
	): Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'> {
		const now = new Date().toISOString();

		return {
			userId,
			cardReferenceType,
			cardReferenceId,
			difficulty: 5, // Start at medium difficulty
			stability: 0, // Will be set on first review
			state: 'new',
			lastReview: null,
			nextReview: now, // Due immediately
			totalReviews: 0,
			reviewHistory: []
		};
	}

	/**
	 * Calculate retrievability (R) - probability of remembering the card
	 *
	 * Formula: R = (1 + elapsed_days / (9 × S))^(-0.5)
	 *
	 * @param card - Card stats
	 * @returns Retrievability between 0 and 1
	 */
	calculateRetrievability(
		card: CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>
	): number {
		if (!card.lastReview || card.stability === 0) {
			return 1; // New card, 100% retrievability
		}

		const now = Date.now();
		const lastReviewTime = new Date(card.lastReview).getTime();
		const elapsedDays = (now - lastReviewTime) / (1000 * 60 * 60 * 24);

		const retrievability = Math.pow(1 + elapsedDays / (9 * card.stability), this.decay);

		return Math.max(0, Math.min(1, retrievability));
	}

	/**
	 * Calculate initial stability based on grade
	 *
	 * Used for the first review of a new card.
	 *
	 * @param grade - Grade given (1-4)
	 * @returns Initial stability in days
	 */
	private calculateInitialStability(grade: Grade): number {
		// Formula: w[0] + w[1] * (grade - 1)
		return this.w[0] + this.w[1] * (grade - 1);
	}

	/**
	 * Calculate new stability after successful review
	 *
	 * Formula: S' = S × (1 + SInc)
	 * Where SInc = e^(w[8]) × (11 - D) × S^(-w[9]) × (e^((1-R) × w[10]) - 1)
	 *
	 * @param card - Card stats
	 * @param grade - Grade given (2-4, not AGAIN)
	 * @returns New stability in days
	 */
	private calculateNewStability(
		card: CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>,
		grade: Grade
	): number {
		const { difficulty, stability } = card;

		// First review (stability = 0)
		if (stability === 0) {
			return this.calculateInitialStability(grade);
		}

		const retrievability = this.calculateRetrievability(card);

		// Factors for stability increase
		const difficultyFactor = Math.exp(this.w[8]) * (11 - difficulty);
		const stabilityFactor = Math.pow(stability, -this.w[9]);
		const retrievabilityFactor = Math.exp((1 - retrievability) * this.w[10]) - 1;

		const stabilityIncrease = 1 + difficultyFactor * stabilityFactor * retrievabilityFactor;

		return stability * Math.max(1, stabilityIncrease);
	}

	/**
	 * Calculate stability after forgetting (AGAIN grade)
	 *
	 * Formula: S' = w[11] × D^(-w[12]) × (S + 1)^(w[13]) × e^(w[14] × (1-R))
	 *
	 * @param card - Card stats
	 * @returns Post-lapse stability
	 */
	private calculatePostLapseStability(
		card: CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>
	): number {
		const { difficulty, stability } = card;
		const retrievability = this.calculateRetrievability(card);

		return (
			this.w[11] *
			Math.pow(difficulty, -this.w[12]) *
			(Math.pow(stability + 1, this.w[13]) - 1) *
			Math.exp(this.w[14] * (1 - retrievability))
		);
	}

	/**
	 * Update difficulty based on grade
	 *
	 * Formula: D' = clamp(D - w[6] × (G - 3), 1, 10)
	 *
	 * @param card - Card stats
	 * @param grade - Grade given (1-4)
	 * @returns New difficulty (1-10)
	 */
	private updateDifficulty(
		card: CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>,
		grade: Grade
	): number {
		const newDifficulty = card.difficulty - this.w[6] * (grade - 3);
		return Math.max(1, Math.min(10, newDifficulty));
	}

	/**
	 * Calculate optimal interval based on stability
	 *
	 * Formula: I = 9 × S × (DR^(-2) - 1)
	 * Where DR = desired retention
	 *
	 * @param stability - Current stability in days
	 * @returns Interval in days (rounded to integer)
	 */
	calculateInterval(stability: number): number {
		const interval = 9 * stability * (Math.pow(this.desiredRetention, 1 / this.decay) - 1);

		return Math.max(1, Math.min(this.maxInterval, Math.round(interval)));
	}

	/**
	 * Review a card - MAIN METHOD
	 *
	 * Updates FSRS metadata based on review grade.
	 *
	 * @param card - Current card stats
	 * @param grade - Grade given (1=Again, 2=Hard, 3=Good, 4=Easy)
	 * @param timeSpent - Time spent on review (seconds, optional)
	 * @returns Updated card stats
	 */
	reviewCard(
		card: CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>,
		grade: Grade,
		timeSpent?: number
	): Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'> {
		const now = new Date();
		const nowISO = now.toISOString();

		// Calculate elapsed days since last review
		const elapsedDays = card.lastReview
			? (now.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
			: 0;

		// Current retrievability
		const retrievability = this.calculateRetrievability(card);

		// Update stability based on grade
		let newStability: number;
		let newState: CardState;

		if (grade === 1) {
			// AGAIN: Failed review
			newStability = this.calculatePostLapseStability(card);
			newState = 'relearning';
		} else {
			// HARD, GOOD, EASY: Successful review
			newStability = this.calculateNewStability(card, grade);
			newState = card.state === 'new' || card.state === 'learning' ? 'learning' : 'review';
		}

		// Update difficulty
		const newDifficulty = this.updateDifficulty(card, grade);

		// Calculate next review interval
		const interval = this.calculateInterval(newStability);

		// Calculate next review date
		const nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

		// Create review history entry
		const historyEntry: ReviewHistoryEntry = {
			date: nowISO,
			grade,
			elapsedDays,
			retrievability,
			timeSpent
		};

		// Return updated card stats
		return {
			...card,
			difficulty: newDifficulty,
			stability: newStability,
			state: newState,
			lastReview: nowISO,
			nextReview: nextReviewDate.toISOString(),
			totalReviews: card.totalReviews + 1,
			reviewHistory: [...card.reviewHistory, historyEntry]
		};
	}

	/**
	 * Check if a card is due for review
	 *
	 * @param card - Card stats
	 * @returns True if card should be reviewed now
	 */
	isDue(card: CardStats): boolean {
		if (!card.nextReview) return true;
		return new Date(card.nextReview) <= new Date();
	}

	/**
	 * Get days until next review (negative if overdue)
	 *
	 * @param card - Card stats
	 * @returns Days until due (negative if overdue)
	 */
	getDaysUntilDue(card: CardStats): number {
		if (!card.nextReview) return 0;

		const now = Date.now();
		const nextReview = new Date(card.nextReview).getTime();
		const diffMs = nextReview - now;

		return diffMs / (1000 * 60 * 60 * 24);
	}

	/**
	 * Get configuration summary
	 *
	 * @returns Configuration object
	 */
	getConfig() {
		return {
			parameters: this.w,
			desiredRetention: this.desiredRetention,
			decay: this.decay,
			maxInterval: this.maxInterval
		};
	}
}

/**
 * Create a default FSRS instance
 *
 * @param desiredRetention - Target retention (default: 0.9)
 * @returns FSRS instance with default parameters
 */
export function createDefaultFSRS(desiredRetention?: number): FSRS {
	return new FSRS(DEFAULT_FSRS_PARAMS, desiredRetention);
}
