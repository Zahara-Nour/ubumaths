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

	test('6/9 is equivalent to 2/3', () => {
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

// =============================================================================
// Transcendental Function Remarkable Values Tests
// =============================================================================

// Helper for π multiples
function piTimes(n: MathNode, d?: MathNode): MathNode {
	if (d) {
		return div(mul(n, greek('pi')), d);
	}
	return mul(n, greek('pi'));
}

describe('Sine Remarkable Values', () => {
	test('sin(0) = 0', () => {
		const result = normalize(fn('sin', num('0')));
		expect(result.hash).toBe('0');
	});

	test('sin(π/6) = 1/2', () => {
		const result = normalize(fn('sin', div(greek('pi'), num('6'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(2n);
	});

	test('sin(π/4) = √2/2', () => {
		const result = normalize(fn('sin', div(greek('pi'), num('4'))));
		// √2/2 is represented as √2 / 2 (fraction form)
		expect(result.numerator.length).toBe(1);
		const numTerm = result.numerator[0].coefficient.terms[0];
		expect(numTerm.rational.n).toBe(1n);
		expect(numTerm.rational.d).toBe(1n);
		expect(numTerm.radicals.length).toBe(1);
		expect(numTerm.radicals[0].radicand).toBe(2n);
		expect(numTerm.radicals[0].index).toBe(2n);
		// Denominator is 2
		expect(result.denominator.length).toBe(1);
		const denTerm = result.denominator[0].coefficient.terms[0];
		expect(denTerm.rational.n).toBe(2n);
		expect(denTerm.rational.d).toBe(1n);
	});

	test('sin(π/3) = √3/2', () => {
		const result = normalize(fn('sin', div(greek('pi'), num('3'))));
		// √3/2 is represented as √3 / 2 (fraction form)
		expect(result.numerator.length).toBe(1);
		const numTerm = result.numerator[0].coefficient.terms[0];
		expect(numTerm.rational.n).toBe(1n);
		expect(numTerm.rational.d).toBe(1n);
		expect(numTerm.radicals.length).toBe(1);
		expect(numTerm.radicals[0].radicand).toBe(3n);
		// Denominator is 2
		expect(result.denominator.length).toBe(1);
		const denTerm = result.denominator[0].coefficient.terms[0];
		expect(denTerm.rational.n).toBe(2n);
	});

	test('sin(π/2) = 1', () => {
		const result = normalize(fn('sin', div(greek('pi'), num('2'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('sin(π) = 0', () => {
		const result = normalize(fn('sin', greek('pi')));
		expect(result.hash).toBe('0');
	});

	test('sin(2π/4) = sin(π/2) = 1 (normalized argument)', () => {
		const result = normalize(fn('sin', div(piTimes(num('2')), num('4'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('sin(3π/2) = -1', () => {
		const result = normalize(fn('sin', div(piTimes(num('3')), num('2'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(-1n);
		expect(coef.d).toBe(1n);
	});

	test('sin(2π) = 0', () => {
		const result = normalize(fn('sin', piTimes(num('2'))));
		expect(result.hash).toBe('0');
	});
});

describe('Cosine Remarkable Values', () => {
	test('cos(0) = 1', () => {
		const result = normalize(fn('cos', num('0')));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('cos(π/6) = √3/2', () => {
		const result = normalize(fn('cos', div(greek('pi'), num('6'))));
		// √3/2 is represented as √3 / 2 (fraction form)
		expect(result.numerator.length).toBe(1);
		const numTerm = result.numerator[0].coefficient.terms[0];
		expect(numTerm.rational.n).toBe(1n);
		expect(numTerm.rational.d).toBe(1n);
		expect(numTerm.radicals.length).toBe(1);
		expect(numTerm.radicals[0].radicand).toBe(3n);
		// Denominator is 2
		expect(result.denominator.length).toBe(1);
		expect(result.denominator[0].coefficient.terms[0].rational.n).toBe(2n);
	});

	test('cos(π/4) = √2/2', () => {
		const result = normalize(fn('cos', div(greek('pi'), num('4'))));
		// √2/2 is represented as √2 / 2 (fraction form)
		expect(result.numerator.length).toBe(1);
		const numTerm = result.numerator[0].coefficient.terms[0];
		expect(numTerm.rational.d).toBe(1n);
		expect(numTerm.radicals.length).toBe(1);
		expect(numTerm.radicals[0].radicand).toBe(2n);
		// Denominator is 2
		expect(result.denominator.length).toBe(1);
		expect(result.denominator[0].coefficient.terms[0].rational.n).toBe(2n);
	});

	test('cos(π/3) = 1/2', () => {
		const result = normalize(fn('cos', div(greek('pi'), num('3'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(2n);
	});

	test('cos(π/2) = 0', () => {
		const result = normalize(fn('cos', div(greek('pi'), num('2'))));
		expect(result.hash).toBe('0');
	});

	test('cos(π) = -1', () => {
		const result = normalize(fn('cos', greek('pi')));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(-1n);
		expect(coef.d).toBe(1n);
	});

	test('cos(2π) = 1', () => {
		const result = normalize(fn('cos', piTimes(num('2'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});
});

describe('Tangent Remarkable Values', () => {
	test('tan(0) = 0', () => {
		const result = normalize(fn('tan', num('0')));
		expect(result.hash).toBe('0');
	});

	test('tan(π/4) = 1', () => {
		const result = normalize(fn('tan', div(greek('pi'), num('4'))));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('tan(π) = 0', () => {
		const result = normalize(fn('tan', greek('pi')));
		expect(result.hash).toBe('0');
	});

	test('tan(2π) = 0', () => {
		const result = normalize(fn('tan', piTimes(num('2'))));
		expect(result.hash).toBe('0');
	});
});

describe('Logarithm Remarkable Values', () => {
	test('ln(1) = 0', () => {
		const result = normalize(fn('ln', num('1')));
		expect(result.hash).toBe('0');
	});

	test('ln(e) = 1', () => {
		const result = normalize(fn('ln', variable('e')));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('log(1) = 0', () => {
		const result = normalize(fn('log', num('1')));
		expect(result.hash).toBe('0');
	});
});

describe('Exponential Remarkable Values', () => {
	test('exp(0) = 1', () => {
		const result = normalize(fn('exp', num('0')));
		expect(result.numerator.length).toBe(1);
		const coef = result.numerator[0].coefficient.terms[0].rational;
		expect(coef.n).toBe(1n);
		expect(coef.d).toBe(1n);
	});

	test('exp(1) = e', () => {
		const result = normalize(fn('exp', num('1')));
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('e');
	});
});

// =============================================================================
// Exp/Ln Composition Tests
// =============================================================================

describe('Exp/Ln Composition Simplification', () => {
	test('exp(ln(x)) = x', () => {
		const expr = fn('exp', fn('ln', variable('x')));
		const result = normalize(expr);
		// Should be just x
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('x');
	});

	test('ln(exp(x)) = x', () => {
		const expr = fn('ln', fn('exp', variable('x')));
		const result = normalize(expr);
		// Should be just x
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect(result.numerator[0].monomial[0].base.type).toBe('variable');
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('x');
	});

	test('exp(ln(2x)) = 2x', () => {
		const expr = fn('exp', fn('ln', mul(num('2'), variable('x'))));
		const result = normalize(expr);
		// Should be 2x
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].coefficient.terms[0].rational.n).toBe(2n);
		expect(result.numerator[0].monomial.length).toBe(1);
	});

	test('ln(exp(x+y)) = x+y', () => {
		const expr = fn('ln', fn('exp', add(variable('x'), variable('y'))));
		const result = normalize(expr);
		// Should be x + y (2 terms)
		expect(result.numerator.length).toBe(2);
	});

	test('exp(ln(x) + 0) = x (with argument normalization)', () => {
		// This tests that canonicalization happens before composition check
		const expr = fn('exp', add(fn('ln', variable('x')), num('0')));
		const result = normalize(expr);
		// Should simplify to x because ln(x) + 0 = ln(x), then exp(ln(x)) = x
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('x');
	});

	test('nested: exp(ln(exp(ln(x)))) = x', () => {
		const expr = fn('exp', fn('ln', fn('exp', fn('ln', variable('x')))));
		const result = normalize(expr);
		// Should simplify to x through recursive simplification
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('x');
	});

	test('ln(exp(ln(exp(x)))) = x', () => {
		const expr = fn('ln', fn('exp', fn('ln', fn('exp', variable('x')))));
		const result = normalize(expr);
		// Should simplify to x through recursive simplification
		expect(result.numerator.length).toBe(1);
		expect(result.numerator[0].monomial.length).toBe(1);
		expect((result.numerator[0].monomial[0].base as { name: string }).name).toBe('x');
	});
});

// =============================================================================
// Logarithm Expansion and Equivalence Tests
// =============================================================================

describe('Logarithm Expansion', () => {
	describe('Integer expansion via prime factorization', () => {
		test('ln(9) = 2·ln(3)', () => {
			const ln9 = fn('ln', num('9'));
			const twoLn3 = mul(num('2'), fn('ln', num('3')));
			expect(normalize(ln9).hash).toBe(normalize(twoLn3).hash);
		});

		test('ln(8) = 3·ln(2)', () => {
			const ln8 = fn('ln', num('8'));
			const threeLn2 = mul(num('3'), fn('ln', num('2')));
			expect(normalize(ln8).hash).toBe(normalize(threeLn2).hash);
		});

		test('ln(12) = 2·ln(2) + ln(3)', () => {
			// 12 = 2² × 3
			const ln12 = fn('ln', num('12'));
			const expanded = add(mul(num('2'), fn('ln', num('2'))), fn('ln', num('3')));
			expect(normalize(ln12).hash).toBe(normalize(expanded).hash);
		});

		test('ln(2) stays as ln(2) (prime)', () => {
			const ln2 = fn('ln', num('2'));
			const result = normalize(ln2);
			// Should be opaque ln(2) function
			expect(result.numerator.length).toBe(1);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('ln(1) = 0', () => {
			const ln1 = fn('ln', num('1'));
			const result = normalize(ln1);
			expect(result.hash).toBe('0');
		});
	});

	describe('Power expansion: ln(x^n) = n·ln(x)', () => {
		test('ln(x^2) = 2·ln(x)', () => {
			const lnX2 = fn('ln', power(variable('x'), num('2')));
			const twoLnX = mul(num('2'), fn('ln', variable('x')));
			expect(normalize(lnX2).hash).toBe(normalize(twoLnX).hash);
		});

		test('ln(x^3) = 3·ln(x)', () => {
			const lnX3 = fn('ln', power(variable('x'), num('3')));
			const threeLnX = mul(num('3'), fn('ln', variable('x')));
			expect(normalize(lnX3).hash).toBe(normalize(threeLnX).hash);
		});

		test('ln(x^1) stays as ln(x) (no expansion needed)', () => {
			const lnX = fn('ln', variable('x'));
			const result = normalize(lnX);
			// Should be opaque ln(x)
			expect(result.numerator.length).toBe(1);
		});
	});

	describe('Product expansion: ln(a·b) = ln(a) + ln(b)', () => {
		test('ln(x·y) = ln(x) + ln(y)', () => {
			const lnXY = fn('ln', mul(variable('x'), variable('y')));
			const lnXPlusLnY = add(fn('ln', variable('x')), fn('ln', variable('y')));
			expect(normalize(lnXY).hash).toBe(normalize(lnXPlusLnY).hash);
		});

		test('ln(x·y·z) = ln(x) + ln(y) + ln(z)', () => {
			const lnXYZ = fn('ln', mul(mul(variable('x'), variable('y')), variable('z')));
			const expanded = add(
				add(fn('ln', variable('x')), fn('ln', variable('y'))),
				fn('ln', variable('z'))
			);
			expect(normalize(lnXYZ).hash).toBe(normalize(expanded).hash);
		});
	});

	describe('Division expansion: ln(a/b) = ln(a) - ln(b)', () => {
		test('ln(x/y) = ln(x) - ln(y)', () => {
			const lnXOverY = fn('ln', div(variable('x'), variable('y')));
			const lnXMinusLnY = sub(fn('ln', variable('x')), fn('ln', variable('y')));
			expect(normalize(lnXOverY).hash).toBe(normalize(lnXMinusLnY).hash);
		});

		test('ln(8/27) = 3·ln(2) - 3·ln(3)', () => {
			// 8 = 2³, 27 = 3³
			const ln8Over27 = fn('ln', div(num('8'), num('27')));
			const expanded = sub(mul(num('3'), fn('ln', num('2'))), mul(num('3'), fn('ln', num('3'))));
			expect(normalize(ln8Over27).hash).toBe(normalize(expanded).hash);
		});
	});

	describe('Combined cases', () => {
		test('ln(x^2·y) = 2·ln(x) + ln(y)', () => {
			const expr = fn('ln', mul(power(variable('x'), num('2')), variable('y')));
			const expanded = add(mul(num('2'), fn('ln', variable('x'))), fn('ln', variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expanded).hash);
		});

		test('exp(ln(x)) still works after expansion changes', () => {
			// Verify that exp(ln(x)) = x still works
			const expr = fn('exp', fn('ln', variable('x')));
			const result = normalize(expr);
			expect(result.numerator.length).toBe(1);
			expect(result.numerator[0].monomial[0].base.type).toBe('variable');
		});

		test('exp(ln(9)) = 9 (composition before ln expansion)', () => {
			// Critical: exp(ln(9)) should simplify to 9, not stay as exp(2·ln(3))
			const expr = fn('exp', fn('ln', num('9')));
			expect(normalize(expr).hash).toBe(normalize(num('9')).hash);
		});

		test('exp(ln(12)) = 12', () => {
			const expr = fn('exp', fn('ln', num('12')));
			expect(normalize(expr).hash).toBe(normalize(num('12')).hash);
		});
	});
});

// =============================================================================
// Comprehensive Edge Cases for Exp/Ln Interactions After Ln Expansion
// =============================================================================

describe('Exp/Ln Robustness After Ln Expansion Changes', () => {
	describe('exp(ln(...)) must simplify BEFORE ln expansion triggers', () => {
		test('exp(ln(x)) = x (variable)', () => {
			const expr = fn('exp', fn('ln', variable('x')));
			const expected = variable('x');
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(2)) = 2 (prime - no expansion)', () => {
			const expr = fn('exp', fn('ln', num('2')));
			expect(normalize(expr).hash).toBe(normalize(num('2')).hash);
		});

		test('exp(ln(4)) = 4 (would expand to 2·ln(2))', () => {
			const expr = fn('exp', fn('ln', num('4')));
			expect(normalize(expr).hash).toBe(normalize(num('4')).hash);
		});

		test('exp(ln(8)) = 8 (would expand to 3·ln(2))', () => {
			const expr = fn('exp', fn('ln', num('8')));
			expect(normalize(expr).hash).toBe(normalize(num('8')).hash);
		});

		test('exp(ln(100)) = 100 (would expand to 2·ln(2) + 2·ln(5))', () => {
			const expr = fn('exp', fn('ln', num('100')));
			expect(normalize(expr).hash).toBe(normalize(num('100')).hash);
		});

		test('exp(ln(x^2)) = x^2 (would expand to 2·ln(x))', () => {
			const expr = fn('exp', fn('ln', power(variable('x'), num('2'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x^3)) = x^3 (would expand to 3·ln(x))', () => {
			const expr = fn('exp', fn('ln', power(variable('x'), num('3'))));
			const expected = power(variable('x'), num('3'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x*y)) = x*y (would expand to ln(x)+ln(y))', () => {
			const expr = fn('exp', fn('ln', mul(variable('x'), variable('y'))));
			const expected = mul(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x/y)) = x/y (would expand to ln(x)-ln(y))', () => {
			const expr = fn('exp', fn('ln', div(variable('x'), variable('y'))));
			const expected = div(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(8/27)) = 8/27 (fraction with expandable integers)', () => {
			const expr = fn('exp', fn('ln', div(num('8'), num('27'))));
			const expected = div(num('8'), num('27'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('ln(exp(...)) must also work correctly', () => {
		test('ln(exp(x)) = x', () => {
			const expr = fn('ln', fn('exp', variable('x')));
			expect(normalize(expr).hash).toBe(normalize(variable('x')).hash);
		});

		test('ln(exp(9)) = 9', () => {
			const expr = fn('ln', fn('exp', num('9')));
			expect(normalize(expr).hash).toBe(normalize(num('9')).hash);
		});

		test('ln(exp(x+y)) = x+y', () => {
			const expr = fn('ln', fn('exp', add(variable('x'), variable('y'))));
			const expected = add(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x^2)) = x^2', () => {
			const expr = fn('ln', fn('exp', power(variable('x'), num('2'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Deeply nested exp/ln combinations', () => {
		test('exp(ln(exp(ln(x)))) = x', () => {
			const expr = fn('exp', fn('ln', fn('exp', fn('ln', variable('x')))));
			expect(normalize(expr).hash).toBe(normalize(variable('x')).hash);
		});

		test('ln(exp(ln(exp(x)))) = x', () => {
			const expr = fn('ln', fn('exp', fn('ln', fn('exp', variable('x')))));
			expect(normalize(expr).hash).toBe(normalize(variable('x')).hash);
		});

		test('exp(ln(exp(ln(9)))) = 9', () => {
			const expr = fn('exp', fn('ln', fn('exp', fn('ln', num('9')))));
			expect(normalize(expr).hash).toBe(normalize(num('9')).hash);
		});

		test('ln(exp(ln(exp(8)))) = 8', () => {
			const expr = fn('ln', fn('exp', fn('ln', fn('exp', num('8')))));
			expect(normalize(expr).hash).toBe(normalize(num('8')).hash);
		});
	});

	describe('Special values and boundaries', () => {
		test('exp(ln(1)) = 1 (ln(1)=0, but exp(ln(1)) should short-circuit)', () => {
			const expr = fn('exp', fn('ln', num('1')));
			expect(normalize(expr).hash).toBe(normalize(num('1')).hash);
		});

		test('ln(exp(0)) = 0', () => {
			const expr = fn('ln', fn('exp', num('0')));
			expect(normalize(expr).hash).toBe(normalize(num('0')).hash);
		});

		test('exp(ln(e)) = e', () => {
			const expr = fn('exp', fn('ln', variable('e')));
			expect(normalize(expr).hash).toBe(normalize(variable('e')).hash);
		});

		test('ln(exp(1)) = 1', () => {
			const expr = fn('ln', fn('exp', num('1')));
			expect(normalize(expr).hash).toBe(normalize(num('1')).hash);
		});
	});

	describe('Ln expansion algebraic consistency', () => {
		test('ln(9) + ln(3) = 3·ln(3) (2·ln(3) + ln(3))', () => {
			const left = add(fn('ln', num('9')), fn('ln', num('3')));
			const right = mul(num('3'), fn('ln', num('3')));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('ln(9) - ln(3) = ln(3) (2·ln(3) - ln(3))', () => {
			const left = sub(fn('ln', num('9')), fn('ln', num('3')));
			const right = fn('ln', num('3'));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('2·ln(9) = 4·ln(3)', () => {
			const left = mul(num('2'), fn('ln', num('9')));
			const right = mul(num('4'), fn('ln', num('3')));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('ln(4) + ln(9) = 2·ln(2) + 2·ln(3) = ln(36)', () => {
			const sum = add(fn('ln', num('4')), fn('ln', num('9')));
			const ln36 = fn('ln', num('36'));
			expect(normalize(sum).hash).toBe(normalize(ln36).hash);
		});

		test('ln(8) - ln(4) = 3·ln(2) - 2·ln(2) = ln(2)', () => {
			const diff = sub(fn('ln', num('8')), fn('ln', num('4')));
			const ln2 = fn('ln', num('2'));
			expect(normalize(diff).hash).toBe(normalize(ln2).hash);
		});

		test('ln(2) + ln(3) = ln(6)', () => {
			const sum = add(fn('ln', num('2')), fn('ln', num('3')));
			const ln6 = fn('ln', num('6'));
			expect(normalize(sum).hash).toBe(normalize(ln6).hash);
		});

		test('ln(x) + ln(y) = ln(x·y) (symbolic)', () => {
			const sum = add(fn('ln', variable('x')), fn('ln', variable('y')));
			const lnProd = fn('ln', mul(variable('x'), variable('y')));
			expect(normalize(sum).hash).toBe(normalize(lnProd).hash);
		});

		test('ln(x) - ln(y) = ln(x/y) (symbolic)', () => {
			const diff = sub(fn('ln', variable('x')), fn('ln', variable('y')));
			const lnDiv = fn('ln', div(variable('x'), variable('y')));
			expect(normalize(diff).hash).toBe(normalize(lnDiv).hash);
		});

		test('2·ln(x) = ln(x^2) (symbolic)', () => {
			const left = mul(num('2'), fn('ln', variable('x')));
			const right = fn('ln', power(variable('x'), num('2')));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('3·ln(2) = ln(8)', () => {
			const left = mul(num('3'), fn('ln', num('2')));
			const right = fn('ln', num('8'));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});
	});

	describe('Operations with exp(ln(...)) results', () => {
		test('exp(ln(x)) + exp(ln(y)) = x + y', () => {
			const left = add(fn('exp', fn('ln', variable('x'))), fn('exp', fn('ln', variable('y'))));
			const right = add(variable('x'), variable('y'));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('exp(ln(x)) * exp(ln(y)) = x * y', () => {
			const left = mul(fn('exp', fn('ln', variable('x'))), fn('exp', fn('ln', variable('y'))));
			const right = mul(variable('x'), variable('y'));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('exp(ln(x)) / exp(ln(y)) = x / y', () => {
			const left = div(fn('exp', fn('ln', variable('x'))), fn('exp', fn('ln', variable('y'))));
			const right = div(variable('x'), variable('y'));
			expect(normalize(left).hash).toBe(normalize(right).hash);
		});

		test('exp(ln(4)) + exp(ln(5)) = 9', () => {
			const left = add(fn('exp', fn('ln', num('4'))), fn('exp', fn('ln', num('5'))));
			expect(normalize(left).hash).toBe(normalize(num('9')).hash);
		});

		test('exp(ln(6)) * exp(ln(7)) = 42', () => {
			const left = mul(fn('exp', fn('ln', num('6'))), fn('exp', fn('ln', num('7'))));
			expect(normalize(left).hash).toBe(normalize(num('42')).hash);
		});
	});

	describe('Edge cases that should NOT simplify (stay opaque)', () => {
		test('exp(2·ln(x)) stays opaque (not x^2 - future feature)', () => {
			const expr = fn('exp', mul(num('2'), fn('ln', variable('x'))));
			// Should be opaque, not equal to x^2
			const x2 = power(variable('x'), num('2'));
			expect(normalize(expr).hash).not.toBe(normalize(x2).hash);
		});

		test('exp(ln(x) + ln(y)) stays opaque (not x*y - future feature)', () => {
			const expr = fn('exp', add(fn('ln', variable('x')), fn('ln', variable('y'))));
			// Should be opaque, not equal to x*y
			const xy = mul(variable('x'), variable('y'));
			expect(normalize(expr).hash).not.toBe(normalize(xy).hash);
		});

		test('ln(x+y) stays opaque (cannot expand sum)', () => {
			const expr = fn('ln', add(variable('x'), variable('y')));
			const result = normalize(expr);
			// Should be single opaque term
			expect(result.numerator.length).toBe(1);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('ln(-x) stays opaque (negative argument)', () => {
			const expr = fn('ln', opposite(variable('x')));
			const result = normalize(expr);
			expect(result.numerator.length).toBe(1);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});
	});

	describe('Large integers near factorization limit', () => {
		test('ln(999983) stays opaque (prime near limit)', () => {
			// 999983 is a prime number
			const expr = fn('ln', num('999983'));
			const result = normalize(expr);
			// Should be opaque ln(999983), not expanded
			expect(result.numerator.length).toBe(1);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('ln(1000000) expands (at limit: 2^6 * 5^6)', () => {
			const expr = fn('ln', num('1000000'));
			const expanded = add(mul(num('6'), fn('ln', num('2'))), mul(num('6'), fn('ln', num('5'))));
			expect(normalize(expr).hash).toBe(normalize(expanded).hash);
		});

		test('exp(ln(999999)) = 999999 (just under limit)', () => {
			const expr = fn('exp', fn('ln', num('999999')));
			expect(normalize(expr).hash).toBe(normalize(num('999999')).hash);
		});
	});
});
