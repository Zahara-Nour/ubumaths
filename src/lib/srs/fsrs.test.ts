/**
 * FSRS Algorithm Tests
 * =====================
 *
 * Comprehensive tests for the FSRS-6 (Free Spaced Repetition Scheduler) algorithm.
 *
 * Test Categories:
 * 1. Initialization and configuration
 * 2. Card state transitions (new → learning → review → relearning)
 * 3. Difficulty calculation
 * 4. Stability calculation
 * 5. Retrievability calculation
 * 6. Interval scheduling
 * 7. Grade effects (1-4)
 * 8. Edge cases and error handling
 *
 * The FSRS algorithm is mathematically complex and these tests validate
 * that the implementation adheres to the FSRS-6 specification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FSRS, createDefaultFSRS } from './fsrs';
import { Grade, type CardStats } from './types';
import {
	DEFAULT_FSRS_PARAMS,
	DEFAULT_DESIRED_RETENTION,
	DEFAULT_MAXIMUM_INTERVAL,
	RETENTION_PROFILES
} from './config';

describe('FSRS Initialization', () => {
	it('should create FSRS instance with default parameters', () => {
		const fsrs = new FSRS();
		const config = fsrs.getConfig();

		expect(config.parameters).toEqual(DEFAULT_FSRS_PARAMS);
		expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
		expect(config.maxInterval).toBe(DEFAULT_MAXIMUM_INTERVAL);
	});

	it('should create FSRS instance with custom retention', () => {
		const customRetention = RETENTION_PROFILES.high; // 0.95
		const fsrs = new FSRS(DEFAULT_FSRS_PARAMS, customRetention);
		const config = fsrs.getConfig();

		expect(config.desiredRetention).toBe(customRetention);
	});

	it('should create FSRS instance with custom maximum interval', () => {
		const customMaxInterval = 365; // 1 year
		const fsrs = new FSRS(DEFAULT_FSRS_PARAMS, DEFAULT_DESIRED_RETENTION, customMaxInterval);
		const config = fsrs.getConfig();

		expect(config.maxInterval).toBe(customMaxInterval);
	});

	it('should throw error if parameters array has wrong length', () => {
		const invalidParams = [1, 2, 3]; // Only 3 parameters instead of 21

		expect(() => {
			new FSRS(invalidParams);
		}).toThrow('FSRS parameters must have exactly 21 values');
	});

	it('should throw error if desired retention is too low', () => {
		expect(() => {
			new FSRS(DEFAULT_FSRS_PARAMS, 0.5); // Below 0.7
		}).toThrow('Desired retention must be between 0.7 and 0.97');
	});

	it('should throw error if desired retention is too high', () => {
		expect(() => {
			new FSRS(DEFAULT_FSRS_PARAMS, 0.99); // Above 0.97
		}).toThrow('Desired retention must be between 0.7 and 0.97');
	});

	it('should accept retention at lower boundary (0.7)', () => {
		expect(() => {
			new FSRS(DEFAULT_FSRS_PARAMS, 0.7);
		}).not.toThrow();
	});

	it('should accept retention at upper boundary (0.97)', () => {
		expect(() => {
			new FSRS(DEFAULT_FSRS_PARAMS, 0.97);
		}).not.toThrow();
	});

	it('should create instance via helper function', () => {
		const fsrs = createDefaultFSRS();
		const config = fsrs.getConfig();

		expect(config.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
	});

	it('should create instance via helper function with custom retention', () => {
		const customRetention = RETENTION_PROFILES.expert; // 0.97
		const fsrs = createDefaultFSRS(customRetention);
		const config = fsrs.getConfig();

		expect(config.desiredRetention).toBe(customRetention);
	});
});

describe('FSRS Card Initialization', () => {
	let fsrs: FSRS;

	beforeEach(() => {
		fsrs = new FSRS();
	});

	it('should initialize a new card with default values', () => {
		const card = fsrs.initCard('user-123', 'template', 'template-456');

		expect(card.userId).toBe('user-123');
		expect(card.cardReferenceType).toBe('template');
		expect(card.cardReferenceId).toBe('template-456');
		expect(card.difficulty).toBe(5); // Medium difficulty
		expect(card.stability).toBe(0); // Will be set on first review
		expect(card.state).toBe('new');
		expect(card.lastReview).toBeNull();
		expect(card.totalReviews).toBe(0);
		expect(card.reviewHistory).toEqual([]);
	});

	it('should set next review to current time for new cards', () => {
		const beforeInit = new Date().toISOString();
		const card = fsrs.initCard('user-123', 'custom', 'card-789');
		const afterInit = new Date().toISOString();

		// Next review should be between before and after
		expect(card.nextReview >= beforeInit).toBe(true);
		expect(card.nextReview <= afterInit).toBe(true);
	});
});

describe('FSRS Retrievability Calculation', () => {
	let fsrs: FSRS;

	beforeEach(() => {
		fsrs = new FSRS();
	});

	it('should return 1.0 retrievability for new cards', () => {
		const card = fsrs.initCard('user-123', 'template', 'template-456');
		const retrievability = fsrs.calculateRetrievability(card);

		expect(retrievability).toBe(1); // 100% retrievability for new cards
	});

	it('should return 1.0 retrievability for cards with stability = 0', () => {
		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 0,
			state: 'new',
			lastReview: new Date().toISOString(),
			nextReview: new Date().toISOString(),
			totalReviews: 0,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const retrievability = fsrs.calculateRetrievability(card);
		expect(retrievability).toBe(1);
	});

	it('should calculate retrievability for recently reviewed card', () => {
		// Card reviewed 1 day ago with stability of 10 days
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 10,
			state: 'review',
			lastReview: oneDayAgo,
			nextReview: new Date().toISOString(),
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const retrievability = fsrs.calculateRetrievability(card);

		// Retrievability should be high (close to 1) for recently reviewed cards
		expect(retrievability).toBeGreaterThan(0.9);
		expect(retrievability).toBeLessThanOrEqual(1.0);
	});

	it('should calculate lower retrievability for overdue card', () => {
		// Card reviewed 30 days ago with stability of 1 day (very unstable)
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 1, // Very low stability
			state: 'review',
			lastReview: thirtyDaysAgo,
			nextReview: new Date().toISOString(),
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const retrievability = fsrs.calculateRetrievability(card);

		// Retrievability should be lower than for recently reviewed cards
		expect(retrievability).toBeLessThan(0.9);
		expect(retrievability).toBeGreaterThan(0);
	});

	it('should clamp retrievability between 0 and 1', () => {
		// Extreme case: very overdue card
		const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 1,
			state: 'review',
			lastReview: yearAgo,
			nextReview: new Date().toISOString(),
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const retrievability = fsrs.calculateRetrievability(card);

		expect(retrievability).toBeGreaterThanOrEqual(0);
		expect(retrievability).toBeLessThanOrEqual(1);
	});
});

describe('FSRS Card State Transitions', () => {
	let fsrs: FSRS;
	let newCard: Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

	beforeEach(() => {
		fsrs = new FSRS();
		newCard = fsrs.initCard('user-123', 'template', 'template-456');
	});

	describe('New → Learning', () => {
		it('should transition from new to learning on GOOD grade', () => {
			const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

			expect(reviewed.state).toBe('learning');
			expect(reviewed.totalReviews).toBe(1);
			expect(reviewed.lastReview).not.toBeNull();
		});

		it('should transition from new to learning on HARD grade', () => {
			const reviewed = fsrs.reviewCard(newCard, Grade.HARD);

			expect(reviewed.state).toBe('learning');
		});

		it('should transition from new to learning on EASY grade', () => {
			const reviewed = fsrs.reviewCard(newCard, Grade.EASY);

			expect(reviewed.state).toBe('learning');
		});

		it('should transition from new to relearning on AGAIN grade', () => {
			const reviewed = fsrs.reviewCard(newCard, Grade.AGAIN);

			expect(reviewed.state).toBe('relearning');
		});
	});

	describe('Learning → Learning (stays in learning)', () => {
		it('should stay in learning state on second GOOD review', () => {
			// First review: new → learning
			const firstReview = fsrs.reviewCard(newCard, Grade.GOOD);
			expect(firstReview.state).toBe('learning');

			// Simulate time passing
			const secondCard = {
				...firstReview,
				lastReview: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
			};

			// Second review: learning → still learning (FSRS keeps in learning)
			const secondReview = fsrs.reviewCard(secondCard, Grade.GOOD);
			expect(secondReview.state).toBe('learning');
			expect(secondReview.totalReviews).toBe(2);
		});

		it('should transition from learning to review only when already in review state', () => {
			// Manually set card to review state
			const reviewCard = { ...newCard, state: 'review' as const };
			const reviewed = fsrs.reviewCard(reviewCard, Grade.GOOD);

			expect(reviewed.state).toBe('review');
		});
	});

	describe('Any State → Relearning on AGAIN', () => {
		it('should transition to relearning on AGAIN grade', () => {
			// Any card that gets AGAIN goes to relearning
			const reviewCard = { ...newCard, state: 'review' as const };
			const failed = fsrs.reviewCard(reviewCard, Grade.AGAIN);
			expect(failed.state).toBe('relearning');
		});

		it('should transition from learning to relearning on AGAIN', () => {
			const learningCard = { ...newCard, state: 'learning' as const };
			const failed = fsrs.reviewCard(learningCard, Grade.AGAIN);
			expect(failed.state).toBe('relearning');
		});
	});
});

describe('FSRS Difficulty Updates', () => {
	let fsrs: FSRS;
	let newCard: Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

	beforeEach(() => {
		fsrs = new FSRS();
		newCard = fsrs.initCard('user-123', 'template', 'template-456');
	});

	it('should decrease difficulty on EASY grade', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.EASY);

		// EASY (grade 4) should decrease difficulty
		expect(reviewed.difficulty).toBeLessThan(newCard.difficulty);
	});

	it('should slightly decrease difficulty on GOOD grade', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		// GOOD (grade 3) should keep difficulty stable (grade - 3 = 0)
		expect(Math.abs(reviewed.difficulty - newCard.difficulty)).toBeLessThan(0.1);
	});

	it('should increase difficulty on HARD grade', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.HARD);

		// HARD (grade 2) should increase difficulty
		expect(reviewed.difficulty).toBeGreaterThan(newCard.difficulty);
	});

	it('should increase difficulty more on AGAIN grade', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.AGAIN);

		// AGAIN (grade 1) should increase difficulty the most
		expect(reviewed.difficulty).toBeGreaterThan(newCard.difficulty);
	});

	it('should clamp difficulty to minimum of 1', () => {
		// Create card with low difficulty
		const easyCard = { ...newCard, difficulty: 1.5 };

		// Grade EASY multiple times
		let card = easyCard;
		for (let i = 0; i < 10; i++) {
			card = fsrs.reviewCard(card, Grade.EASY);
		}

		expect(card.difficulty).toBeGreaterThanOrEqual(1);
	});

	it('should clamp difficulty to maximum of 10', () => {
		// Create card with high difficulty
		const hardCard = { ...newCard, difficulty: 9.5 };

		// Grade AGAIN multiple times
		let card = hardCard;
		for (let i = 0; i < 10; i++) {
			card = fsrs.reviewCard(card, Grade.AGAIN);
		}

		expect(card.difficulty).toBeLessThanOrEqual(10);
	});
});

describe('FSRS Stability Calculation', () => {
	let fsrs: FSRS;
	let newCard: Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

	beforeEach(() => {
		fsrs = new FSRS();
		newCard = fsrs.initCard('user-123', 'template', 'template-456');
	});

	it('should set initial stability based on first review grade', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		// Initial stability should be > 0
		expect(reviewed.stability).toBeGreaterThan(0);
	});

	it('should set higher initial stability for EASY grade', () => {
		const easyReview = fsrs.reviewCard(newCard, Grade.EASY);
		const goodReview = fsrs.reviewCard(newCard, Grade.GOOD);

		// EASY should have higher initial stability than GOOD
		expect(easyReview.stability).toBeGreaterThan(goodReview.stability);
	});

	it('should set lower initial stability for HARD grade', () => {
		const hardReview = fsrs.reviewCard(newCard, Grade.HARD);
		const goodReview = fsrs.reviewCard(newCard, Grade.GOOD);

		// HARD should have lower initial stability than GOOD
		expect(hardReview.stability).toBeLessThan(goodReview.stability);
	});

	it('should increase stability on successful reviews', () => {
		// First review
		const firstReview = fsrs.reviewCard(newCard, Grade.GOOD);
		const initialStability = firstReview.stability;

		// Second review after time passes
		const secondReview = fsrs.reviewCard(
			{
				...firstReview,
				lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
			},
			Grade.GOOD
		);

		// Stability should increase
		expect(secondReview.stability).toBeGreaterThan(initialStability);
	});

	it('should calculate different stability based on grade over multiple reviews', () => {
		// Track stability progression for different grades
		let easyCard = fsrs.initCard('user-123', 'template', 'template-456');
		let goodCard = fsrs.initCard('user-123', 'template', 'template-456');

		// Perform multiple reviews with different grades
		for (let i = 0; i < 3; i++) {
			easyCard = fsrs.reviewCard(
				{
					...easyCard,
					lastReview: i === 0 ? null : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				},
				Grade.EASY
			);

			goodCard = fsrs.reviewCard(
				{
					...goodCard,
					lastReview: i === 0 ? null : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				},
				Grade.GOOD
			);
		}

		// After multiple EASY reviews, stability should be higher
		expect(easyCard.stability).toBeGreaterThan(goodCard.stability);
	});

	it('should decrease stability on AGAIN grade (post-lapse)', () => {
		// Get to review state
		const firstReview = fsrs.reviewCard(newCard, Grade.GOOD);
		const secondReview = fsrs.reviewCard(
			{
				...firstReview,
				lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
			},
			Grade.GOOD
		);

		const beforeFailureStability = secondReview.stability;

		// Fail the card
		const failed = fsrs.reviewCard(secondReview, Grade.AGAIN);

		// Post-lapse stability should be less than pre-failure
		expect(failed.stability).toBeLessThan(beforeFailureStability);
	});
});

describe('FSRS Interval Calculation', () => {
	let fsrs: FSRS;

	beforeEach(() => {
		fsrs = new FSRS();
	});

	it('should calculate interval based on stability', () => {
		const stability = 10; // 10 days
		const interval = fsrs.calculateInterval(stability);

		expect(interval).toBeGreaterThan(0);
		expect(Number.isInteger(interval)).toBe(true); // Should be rounded to integer
	});

	it('should return minimum interval of 1 day', () => {
		const veryLowStability = 0.001;
		const interval = fsrs.calculateInterval(veryLowStability);

		expect(interval).toBeGreaterThanOrEqual(1);
	});

	it('should respect maximum interval', () => {
		const maxInterval = 365; // 1 year
		const fsrsWithMaxInterval = new FSRS(
			DEFAULT_FSRS_PARAMS,
			DEFAULT_DESIRED_RETENTION,
			maxInterval
		);

		const veryHighStability = 10000;
		const interval = fsrsWithMaxInterval.calculateInterval(veryHighStability);

		expect(interval).toBeLessThanOrEqual(maxInterval);
	});

	it('should calculate longer intervals for higher desired retention', () => {
		const fsrsLowRetention = new FSRS(DEFAULT_FSRS_PARAMS, 0.8); // 80%
		const fsrsHighRetention = new FSRS(DEFAULT_FSRS_PARAMS, 0.95); // 95%

		const stability = 10;
		const lowInterval = fsrsLowRetention.calculateInterval(stability);
		const highInterval = fsrsHighRetention.calculateInterval(stability);

		// Higher retention should result in shorter intervals (more frequent reviews)
		expect(highInterval).toBeLessThan(lowInterval);
	});
});

describe('FSRS Review History', () => {
	let fsrs: FSRS;
	let newCard: Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

	beforeEach(() => {
		fsrs = new FSRS();
		newCard = fsrs.initCard('user-123', 'template', 'template-456');
	});

	it('should add entry to review history', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		expect(reviewed.reviewHistory).toHaveLength(1);
		expect(reviewed.reviewHistory[0].grade).toBe(Grade.GOOD);
	});

	it('should record review timestamp', () => {
		const beforeReview = new Date().toISOString();
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);
		const afterReview = new Date().toISOString();

		const historyEntry = reviewed.reviewHistory[0];
		expect(historyEntry.date >= beforeReview).toBe(true);
		expect(historyEntry.date <= afterReview).toBe(true);
	});

	it('should record elapsed days', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		// First review should have 0 elapsed days
		expect(reviewed.reviewHistory[0].elapsedDays).toBe(0);
	});

	it('should record retrievability at time of review', () => {
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		expect(reviewed.reviewHistory[0].retrievability).toBeDefined();
		expect(reviewed.reviewHistory[0].retrievability).toBeGreaterThanOrEqual(0);
		expect(reviewed.reviewHistory[0].retrievability).toBeLessThanOrEqual(1);
	});

	it('should record time spent if provided', () => {
		const timeSpent = 45; // 45 seconds
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD, timeSpent);

		expect(reviewed.reviewHistory[0].timeSpent).toBe(timeSpent);
	});

	it('should accumulate review history over multiple reviews', () => {
		let card = newCard;

		// Perform 5 reviews
		for (let i = 0; i < 5; i++) {
			card = fsrs.reviewCard(
				{
					...card,
					lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
				},
				Grade.GOOD
			);
		}

		expect(card.reviewHistory).toHaveLength(5);
	});
});

describe('FSRS Next Review Scheduling', () => {
	let fsrs: FSRS;
	let newCard: Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

	beforeEach(() => {
		fsrs = new FSRS();
		newCard = fsrs.initCard('user-123', 'template', 'template-456');
	});

	it('should set next review date based on interval', () => {
		const reviewTime = new Date();
		const reviewed = fsrs.reviewCard(newCard, Grade.GOOD);

		const nextReviewTime = new Date(reviewed.nextReview);
		const diffMs = nextReviewTime.getTime() - reviewTime.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);

		// Next review should be in the future
		expect(diffDays).toBeGreaterThan(0);
	});

	it('should schedule sooner for HARD grade', () => {
		const hardReview = fsrs.reviewCard(newCard, Grade.HARD);
		const goodReview = fsrs.reviewCard(newCard, Grade.GOOD);

		const hardInterval = new Date(hardReview.nextReview).getTime() - new Date().getTime();
		const goodInterval = new Date(goodReview.nextReview).getTime() - new Date().getTime();

		// HARD should schedule sooner than GOOD
		expect(hardInterval).toBeLessThan(goodInterval);
	});

	it('should schedule later for EASY grade', () => {
		const easyReview = fsrs.reviewCard(newCard, Grade.EASY);
		const goodReview = fsrs.reviewCard(newCard, Grade.GOOD);

		const easyInterval = new Date(easyReview.nextReview).getTime() - new Date().getTime();
		const goodInterval = new Date(goodReview.nextReview).getTime() - new Date().getTime();

		// EASY should schedule later than GOOD
		expect(easyInterval).toBeGreaterThan(goodInterval);
	});
});

describe('FSRS Due Date Checking', () => {
	let fsrs: FSRS;

	beforeEach(() => {
		fsrs = new FSRS();
	});

	it('should identify card as due if next review is in the past', () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 10,
			state: 'review',
			lastReview: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
			nextReview: pastDate,
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		expect(fsrs.isDue(card)).toBe(true);
	});

	it('should identify card as not due if next review is in the future', () => {
		const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day from now

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 10,
			state: 'review',
			lastReview: new Date().toISOString(),
			nextReview: futureDate,
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		expect(fsrs.isDue(card)).toBe(false);
	});

	it('should return days until due for future card', () => {
		const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 10,
			state: 'review',
			lastReview: new Date().toISOString(),
			nextReview: threeDaysFromNow,
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const daysUntilDue = fsrs.getDaysUntilDue(card);

		// Should be approximately 3 days
		expect(daysUntilDue).toBeGreaterThan(2.9);
		expect(daysUntilDue).toBeLessThan(3.1);
	});

	it('should return negative days for overdue card', () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

		const card: CardStats = {
			id: 'stats-1',
			userId: 'user-123',
			cardReferenceType: 'template',
			cardReferenceId: 'template-456',
			difficulty: 5,
			stability: 10,
			state: 'review',
			lastReview: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			nextReview: twoDaysAgo,
			totalReviews: 1,
			reviewHistory: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const daysUntilDue = fsrs.getDaysUntilDue(card);

		// Should be approximately -2 days
		expect(daysUntilDue).toBeLessThan(-1.9);
		expect(daysUntilDue).toBeGreaterThan(-2.1);
	});
});

describe('FSRS Edge Cases', () => {
	let fsrs: FSRS;

	beforeEach(() => {
		fsrs = new FSRS();
	});

	it('should handle rapid successive reviews', () => {
		let card = fsrs.initCard('user-123', 'template', 'template-456');

		// Review 10 times in quick succession
		for (let i = 0; i < 10; i++) {
			card = fsrs.reviewCard(card, Grade.GOOD);
		}

		expect(card.totalReviews).toBe(10);
		expect(card.reviewHistory).toHaveLength(10);
		expect(card.stability).toBeGreaterThan(0);
	});

	it('should handle alternating EASY and AGAIN grades', () => {
		let card = fsrs.initCard('user-123', 'template', 'template-456');

		// Alternate between EASY and AGAIN
		// 0: EASY (new→learning), 1: AGAIN (learning→relearning), 2: EASY (relearning→review),
		// 3: AGAIN (review→relearning), 4: EASY (relearning→review)
		for (let i = 0; i < 5; i++) {
			card = fsrs.reviewCard(card, i % 2 === 0 ? Grade.EASY : Grade.AGAIN);
		}

		expect(card.totalReviews).toBe(5);
		// Last was EASY from relearning state, so should be review
		expect(card.state).toBe('review');
	});

	it('should handle very long intervals without overflow', () => {
		// Create card with very high stability
		let card = fsrs.initCard('user-123', 'template', 'template-456');

		// Grade EASY many times to build up stability
		for (let i = 0; i < 20; i++) {
			card = fsrs.reviewCard(
				{
					...card,
					lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				},
				Grade.EASY
			);
		}

		const interval = fsrs.calculateInterval(card.stability);

		// Should not exceed max interval
		expect(interval).toBeLessThanOrEqual(DEFAULT_MAXIMUM_INTERVAL);
		expect(Number.isFinite(interval)).toBe(true);
	});

	it('should maintain data integrity across multiple reviews', () => {
		let card = fsrs.initCard('user-123', 'template', 'template-456');
		const grades = [Grade.GOOD, Grade.HARD, Grade.GOOD, Grade.EASY, Grade.AGAIN, Grade.GOOD];

		for (const grade of grades) {
			card = fsrs.reviewCard(
				{
					...card,
					lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				},
				grade
			);

			// Validate data integrity after each review
			expect(card.difficulty).toBeGreaterThanOrEqual(1);
			expect(card.difficulty).toBeLessThanOrEqual(10);
			expect(card.stability).toBeGreaterThan(0);
			expect(card.totalReviews).toBeGreaterThan(0);
			expect(card.reviewHistory.length).toBe(card.totalReviews);
			expect(card.lastReview).not.toBeNull();
		}
	});
});

describe('FSRS Integration Scenarios', () => {
	it('should simulate realistic learning progression', () => {
		const fsrs = new FSRS();
		let card = fsrs.initCard('user-123', 'template', 'template-456');

		// Day 1: First exposure - Good
		card = fsrs.reviewCard(card, Grade.GOOD);
		expect(card.state).toBe('learning');

		// Day 2: Second review - Good (stays in learning)
		card = fsrs.reviewCard(
			{
				...card,
				lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
			},
			Grade.GOOD
		);
		expect(card.state).toBe('learning'); // Still learning in FSRS

		// Day 5: Third review - Easy (still learning, but with higher stability)
		card = fsrs.reviewCard(
			{
				...card,
				lastReview: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
			},
			Grade.EASY
		);
		expect(card.state).toBe('learning'); // Remains in learning

		// Stability should increase over time
		expect(card.stability).toBeGreaterThan(1);
	});

	it('should simulate forgetting and relearning', () => {
		const fsrs = new FSRS();
		let card = fsrs.initCard('user-123', 'template', 'template-456');

		// Build up stability through successful reviews
		card = fsrs.reviewCard(card, Grade.GOOD);
		card = fsrs.reviewCard(
			{
				...card,
				lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
			},
			Grade.GOOD
		);
		expect(card.state).toBe('learning');

		const stabilityBeforeFailure = card.stability;

		// Forget the card
		card = fsrs.reviewCard(card, Grade.AGAIN);
		expect(card.state).toBe('relearning');

		// Stability should decrease (post-lapse)
		expect(card.stability).toBeLessThan(stabilityBeforeFailure);

		// Relearn the card (successful review from relearning)
		card = fsrs.reviewCard(
			{
				...card,
				lastReview: new Date(Date.now() - 60 * 60 * 1000).toISOString()
			},
			Grade.GOOD
		);

		// From relearning state, successful review (not new/learning) goes to review
		expect(card.state).toBe('review');
	});
});
