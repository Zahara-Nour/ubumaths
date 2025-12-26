/**
 * Tests for Guess Who Math Game - Grid Generator
 *
 * @module utils/guess-who/grid-generator.test
 */

import { describe, it, expect } from 'vitest';
import { generateGrid, assignSecretNumbers } from './grid-generator';

describe('generateGrid', () => {
	it('generates an array of exactly 24 numbers', () => {
		const grid = generateGrid();
		expect(grid).toHaveLength(24);
	});

	it('generates unique numbers', () => {
		const grid = generateGrid();
		const uniqueNumbers = new Set(grid);
		expect(uniqueNumbers.size).toBe(24);
	});

	it('generates numbers between 2 and 99 inclusive', () => {
		const grid = generateGrid();
		for (const num of grid) {
			expect(num).toBeGreaterThanOrEqual(2);
			expect(num).toBeLessThanOrEqual(99);
		}
	});

	it('generates different grids on multiple calls', () => {
		const grid1 = generateGrid();
		const grid2 = generateGrid();
		// While theoretically possible to get the same grid, probability is negligible
		expect(grid1).not.toEqual(grid2);
	});
});

describe('assignSecretNumbers', () => {
	it('returns two numbers from the grid', () => {
		const grid = generateGrid();
		const [secret1, secret2] = assignSecretNumbers(grid);

		expect(grid).toContain(secret1);
		expect(grid).toContain(secret2);
	});

	it('returns two different numbers', () => {
		const grid = generateGrid();
		const [secret1, secret2] = assignSecretNumbers(grid);

		expect(secret1).not.toBe(secret2);
	});

	it('works with a small grid', () => {
		const smallGrid = [5, 10, 15];
		const [secret1, secret2] = assignSecretNumbers(smallGrid);

		expect(smallGrid).toContain(secret1);
		expect(smallGrid).toContain(secret2);
		expect(secret1).not.toBe(secret2);
	});
});
