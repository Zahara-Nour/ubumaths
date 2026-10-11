/**
 * Tests for Algebraic Structure Detection
 */

import { describe, it, expect } from 'vitest';
import {
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes
} from '../structures';
import { parseLatex } from '../../parser';
import { isNumber } from '../../guards';

describe('isDifferenceOfSquares', () => {
	it('detects x² - y²', () => {
		const node = parseLatex('x^2 - y^2');
		const result = isDifferenceOfSquares(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('difference_of_squares');
		expect(result!.confidence).toBe('certain');
	});

	it('detects x² - 9', () => {
		const node = parseLatex('x^2 - 9');
		const result = isDifferenceOfSquares(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('difference_of_squares');
		// b should be 3 (since 9 = 3²)
		expect(isNumber(result!.b)).toBe(true);
		if (isNumber(result!.b)) {
			expect(result!.b.value).toBe('3');
		}
	});

	it('detects x² - 4', () => {
		const node = parseLatex('x^2 - 4');
		const result = isDifferenceOfSquares(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('difference_of_squares');
	});

	it('rejects x² + y² (sum, not difference)', () => {
		const node = parseLatex('x^2 + y^2');
		const result = isDifferenceOfSquares(node);

		expect(result).toBeNull();
	});

	it('rejects x² - 5 (5 is not a perfect square)', () => {
		const node = parseLatex('x^2 - 5');
		const result = isDifferenceOfSquares(node);

		// 5 is not a perfect square, so right side doesn't match
		expect(result).toBeNull();
	});

	it('rejects x³ - y³', () => {
		const node = parseLatex('x^3 - y^3');
		const result = isDifferenceOfSquares(node);

		expect(result).toBeNull();
	});
});

describe('isPerfectSquareTrinomial', () => {
	it('detects x² + 2x + 1 = (x + 1)²', () => {
		const node = parseLatex('x^2 + 2x + 1');
		const result = isPerfectSquareTrinomial(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('perfect_square_trinomial');
		expect(result!.sign).toBe('+');
	});

	it('detects x² - 2x + 1 = (x - 1)²', () => {
		const node = parseLatex('x^2 - 2x + 1');
		const result = isPerfectSquareTrinomial(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('perfect_square_trinomial');
		expect(result!.sign).toBe('-');
	});

	it('detects x² + 4x + 4 = (x + 2)²', () => {
		const node = parseLatex('x^2 + 4x + 4');
		const result = isPerfectSquareTrinomial(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('perfect_square_trinomial');
	});

	it('rejects x² + 3x + 1 (not perfect square)', () => {
		const node = parseLatex('x^2 + 3x + 1');
		const result = isPerfectSquareTrinomial(node);

		expect(result).toBeNull();
	});

	it('rejects x² + 2x + 2 (not perfect square)', () => {
		const node = parseLatex('x^2 + 2x + 2');
		const result = isPerfectSquareTrinomial(node);

		expect(result).toBeNull();
	});
});

describe('isSumOfCubes', () => {
	it('detects x³ + y³', () => {
		const node = parseLatex('x^3 + y^3');
		const result = isSumOfCubes(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('sum_of_cubes');
	});

	it('detects x³ + 8', () => {
		const node = parseLatex('x^3 + 8');
		const result = isSumOfCubes(node);

		expect(result).not.toBeNull();
		// 8 = 2³
		expect(isNumber(result!.b)).toBe(true);
		if (isNumber(result!.b)) {
			expect(result!.b.value).toBe('2');
		}
	});

	it('detects x³ + 27', () => {
		const node = parseLatex('x^3 + 27');
		const result = isSumOfCubes(node);

		expect(result).not.toBeNull();
		// 27 = 3³
	});

	it('rejects x³ - y³ (difference, not sum)', () => {
		const node = parseLatex('x^3 - y^3');
		const result = isSumOfCubes(node);

		expect(result).toBeNull();
	});

	it('rejects x² + y²', () => {
		const node = parseLatex('x^2 + y^2');
		const result = isSumOfCubes(node);

		expect(result).toBeNull();
	});
});

describe('isDifferenceOfCubes', () => {
	it('detects x³ - y³', () => {
		const node = parseLatex('x^3 - y^3');
		const result = isDifferenceOfCubes(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('difference_of_cubes');
	});

	it('detects x³ - 8', () => {
		const node = parseLatex('x^3 - 8');
		const result = isDifferenceOfCubes(node);

		expect(result).not.toBeNull();
	});

	it('detects x³ - 27', () => {
		const node = parseLatex('x^3 - 27');
		const result = isDifferenceOfCubes(node);

		expect(result).not.toBeNull();
	});

	it('rejects x³ + y³ (sum, not difference)', () => {
		const node = parseLatex('x^3 + y^3');
		const result = isDifferenceOfCubes(node);

		expect(result).toBeNull();
	});
});
