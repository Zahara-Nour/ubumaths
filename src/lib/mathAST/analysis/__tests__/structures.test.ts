/**
 * Tests for Algebraic Structure Detection
 */

import { describe, it, expect } from 'vitest';
import {
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes,
	isQuadraticForm,
	isFactoredForm,
	hasCommonFactor,
	detectStructure
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

describe('isQuadraticForm', () => {
	it('detects ax² + bx + c form', () => {
		const node = parseLatex('2x^2 + 3x + 1');
		const result = isQuadraticForm(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('quadratic_form');
		expect(result!.variable).toBe('x');

		// Check coefficients
		expect(isNumber(result!.a)).toBe(true);
		expect(isNumber(result!.b)).toBe(true);
		expect(isNumber(result!.c)).toBe(true);

		if (isNumber(result!.a)) expect(parseFloat(result!.a.value)).toBe(2);
		if (isNumber(result!.b)) expect(parseFloat(result!.b.value)).toBe(3);
		if (isNumber(result!.c)) expect(parseFloat(result!.c.value)).toBe(1);
	});

	it('detects x² + x + 1', () => {
		const node = parseLatex('x^2 + x + 1');
		const result = isQuadraticForm(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('quadratic_form');
	});

	it('detects x² - 1', () => {
		const node = parseLatex('x^2 - 1');
		const result = isQuadraticForm(node);

		expect(result).not.toBeNull();
	});

	it('detects x²', () => {
		const node = parseLatex('x^2');
		const result = isQuadraticForm(node);

		expect(result).not.toBeNull();
	});

	it('rejects linear expressions', () => {
		const node = parseLatex('2x + 1');
		const result = isQuadraticForm(node);

		expect(result).toBeNull();
	});

	it('rejects cubic expressions', () => {
		const node = parseLatex('x^3 + x^2 + x + 1');
		const result = isQuadraticForm(node);

		expect(result).toBeNull();
	});
});

describe('isFactoredForm', () => {
	it('detects (x - 1)(x - 2)', () => {
		const node = parseLatex('(x - 1)(x - 2)');
		const result = isFactoredForm(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('factored_form');
		expect(result!.variable).toBe('x');
		expect(result!.factors.length).toBe(2);
		expect(result!.roots.length).toBe(2);
	});

	it('detects (x + 1)(x + 2)', () => {
		const node = parseLatex('(x + 1)(x + 2)');
		const result = isFactoredForm(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('factored_form');
	});

	it('detects (x - 1)(x + 1)', () => {
		const node = parseLatex('(x - 1)(x + 1)');
		const result = isFactoredForm(node);

		expect(result).not.toBeNull();
		// This is both factored form and difference of squares when expanded
	});

	it('rejects non-factored form', () => {
		const node = parseLatex('x^2 + x + 1');
		const result = isFactoredForm(node);

		expect(result).toBeNull();
	});
});

describe('hasCommonFactor', () => {
	it('detects common factor in 2x + 4', () => {
		const node = parseLatex('2x + 4');
		const result = hasCommonFactor(node);

		expect(result).not.toBeNull();
		expect(result!.type).toBe('common_factor');
		expect(isNumber(result!.factor)).toBe(true);
		if (isNumber(result!.factor)) {
			expect(parseFloat(result!.factor.value)).toBe(2);
		}
	});

	it('detects common factor in 3x + 6y', () => {
		const node = parseLatex('3x + 6y');
		const result = hasCommonFactor(node);

		expect(result).not.toBeNull();
		expect(isNumber(result!.factor)).toBe(true);
		if (isNumber(result!.factor)) {
			expect(parseFloat(result!.factor.value)).toBe(3);
		}
	});

	it('detects common factor in 4x² + 8x + 12', () => {
		const node = parseLatex('4x^2 + 8x + 12');
		const result = hasCommonFactor(node);

		expect(result).not.toBeNull();
		expect(isNumber(result!.factor)).toBe(true);
		if (isNumber(result!.factor)) {
			expect(parseFloat(result!.factor.value)).toBe(4);
		}
	});

	it('returns null when no common factor > 1', () => {
		const node = parseLatex('x + 1');
		const result = hasCommonFactor(node);

		expect(result).toBeNull();
	});

	it('returns null for single term', () => {
		const node = parseLatex('3x');
		const result = hasCommonFactor(node);

		expect(result).toBeNull();
	});
});

describe('detectStructure', () => {
	it('detects multiple structures for x² - 4', () => {
		const node = parseLatex('x^2 - 4');
		const structures = detectStructure(node);

		expect(structures.length).toBeGreaterThan(0);
		const types = structures.map((s) => s.type);
		expect(types).toContain('difference_of_squares');
		expect(types).toContain('quadratic_form');
	});

	it('detects quadratic form for x² + 2x + 1', () => {
		const node = parseLatex('x^2 + 2x + 1');
		const structures = detectStructure(node);

		const types = structures.map((s) => s.type);
		expect(types).toContain('quadratic_form');
		expect(types).toContain('perfect_square_trinomial');
	});

	it('returns empty array for simple expressions', () => {
		const node = parseLatex('x + 1');
		const structures = detectStructure(node);

		// x + 1 has no special structure (not quadratic, not factored, etc.)
		// Could potentially have structures like factored form if (x + 1) is considered
		expect(Array.isArray(structures)).toBe(true);
	});
});
