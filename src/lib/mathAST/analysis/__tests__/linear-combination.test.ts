/**
 * Tests for Linear Combination Analysis
 */

import { describe, it, expect } from 'vitest';
import {
	extractLinearCombination,
	isLinearCombination,
	getCoefficient
} from '../linear-combination';
import { parseLatex } from '../../parser';
import { isNumber, isGreek, isFunction, isDivision } from '../../guards';

// Helper to parse and extract
function extract(latex: string, variables: string[]) {
	const node = parseLatex(latex);
	return extractLinearCombination(node, variables);
}

// Helper to get numeric coefficient value
function getNumericCoeff(latex: string, variable: string, allVars: string[]): number | null {
	const result = extract(latex, allVars);
	if (!result.isLinear) return null;
	const coeff = result.coefficients.get(variable);
	if (!coeff || !isNumber(coeff)) return null;
	return parseFloat(coeff.value);
}

describe('extractLinearCombination', () => {
	describe('numeric coefficients', () => {
		it('extracts explicit numeric coefficients', () => {
			const result = extract('2x + 3y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('2x + 3y', 'x', ['x', 'y'])).toBe(2);
			expect(getNumericCoeff('2x + 3y', 'y', ['x', 'y'])).toBe(3);
		});

		it('handles negative coefficients from subtraction', () => {
			const result = extract('2x - 3y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('2x - 3y', 'x', ['x', 'y'])).toBe(2);
			expect(getNumericCoeff('2x - 3y', 'y', ['x', 'y'])).toBe(-3);
		});

		it('handles implicit coefficient 1', () => {
			const result = extract('x + y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('x + y', 'x', ['x', 'y'])).toBe(1);
			expect(getNumericCoeff('x + y', 'y', ['x', 'y'])).toBe(1);
		});

		it('handles implicit coefficient -1', () => {
			const result = extract('-x + y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('-x + y', 'x', ['x', 'y'])).toBe(-1);
			expect(getNumericCoeff('-x + y', 'y', ['x', 'y'])).toBe(1);
		});

		it('handles coefficient 0 for missing variables', () => {
			const result = extract('3x', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('3x', 'x', ['x', 'y'])).toBe(3);
			expect(getNumericCoeff('3x', 'y', ['x', 'y'])).toBe(0);
		});

		it('combines like terms (x + x = 2x)', () => {
			const result = extract('x + x', ['x']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('x + x', 'x', ['x'])).toBe(2);
		});

		it('combines like terms with different coefficients', () => {
			const result = extract('2x + 3x', ['x']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('2x + 3x', 'x', ['x'])).toBe(5);
		});

		it('handles subtraction of like terms', () => {
			const result = extract('5x - 2x', ['x']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('5x - 2x', 'x', ['x'])).toBe(3);
		});

		it('handles three variables', () => {
			const result = extract('x + 2y - 3z', ['x', 'y', 'z']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('x + 2y - 3z', 'x', ['x', 'y', 'z'])).toBe(1);
			expect(getNumericCoeff('x + 2y - 3z', 'y', ['x', 'y', 'z'])).toBe(2);
			expect(getNumericCoeff('x + 2y - 3z', 'z', ['x', 'y', 'z'])).toBe(-3);
		});

		it('handles decimal coefficients', () => {
			const result = extract('1.5x + 2.5y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('1.5x + 2.5y', 'x', ['x', 'y'])).toBe(1.5);
			expect(getNumericCoeff('1.5x + 2.5y', 'y', ['x', 'y'])).toBe(2.5);
		});
	});

	describe('symbolic coefficients', () => {
		it('extracts π as coefficient (with explicit multiplication)', () => {
			// Note: \pi x without explicit multiplication is parsed as two separate terms
			// Use \pi \cdot x for explicit multiplication
			const result = extract('\\pi \\cdot x + y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			const coeffX = result.coefficients.get('x');
			expect(coeffX).toBeDefined();
			expect(isGreek(coeffX!)).toBe(true);
			if (isGreek(coeffX!)) {
				expect(coeffX.letter).toBe('pi');
			}
		});

		it('extracts √2 as coefficient', () => {
			const result = extract('\\sqrt{2}x + y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			const coeffX = result.coefficients.get('x');
			expect(coeffX).toBeDefined();
			expect(isFunction(coeffX!)).toBe(true);
			if (isFunction(coeffX!)) {
				expect(coeffX.name).toBe('sqrt');
			}
		});

		it('extracts fraction coefficient (x/2)', () => {
			const result = extract('\\frac{x}{2} + y', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			const coeffX = result.coefficients.get('x');
			expect(coeffX).toBeDefined();
			expect(isDivision(coeffX!)).toBe(true);
		});

		it('extracts fraction coefficient (2x/3)', () => {
			const result = extract('\\frac{2x}{3}', ['x']);

			expect(result.isLinear).toBe(true);
			const coeffX = result.coefficients.get('x');
			expect(coeffX).toBeDefined();
			expect(isDivision(coeffX!)).toBe(true);
		});
	});

	describe('non-linear expressions', () => {
		it('rejects x*y (product of variables)', () => {
			const result = extract('xy', ['x', 'y']);

			expect(result.isLinear).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('rejects x² (power of variable)', () => {
			const result = extract('x^2', ['x']);

			expect(result.isLinear).toBe(false);
		});

		it('rejects constant terms (no variable)', () => {
			const result = extract('2x + 3', ['x']);

			expect(result.isLinear).toBe(false);
			expect(result.error).toContain('constant');
		});

		it('rejects variable in denominator (1/x)', () => {
			const result = extract('\\frac{1}{x}', ['x']);

			expect(result.isLinear).toBe(false);
		});

		it('rejects sin(x) as term', () => {
			const result = extract('\\sin(x) + y', ['x', 'y']);

			expect(result.isLinear).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles single variable', () => {
			const result = extract('x', ['x']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('x', 'x', ['x'])).toBe(1);
		});

		it('handles negative single variable', () => {
			const result = extract('-x', ['x']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('-x', 'x', ['x'])).toBe(-1);
		});

		it('handles parenthesized terms', () => {
			const result = extract('(2x) + (3y)', ['x', 'y']);

			expect(result.isLinear).toBe(true);
			expect(getNumericCoeff('(2x) + (3y)', 'x', ['x', 'y'])).toBe(2);
			expect(getNumericCoeff('(2x) + (3y)', 'y', ['x', 'y'])).toBe(3);
		});

		it('returns 0 for all coefficients when expression is just the wrong variable', () => {
			const result = extract('z', ['x', 'y']);

			// z is not in our variable list, so this should fail
			// because z would be treated as part of a coefficient, but there's no target variable
			expect(result.isLinear).toBe(false);
		});
	});
});

describe('isLinearCombination', () => {
	it('returns true for valid linear combinations', () => {
		expect(isLinearCombination(parseLatex('2x + 3y'), ['x', 'y'])).toBe(true);
		expect(isLinearCombination(parseLatex('x - y'), ['x', 'y'])).toBe(true);
		expect(isLinearCombination(parseLatex('\\sqrt{2}x'), ['x'])).toBe(true);
	});

	it('returns false for non-linear expressions', () => {
		expect(isLinearCombination(parseLatex('xy'), ['x', 'y'])).toBe(false);
		expect(isLinearCombination(parseLatex('x^2'), ['x'])).toBe(false);
		expect(isLinearCombination(parseLatex('x + 1'), ['x'])).toBe(false);
	});
});

describe('getCoefficient', () => {
	it('gets coefficient for a single variable', () => {
		const node = parseLatex('2x + 3y');
		const coeffX = getCoefficient(node, 'x', ['y']);
		const coeffY = getCoefficient(node, 'y', ['x']);

		expect(coeffX).toBeDefined();
		expect(isNumber(coeffX!)).toBe(true);
		if (isNumber(coeffX!)) {
			expect(parseFloat(coeffX.value)).toBe(2);
		}

		expect(coeffY).toBeDefined();
		expect(isNumber(coeffY!)).toBe(true);
		if (isNumber(coeffY!)) {
			expect(parseFloat(coeffY.value)).toBe(3);
		}
	});

	it('returns null for non-linear expressions', () => {
		const node = parseLatex('x^2 + y');
		const coeff = getCoefficient(node, 'x', ['y']);

		expect(coeff).toBeNull();
	});
});
