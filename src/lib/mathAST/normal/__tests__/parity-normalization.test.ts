/**
 * Tests for parity normalization of even/odd functions
 *
 * Verifies that:
 * - Even functions: f(-x) === f(x) (e.g., cos, cosh, abs)
 * - Odd functions: f(-x) === -f(x) (e.g., sin, sinh, tan, tanh)
 */

import { describe, test, expect } from 'vitest';
import type { MathNode } from '../../types';
import {
	abs,
	add,
	cos,
	func,
	implicitMultiply,
	number,
	opposite,
	sin,
	subtract,
	tan,
	variable
} from '../../factory';
import { equivalenceForms } from '../normalize';
import { normalFormsEquivalent } from '../hash';

/**
 * Décideur d'équivalence : formes d'équivalence (trigonométrie réduite, repli
 * sur les formes non réduites quand la réduction annule un dénominateur), puis
 * comparaison des formes normales.
 */
function isEquivalent(a: MathNode, b: MathNode): boolean {
	const [formA, formB] = equivalenceForms(a, b);
	return normalFormsEquivalent(formA, formB);
}

// Fonctions sans constructeur dédié dans la fabrique (cosh, sec, arcsin…)
function fn(name: string, arg: MathNode): MathNode {
	return func(name, [arg]);
}

// =============================================================================
// Even Functions (f(-x) = f(x))
// =============================================================================

describe('Even function parity normalization', () => {
	describe('cos (even)', () => {
		test('cos(-x) is equivalent to cos(x)', () => {
			const a = cos(opposite(variable('x')));
			const b = cos(variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('cos(-2x) is equivalent to cos(2x)', () => {
			const a = cos(opposite(implicitMultiply(number('2'), variable('x'))));
			const b = cos(implicitMultiply(number('2'), variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('cos(-x-y) is equivalent to cos(x+y)', () => {
			const a = cos(opposite(add(variable('x'), variable('y'))));
			const b = cos(add(variable('x'), variable('y')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('cosh (even)', () => {
		test('cosh(-x) is equivalent to cosh(x)', () => {
			const a = fn('cosh', opposite(variable('x')));
			const b = fn('cosh', variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('abs (even)', () => {
		test('|-x| is equivalent to |x|', () => {
			const a = abs(opposite(variable('x')));
			const b = abs(variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('|-2x| is equivalent to |2x|', () => {
			const a = abs(opposite(implicitMultiply(number('2'), variable('x'))));
			const b = abs(implicitMultiply(number('2'), variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('sec (even)', () => {
		test('sec(-x) is equivalent to sec(x)', () => {
			const a = fn('sec', opposite(variable('x')));
			const b = fn('sec', variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('sech (even)', () => {
		test('sech(-x) is equivalent to sech(x)', () => {
			const a = fn('sech', opposite(variable('x')));
			const b = fn('sech', variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});
});

// =============================================================================
// Odd Functions (f(-x) = -f(x))
// =============================================================================

describe('Odd function parity normalization', () => {
	describe('sin (odd)', () => {
		test('sin(-x) is equivalent to -sin(x)', () => {
			const a = sin(opposite(variable('x')));
			const b = opposite(sin(variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('sin(-2x) is equivalent to -sin(2x)', () => {
			const a = sin(opposite(implicitMultiply(number('2'), variable('x'))));
			const b = opposite(sin(implicitMultiply(number('2'), variable('x'))));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('sin(-x-y) is equivalent to -sin(x+y)', () => {
			const a = sin(opposite(add(variable('x'), variable('y'))));
			const b = opposite(sin(add(variable('x'), variable('y'))));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('tan (odd)', () => {
		test('tan(-x) is equivalent to -tan(x)', () => {
			const a = tan(opposite(variable('x')));
			const b = opposite(tan(variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('sinh (odd)', () => {
		test('sinh(-x) is equivalent to -sinh(x)', () => {
			const a = fn('sinh', opposite(variable('x')));
			const b = opposite(fn('sinh', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('tanh (odd)', () => {
		test('tanh(-x) is equivalent to -tanh(x)', () => {
			const a = fn('tanh', opposite(variable('x')));
			const b = opposite(fn('tanh', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('cot (odd)', () => {
		test('cot(-x) is equivalent to -cot(x)', () => {
			const a = fn('cot', opposite(variable('x')));
			const b = opposite(fn('cot', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('coth (odd)', () => {
		test('coth(-x) is equivalent to -coth(x)', () => {
			const a = fn('coth', opposite(variable('x')));
			const b = opposite(fn('coth', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('csc (odd)', () => {
		test('csc(-x) is equivalent to -csc(x)', () => {
			const a = fn('csc', opposite(variable('x')));
			const b = opposite(fn('csc', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('csch (odd)', () => {
		test('csch(-x) is equivalent to -csch(x)', () => {
			const a = fn('csch', opposite(variable('x')));
			const b = opposite(fn('csch', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('arcsin (odd)', () => {
		test('arcsin(-x) is equivalent to -arcsin(x)', () => {
			const a = fn('arcsin', opposite(variable('x')));
			const b = opposite(fn('arcsin', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('arctan (odd)', () => {
		test('arctan(-x) is equivalent to -arctan(x)', () => {
			const a = fn('arctan', opposite(variable('x')));
			const b = opposite(fn('arctan', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('arcsinh (odd)', () => {
		test('arcsinh(-x) is equivalent to -arcsinh(x)', () => {
			const a = fn('arcsinh', opposite(variable('x')));
			const b = opposite(fn('arcsinh', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('arctanh (odd)', () => {
		test('arctanh(-x) is equivalent to -arctanh(x)', () => {
			const a = fn('arctanh', opposite(variable('x')));
			const b = opposite(fn('arctanh', variable('x')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});
});

// =============================================================================
// Composed Functions
// =============================================================================

describe('Composed function parity', () => {
	test('cos(sin(-x)) is equivalent to cos(sin(x)) via cos(-sin(x))=cos(sin(x))', () => {
		// sin(-x) = -sin(x), then cos(-sin(x)) = cos(sin(x)) because cos is even
		const a = cos(sin(opposite(variable('x'))));
		const b = cos(sin(variable('x')));

		expect(isEquivalent(a, b)).toBe(true);
	});

	test('sin(cos(-x)) is equivalent to sin(cos(x)) because cos(-x)=cos(x)', () => {
		// cos(-x) = cos(x), so sin(cos(-x)) = sin(cos(x))
		const a = sin(cos(opposite(variable('x'))));
		const b = sin(cos(variable('x')));

		expect(isEquivalent(a, b)).toBe(true);
	});

	test('sin(sin(-x)) is equivalent to -sin(sin(x))', () => {
		// sin(-x) = -sin(x), then sin(-sin(x)) = -sin(sin(x)) because sin is odd
		const a = sin(sin(opposite(variable('x'))));
		const b = opposite(sin(sin(variable('x'))));

		expect(isEquivalent(a, b)).toBe(true);
	});
});

// =============================================================================
// Edge Cases (should NOT change)
// =============================================================================

describe('Edge cases - expressions that should not be simplified', () => {
	test('cos(x-y) keeps its original form (mixed signs)', () => {
		// x - y has mixed signs, so parity rule should not apply
		const expr = cos(subtract(variable('x'), variable('y')));

		// `cos` est PAIRE et `y − x = −(x − y)` : les deux sont donc égaux, et le
		// décideur le voit depuis que les arcs commensurables sont traités.
		// L'ancienne version de ce test assertait l'inverse (« They are different
		// because x-y !== y-x ») : elle enregistrait la limite du décideur comme
		// un fait mathématique. Vérifié numériquement : cos(1,3−0,4) et
		// cos(0,4−1,3) valent tous deux 0,62160996827…
		const mirrored = cos(subtract(variable('y'), variable('x')));

		expect(isEquivalent(expr, mirrored)).toBe(true);
	});

	test('sin(x-y) keeps its original form', () => {
		const expr = sin(subtract(variable('x'), variable('y')));

		// Should NOT be equivalent to sin(y-x)
		const different = sin(subtract(variable('y'), variable('x')));

		expect(isEquivalent(expr, different)).toBe(false);
	});

	test('cos(x+1) is not affected by parity rules (not purely negative)', () => {
		// x + 1 doesn't have all negative terms
		const a = cos(add(variable('x'), number('1')));
		const b = cos(subtract(number('1'), variable('x')));

		// These should be different
		expect(isEquivalent(a, b)).toBe(false);
	});

	test('positive arguments stay unchanged', () => {
		const a = cos(variable('x'));
		const b = cos(variable('x'));

		expect(isEquivalent(a, b)).toBe(true);
	});
});

// =============================================================================
// Known Trigonometric Values with Parity
// =============================================================================

describe('Known values with parity', () => {
	test('cos(0) = 1', () => {
		const expr = cos(number('0'));
		expect(isEquivalent(expr, number('1'))).toBe(true);
	});

	test('sin(0) = 0', () => {
		const expr = sin(number('0'));
		expect(isEquivalent(expr, number('0'))).toBe(true);
	});

	test('tan(0) = 0', () => {
		const expr = tan(number('0'));
		expect(isEquivalent(expr, number('0'))).toBe(true);
	});
});
