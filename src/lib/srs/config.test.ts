/**
 * SRS Configuration Tests
 * =======================
 *
 * Tests for FSRS configuration validation and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
	DEFAULT_FSRS_PARAMS,
	DEFAULT_DESIRED_RETENTION,
	DEFAULT_MAXIMUM_INTERVAL,
	RETENTION_PROFILES,
	isValidRetention,
	isValidParameters,
	getRetentionProfileName,
	GRADE_LABELS,
	STATE_LABELS
} from './config';

describe('Configuration Constants', () => {
	it('should have 21 default FSRS parameters', () => {
		expect(DEFAULT_FSRS_PARAMS).toHaveLength(21);
	});

	it('should have all parameters as numbers', () => {
		DEFAULT_FSRS_PARAMS.forEach((param) => {
			expect(typeof param).toBe('number');
			expect(Number.isFinite(param)).toBe(true);
		});
	});

	it('should have default desired retention of 0.9', () => {
		expect(DEFAULT_DESIRED_RETENTION).toBe(0.9);
		expect(DEFAULT_DESIRED_RETENTION).toBe(RETENTION_PROFILES.balanced);
	});

	it('should have maximum interval of 36500 days (100 years)', () => {
		expect(DEFAULT_MAXIMUM_INTERVAL).toBe(36500);
	});

	it('should have decay parameter of -0.5', async () => {
		const { DECAY_PARAMETER } = await import('./config');
		expect(DECAY_PARAMETER).toBe(-0.5);
	});
});

describe('Retention Profiles', () => {
	it('should have relaxed profile at 80%', () => {
		expect(RETENTION_PROFILES.relaxed).toBe(0.8);
	});

	it('should have balanced profile at 90%', () => {
		expect(RETENTION_PROFILES.balanced).toBe(0.9);
	});

	it('should have high profile at 95%', () => {
		expect(RETENTION_PROFILES.high).toBe(0.95);
	});

	it('should have expert profile at 97%', () => {
		expect(RETENTION_PROFILES.expert).toBe(0.97);
	});

	it('should have profiles in ascending order', () => {
		const { relaxed, balanced, high, expert } = RETENTION_PROFILES;
		expect(relaxed).toBeLessThan(balanced);
		expect(balanced).toBeLessThan(high);
		expect(high).toBeLessThan(expert);
	});
});

describe('Validation Functions', () => {
	describe('isValidRetention', () => {
		it('should accept retention at lower boundary (0.7)', () => {
			expect(isValidRetention(0.7)).toBe(true);
		});

		it('should accept retention at upper boundary (0.97)', () => {
			expect(isValidRetention(0.97)).toBe(true);
		});

		it('should accept retention in valid range', () => {
			expect(isValidRetention(0.8)).toBe(true);
			expect(isValidRetention(0.9)).toBe(true);
			expect(isValidRetention(0.95)).toBe(true);
		});

		it('should reject retention below 0.7', () => {
			expect(isValidRetention(0.69)).toBe(false);
			expect(isValidRetention(0.5)).toBe(false);
			expect(isValidRetention(0)).toBe(false);
		});

		it('should reject retention above 0.97', () => {
			expect(isValidRetention(0.98)).toBe(false);
			expect(isValidRetention(0.99)).toBe(false);
			expect(isValidRetention(1.0)).toBe(false);
		});

		it('should reject negative retention', () => {
			expect(isValidRetention(-0.5)).toBe(false);
		});
	});

	describe('isValidParameters', () => {
		it('should accept valid 21-parameter array', () => {
			expect(isValidParameters(DEFAULT_FSRS_PARAMS)).toBe(true);
		});

		it('should accept any 21-element number array', () => {
			const customParams = new Array(21).fill(1.0);
			expect(isValidParameters(customParams)).toBe(true);
		});

		it('should reject array with fewer than 21 parameters', () => {
			const tooFew = new Array(20).fill(1.0);
			expect(isValidParameters(tooFew)).toBe(false);
		});

		it('should reject array with more than 21 parameters', () => {
			const tooMany = new Array(22).fill(1.0);
			expect(isValidParameters(tooMany)).toBe(false);
		});

		it('should reject empty array', () => {
			expect(isValidParameters([])).toBe(false);
		});

		it('should reject non-array values', () => {
			expect(isValidParameters(null as unknown as number[])).toBe(false);
			expect(isValidParameters(undefined as unknown as number[])).toBe(false);
			expect(isValidParameters('not an array' as unknown as number[])).toBe(false);
			expect(isValidParameters(42 as unknown as number[])).toBe(false);
		});
	});

	describe('getRetentionProfileName', () => {
		it('should return "Décontracté (80%)" for relaxed retention', () => {
			expect(getRetentionProfileName(0.7)).toBe('Décontracté (80%)');
			expect(getRetentionProfileName(0.75)).toBe('Décontracté (80%)');
			expect(getRetentionProfileName(0.8)).toBe('Décontracté (80%)');
		});

		it('should return "Équilibré (90%)" for balanced retention', () => {
			expect(getRetentionProfileName(0.85)).toBe('Équilibré (90%)');
			expect(getRetentionProfileName(0.9)).toBe('Équilibré (90%)');
		});

		it('should return "Performance (95%)" for high retention', () => {
			expect(getRetentionProfileName(0.92)).toBe('Performance (95%)');
			expect(getRetentionProfileName(0.95)).toBe('Performance (95%)');
		});

		it('should return "Expert (97%)" for expert retention', () => {
			expect(getRetentionProfileName(0.96)).toBe('Expert (97%)');
			expect(getRetentionProfileName(0.97)).toBe('Expert (97%)');
		});

		it('should handle edge cases', () => {
			expect(getRetentionProfileName(0.6)).toBe('Décontracté (80%)'); // Below valid range
			expect(getRetentionProfileName(0.99)).toBe('Expert (97%)'); // Above valid range
		});
	});
});

describe('Grade Labels', () => {
	it('should have labels for all 4 grades', () => {
		expect(GRADE_LABELS[1]).toBeDefined(); // AGAIN
		expect(GRADE_LABELS[2]).toBeDefined(); // HARD
		expect(GRADE_LABELS[3]).toBeDefined(); // GOOD
		expect(GRADE_LABELS[4]).toBeDefined(); // EASY
	});

	it('should have French labels', () => {
		expect(GRADE_LABELS[1].label).toBe('Échec');
		expect(GRADE_LABELS[2].label).toBe('Difficile');
		expect(GRADE_LABELS[3].label).toBe('Bien');
		expect(GRADE_LABELS[4].label).toBe('Facile');
	});

	it('should have descriptions for each grade', () => {
		expect(GRADE_LABELS[1].description).toBe('Oublié complètement');
		expect(GRADE_LABELS[2].description).toBe('Réussi avec beaucoup de difficulté');
		expect(GRADE_LABELS[3].description).toBe('Réussi après réflexion');
		expect(GRADE_LABELS[4].description).toBe('Souvenu immédiatement');
	});

	it('should have emojis for each grade', () => {
		expect(GRADE_LABELS[1].emoji).toBe('❌');
		expect(GRADE_LABELS[2].emoji).toBe('😓');
		expect(GRADE_LABELS[3].emoji).toBe('👍');
		expect(GRADE_LABELS[4].emoji).toBe('✨');
	});

	it('should have colors for each grade', () => {
		expect(GRADE_LABELS[1].color).toBe('red');
		expect(GRADE_LABELS[2].color).toBe('orange');
		expect(GRADE_LABELS[3].color).toBe('green');
		expect(GRADE_LABELS[4].color).toBe('blue');
	});
});

describe('State Labels', () => {
	it('should have labels for all 4 states', () => {
		expect(STATE_LABELS.new).toBeDefined();
		expect(STATE_LABELS.learning).toBeDefined();
		expect(STATE_LABELS.review).toBeDefined();
		expect(STATE_LABELS.relearning).toBeDefined();
	});

	it('should have French labels', () => {
		expect(STATE_LABELS.new).toBe('Nouveau');
		expect(STATE_LABELS.learning).toBe('Apprentissage');
		expect(STATE_LABELS.review).toBe('Révision');
		expect(STATE_LABELS.relearning).toBe('Ré-apprentissage');
	});
});

describe('Learning and Relearning Steps', () => {
	it('should have default learning steps', async () => {
		const { DEFAULT_LEARNING_STEPS } = await import('./config');
		expect(DEFAULT_LEARNING_STEPS).toBeDefined();
		expect(Array.isArray(DEFAULT_LEARNING_STEPS)).toBe(true);
	});

	it('should have learning steps in milliseconds', async () => {
		const { DEFAULT_LEARNING_STEPS } = await import('./config');
		// Default: [10 minutes]
		expect(DEFAULT_LEARNING_STEPS[0]).toBe(10 * 60 * 1000);
	});

	it('should have default relearning steps', async () => {
		const { DEFAULT_RELEARNING_STEPS } = await import('./config');
		expect(DEFAULT_RELEARNING_STEPS).toBeDefined();
		expect(Array.isArray(DEFAULT_RELEARNING_STEPS)).toBe(true);
	});

	it('should have relearning steps in milliseconds', async () => {
		const { DEFAULT_RELEARNING_STEPS } = await import('./config');
		// Default: [10 minutes]
		expect(DEFAULT_RELEARNING_STEPS[0]).toBe(10 * 60 * 1000);
	});
});

describe('Educational Configuration', () => {
	it('should export complete educational config', async () => {
		const { EDUCATIONAL_CONFIG } = await import('./config');

		expect(EDUCATIONAL_CONFIG.parameters).toEqual(DEFAULT_FSRS_PARAMS);
		expect(EDUCATIONAL_CONFIG.desiredRetention).toBe(DEFAULT_DESIRED_RETENTION);
		expect(EDUCATIONAL_CONFIG.maximumInterval).toBe(DEFAULT_MAXIMUM_INTERVAL);
		expect(EDUCATIONAL_CONFIG.decay).toBe(-0.5);
		expect(EDUCATIONAL_CONFIG.learningSteps).toBeDefined();
		expect(EDUCATIONAL_CONFIG.relearningSteps).toBeDefined();
	});
});
