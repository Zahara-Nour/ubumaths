import { describe, it, expect } from 'vitest';
import {
	calculate2048TheoreticalReward,
	REWARD_2048_MIN_SCORE,
	REWARD_2048_MAX
} from '../reward-2048';

describe('calculate2048TheoreticalReward', () => {
	it('returns 0 for scores below minimum', () => {
		expect(calculate2048TheoreticalReward(0)).toBe(0);
		expect(calculate2048TheoreticalReward(500)).toBe(0);
		expect(calculate2048TheoreticalReward(999)).toBe(0);
	});

	it('returns correct values at breakpoints', () => {
		expect(calculate2048TheoreticalReward(1000)).toBe(0.5);
		expect(calculate2048TheoreticalReward(5000)).toBe(1.5);
		expect(calculate2048TheoreticalReward(10000)).toBe(3.0);
		expect(calculate2048TheoreticalReward(20000)).toBe(5.0);
		expect(calculate2048TheoreticalReward(50000)).toBe(8.0);
	});

	it('interpolates linearly between breakpoints', () => {
		// Midpoint of 1000-5000: score 3000 → 0.5 + (2000/4000) * 1.0 = 1.0
		expect(calculate2048TheoreticalReward(3000)).toBe(1.0);

		// Midpoint of 5000-10000: score 7500 → 1.5 + (2500/5000) * 1.5 = 2.25
		expect(calculate2048TheoreticalReward(7500)).toBe(2.25);

		// Midpoint of 10000-20000: score 15000 → 3.0 + (5000/10000) * 2.0 = 4.0
		expect(calculate2048TheoreticalReward(15000)).toBe(4.0);

		// Midpoint of 20000-50000: score 35000 → 5.0 + (15000/30000) * 3.0 = 6.5
		expect(calculate2048TheoreticalReward(35000)).toBe(6.5);
	});

	it('caps at maximum reward for high scores', () => {
		expect(calculate2048TheoreticalReward(50000)).toBe(REWARD_2048_MAX);
		expect(calculate2048TheoreticalReward(100000)).toBe(REWARD_2048_MAX);
		expect(calculate2048TheoreticalReward(1000000)).toBe(REWARD_2048_MAX);
	});

	it('rounds to 2 decimal places', () => {
		// score 2000: 0.5 + (1000/4000) * 1.0 = 0.75
		expect(calculate2048TheoreticalReward(2000)).toBe(0.75);
		// score 1500: 0.5 + (500/4000) * 1.0 = 0.625 → 0.63
		expect(calculate2048TheoreticalReward(1500)).toBe(0.63);
	});

	it('exports correct constants', () => {
		expect(REWARD_2048_MIN_SCORE).toBe(1000);
		expect(REWARD_2048_MAX).toBe(8.0);
	});
});
