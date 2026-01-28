/**
 * Tests for periodicity detection module
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { detectPeriodicity, isPeriodic, getPeriod, getPeriodNumeric } from '../periodicity';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;

describe('detectPeriodicity', () => {
	describe('basic trigonometric functions', () => {
		it('should detect sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
			expect(result.variable).toBe('x');
		});

		it('should detect cos(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect tan(x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\tan(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cot(x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\cot(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sec(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sec(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect csc(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\csc(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('scaled arguments', () => {
		it('should detect sin(2x) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(2x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cos(3x) as periodic with period 2π/3', () => {
			const result = detectPeriodicity(parseLatex('\\cos(3x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI / 3, 5);
		});

		it('should detect tan(2x) as periodic with period π/2', () => {
			const result = detectPeriodicity(parseLatex('\\tan(2x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI / 2, 5);
		});

		it('should detect sin(x/2) as periodic with period 4π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(\\frac{x}{2})'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(4 * PI, 5);
		});

		it('should detect cos(πx) as periodic with period 2', () => {
			const result = detectPeriodicity(parseLatex('\\cos(\\pi x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(2, 5);
		});
	});

	describe('shifted arguments', () => {
		it('should detect sin(x + 1) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x + 1)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect cos(x - π) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(x - \\pi)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(2x + 1) as periodic with period π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(2x + 1)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});
	});

	describe('combinations', () => {
		it('should detect sin(x) + cos(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + \\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(x) + 1 as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + 1'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect 2*sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('2\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(x)*cos(x) as periodic with MINIMAL period π', () => {
			// sin(x)·cos(x) = sin(2x)/2, so minimal period is π
			// Both sin and cos have half-period antisymmetry at π
			const result = detectPeriodicity(parseLatex('\\sin(x)\\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin²(x) as periodic with MINIMAL period π', () => {
			// sin²(x + π) = (-sin(x))² = sin²(x), so minimal period is π
			const result = detectPeriodicity(parseLatex('\\sin^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect cos²(x) as periodic with MINIMAL period π', () => {
			const result = detectPeriodicity(parseLatex('\\cos^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin⁴(x) as periodic with MINIMAL period π', () => {
			// Even power of antisymmetric function
			const result = detectPeriodicity(parseLatex('\\sin^4(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin³(x) as periodic with period 2π (odd power)', () => {
			// Odd power preserves antisymmetry, period unchanged
			const result = detectPeriodicity(parseLatex('\\sin^3(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect tan²(x) as periodic with period π (no reduction)', () => {
			// tan has no half-period antisymmetry, so no reduction
			const result = detectPeriodicity(parseLatex('\\tan^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin(x)/cos(x) as periodic with MINIMAL period π', () => {
			// sin/cos = tan, but computed via antisymmetry: period π
			const result = detectPeriodicity(parseLatex('\\frac{\\sin(x)}{\\cos(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect 1/sin(x) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\frac{1}{\\sin(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('non-periodic functions', () => {
		it('should detect x as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('x'));
			expect(result.isPeriodic).toBe(false);
			expect(result.period).toBeNull();
		});

		it('should detect x^2 as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('x^2'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect exp(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('e^x'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect ln(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\ln(x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect sinh(x) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\sinh(x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect constant as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('5'));
			expect(result.isPeriodic).toBe(false);
		});
	});

	describe('function compositions', () => {
		it('should detect sin(sin(x)) as periodic with period 2π', () => {
			// sin(x) has period 2π, so sin(sin(x)) also has period 2π
			const result = detectPeriodicity(parseLatex('\\sin(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect cos(sin(x)) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\cos(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(cos(x)) as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('\\sin(\\cos(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin(tan(x)) as periodic with period π', () => {
			// tan(x) has period π, so sin(tan(x)) has period π
			const result = detectPeriodicity(parseLatex('\\sin(\\tan(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(PI, 5);
		});

		it('should detect sin(x²) as non-periodic', () => {
			// x² is not periodic, so sin(x²) is not periodic
			const result = detectPeriodicity(parseLatex('\\sin(x^2)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect sin(eˣ) as non-periodic', () => {
			const result = detectPeriodicity(parseLatex('\\sin(e^x)'));
			expect(result.isPeriodic).toBe(false);
		});

		it('should detect exp(sin(x)) as periodic with period 2π', () => {
			// sin(x) has period 2π, so exp(sin(x)) also has period 2π
			// Use \exp function notation since e^{...} parses e as a variable
			const result = detectPeriodicity(parseLatex('\\exp(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect 2^{cos(x)} as periodic with period 2π', () => {
			const result = detectPeriodicity(parseLatex('2^{\\cos(x)}'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});
	});

	describe('symbolic periods', () => {
		it('should return symbolic 2π for sin(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x)'));
			expect(period).not.toBeNull();
			// Check it's 2π symbolically (multiplication of 2 and π)
			expect(period?.type).toBe('multiplication');
		});

		it('should return symbolic π for sin²(x)', () => {
			const period = getPeriod(parseLatex('\\sin^2(x)'));
			expect(period).not.toBeNull();
			// Check it's π symbolically (MathConstantNode has type 'constant')
			expect(period?.type).toBe('constant');
		});

		it('should return symbolic 2π for sin(x) + cos(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x) + \\cos(x)'));
			expect(period).not.toBeNull();
			// Should be symbolic, not numeric
			expect(period?.type).not.toBe('number');
		});

		it('should return symbolic π for sin(x)·cos(x)', () => {
			const period = getPeriod(parseLatex('\\sin(x)\\cos(x)'));
			expect(period).not.toBeNull();
			// Check it's π symbolically (MathConstantNode has type 'constant')
			expect(period?.type).toBe('constant');
		});
	});

	describe('edge cases', () => {
		it('should handle parentheses', () => {
			const result = detectPeriodicity(parseLatex('(\\sin(x))'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should handle negative coefficient', () => {
			const result = detectPeriodicity(parseLatex('-\\sin(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should handle specified variable', () => {
			const result = detectPeriodicity(parseLatex('\\sin(y)'), 'y');
			expect(result.isPeriodic).toBe(true);
			expect(result.variable).toBe('y');
		});

		it('should return non-periodic for multiple variables without specification', () => {
			const result = detectPeriodicity(parseLatex('\\sin(x) + y'));
			expect(result.isPeriodic).toBe(false);
			expect(result.reason).toContain('Multiple variables');
		});
	});
});

describe('isPeriodic', () => {
	it('should return true for periodic functions', () => {
		expect(isPeriodic(parseLatex('\\sin(x)'))).toBe(true);
		expect(isPeriodic(parseLatex('\\cos(2x)'))).toBe(true);
		expect(isPeriodic(parseLatex('\\tan(x)'))).toBe(true);
	});

	it('should return false for non-periodic functions', () => {
		expect(isPeriodic(parseLatex('x'))).toBe(false);
		expect(isPeriodic(parseLatex('x^2'))).toBe(false);
		expect(isPeriodic(parseLatex('e^x'))).toBe(false);
	});
});

describe('getPeriod', () => {
	it('should return period node for periodic functions', () => {
		const period = getPeriod(parseLatex('\\sin(x)'));
		expect(period).not.toBeNull();
	});

	it('should return null for non-periodic functions', () => {
		expect(getPeriod(parseLatex('x^2'))).toBeNull();
	});
});

describe('getPeriodNumeric', () => {
	it('should return numeric period for periodic functions', () => {
		expect(getPeriodNumeric(parseLatex('\\sin(x)'))).toBeCloseTo(TWO_PI, 5);
		expect(getPeriodNumeric(parseLatex('\\tan(x)'))).toBeCloseTo(PI, 5);
		expect(getPeriodNumeric(parseLatex('\\sin(2x)'))).toBeCloseTo(PI, 5);
	});

	it('should return null for non-periodic functions', () => {
		expect(getPeriodNumeric(parseLatex('x^2'))).toBeNull();
	});
});
