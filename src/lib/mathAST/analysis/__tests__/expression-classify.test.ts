/**
 * Tests for Expression Classification
 */

import { describe, it, expect } from 'vitest';
import {
	classifyExpression,
	getPolynomialDegree,
	isPolynomialIn,
	containsTranscendental,
	getTranscendentalType,
	containsRadical,
	isRationalIn,
	calculateComplexity
} from '../expression-classify';
import { parseLatex } from '../../parser';

// Helper to parse and classify
function classify(latex: string, variable?: string) {
	const node = parseLatex(latex);
	return classifyExpression(node, variable);
}

describe('getPolynomialDegree', () => {
	it('returns degree 0 for constants', () => {
		expect(getPolynomialDegree(parseLatex('5'), 'x')).toBe(0);
		expect(getPolynomialDegree(parseLatex('\\pi'), 'x')).toBe(0);
	});

	it('returns degree 1 for linear terms', () => {
		expect(getPolynomialDegree(parseLatex('x'), 'x')).toBe(1);
		expect(getPolynomialDegree(parseLatex('2x'), 'x')).toBe(1);
		expect(getPolynomialDegree(parseLatex('3x + 1'), 'x')).toBe(1);
	});

	it('returns degree 2 for quadratic terms', () => {
		expect(getPolynomialDegree(parseLatex('x^2'), 'x')).toBe(2);
		expect(getPolynomialDegree(parseLatex('x^2 + x + 1'), 'x')).toBe(2);
		expect(getPolynomialDegree(parseLatex('2x^2 - 3x + 4'), 'x')).toBe(2);
	});

	it('returns degree for higher polynomials', () => {
		expect(getPolynomialDegree(parseLatex('x^3'), 'x')).toBe(3);
		expect(getPolynomialDegree(parseLatex('x^5 - x^3 + x'), 'x')).toBe(5);
	});

	it('handles products correctly', () => {
		expect(getPolynomialDegree(parseLatex('x \\cdot x'), 'x')).toBe(2);
		expect(getPolynomialDegree(parseLatex('2x \\cdot 3x'), 'x')).toBe(2);
	});

	it('returns null for transcendental expressions', () => {
		expect(getPolynomialDegree(parseLatex('\\sin(x)'), 'x')).toBeNull();
		expect(getPolynomialDegree(parseLatex('e^x'), 'x')).toBeNull();
		expect(getPolynomialDegree(parseLatex('\\ln(x)'), 'x')).toBeNull();
	});

	it('returns null when variable is in denominator', () => {
		expect(getPolynomialDegree(parseLatex('\\frac{1}{x}'), 'x')).toBeNull();
		expect(getPolynomialDegree(parseLatex('\\frac{x^2}{x + 1}'), 'x')).toBeNull();
	});

	it('returns null for fractional exponents', () => {
		expect(getPolynomialDegree(parseLatex('x^{0.5}'), 'x')).toBeNull();
	});

	it('returns 0 when variable is not in expression', () => {
		expect(getPolynomialDegree(parseLatex('y^2 + y'), 'x')).toBe(0);
	});
});

describe('isPolynomialIn', () => {
	it('returns true for polynomials', () => {
		expect(isPolynomialIn(parseLatex('x^2 + 2x + 1'), 'x')).toBe(true);
		expect(isPolynomialIn(parseLatex('x + y'), 'x')).toBe(true);
		expect(isPolynomialIn(parseLatex('5'), 'x')).toBe(true);
	});

	it('returns false for non-polynomials', () => {
		expect(isPolynomialIn(parseLatex('\\sin(x)'), 'x')).toBe(false);
		expect(isPolynomialIn(parseLatex('\\frac{1}{x}'), 'x')).toBe(false);
	});
});

describe('containsTranscendental', () => {
	it('detects trigonometric functions', () => {
		expect(containsTranscendental(parseLatex('\\sin(x)'))).toBe(true);
		expect(containsTranscendental(parseLatex('\\cos(x)'))).toBe(true);
		expect(containsTranscendental(parseLatex('\\tan(x)'))).toBe(true);
	});

	it('detects exponential and logarithmic functions', () => {
		expect(containsTranscendental(parseLatex('\\exp(x)'))).toBe(true);
		expect(containsTranscendental(parseLatex('\\ln(x)'))).toBe(true);
		expect(containsTranscendental(parseLatex('\\log(x)'))).toBe(true);
	});

	it('returns false for polynomials', () => {
		expect(containsTranscendental(parseLatex('x^2 + 2x + 1'))).toBe(false);
		expect(containsTranscendental(parseLatex('\\sqrt{x}'))).toBe(false);
	});
});

describe('getTranscendentalType', () => {
	it('identifies trigonometric type', () => {
		expect(getTranscendentalType(parseLatex('\\sin(x)'))).toBe('trigonometric');
		expect(getTranscendentalType(parseLatex('\\cos(x)'))).toBe('trigonometric');
	});

	it('identifies exponential type', () => {
		expect(getTranscendentalType(parseLatex('\\exp(x)'))).toBe('exponential');
	});

	it('identifies logarithmic type', () => {
		expect(getTranscendentalType(parseLatex('\\ln(x)'))).toBe('logarithmic');
		expect(getTranscendentalType(parseLatex('\\log(x)'))).toBe('logarithmic');
	});

	it('returns null for non-transcendental', () => {
		expect(getTranscendentalType(parseLatex('x^2'))).toBeNull();
	});
});

describe('containsRadical', () => {
	it('detects sqrt', () => {
		expect(containsRadical(parseLatex('\\sqrt{x}'))).toBe(true);
		expect(containsRadical(parseLatex('\\sqrt{2}'))).toBe(true);
	});

	it('detects cube root', () => {
		expect(containsRadical(parseLatex('\\sqrt[3]{x}'))).toBe(true);
	});

	it('returns false for non-radical expressions', () => {
		expect(containsRadical(parseLatex('x^2'))).toBe(false);
		expect(containsRadical(parseLatex('x + 1'))).toBe(false);
	});
});

describe('isRationalIn', () => {
	it('identifies polynomials as rational', () => {
		expect(isRationalIn(parseLatex('x^2 + 1'), 'x')).toBe(true);
	});

	it('identifies rational expressions', () => {
		expect(isRationalIn(parseLatex('\\frac{x}{x+1}'), 'x')).toBe(true);
		expect(isRationalIn(parseLatex('\\frac{x^2 + 1}{x - 2}'), 'x')).toBe(true);
	});

	it('rejects transcendental expressions', () => {
		expect(isRationalIn(parseLatex('\\sin(x)'), 'x')).toBe(false);
	});

	it('rejects radical expressions', () => {
		expect(isRationalIn(parseLatex('\\sqrt{x}'), 'x')).toBe(false);
	});
});

describe('calculateComplexity', () => {
	it('returns low complexity for simple expressions', () => {
		const c1 = calculateComplexity(parseLatex('x'));
		const c2 = calculateComplexity(parseLatex('5'));
		expect(c1).toBeLessThan(5);
		expect(c2).toBeLessThan(5);
	});

	it('returns higher complexity for nested expressions', () => {
		const c1 = calculateComplexity(parseLatex('x'));
		const c2 = calculateComplexity(parseLatex('x + 1'));
		const c3 = calculateComplexity(parseLatex('(x + 1)^2'));
		expect(c2).toBeGreaterThan(c1);
		expect(c3).toBeGreaterThan(c2);
	});

	it('returns higher complexity for functions', () => {
		const c1 = calculateComplexity(parseLatex('x'));
		const c2 = calculateComplexity(parseLatex('\\sin(x)'));
		expect(c2).toBeGreaterThan(c1);
	});
});

describe('classifyExpression', () => {
	describe('constant expressions', () => {
		it('classifies numeric constants', () => {
			const result = classify('5');
			expect(result.category).toBe('constant');
			expect(result.isConstant).toBe(true);
			expect(result.variables).toHaveLength(0);
		});

		it('classifies pure numeric expressions as constant', () => {
			// Note: Greek letters like \pi are treated as variables in this system
			// for substitution purposes. Use numeric constants for true constants.
			const result = classify('\\sqrt{2}');
			expect(result.category).toBe('constant');
			expect(result.isConstant).toBe(true);
		});
	});

	describe('polynomial expressions', () => {
		it('classifies linear polynomial', () => {
			const result = classify('2x + 1', 'x');
			expect(result.category).toBe('polynomial');
			expect(result.polynomialDegree).toBe(1);
		});

		it('classifies quadratic polynomial', () => {
			const result = classify('x^2 + 2x + 1', 'x');
			expect(result.category).toBe('polynomial');
			expect(result.polynomialDegree).toBe(2);
		});

		it('classifies cubic polynomial', () => {
			const result = classify('x^3 - x', 'x');
			expect(result.category).toBe('polynomial');
			expect(result.polynomialDegree).toBe(3);
		});

		it('includes rational and algebraic as subcategories', () => {
			const result = classify('x^2 + 1', 'x');
			expect(result.subCategories).toContain('rational');
			expect(result.subCategories).toContain('algebraic');
		});
	});

	describe('rational expressions', () => {
		it('classifies simple fraction', () => {
			const result = classify('\\frac{1}{x}', 'x');
			expect(result.category).toBe('rational');
			expect(result.polynomialDegree).toBeNull();
		});

		it('classifies ratio of polynomials', () => {
			const result = classify('\\frac{x^2 + 1}{x - 1}', 'x');
			expect(result.category).toBe('rational');
		});
	});

	describe('radical expressions', () => {
		it('classifies sqrt expressions', () => {
			const result = classify('\\sqrt{x}', 'x');
			expect(result.category).toBe('radical');
		});

		it('classifies expressions with radicals', () => {
			const result = classify('\\sqrt{x} + 1', 'x');
			expect(result.category).toBe('radical');
		});
	});

	describe('transcendental expressions', () => {
		it('classifies trigonometric expressions', () => {
			const result = classify('\\sin(x)', 'x');
			expect(result.category).toBe('trigonometric');
			expect(result.hasTranscendental).toBe(true);
			expect(result.transcendentalType).toBe('trigonometric');
		});

		it('classifies exponential expressions', () => {
			const result = classify('\\exp(x)', 'x');
			expect(result.category).toBe('exponential');
			expect(result.transcendentalType).toBe('exponential');
		});

		it('classifies logarithmic expressions', () => {
			const result = classify('\\ln(x)', 'x');
			expect(result.category).toBe('logarithmic');
			expect(result.transcendentalType).toBe('logarithmic');
		});

		it('classifies mixed transcendental expressions', () => {
			const result = classify('\\sin(x) + \\ln(x)', 'x');
			expect(result.category).toBe('mixed');
			expect(result.hasTranscendental).toBe(true);
		});
	});

	describe('complexity scoring', () => {
		it('simple expressions have low complexity', () => {
			const result = classify('x');
			expect(result.complexity).toBeLessThan(10);
		});

		it('nested expressions have higher complexity', () => {
			const simple = classify('x');
			const nested = classify('\\frac{x^2 + 1}{\\sqrt{x + 1}}', 'x');
			expect(nested.complexity).toBeGreaterThan(simple.complexity);
		});
	});

	describe('variable detection', () => {
		it('detects single variable', () => {
			const result = classify('x^2 + x + 1');
			expect(result.variables).toEqual(['x']);
		});

		it('detects multiple variables', () => {
			const result = classify('x + y');
			expect(result.variables).toContain('x');
			expect(result.variables).toContain('y');
		});
	});
});
