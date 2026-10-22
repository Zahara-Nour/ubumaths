/**
 * Tests for mathematical equivalence checking (décideur, empreinte,
 * simplification par forme normale)
 */

import { describe, test, expect } from 'vitest';
import type { MathNode } from '../../types';
import {
	add,
	fraction,
	implicitMultiply,
	number,
	opposite,
	power,
	sqrt,
	subtract,
	variable
} from '../../factory';
import { equivalenceForm, equivalenceForms, normalize } from '../normalize';
import { denormalize } from '../denormalize';
import { hashNormalForm, normalFormsEquivalent } from '../hash';

/**
 * Décideur d'équivalence : formes d'équivalence (trigonométrie réduite, repli
 * sur les formes non réduites quand la réduction annule un dénominateur), puis
 * comparaison des formes normales.
 */
function isEquivalent(a: MathNode, b: MathNode): boolean {
	const [formA, formB] = equivalenceForms(a, b);
	return normalFormsEquivalent(formA, formB);
}

/**
 * Empreinte du décideur : celle de la forme d'équivalence, ou celle de la
 * forme normale quand la réduction annule un dénominateur.
 */
function hashOf(node: MathNode): string {
	try {
		return hashNormalForm(equivalenceForm(node));
	} catch {
		return hashNormalForm(normalize(node));
	}
}

// =============================================================================
// isEquivalent (helper local) Tests
// =============================================================================

describe('isEquivalent', () => {
	describe('Polynomial equivalence', () => {
		test('2x + 3x is equivalent to 5x', () => {
			const a = add(
				implicitMultiply(number('2'), variable('x')),
				implicitMultiply(number('3'), variable('x'))
			);
			const b = implicitMultiply(number('5'), variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('x + y is equivalent to y + x (commutativity)', () => {
			const a = add(variable('x'), variable('y'));
			const b = add(variable('y'), variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('x * y is equivalent to y * x (commutativity)', () => {
			const a = implicitMultiply(variable('x'), variable('y'));
			const b = implicitMultiply(variable('y'), variable('x'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('(x + y) + z is equivalent to x + (y + z) (associativity)', () => {
			const a = add(add(variable('x'), variable('y')), variable('z'));
			const b = add(variable('x'), add(variable('y'), variable('z')));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('(x * y) * z is equivalent to x * (y * z) (associativity)', () => {
			const a = implicitMultiply(implicitMultiply(variable('x'), variable('y')), variable('z'));
			const b = implicitMultiply(variable('x'), implicitMultiply(variable('y'), variable('z')));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('x * (y + z) is equivalent to x*y + x*z (distributivity)', () => {
			const a = implicitMultiply(variable('x'), add(variable('y'), variable('z')));
			const b = add(
				implicitMultiply(variable('x'), variable('y')),
				implicitMultiply(variable('x'), variable('z'))
			);

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('Binomial expansion', () => {
		test('(a + b)^2 is equivalent to a^2 + 2ab + b^2', () => {
			const a = power(add(variable('a'), variable('b')), number('2'));

			// Build a^2 + 2ab + b^2
			const aSq = power(variable('a'), number('2'));
			const twoAB = implicitMultiply(number('2'), implicitMultiply(variable('a'), variable('b')));
			const bSq = power(variable('b'), number('2'));
			const b = add(aSq, add(twoAB, bSq));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('(a - b)^2 is equivalent to a^2 - 2ab + b^2', () => {
			const a = power(subtract(variable('a'), variable('b')), number('2'));

			const aSq = power(variable('a'), number('2'));
			const twoAB = implicitMultiply(number('2'), implicitMultiply(variable('a'), variable('b')));
			const bSq = power(variable('b'), number('2'));
			const b = add(subtract(aSq, twoAB), bSq);

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('Fraction equivalence', () => {
		test('6/9 is equivalent to 2/3', () => {
			const a = fraction(number('6'), number('9'));
			const b = fraction(number('2'), number('3'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('4/8 is equivalent to 1/2', () => {
			const a = fraction(number('4'), number('8'));
			const b = fraction(number('1'), number('2'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('-6/9 is equivalent to -2/3', () => {
			const a = fraction(opposite(number('6')), number('9'));
			const b = fraction(opposite(number('2')), number('3'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('6/(-9) is equivalent to -2/3', () => {
			const a = fraction(number('6'), opposite(number('9')));
			const b = fraction(opposite(number('2')), number('3'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('(-6)/(-9) is equivalent to 2/3', () => {
			const a = fraction(opposite(number('6')), opposite(number('9')));
			const b = fraction(number('2'), number('3'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('-4/8 is equivalent to -1/2', () => {
			const a = fraction(opposite(number('4')), number('8'));
			const b = fraction(opposite(number('1')), number('2'));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('15/(-25) is equivalent to -3/5', () => {
			const a = fraction(number('15'), opposite(number('25')));
			const b = fraction(opposite(number('3')), number('5'));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('Radical equivalence', () => {
		test('sqrt(18) is equivalent to 3*sqrt(2)', () => {
			const a = sqrt(number('18'));
			const b = implicitMultiply(number('3'), sqrt(number('2')));

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('sqrt(4) is equivalent to 2', () => {
			const a = sqrt(number('4'));
			const b = number('2');

			expect(isEquivalent(a, b)).toBe(true);
		});

		test('sqrt(50) is equivalent to 5*sqrt(2)', () => {
			const a = sqrt(number('50'));
			const b = implicitMultiply(number('5'), sqrt(number('2')));

			expect(isEquivalent(a, b)).toBe(true);
		});
	});

	describe('Non-equivalence', () => {
		test('x is not equivalent to y', () => {
			const a = variable('x');
			const b = variable('y');

			expect(isEquivalent(a, b)).toBe(false);
		});

		test('x^2 is not equivalent to x^3', () => {
			const a = power(variable('x'), number('2'));
			const b = power(variable('x'), number('3'));

			expect(isEquivalent(a, b)).toBe(false);
		});

		test('x + 1 is not equivalent to x + 2', () => {
			const a = add(variable('x'), number('1'));
			const b = add(variable('x'), number('2'));

			expect(isEquivalent(a, b)).toBe(false);
		});

		test('2x is not equivalent to 3x', () => {
			const a = implicitMultiply(number('2'), variable('x'));
			const b = implicitMultiply(number('3'), variable('x'));

			expect(isEquivalent(a, b)).toBe(false);
		});
	});
});

// =============================================================================
// hashOf Tests
// =============================================================================

describe('hashOf', () => {
	test('equivalent expressions have same hash', () => {
		const a = add(
			implicitMultiply(number('2'), variable('x')),
			implicitMultiply(number('3'), variable('x'))
		);
		const b = implicitMultiply(number('5'), variable('x'));

		expect(hashOf(a)).toBe(hashOf(b));
	});

	test('different expressions have different hash', () => {
		const a = variable('x');
		const b = variable('y');

		expect(hashOf(a)).not.toBe(hashOf(b));
	});
});

// =============================================================================
// denormalize(normalize) Tests
// =============================================================================

describe('denormalize(normalize)', () => {
	test('simplifies 2x + 3x to 5x', () => {
		const expr = add(
			implicitMultiply(number('2'), variable('x')),
			implicitMultiply(number('3'), variable('x'))
		);
		const simplified = denormalize(normalize(expr));

		// The simplified form should be equivalent to 5x
		expect(isEquivalent(simplified, implicitMultiply(number('5'), variable('x')))).toBe(true);
	});

	test('simplifies x + x to 2x', () => {
		const expr = add(variable('x'), variable('x'));
		const simplified = denormalize(normalize(expr));

		expect(isEquivalent(simplified, implicitMultiply(number('2'), variable('x')))).toBe(true);
	});

	test('simplifies x - x to 0', () => {
		const expr = subtract(variable('x'), variable('x'));
		const simplified = denormalize(normalize(expr));

		expect(isEquivalent(simplified, number('0'))).toBe(true);
	});

	test('simplifies 0 * x to 0', () => {
		const expr = implicitMultiply(number('0'), variable('x'));
		const simplified = denormalize(normalize(expr));

		expect(isEquivalent(simplified, number('0'))).toBe(true);
	});

	test('simplifies sqrt(18) to 3*sqrt(2)', () => {
		const expr = sqrt(number('18'));
		const simplified = denormalize(normalize(expr));

		expect(isEquivalent(simplified, implicitMultiply(number('3'), sqrt(number('2'))))).toBe(true);
	});
});

// =============================================================================
// normalize Tests
// =============================================================================

describe('normalize', () => {
	test('returns a NormalForm object', () => {
		const expr = variable('x');
		const normal = normalize(expr);

		expect(normal).toHaveProperty('numerator');
		expect(normal).toHaveProperty('denominator');
		expect(normal).toHaveProperty('hash');
	});
});

// =============================================================================
// Fraction Reduction Tests
// =============================================================================

describe('fraction reduction', () => {
	test('(2x+7x)/x === 9', () => {
		// (2x+7x)/x = 9x/x = 9
		const expr = fraction(
			add(
				implicitMultiply(number('2'), variable('x')),
				implicitMultiply(number('7'), variable('x'))
			),
			variable('x')
		);
		expect(isEquivalent(expr, number('9'))).toBe(true);
	});

	test('6x^2/(2x) === 3x', () => {
		// 6x^2 / 2x = 3x
		const expr = fraction(
			implicitMultiply(number('6'), power(variable('x'), number('2'))),
			implicitMultiply(number('2'), variable('x'))
		);
		expect(isEquivalent(expr, implicitMultiply(number('3'), variable('x')))).toBe(true);
	});

	test('x^2y/(xy) === x', () => {
		// x^2*y / (x*y) = x
		const expr = fraction(
			implicitMultiply(power(variable('x'), number('2')), variable('y')),
			implicitMultiply(variable('x'), variable('y'))
		);
		expect(isEquivalent(expr, variable('x'))).toBe(true);
	});

	test('2xy/(xy) === 2', () => {
		// 2*x*y / (x*y) = 2
		const expr = fraction(
			implicitMultiply(number('2'), implicitMultiply(variable('x'), variable('y'))),
			implicitMultiply(variable('x'), variable('y'))
		);
		expect(isEquivalent(expr, number('2'))).toBe(true);
	});

	test('(x^2+xy)/x === x+y', () => {
		// (x^2 + x*y) / x = x + y
		const expr = fraction(
			add(power(variable('x'), number('2')), implicitMultiply(variable('x'), variable('y'))),
			variable('x')
		);
		expect(isEquivalent(expr, add(variable('x'), variable('y')))).toBe(true);
	});

	test('x/x === 1', () => {
		const expr = fraction(variable('x'), variable('x'));
		expect(isEquivalent(expr, number('1'))).toBe(true);
	});

	test('4/2 === 2', () => {
		const expr = fraction(number('4'), number('2'));
		expect(isEquivalent(expr, number('2'))).toBe(true);
	});

	test('3x/1 === 3x', () => {
		const expr = fraction(implicitMultiply(number('3'), variable('x')), number('1'));
		expect(isEquivalent(expr, implicitMultiply(number('3'), variable('x')))).toBe(true);
	});
});
