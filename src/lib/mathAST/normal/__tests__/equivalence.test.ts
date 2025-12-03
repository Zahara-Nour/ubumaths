/**
 * Tests for mathematical equivalence checking via the Exp class
 */

import { describe, test, expect } from 'vitest';
import { Exp } from '../../exp';

// =============================================================================
// Exp Equivalence Tests
// =============================================================================

describe('Exp.isEquivalent', () => {
	describe('Polynomial equivalence', () => {
		test('2x + 3x is equivalent to 5x', () => {
			const a = Exp.add(
				Exp.multiply(Exp.number('2'), Exp.variable('x')),
				Exp.multiply(Exp.number('3'), Exp.variable('x'))
			);
			const b = Exp.multiply(Exp.number('5'), Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('x + y is equivalent to y + x (commutativity)', () => {
			const a = Exp.add(Exp.variable('x'), Exp.variable('y'));
			const b = Exp.add(Exp.variable('y'), Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('x * y is equivalent to y * x (commutativity)', () => {
			const a = Exp.multiply(Exp.variable('x'), Exp.variable('y'));
			const b = Exp.multiply(Exp.variable('y'), Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('(x + y) + z is equivalent to x + (y + z) (associativity)', () => {
			const a = Exp.add(Exp.add(Exp.variable('x'), Exp.variable('y')), Exp.variable('z'));
			const b = Exp.add(Exp.variable('x'), Exp.add(Exp.variable('y'), Exp.variable('z')));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('(x * y) * z is equivalent to x * (y * z) (associativity)', () => {
			const a = Exp.multiply(Exp.multiply(Exp.variable('x'), Exp.variable('y')), Exp.variable('z'));
			const b = Exp.multiply(Exp.variable('x'), Exp.multiply(Exp.variable('y'), Exp.variable('z')));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('x * (y + z) is equivalent to x*y + x*z (distributivity)', () => {
			const a = Exp.multiply(Exp.variable('x'), Exp.add(Exp.variable('y'), Exp.variable('z')));
			const b = Exp.add(
				Exp.multiply(Exp.variable('x'), Exp.variable('y')),
				Exp.multiply(Exp.variable('x'), Exp.variable('z'))
			);

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('Binomial expansion', () => {
		test('(a + b)^2 is equivalent to a^2 + 2ab + b^2', () => {
			const a = Exp.power(Exp.add(Exp.variable('a'), Exp.variable('b')), Exp.number('2'));

			// Build a^2 + 2ab + b^2
			const aSq = Exp.power(Exp.variable('a'), Exp.number('2'));
			const twoAB = Exp.multiply(
				Exp.number('2'),
				Exp.multiply(Exp.variable('a'), Exp.variable('b'))
			);
			const bSq = Exp.power(Exp.variable('b'), Exp.number('2'));
			const b = Exp.add(aSq, Exp.add(twoAB, bSq));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('(a - b)^2 is equivalent to a^2 - 2ab + b^2', () => {
			const a = Exp.power(Exp.subtract(Exp.variable('a'), Exp.variable('b')), Exp.number('2'));

			const aSq = Exp.power(Exp.variable('a'), Exp.number('2'));
			const twoAB = Exp.multiply(
				Exp.number('2'),
				Exp.multiply(Exp.variable('a'), Exp.variable('b'))
			);
			const bSq = Exp.power(Exp.variable('b'), Exp.number('2'));
			const b = Exp.add(Exp.subtract(aSq, twoAB), bSq);

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	// NOTE: Fraction reduction of polynomial quotients is not yet implemented
	// These tests document expected future behavior
	describe('Fraction equivalence (TODO: implement fraction reduction)', () => {
		test.skip('6/9 is equivalent to 2/3', () => {
			const a = Exp.divide(Exp.number('6'), Exp.number('9'));
			const b = Exp.divide(Exp.number('2'), Exp.number('3'));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test.skip('4/8 is equivalent to 1/2', () => {
			const a = Exp.divide(Exp.number('4'), Exp.number('8'));
			const b = Exp.divide(Exp.number('1'), Exp.number('2'));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('Radical equivalence', () => {
		test('sqrt(18) is equivalent to 3*sqrt(2)', () => {
			const a = Exp.sqrt(Exp.number('18'));
			const b = Exp.multiply(Exp.number('3'), Exp.sqrt(Exp.number('2')));

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('sqrt(4) is equivalent to 2', () => {
			const a = Exp.sqrt(Exp.number('4'));
			const b = Exp.number('2');

			expect(a.isEquivalent(b)).toBe(true);
		});

		test('sqrt(50) is equivalent to 5*sqrt(2)', () => {
			const a = Exp.sqrt(Exp.number('50'));
			const b = Exp.multiply(Exp.number('5'), Exp.sqrt(Exp.number('2')));

			expect(a.isEquivalent(b)).toBe(true);
		});
	});

	describe('Non-equivalence', () => {
		test('x is not equivalent to y', () => {
			const a = Exp.variable('x');
			const b = Exp.variable('y');

			expect(a.isEquivalent(b)).toBe(false);
		});

		test('x^2 is not equivalent to x^3', () => {
			const a = Exp.power(Exp.variable('x'), Exp.number('2'));
			const b = Exp.power(Exp.variable('x'), Exp.number('3'));

			expect(a.isEquivalent(b)).toBe(false);
		});

		test('x + 1 is not equivalent to x + 2', () => {
			const a = Exp.add(Exp.variable('x'), Exp.number('1'));
			const b = Exp.add(Exp.variable('x'), Exp.number('2'));

			expect(a.isEquivalent(b)).toBe(false);
		});

		test('2x is not equivalent to 3x', () => {
			const a = Exp.multiply(Exp.number('2'), Exp.variable('x'));
			const b = Exp.multiply(Exp.number('3'), Exp.variable('x'));

			expect(a.isEquivalent(b)).toBe(false);
		});
	});
});

// =============================================================================
// Exp.hash Tests
// =============================================================================

describe('Exp.hash', () => {
	test('equivalent expressions have same hash', () => {
		const a = Exp.add(
			Exp.multiply(Exp.number('2'), Exp.variable('x')),
			Exp.multiply(Exp.number('3'), Exp.variable('x'))
		);
		const b = Exp.multiply(Exp.number('5'), Exp.variable('x'));

		expect(a.hash).toBe(b.hash);
	});

	test('different expressions have different hash', () => {
		const a = Exp.variable('x');
		const b = Exp.variable('y');

		expect(a.hash).not.toBe(b.hash);
	});

	test('hash is cached (same object)', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.variable('y'));
		const hash1 = expr.hash;
		const hash2 = expr.hash;

		expect(hash1).toBe(hash2);
	});
});

// =============================================================================
// Exp.simplify Tests
// =============================================================================

describe('Exp.simplify', () => {
	test('simplifies 2x + 3x to 5x', () => {
		const expr = Exp.add(
			Exp.multiply(Exp.number('2'), Exp.variable('x')),
			Exp.multiply(Exp.number('3'), Exp.variable('x'))
		);
		const simplified = expr.simplify();

		// The simplified form should be equivalent to 5x
		expect(simplified.isEquivalent(Exp.multiply(Exp.number('5'), Exp.variable('x')))).toBe(true);
	});

	test('simplifies x + x to 2x', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.variable('x'));
		const simplified = expr.simplify();

		expect(simplified.isEquivalent(Exp.multiply(Exp.number('2'), Exp.variable('x')))).toBe(true);
	});

	test('simplifies x - x to 0', () => {
		const expr = Exp.subtract(Exp.variable('x'), Exp.variable('x'));
		const simplified = expr.simplify();

		expect(simplified.isEquivalent(Exp.number('0'))).toBe(true);
	});

	test('simplifies 0 * x to 0', () => {
		const expr = Exp.multiply(Exp.number('0'), Exp.variable('x'));
		const simplified = expr.simplify();

		expect(simplified.isEquivalent(Exp.number('0'))).toBe(true);
	});

	test('simplifies sqrt(18) to 3*sqrt(2)', () => {
		const expr = Exp.sqrt(Exp.number('18'));
		const simplified = expr.simplify();

		expect(simplified.isEquivalent(Exp.multiply(Exp.number('3'), Exp.sqrt(Exp.number('2'))))).toBe(
			true
		);
	});
});

// =============================================================================
// Exp.normal Tests
// =============================================================================

describe('Exp.normal', () => {
	test('returns a NormalForm object', () => {
		const expr = Exp.variable('x');
		const normal = expr.normal;

		expect(normal).toHaveProperty('numerator');
		expect(normal).toHaveProperty('denominator');
		expect(normal).toHaveProperty('hash');
	});

	test('normal form is cached', () => {
		const expr = Exp.add(Exp.variable('x'), Exp.variable('y'));
		const normal1 = expr.normal;
		const normal2 = expr.normal;

		expect(normal1).toBe(normal2); // Same object reference
	});
});
