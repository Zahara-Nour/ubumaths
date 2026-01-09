/**
 * Tests for the main normalization algorithm
 */

import { describe, test, expect } from 'vitest';
import type { MathNode } from '../../types';
import { normalize } from '../normalize';
import { hashNormalForm, normalFormsEquivalent } from '../hash';

// =============================================================================
// Helper Functions
// =============================================================================

function num(value: string): MathNode {
	return { type: 'number', value };
}

function variable(name: string): MathNode {
	return { type: 'variable', name };
}

function add(left: MathNode, right: MathNode): MathNode {
	return { type: 'addition', left, right };
}

function sub(left: MathNode, right: MathNode): MathNode {
	return { type: 'subtraction', left, right };
}

function mul(left: MathNode, right: MathNode): MathNode {
	return { type: 'multiplication', left, right, displayStyle: 'implicit' };
}

function div(numerator: MathNode, denominator: MathNode): MathNode {
	return { type: 'division', numerator, denominator, displayStyle: 'fraction' };
}

function power(base: MathNode, exponent: MathNode): MathNode {
	return { type: 'superscript', base, superscript: exponent };
}

function opposite(operand: MathNode): MathNode {
	return { type: 'opposite', operand };
}

function sqrt(arg: MathNode): MathNode {
	return { type: 'function', name: 'sqrt', args: [arg] };
}

function greek(letter: string): MathNode {
	return { type: 'greek', letter: letter as 'pi' | 'alpha' };
}

// =============================================================================
// Normalize Constants Tests
// =============================================================================

describe('Normalize Constants', () => {
	test('normalizes 0 to zero form', () => {
		const result = normalize(num('0'));
		expect(result.numerator).toEqual([]);
		expect(result.hash).toBe('0');
	});

	test('normalizes 1 to one form', () => {
		const result = normalize(num('1'));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(0);
	});

	test('normalizes integer', () => {
		const result = normalize(num('5'));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(0);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(5n);
	});

	test('normalizes negative integer', () => {
		const result = normalize(num('-3'));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(-3n);
	});

	test('normalizes decimal', () => {
		const result = normalize(num('0.5'));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(2n);
	});
});

// =============================================================================
// Normalize Variables Tests
// =============================================================================

describe('Normalize Variables', () => {
	test('normalizes single variable', () => {
		const result = normalize(variable('x'));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
		if (result.numerator[0].monomial[0].base.type === 'variable') {
			expect(result.numerator[0].monomial[0].base.name).toBe('x');
		}
	});

	test('normalizes greek letter', () => {
		const result = normalize(greek('pi'));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('greek');
	});
});

// =============================================================================
// Normalize Addition Tests
// =============================================================================

describe('Normalize Addition', () => {
	test('2x + 3x = 5x', () => {
		const node = add(mul(num('2'), variable('x')), mul(num('3'), variable('x')));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(5n);
		expect(result.numerator[0].monomial.length).toBe(1);
	});

	test('x + y stays as x + y', () => {
		const node = add(variable('x'), variable('y'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(2);
	});

	test('x + 0 = x', () => {
		const node = add(variable('x'), num('0'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
	});

	test('0 + x = x', () => {
		const node = add(num('0'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
	});

	test('x + x = 2x', () => {
		const node = add(variable('x'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
	});

	test('3 + 5 = 8', () => {
		const node = add(num('3'), num('5'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(8n);
		expect(result.numerator[0].monomial.length).toBe(0);
	});
});

// =============================================================================
// Normalize Subtraction Tests
// =============================================================================

describe('Normalize Subtraction', () => {
	test('5x - 3x = 2x', () => {
		const node = sub(mul(num('5'), variable('x')), mul(num('3'), variable('x')));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
	});

	test('x - x = 0', () => {
		const node = sub(variable('x'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(0);
	});

	test('5 - 3 = 2', () => {
		const node = sub(num('5'), num('3'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
	});
});

// =============================================================================
// Normalize Multiplication Tests
// =============================================================================

describe('Normalize Multiplication', () => {
	test('2 * 3 = 6', () => {
		const node = mul(num('2'), num('3'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(6n);
	});

	test('2 * x has coefficient 2', () => {
		const node = mul(num('2'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
		expect(result.numerator[0].monomial.length).toBe(1);
	});

	test('x * y has two factors', () => {
		const node = mul(variable('x'), variable('y'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(2);
	});

	test('x * x = x^2', () => {
		const node = mul(variable('x'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].exponent.n).toBe(2n);
	});

	test('0 * x = 0', () => {
		const node = mul(num('0'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(0);
	});

	test('1 * x = x', () => {
		const node = mul(num('1'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(1n);
	});
});

// =============================================================================
// Normalize Division Tests
// =============================================================================

describe('Normalize Division', () => {
	test('x / 1 = x', () => {
		const node = div(variable('x'), num('1'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.denominator.length).toBe(1);
	});

	test('0 / x = 0', () => {
		const node = div(num('0'), variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(0);
	});

	test('x / y has denominator', () => {
		const node = div(variable('x'), variable('y'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.denominator.length).toBe(1);
	});
});

// =============================================================================
// Normalize Power Tests
// =============================================================================

describe('Normalize Power', () => {
	test('x^2 has exponent 2', () => {
		const node = power(variable('x'), num('2'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].exponent.n).toBe(2n);
	});

	test('x^0 = 1', () => {
		const node = power(variable('x'), num('0'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(1n);
		expect(result.numerator[0].monomial.length).toBe(0);
	});

	test('x^1 = x', () => {
		const node = power(variable('x'), num('1'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].exponent.n).toBe(1n);
	});

	test('(a + b)^2 expands correctly', () => {
		const node = power(add(variable('a'), variable('b')), num('2'));
		const result = normalize(node);

		// (a + b)^2 = a^2 + 2ab + b^2
		expect(result.numerator.length).toBe(3);
	});

	test('2^3 = 8', () => {
		const node = power(num('2'), num('3'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(8n);
	});
});

// =============================================================================
// Normalize Negation Tests
// =============================================================================

describe('Normalize Negation', () => {
	test('-x has negative coefficient', () => {
		const node = opposite(variable('x'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(-1n);
	});

	test('-3 = -3', () => {
		const node = opposite(num('3'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(-3n);
	});

	test('-(-x) = x', () => {
		const node = opposite(opposite(variable('x')));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(1n);
	});
});

// =============================================================================
// Normalize Sqrt Tests
// =============================================================================

describe('Normalize Sqrt', () => {
	test('sqrt(4) = 2', () => {
		const node = sqrt(num('4'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
		expect(result.numerator[0].coefficient.terms[0].radicals.length).toBe(0);
	});

	test('sqrt(2) has radical', () => {
		const node = sqrt(num('2'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].radicals.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].radicals[0].radicand).toBe(2n);
	});

	test('sqrt(18) = 3*sqrt(2)', () => {
		const node = sqrt(num('18'));
		const result = normalize(node);

		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(3n);
		expect(result.numerator[0].coefficient.terms[0].radicals[0].radicand).toBe(2n);
	});
});

// =============================================================================
// Equivalence Tests
// =============================================================================

describe('Expression Equivalence', () => {
	test('2x + 3x is equivalent to 5x', () => {
		const a = normalize(add(mul(num('2'), variable('x')), mul(num('3'), variable('x'))));
		const b = normalize(mul(num('5'), variable('x')));

		expect(normalFormsEquivalent(a, b)).toBe(true);
	});

	test('x + y is equivalent to y + x', () => {
		const a = normalize(add(variable('x'), variable('y')));
		const b = normalize(add(variable('y'), variable('x')));

		expect(normalFormsEquivalent(a, b)).toBe(true);
	});

	test('x * y is equivalent to y * x', () => {
		const a = normalize(mul(variable('x'), variable('y')));
		const b = normalize(mul(variable('y'), variable('x')));

		expect(normalFormsEquivalent(a, b)).toBe(true);
	});

	test('(a + b)^2 is equivalent to a^2 + 2ab + b^2', () => {
		const ab2 = power(add(variable('a'), variable('b')), num('2'));
		const expanded = add(
			add(power(variable('a'), num('2')), mul(mul(num('2'), variable('a')), variable('b'))),
			power(variable('b'), num('2'))
		);

		const a = normalize(ab2);
		const b = normalize(expanded);

		expect(normalFormsEquivalent(a, b)).toBe(true);
	});

	// NOTE: Fraction reduction of polynomial quotients is not yet implemented
	// This test documents expected future behavior
	test.skip('6/9 is equivalent to 2/3 (TODO: implement fraction reduction)', () => {
		const a = normalize(div(num('6'), num('9')));
		const b = normalize(div(num('2'), num('3')));

		expect(normalFormsEquivalent(a, b)).toBe(true);
	});

	test('x is not equivalent to y', () => {
		const a = normalize(variable('x'));
		const b = normalize(variable('y'));

		expect(normalFormsEquivalent(a, b)).toBe(false);
	});

	test('x^2 is not equivalent to x^3', () => {
		const a = normalize(power(variable('x'), num('2')));
		const b = normalize(power(variable('x'), num('3')));

		expect(normalFormsEquivalent(a, b)).toBe(false);
	});
});

// =============================================================================
// Hash Tests
// =============================================================================

describe('Expression Hash', () => {
	test('equivalent expressions have same hash', () => {
		const a = normalize(add(mul(num('2'), variable('x')), mul(num('3'), variable('x'))));
		const b = normalize(mul(num('5'), variable('x')));

		expect(hashNormalForm(a)).toBe(hashNormalForm(b));
	});

	test('different expressions have different hash', () => {
		const a = normalize(variable('x'));
		const b = normalize(variable('y'));

		expect(hashNormalForm(a)).not.toBe(hashNormalForm(b));
	});
});

// =============================================================================
// Function Argument Normalization Tests
// =============================================================================

function fn(name: string, ...args: MathNode[]): MathNode {
	return { type: 'function', name, args };
}

function fnWithBase(name: string, base: MathNode, arg: MathNode): MathNode {
	return { type: 'function', name, args: [arg], base };
}

describe('Function Argument Normalization', () => {
	test('sin(x+x) and sin(2x) are equivalent', () => {
		const expr1 = fn('sin', add(variable('x'), variable('x')));
		const expr2 = fn('sin', mul(num('2'), variable('x')));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('cos(2*3) and cos(6) are equivalent', () => {
		const expr1 = fn('cos', mul(num('2'), num('3')));
		const expr2 = fn('cos', num('6'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('sqrt(x+x) and sqrt(2x) are equivalent', () => {
		const expr1 = sqrt(add(variable('x'), variable('x')));
		const expr2 = sqrt(mul(num('2'), variable('x')));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('log base normalization: log_2(4+4) and log_2(8) are equivalent', () => {
		const expr1 = fnWithBase('log', num('2'), add(num('4'), num('4')));
		const expr2 = fnWithBase('log', num('2'), num('8'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('nested function arguments are normalized: sin(cos(x+x)) and sin(cos(2x))', () => {
		const expr1 = fn('sin', fn('cos', add(variable('x'), variable('x'))));
		const expr2 = fn('sin', fn('cos', mul(num('2'), variable('x'))));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('ln(1+1) and ln(2) are equivalent', () => {
		const expr1 = fn('ln', add(num('1'), num('1')));
		const expr2 = fn('ln', num('2'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('tan(x+0) and tan(x) are equivalent', () => {
		const expr1 = fn('tan', add(variable('x'), num('0')));
		const expr2 = fn('tan', variable('x'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).toBe(norm2.hash);
	});

	test('different function arguments produce different hashes', () => {
		const expr1 = fn('sin', variable('x'));
		const expr2 = fn('sin', variable('y'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).not.toBe(norm2.hash);
	});

	test('different functions with same argument produce different hashes', () => {
		const expr1 = fn('sin', variable('x'));
		const expr2 = fn('cos', variable('x'));
		const norm1 = normalize(expr1);
		const norm2 = normalize(expr2);
		expect(norm1.hash).not.toBe(norm2.hash);
	});
});
