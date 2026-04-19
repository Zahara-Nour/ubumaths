import { describe, it, expect } from 'vitest';
import {
	calculateMathemoTheoreticalReward,
	REWARD_MATHEMO_MAX,
	REWARD_MATHEMO_MIN
} from './reward-mathemo';

describe('calculateMathemoTheoreticalReward', () => {
	it('exports correct constants', () => {
		expect(REWARD_MATHEMO_MAX).toBe(8.0);
		expect(REWARD_MATHEMO_MIN).toBe(0.3);
	});

	// ===== Length reward tiers =====

	it('returns correct base rewards for word lengths', () => {
		// All at max efficiency (1 attempt out of 6) → efficiency = 1.5
		// 2-4 letters: 0.5 * 1.5 = 0.75
		expect(calculateMathemoTheoreticalReward(2, 1, 6)).toBe(0.75);
		expect(calculateMathemoTheoreticalReward(4, 1, 6)).toBe(0.75);

		// 5-6 letters: 1.0 * 1.5 = 1.5
		expect(calculateMathemoTheoreticalReward(5, 1, 6)).toBe(1.5);
		expect(calculateMathemoTheoreticalReward(6, 1, 6)).toBe(1.5);

		// 7-8 letters: 1.5 * 1.5 = 2.25
		expect(calculateMathemoTheoreticalReward(7, 1, 6)).toBe(2.25);
		expect(calculateMathemoTheoreticalReward(8, 1, 6)).toBe(2.25);

		// 9-10 letters: 2.5 * 1.5 = 3.75
		expect(calculateMathemoTheoreticalReward(9, 1, 6)).toBe(3.75);
		expect(calculateMathemoTheoreticalReward(10, 1, 6)).toBe(3.75);

		// 11-12 letters: 4.0 * 1.5 = 6.0
		expect(calculateMathemoTheoreticalReward(11, 1, 6)).toBe(6.0);
		expect(calculateMathemoTheoreticalReward(12, 1, 6)).toBe(6.0);

		// 13+ letters: 6.0 * 1.5 = 9.0 → capped at 8.0
		expect(calculateMathemoTheoreticalReward(13, 1, 6)).toBe(REWARD_MATHEMO_MAX);
		expect(calculateMathemoTheoreticalReward(16, 1, 6)).toBe(REWARD_MATHEMO_MAX);
	});

	// ===== Efficiency multiplier =====

	it('gives highest reward for first attempt', () => {
		// 6 letters, 1st attempt out of 6: 1.0 * 1.5 = 1.5
		expect(calculateMathemoTheoreticalReward(6, 1, 6)).toBe(1.5);
	});

	it('gives lowest reward for last attempt', () => {
		// 6 letters, 6th attempt out of 6: 1.0 * 0.8 = 0.8
		expect(calculateMathemoTheoreticalReward(6, 6, 6)).toBe(0.8);
	});

	it('interpolates efficiency between first and last attempt', () => {
		// 6 letters, 3rd attempt out of 6:
		// efficiency = 1.5 - 0.7 * (2/5) = 1.5 - 0.28 = 1.22
		// reward = 1.0 * 1.22 = 1.22
		expect(calculateMathemoTheoreticalReward(6, 3, 6)).toBe(1.22);

		// 6 letters, 4th attempt out of 6:
		// efficiency = 1.5 - 0.7 * (3/5) = 1.5 - 0.42 = 1.08
		// reward = 1.0 * 1.08 = 1.08
		expect(calculateMathemoTheoreticalReward(6, 4, 6)).toBe(1.08);
	});

	// ===== Edge cases =====

	it('handles max_attempts = 1 (always max efficiency)', () => {
		// 6 letters, 1 attempt out of 1: efficiency = 1.5
		expect(calculateMathemoTheoreticalReward(6, 1, 1)).toBe(1.5);
	});

	it('clamps to minimum reward', () => {
		// 2 letters (0.5), last attempt of 10:
		// efficiency = 1.5 - 0.7 * (9/9) = 0.8
		// reward = 0.5 * 0.8 = 0.4 (above min 0.3)
		expect(calculateMathemoTheoreticalReward(2, 10, 10)).toBe(0.4);

		// 2 letters (0.5), max_attempts=1 → 0.5 * 1.5 = 0.75
		expect(calculateMathemoTheoreticalReward(2, 1, 1)).toBe(0.75);
	});

	it('clamps to maximum reward', () => {
		// 16 letters (6.0), 1st attempt: 6.0 * 1.5 = 9.0 → capped at 8.0
		expect(calculateMathemoTheoreticalReward(16, 1, 6)).toBe(8.0);
	});

	it('rounds to 2 decimal places', () => {
		// 5 letters, 2nd attempt of 6:
		// efficiency = 1.5 - 0.7 * (1/5) = 1.5 - 0.14 = 1.36
		// reward = 1.0 * 1.36 = 1.36
		expect(calculateMathemoTheoreticalReward(5, 2, 6)).toBe(1.36);
	});

	// ===== Realistic game scenarios =====

	it('rewards typical winning scenarios correctly', () => {
		// "cercle" (6 letters), found in 3 attempts out of 6
		const cercle = calculateMathemoTheoreticalReward(6, 3, 6);
		expect(cercle).toBe(1.22);

		// "mathematiques" (14 letters), found in 5 attempts out of 6
		// efficiency = 1.5 - 0.7 * (4/5) = 1.5 - 0.56 = 0.94
		// reward = 6.0 * 0.94 = 5.64
		const maths = calculateMathemoTheoreticalReward(14, 5, 6);
		expect(maths).toBe(5.64);

		// "pi" (2 letters), found in 1 attempt out of 6
		const pi = calculateMathemoTheoreticalReward(2, 1, 6);
		expect(pi).toBe(0.75);
	});
});
