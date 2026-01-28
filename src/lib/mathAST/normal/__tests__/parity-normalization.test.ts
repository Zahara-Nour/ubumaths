/**
 * Tests for parity normalization of even/odd functions
 *
 * Verifies that:
 * - Even functions: f(-x) === f(x) (e.g., cos, cosh, abs)
 * - Odd functions: f(-x) === -f(x) (e.g., sin, sinh, tan, tanh)
 */

import { describe, test, expect } from 'vitest';
import { Exp } from '../../exp';

// Helper to create function expressions using Exp.func for functions not directly exposed
function fn(name: string, arg: Exp): Exp {
	return Exp.func(name, [arg]);
}

// =============================================================================
// Even Functions (f(-x) = f(x))
// =============================================================================

describe('Even function parity normalization', () => {
	describe('cos (even)', () => {
		test('cos(-x) is equivalent to cos(x)', () => {
			const a = Exp.cos(Exp.opposite(Exp.variable('x')));
			const b = Exp.cos(Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('cos(-2x) is equivalent to cos(2x)', () => {
			const a = Exp.cos(Exp.opposite(Exp.multiply(Exp.number('2'), Exp.variable('x'))));
			const b = Exp.cos(Exp.multiply(Exp.number('2'), Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('cos(-x-y) is equivalent to cos(x+y)', () => {
			const a = Exp.cos(Exp.opposite(Exp.add(Exp.variable('x'), Exp.variable('y'))));
			const b = Exp.cos(Exp.add(Exp.variable('x'), Exp.variable('y')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('cosh (even)', () => {
		test('cosh(-x) is equivalent to cosh(x)', () => {
			const a = fn('cosh', Exp.opposite(Exp.variable('x')));
			const b = fn('cosh', Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('abs (even)', () => {
		test('|-x| is equivalent to |x|', () => {
			const a = Exp.abs(Exp.opposite(Exp.variable('x')));
			const b = Exp.abs(Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('|-2x| is equivalent to |2x|', () => {
			const a = Exp.abs(Exp.opposite(Exp.multiply(Exp.number('2'), Exp.variable('x'))));
			const b = Exp.abs(Exp.multiply(Exp.number('2'), Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('sec (even)', () => {
		test('sec(-x) is equivalent to sec(x)', () => {
			const a = fn('sec', Exp.opposite(Exp.variable('x')));
			const b = fn('sec', Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('sech (even)', () => {
		test('sech(-x) is equivalent to sech(x)', () => {
			const a = fn('sech', Exp.opposite(Exp.variable('x')));
			const b = fn('sech', Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});
});

// =============================================================================
// Odd Functions (f(-x) = -f(x))
// =============================================================================

describe('Odd function parity normalization', () => {
	describe('sin (odd)', () => {
		test('sin(-x) is equivalent to -sin(x)', () => {
			const a = Exp.sin(Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(Exp.sin(Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('sin(-2x) is equivalent to -sin(2x)', () => {
			const a = Exp.sin(Exp.opposite(Exp.multiply(Exp.number('2'), Exp.variable('x'))));
			const b = Exp.opposite(Exp.sin(Exp.multiply(Exp.number('2'), Exp.variable('x'))));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('sin(-x-y) is equivalent to -sin(x+y)', () => {
			const a = Exp.sin(Exp.opposite(Exp.add(Exp.variable('x'), Exp.variable('y'))));
			const b = Exp.opposite(Exp.sin(Exp.add(Exp.variable('x'), Exp.variable('y'))));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('tan (odd)', () => {
		test('tan(-x) is equivalent to -tan(x)', () => {
			const a = Exp.tan(Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(Exp.tan(Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('sinh (odd)', () => {
		test('sinh(-x) is equivalent to -sinh(x)', () => {
			const a = fn('sinh', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('sinh', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('tanh (odd)', () => {
		test('tanh(-x) is equivalent to -tanh(x)', () => {
			const a = fn('tanh', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('tanh', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('cot (odd)', () => {
		test('cot(-x) is equivalent to -cot(x)', () => {
			const a = fn('cot', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('cot', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('coth (odd)', () => {
		test('coth(-x) is equivalent to -coth(x)', () => {
			const a = fn('coth', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('coth', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('csc (odd)', () => {
		test('csc(-x) is equivalent to -csc(x)', () => {
			const a = fn('csc', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('csc', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('csch (odd)', () => {
		test('csch(-x) is equivalent to -csch(x)', () => {
			const a = fn('csch', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('csch', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('arcsin (odd)', () => {
		test('arcsin(-x) is equivalent to -arcsin(x)', () => {
			const a = fn('arcsin', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('arcsin', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('arctan (odd)', () => {
		test('arctan(-x) is equivalent to -arctan(x)', () => {
			const a = fn('arctan', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('arctan', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('arcsinh (odd)', () => {
		test('arcsinh(-x) is equivalent to -arcsinh(x)', () => {
			const a = fn('arcsinh', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('arcsinh', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('arctanh (odd)', () => {
		test('arctanh(-x) is equivalent to -arctanh(x)', () => {
			const a = fn('arctanh', Exp.opposite(Exp.variable('x')));
			const b = Exp.opposite(fn('arctanh', Exp.variable('x')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});
});

// =============================================================================
// Composed Functions
// =============================================================================

describe('Composed function parity', () => {
	test('cos(sin(-x)) is equivalent to cos(sin(x)) via cos(-sin(x))=cos(sin(x))', () => {
		// sin(-x) = -sin(x), then cos(-sin(x)) = cos(sin(x)) because cos is even
		const a = Exp.cos(Exp.sin(Exp.opposite(Exp.variable('x'))));
		const b = Exp.cos(Exp.sin(Exp.variable('x')));

		expect(a.isEquivalent(b)).toBe(true);
	});

	test('sin(cos(-x)) is equivalent to sin(cos(x)) because cos(-x)=cos(x)', () => {
		// cos(-x) = cos(x), so sin(cos(-x)) = sin(cos(x))
		const a = Exp.sin(Exp.cos(Exp.opposite(Exp.variable('x'))));
		const b = Exp.sin(Exp.cos(Exp.variable('x')));

		expect(a.isEquivalent(b)).toBe(true);
	});

	test('sin(sin(-x)) is equivalent to -sin(sin(x))', () => {
		// sin(-x) = -sin(x), then sin(-sin(x)) = -sin(sin(x)) because sin is odd
		const a = Exp.sin(Exp.sin(Exp.opposite(Exp.variable('x'))));
		const b = Exp.opposite(Exp.sin(Exp.sin(Exp.variable('x'))));

		expect(a.isEquivalent(b)).toBe(true);
	});
});

// =============================================================================
// Edge Cases (should NOT change)
// =============================================================================

describe('Edge cases - expressions that should not be simplified', () => {
	test('cos(x-y) keeps its original form (mixed signs)', () => {
		// x - y has mixed signs, so parity rule should not apply
		const expr = Exp.cos(Exp.subtract(Exp.variable('x'), Exp.variable('y')));

		// Should NOT be equivalent to cos(y-x)
		const different = Exp.cos(Exp.subtract(Exp.variable('y'), Exp.variable('x')));

		// They are different because x-y !== y-x
		expect(expr.isEquivalent(different)).toBe(false);
	});

	test('sin(x-y) keeps its original form', () => {
		const expr = Exp.sin(Exp.subtract(Exp.variable('x'), Exp.variable('y')));

		// Should NOT be equivalent to sin(y-x)
		const different = Exp.sin(Exp.subtract(Exp.variable('y'), Exp.variable('x')));

		expect(expr.isEquivalent(different)).toBe(false);
	});

	test('cos(x+1) is not affected by parity rules (not purely negative)', () => {
		// x + 1 doesn't have all negative terms
		const a = Exp.cos(Exp.add(Exp.variable('x'), Exp.number('1')));
		const b = Exp.cos(Exp.subtract(Exp.number('1'), Exp.variable('x')));

		// These should be different
		expect(a.isEquivalent(b)).toBe(false);
	});

	test('positive arguments stay unchanged', () => {
		const a = Exp.cos(Exp.variable('x'));
		const b = Exp.cos(Exp.variable('x'));

		expect(a.isEquivalent(b)).toBe(true);
	});
});

// =============================================================================
// Known Trigonometric Values with Parity
// =============================================================================

describe('Known values with parity', () => {
	test('cos(0) = 1', () => {
		const expr = Exp.cos(Exp.number('0'));
		expect(expr.isEquivalent(Exp.number('1'))).toBe(true);
	});

	test('sin(0) = 0', () => {
		const expr = Exp.sin(Exp.number('0'));
		expect(expr.isEquivalent(Exp.number('0'))).toBe(true);
	});

	test('tan(0) = 0', () => {
		const expr = Exp.tan(Exp.number('0'));
		expect(expr.isEquivalent(Exp.number('0'))).toBe(true);
	});
});
