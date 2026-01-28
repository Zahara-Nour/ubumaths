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

		it('should detect sin(x)*cos(x) as periodic with period 2π', () => {
			// Product of periodic functions has period = LCM of periods
			// (2π is a valid period, even if π is the fundamental period)
			const result = detectPeriodicity(parseLatex('\\sin(x)\\cos(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
		});

		it('should detect sin²(x) as periodic with period 2π', () => {
			// f(x)^n has same period as f(x)
			// (2π is a valid period, even if π is the fundamental period)
			const result = detectPeriodicity(parseLatex('\\sin^2(x)'));
			expect(result.isPeriodic).toBe(true);
			expect(result.periodNumeric).toBeCloseTo(TWO_PI, 5);
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
