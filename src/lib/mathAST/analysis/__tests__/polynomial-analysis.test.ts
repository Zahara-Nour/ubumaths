/**
 * Tests for Polynomial Analysis
 */

import { describe, it, expect } from 'vitest';
import {
	analyzePolynomial,
	getPolynomialCoefficients,
	isMonomial,
	isBinomial,
	isTrinomial,
	getTermCount
} from '../polynomial-analysis';
import { parseLatex } from '../../parser';
import { isNumber } from '../../guards';

// Helper to parse and analyze
function analyze(latex: string, variable: string = 'x') {
	const node = parseLatex(latex);
	return analyzePolynomial(node, variable);
}

// Helper to get numeric coefficient value
function getNumericCoeff(analysis: ReturnType<typeof analyze>, degree: number): number | null {
	if (!analysis.isPolynomial) return null;
	const coeff = analysis.coefficients.get(degree);
	if (!coeff || !isNumber(coeff)) return null;
	return parseFloat(coeff.value);
}

describe('analyzePolynomial', () => {
	describe('basic polynomials', () => {
		it('analyzes constant polynomial', () => {
			const result = analyze('5', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.degree).toBe(0);
			expect(result.termCount).toBe(1);
			expect(getNumericCoeff(result, 0)).toBe(5);
		});

		it('analyzes linear polynomial', () => {
			const result = analyze('2x + 3', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.degree).toBe(1);
			expect(result.termCount).toBe(2);
			expect(getNumericCoeff(result, 1)).toBe(2);
			expect(getNumericCoeff(result, 0)).toBe(3);
		});

		it('analyzes quadratic polynomial', () => {
			const result = analyze('x^2 + 2x + 1', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.degree).toBe(2);
			expect(result.termCount).toBe(3);
			expect(getNumericCoeff(result, 2)).toBe(1);
			expect(getNumericCoeff(result, 1)).toBe(2);
			expect(getNumericCoeff(result, 0)).toBe(1);
		});

		it('analyzes cubic polynomial', () => {
			const result = analyze('x^3 - 2x^2 + x - 5', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.degree).toBe(3);
			expect(result.termCount).toBe(4);
			expect(getNumericCoeff(result, 3)).toBe(1);
			expect(getNumericCoeff(result, 2)).toBe(-2);
			expect(getNumericCoeff(result, 1)).toBe(1);
			expect(getNumericCoeff(result, 0)).toBe(-5);
		});
	});

	describe('leading coefficient', () => {
		it('extracts leading coefficient 1', () => {
			const result = analyze('x^2 + x + 1', 'x');
			expect(result.isPolynomial).toBe(true);
			expect(isNumber(result.leadingCoefficient)).toBe(true);
			if (isNumber(result.leadingCoefficient)) {
				expect(parseFloat(result.leadingCoefficient.value)).toBe(1);
			}
		});

		it('extracts leading coefficient > 1', () => {
			const result = analyze('3x^2 + x + 1', 'x');
			expect(result.isPolynomial).toBe(true);
			expect(isNumber(result.leadingCoefficient)).toBe(true);
			if (isNumber(result.leadingCoefficient)) {
				expect(parseFloat(result.leadingCoefficient.value)).toBe(3);
			}
		});

		it('extracts negative leading coefficient', () => {
			const result = analyze('-2x^2 + x + 1', 'x');
			expect(result.isPolynomial).toBe(true);
			// Negative coefficient may be a number with negative value or an opposite node
			const coeff = result.leadingCoefficient;
			if (isNumber(coeff)) {
				expect(parseFloat(coeff.value)).toBe(-2);
			} else if (coeff.type === 'opposite') {
				// It's -2 represented as opposite(2)
				expect(isNumber(coeff.operand)).toBe(true);
				if (isNumber(coeff.operand)) {
					expect(parseFloat(coeff.operand.value)).toBe(2);
				}
			} else {
				// Should be one of the above
				expect.fail('Leading coefficient should be a number or opposite');
			}
		});
	});

	describe('constant term', () => {
		it('extracts constant term', () => {
			const result = analyze('x^2 + x + 7', 'x');
			expect(result.isPolynomial).toBe(true);
			expect(isNumber(result.constantTerm)).toBe(true);
			if (isNumber(result.constantTerm)) {
				expect(parseFloat(result.constantTerm.value)).toBe(7);
			}
		});

		it('returns 0 for missing constant term', () => {
			const result = analyze('x^2 + x', 'x');
			expect(result.isPolynomial).toBe(true);
			expect(isNumber(result.constantTerm)).toBe(true);
			if (isNumber(result.constantTerm)) {
				expect(parseFloat(result.constantTerm.value)).toBe(0);
			}
		});
	});

	describe('non-polynomials', () => {
		it('rejects expressions with variable in denominator', () => {
			const result = analyze('\\frac{1}{x}', 'x');
			expect(result.isPolynomial).toBe(false);
		});

		it('rejects transcendental expressions', () => {
			const result = analyze('\\sin(x)', 'x');
			expect(result.isPolynomial).toBe(false);
		});
	});

	describe('monomials list', () => {
		it('returns monomials sorted by decreasing degree', () => {
			const result = analyze('1 + x + x^2', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.monomials.length).toBe(3);
			expect(result.monomials[0].degree).toBe(2);
			expect(result.monomials[1].degree).toBe(1);
			expect(result.monomials[2].degree).toBe(0);
		});
	});

	describe('combining like terms', () => {
		it('combines coefficients of same degree', () => {
			const result = analyze('x + 2x', 'x');

			expect(result.isPolynomial).toBe(true);
			expect(result.termCount).toBe(1);
			expect(getNumericCoeff(result, 1)).toBe(3);
		});

		it('combines multiple terms correctly', () => {
			const result = analyze('x^2 + 3x + 2x^2 + x', 'x');

			expect(result.isPolynomial).toBe(true);
			// 3x^2 + 4x
			expect(getNumericCoeff(result, 2)).toBe(3);
			expect(getNumericCoeff(result, 1)).toBe(4);
		});
	});
});

describe('getPolynomialCoefficients', () => {
	it('returns coefficient map for valid polynomial', () => {
		const node = parseLatex('x^2 + 2x + 1');
		const coeffs = getPolynomialCoefficients(node, 'x');

		expect(coeffs).not.toBeNull();
		expect(coeffs!.size).toBe(3);
		expect(coeffs!.has(2)).toBe(true);
		expect(coeffs!.has(1)).toBe(true);
		expect(coeffs!.has(0)).toBe(true);
	});

	it('returns null for non-polynomial', () => {
		const node = parseLatex('\\sin(x)');
		const coeffs = getPolynomialCoefficients(node, 'x');

		expect(coeffs).toBeNull();
	});
});

describe('isMonomial', () => {
	it('returns true for single term', () => {
		expect(isMonomial(parseLatex('5'))).toBe(true);
		expect(isMonomial(parseLatex('x'))).toBe(true);
		expect(isMonomial(parseLatex('3x'))).toBe(true);
		expect(isMonomial(parseLatex('3x^2'))).toBe(true);
		expect(isMonomial(parseLatex('2xy'))).toBe(true);
	});

	it('returns false for multiple terms', () => {
		expect(isMonomial(parseLatex('x + 1'))).toBe(false);
		expect(isMonomial(parseLatex('x^2 + x'))).toBe(false);
	});
});

describe('isBinomial', () => {
	it('returns true for two terms', () => {
		expect(isBinomial(parseLatex('x + 1'))).toBe(true);
		expect(isBinomial(parseLatex('x - 1'))).toBe(true);
		expect(isBinomial(parseLatex('x^2 - 1'))).toBe(true);
		expect(isBinomial(parseLatex('2x + 3'))).toBe(true);
	});

	it('returns false for non-binomials', () => {
		expect(isBinomial(parseLatex('x'))).toBe(false);
		expect(isBinomial(parseLatex('x + y + z'))).toBe(false);
	});
});

describe('isTrinomial', () => {
	it('returns true for three terms', () => {
		expect(isTrinomial(parseLatex('x^2 + 2x + 1'))).toBe(true);
		expect(isTrinomial(parseLatex('x + y + z'))).toBe(true);
		expect(isTrinomial(parseLatex('a^2 - 2ab + b^2'))).toBe(true);
	});

	it('returns false for non-trinomials', () => {
		expect(isTrinomial(parseLatex('x'))).toBe(false);
		expect(isTrinomial(parseLatex('x + 1'))).toBe(false);
		expect(isTrinomial(parseLatex('w + x + y + z'))).toBe(false);
	});
});

describe('getTermCount', () => {
	it('counts terms correctly', () => {
		expect(getTermCount(parseLatex('x'))).toBe(1);
		expect(getTermCount(parseLatex('x + 1'))).toBe(2);
		expect(getTermCount(parseLatex('x^2 + 2x + 1'))).toBe(3);
		expect(getTermCount(parseLatex('a + b + c + d'))).toBe(4);
	});
});
