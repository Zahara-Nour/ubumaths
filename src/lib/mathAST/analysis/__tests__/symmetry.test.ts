/**
 * Tests for symmetry detection module
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { detectSymmetry, isEven, isOdd, hasNoSymmetry } from '../symmetry';

describe('detectSymmetry', () => {
	describe('even functions', () => {
		it('should detect x^2 as even', () => {
			const result = detectSymmetry(parseLatex('x^2'));
			expect(result.symmetry).toBe('even');
			expect(result.variable).toBe('x');
		});

		it('should detect x^4 as even', () => {
			const result = detectSymmetry(parseLatex('x^4'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect x^2 + 1 as even', () => {
			const result = detectSymmetry(parseLatex('x^2 + 1'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect cos(x) as even', () => {
			const result = detectSymmetry(parseLatex('\\cos(x)'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect cosh(x) as even', () => {
			const result = detectSymmetry(parseLatex('\\cosh(x)'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect |x| as even', () => {
			const result = detectSymmetry(parseLatex('|x|'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect x^2 * cos(x) as even (even × even)', () => {
			const result = detectSymmetry(parseLatex('x^2 \\cos(x)'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect x * sin(x) as even (odd × odd)', () => {
			const result = detectSymmetry(parseLatex('x \\sin(x)'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect constant as even', () => {
			const result = detectSymmetry(parseLatex('5'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect x^2 + x^4 as even', () => {
			const result = detectSymmetry(parseLatex('x^2 + x^4'));
			expect(result.symmetry).toBe('even');
		});
	});

	describe('odd functions', () => {
		it('should detect x as odd', () => {
			const result = detectSymmetry(parseLatex('x'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect x^3 as odd', () => {
			const result = detectSymmetry(parseLatex('x^3'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect x^5 as odd', () => {
			const result = detectSymmetry(parseLatex('x^5'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect sin(x) as odd', () => {
			const result = detectSymmetry(parseLatex('\\sin(x)'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect tan(x) as odd', () => {
			const result = detectSymmetry(parseLatex('\\tan(x)'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect sinh(x) as odd', () => {
			const result = detectSymmetry(parseLatex('\\sinh(x)'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect x^3 + x as odd', () => {
			const result = detectSymmetry(parseLatex('x^3 + x'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect x * cos(x) as odd (odd × even)', () => {
			const result = detectSymmetry(parseLatex('x \\cos(x)'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect -x as odd', () => {
			const result = detectSymmetry(parseLatex('-x'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect x/(x^2+1) as odd', () => {
			const result = detectSymmetry(parseLatex('\\frac{x}{x^2+1}'));
			expect(result.symmetry).toBe('odd');
		});
	});

	describe('no symmetry', () => {
		it('should detect x^2 + x as neither', () => {
			const result = detectSymmetry(parseLatex('x^2 + x'));
			expect(result.symmetry).toBe('none');
		});

		it('should detect x + 1 as neither', () => {
			const result = detectSymmetry(parseLatex('x + 1'));
			expect(result.symmetry).toBe('none');
		});

		it('should detect x^3 + x^2 as neither', () => {
			const result = detectSymmetry(parseLatex('x^3 + x^2'));
			expect(result.symmetry).toBe('none');
		});

		it('should detect x^2 + sin(x) as neither (even + odd)', () => {
			const result = detectSymmetry(parseLatex('x^2 + \\sin(x)'));
			expect(result.symmetry).toBe('none');
		});
	});

	describe('special cases', () => {
		it('should handle delimiter (parentheses)', () => {
			const result = detectSymmetry(parseLatex('(x^2)'));
			expect(result.symmetry).toBe('even');
		});

		it('should handle negative exponents', () => {
			// x^{-2} is even
			const result = detectSymmetry(parseLatex('x^{-2}'));
			expect(result.symmetry).toBe('even');
		});

		it('should handle fractions with even numerator and denominator', () => {
			// x^2 / (x^2 + 1) - even/even = even
			const result = detectSymmetry(parseLatex('\\frac{x^2}{x^2+1}'));
			expect(result.symmetry).toBe('even');
		});

		it('should use specified variable', () => {
			// In terms of x, this is constant (even)
			const result = detectSymmetry(parseLatex('y^2'), 'x');
			expect(result.symmetry).toBe('even');
		});

		it('should detect symmetry in specified variable', () => {
			// x*y is odd in x (y treated as constant)
			const result = detectSymmetry(parseLatex('xy'), 'x');
			expect(result.symmetry).toBe('odd');
		});

		it('should return unknown for multiple variables without specification', () => {
			const result = detectSymmetry(parseLatex('x + y'));
			expect(result.symmetry).toBe('unknown');
		});
	});

	describe('composition of functions', () => {
		it('should detect cos(x^2) as even (even of even)', () => {
			const result = detectSymmetry(parseLatex('\\cos(x^2)'));
			expect(result.symmetry).toBe('even');
		});

		it('should detect sin(x^3) as odd (odd of odd)', () => {
			const result = detectSymmetry(parseLatex('\\sin(x^3)'));
			expect(result.symmetry).toBe('odd');
		});

		it('should detect cos(x^3) as even (even of odd = even)', () => {
			// cos(-x^3) = cos(-(x^3)) = cos(x^3) because cos is even
			const result = detectSymmetry(parseLatex('\\cos(x^3)'));
			expect(result.symmetry).toBe('even');
		});
	});
});

describe('isEven', () => {
	it('should return true for even functions', () => {
		expect(isEven(parseLatex('x^2'))).toBe(true);
		expect(isEven(parseLatex('\\cos(x)'))).toBe(true);
	});

	it('should return false for odd functions', () => {
		expect(isEven(parseLatex('x'))).toBe(false);
		expect(isEven(parseLatex('\\sin(x)'))).toBe(false);
	});

	it('should return false for neither', () => {
		expect(isEven(parseLatex('x + 1'))).toBe(false);
	});
});

describe('isOdd', () => {
	it('should return true for odd functions', () => {
		expect(isOdd(parseLatex('x^3'))).toBe(true);
		expect(isOdd(parseLatex('\\sin(x)'))).toBe(true);
	});

	it('should return false for even functions', () => {
		expect(isOdd(parseLatex('x^2'))).toBe(false);
		expect(isOdd(parseLatex('\\cos(x)'))).toBe(false);
	});

	it('should return false for neither', () => {
		expect(isOdd(parseLatex('x^2 + x'))).toBe(false);
	});
});

describe('hasNoSymmetry', () => {
	it('should return true for functions with no symmetry', () => {
		expect(hasNoSymmetry(parseLatex('x + 1'))).toBe(true);
		expect(hasNoSymmetry(parseLatex('x^2 + x'))).toBe(true);
	});

	it('should return false for even functions', () => {
		expect(hasNoSymmetry(parseLatex('x^2'))).toBe(false);
	});

	it('should return false for odd functions', () => {
		expect(hasNoSymmetry(parseLatex('x^3'))).toBe(false);
	});
});

describe('domain symmetry', () => {
	it('should detect non-symmetric domain for sqrt(x)', () => {
		// sqrt(x) has domain [0, +∞[ which is not symmetric
		const result = detectSymmetry(parseLatex('\\sqrt{x}'));
		expect(result.symmetry).toBe('none');
		expect(result.reason).toContain('Domain');
	});

	it('should detect non-symmetric domain for ln(x)', () => {
		// ln(x) has domain ]0, +∞[ which is not symmetric
		const result = detectSymmetry(parseLatex('\\ln(x)'));
		expect(result.symmetry).toBe('none');
		expect(result.reason).toContain('Domain');
	});

	it('should allow symmetric domain for ln(x^2)', () => {
		// ln(x^2) has domain ℝ \ {0} which is symmetric
		// But the function itself: ln((-x)^2) = ln(x^2) → even
		const result = detectSymmetry(parseLatex('\\ln(x^2)'));
		expect(result.symmetry).toBe('even');
	});

	it('should allow symmetric domain for 1/x', () => {
		// 1/x has domain ℝ \ {0} which is symmetric
		// And the function is odd: 1/(-x) = -1/x
		const result = detectSymmetry(parseLatex('\\frac{1}{x}'));
		expect(result.symmetry).toBe('odd');
	});

	it('should allow symmetric domain for x^2 + 1', () => {
		// x^2 + 1 has domain ℝ which is symmetric
		const result = detectSymmetry(parseLatex('x^2 + 1'));
		expect(result.symmetry).toBe('even');
	});
});
