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

// =============================================================================
// exp(linear combination of ln) = product of powers
// =============================================================================

describe('exp(Σ aᵢ·ln(xᵢ)) = Π xᵢ^aᵢ', () => {
	describe('Basic scalar multiples', () => {
		test('exp(2·ln(x)) = x²', () => {
			const expr = fn('exp', mul(num('2'), fn('ln', variable('x'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(3·ln(x)) = x³', () => {
			const expr = fn('exp', mul(num('3'), fn('ln', variable('x'))));
			const expected = power(variable('x'), num('3'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-ln(x)) = 1/x', () => {
			const expr = fn('exp', opposite(fn('ln', variable('x'))));
			const expected = div(num('1'), variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-2·ln(x)) = 1/x²', () => {
			const expr = fn('exp', mul(num('-2'), fn('ln', variable('x'))));
			const expected = div(num('1'), power(variable('x'), num('2')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Sums of logarithms', () => {
		test('exp(ln(x) + ln(y)) = x·y', () => {
			const expr = fn('exp', add(fn('ln', variable('x')), fn('ln', variable('y'))));
			const expected = mul(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2·ln(x) + 3·ln(y)) = x²·y³', () => {
			const expr = fn(
				'exp',
				add(mul(num('2'), fn('ln', variable('x'))), mul(num('3'), fn('ln', variable('y'))))
			);
			const expected = mul(power(variable('x'), num('2')), power(variable('y'), num('3')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x) + ln(y) + ln(z)) = x·y·z', () => {
			const expr = fn(
				'exp',
				add(add(fn('ln', variable('x')), fn('ln', variable('y'))), fn('ln', variable('z')))
			);
			const expected = mul(mul(variable('x'), variable('y')), variable('z'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Differences of logarithms', () => {
		test('exp(ln(x) - ln(y)) = x/y', () => {
			const expr = fn('exp', sub(fn('ln', variable('x')), fn('ln', variable('y'))));
			const expected = div(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(3·ln(x) - 2·ln(y)) = x³/y²', () => {
			const expr = fn(
				'exp',
				sub(mul(num('3'), fn('ln', variable('x'))), mul(num('2'), fn('ln', variable('y'))))
			);
			const expected = div(power(variable('x'), num('3')), power(variable('y'), num('2')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('With numeric arguments', () => {
		test('exp(3·ln(2)) = 8', () => {
			const expr = fn('exp', mul(num('3'), fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe(normalize(num('8')).hash);
		});

		test('exp(2·ln(3)) = 9', () => {
			const expr = fn('exp', mul(num('2'), fn('ln', num('3'))));
			expect(normalize(expr).hash).toBe(normalize(num('9')).hash);
		});

		test('exp(ln(2) + ln(3)) = 6', () => {
			const expr = fn('exp', add(fn('ln', num('2')), fn('ln', num('3'))));
			expect(normalize(expr).hash).toBe(normalize(num('6')).hash);
		});

		test('exp(ln(2) - ln(3)) = 2/3', () => {
			const expr = fn('exp', sub(fn('ln', num('2')), fn('ln', num('3'))));
			expect(normalize(expr).hash).toBe(normalize(div(num('2'), num('3'))).hash);
		});
	});

	describe('Round-trip with ln expansion', () => {
		test('exp(ln(x²)) = x² via direct path', () => {
			// exp(ln(x²)) uses the direct exp(ln(something)) = something path
			const expr = fn('exp', fn('ln', power(variable('x'), num('2'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x·y)) = x·y via direct path', () => {
			const expr = fn('exp', fn('ln', mul(variable('x'), variable('y'))));
			const expected = mul(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln then exp of x² via expansion path', () => {
			// 2·ln(x) is the expanded form of ln(x²)
			// exp(2·ln(x)) should give x²
			const expanded = mul(num('2'), fn('ln', variable('x')));
			const expr = fn('exp', expanded);
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Complex expressions inside ln', () => {
		test('exp(ln(x+1)) = x+1', () => {
			const expr = fn('exp', fn('ln', add(variable('x'), num('1'))));
			const expected = add(variable('x'), num('1'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2·ln(x+1)) = (x+1)²', () => {
			const expr = fn('exp', mul(num('2'), fn('ln', add(variable('x'), num('1')))));
			const expected = power(add(variable('x'), num('1')), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Cases that should stay opaque', () => {
		test('exp(ln(x) + 1) stays opaque (mixed ln and non-ln terms)', () => {
			// With combination approach: no partial ln extraction, stays opaque
			const expr = fn('exp', add(fn('ln', variable('x')), num('1')));
			const result = normalize(expr);
			// Should be opaque exp(ln(x) + 1)
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(ln(x)·ln(y)) stays opaque (product of logs)', () => {
			const expr = fn('exp', mul(fn('ln', variable('x')), fn('ln', variable('y'))));
			const result = normalize(expr);
			// Should be opaque
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(ln(x)²) stays opaque (squared log)', () => {
			const expr = fn('exp', power(fn('ln', variable('x')), num('2')));
			const result = normalize(expr);
			// Should be opaque
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(x·ln(y)) stays opaque (variable coefficient)', () => {
			const expr = fn('exp', mul(variable('x'), fn('ln', variable('y'))));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(sqrt(2)·ln(x)) stays opaque (irrational coefficient)', () => {
			const expr = fn('exp', mul(fn('sqrt', num('2')), fn('ln', variable('x'))));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});
	});

	describe('Edge cases - Zero and identity', () => {
		test('exp(0·ln(x)) = 1 (zero coefficient)', () => {
			const expr = fn('exp', mul(num('0'), fn('ln', variable('x'))));
			expect(normalize(expr).hash).toBe(normalize(num('1')).hash);
		});

		test('exp(1·ln(x)) = x (identity coefficient)', () => {
			const expr = fn('exp', mul(num('1'), fn('ln', variable('x'))));
			expect(normalize(expr).hash).toBe(normalize(variable('x')).hash);
		});

		test('exp(ln(x) - ln(x)) = 1 (self-cancellation)', () => {
			const expr = fn('exp', sub(fn('ln', variable('x')), fn('ln', variable('x'))));
			expect(normalize(expr).hash).toBe(normalize(num('1')).hash);
		});

		test('exp(2·ln(x) - 2·ln(x)) = 1', () => {
			const expr = fn(
				'exp',
				sub(mul(num('2'), fn('ln', variable('x'))), mul(num('2'), fn('ln', variable('x'))))
			);
			expect(normalize(expr).hash).toBe(normalize(num('1')).hash);
		});
	});

	describe('Edge cases - Large coefficients', () => {
		test('exp(10·ln(x)) = x^10', () => {
			const expr = fn('exp', mul(num('10'), fn('ln', variable('x'))));
			const expected = power(variable('x'), num('10'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-10·ln(x)) = 1/x^10', () => {
			const expr = fn('exp', mul(num('-10'), fn('ln', variable('x'))));
			const expected = div(num('1'), power(variable('x'), num('10')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(4·ln(2)) = 16', () => {
			const expr = fn('exp', mul(num('4'), fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe(normalize(num('16')).hash);
		});

		test('exp(5·ln(2)) = 32', () => {
			const expr = fn('exp', mul(num('5'), fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe(normalize(num('32')).hash);
		});
	});

	describe('Edge cases - All negative coefficients', () => {
		test('exp(-ln(x) - ln(y)) = 1/(x·y)', () => {
			const expr = fn('exp', sub(opposite(fn('ln', variable('x'))), fn('ln', variable('y'))));
			const expected = div(num('1'), mul(variable('x'), variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-2·ln(x) - 3·ln(y)) = 1/(x²·y³)', () => {
			const expr = fn(
				'exp',
				sub(mul(num('-2'), fn('ln', variable('x'))), mul(num('3'), fn('ln', variable('y'))))
			);
			const expected = div(
				num('1'),
				mul(power(variable('x'), num('2')), power(variable('y'), num('3')))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Edge cases - Complex numeric results', () => {
		test('exp(ln(3) - 2·ln(2)) = 3/4', () => {
			const expr = fn('exp', sub(fn('ln', num('3')), mul(num('2'), fn('ln', num('2')))));
			expect(normalize(expr).hash).toBe(normalize(div(num('3'), num('4'))).hash);
		});

		test('exp(2·ln(3) - ln(2)) = 9/2', () => {
			const expr = fn('exp', sub(mul(num('2'), fn('ln', num('3'))), fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe(normalize(div(num('9'), num('2'))).hash);
		});

		test('exp(ln(2) + ln(3) + ln(5)) = 30', () => {
			const expr = fn('exp', add(add(fn('ln', num('2')), fn('ln', num('3'))), fn('ln', num('5'))));
			expect(normalize(expr).hash).toBe(normalize(num('30')).hash);
		});

		test('exp(ln(2) - ln(3) - ln(5)) = 2/15', () => {
			const expr = fn('exp', sub(sub(fn('ln', num('2')), fn('ln', num('3'))), fn('ln', num('5'))));
			expect(normalize(expr).hash).toBe(normalize(div(num('2'), num('15'))).hash);
		});
	});

	describe('Edge cases - Many terms', () => {
		test('exp(ln(a) + ln(b) + ln(c) + ln(d)) = a·b·c·d', () => {
			const expr = fn(
				'exp',
				add(
					add(add(fn('ln', variable('a')), fn('ln', variable('b'))), fn('ln', variable('c'))),
					fn('ln', variable('d'))
				)
			);
			const expected = mul(mul(mul(variable('a'), variable('b')), variable('c')), variable('d'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(a) - ln(b) + ln(c) - ln(d)) = (a·c)/(b·d)', () => {
			const expr = fn(
				'exp',
				sub(
					add(sub(fn('ln', variable('a')), fn('ln', variable('b'))), fn('ln', variable('c'))),
					fn('ln', variable('d'))
				)
			);
			const expected = div(mul(variable('a'), variable('c')), mul(variable('b'), variable('d')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2·ln(a) + 3·ln(b) - ln(c) - 2·ln(d)) = (a²·b³)/(c·d²)', () => {
			const expr = fn(
				'exp',
				sub(
					sub(
						add(mul(num('2'), fn('ln', variable('a'))), mul(num('3'), fn('ln', variable('b')))),
						fn('ln', variable('c'))
					),
					mul(num('2'), fn('ln', variable('d')))
				)
			);
			const expected = div(
				mul(power(variable('a'), num('2')), power(variable('b'), num('3'))),
				mul(variable('c'), power(variable('d'), num('2')))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Edge cases - Nested and expanded forms', () => {
		test('exp(ln(x³)) = x³ via direct path', () => {
			const expr = fn('exp', fn('ln', power(variable('x'), num('3'))));
			const expected = power(variable('x'), num('3'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x/y)) = x/y via direct path', () => {
			const expr = fn('exp', fn('ln', div(variable('x'), variable('y'))));
			const expected = div(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln((x+1)²)) = (x+1)² via direct path', () => {
			const xPlus1Squared = power(add(variable('x'), num('1')), num('2'));
			const expr = fn('exp', fn('ln', xPlus1Squared));
			expect(normalize(expr).hash).toBe(normalize(xPlus1Squared).hash);
		});

		test('exp(ln(x) + ln(x)) = x² (same base twice)', () => {
			const expr = fn('exp', add(fn('ln', variable('x')), fn('ln', variable('x'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(3·ln(x) + 2·ln(x)) = x⁵ (same base with different coefficients)', () => {
			const expr = fn(
				'exp',
				add(mul(num('3'), fn('ln', variable('x'))), mul(num('2'), fn('ln', variable('x'))))
			);
			const expected = power(variable('x'), num('5'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Edge cases - Equivalence with manual expansion', () => {
		test('exp(ln(8)) = exp(3·ln(2)) = 8', () => {
			const expr1 = fn('exp', fn('ln', num('8')));
			const expr2 = fn('exp', mul(num('3'), fn('ln', num('2'))));
			expect(normalize(expr1).hash).toBe(normalize(num('8')).hash);
			expect(normalize(expr2).hash).toBe(normalize(num('8')).hash);
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(ln(x²·y)) = x²·y via both paths', () => {
			// Direct path
			const expr1 = fn('exp', fn('ln', mul(power(variable('x'), num('2')), variable('y'))));
			// Expansion path: 2·ln(x) + ln(y)
			const expr2 = fn('exp', add(mul(num('2'), fn('ln', variable('x'))), fn('ln', variable('y'))));
			const expected = mul(power(variable('x'), num('2')), variable('y'));
			expect(normalize(expr1).hash).toBe(normalize(expected).hash);
			expect(normalize(expr2).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x/y²)) = x/y² via both paths', () => {
			// Direct path
			const expr1 = fn('exp', fn('ln', div(variable('x'), power(variable('y'), num('2')))));
			// Expansion path: ln(x) - 2·ln(y)
			const expr2 = fn('exp', sub(fn('ln', variable('x')), mul(num('2'), fn('ln', variable('y')))));
			const expected = div(variable('x'), power(variable('y'), num('2')));
			expect(normalize(expr1).hash).toBe(normalize(expected).hash);
			expect(normalize(expr2).hash).toBe(normalize(expected).hash);
		});
	});

	describe('Edge cases - Special expressions', () => {
		test('exp(-ln(2)) = 1/2', () => {
			const expr = fn('exp', opposite(fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe(normalize(div(num('1'), num('2'))).hash);
		});

		test('exp(-ln(x+1)) = 1/(x+1)', () => {
			const expr = fn('exp', opposite(fn('ln', add(variable('x'), num('1')))));
			const expected = div(num('1'), add(variable('x'), num('1')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(a·b) - ln(c·d)) = (a·b)/(c·d) via direct path', () => {
			const ab = mul(variable('a'), variable('b'));
			const cd = mul(variable('c'), variable('d'));
			const expr = fn('exp', fn('ln', div(ab, cd)));
			const expected = div(ab, cd);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});
});

// =============================================================================
// Exp Expansion Rules Tests
// =============================================================================

describe('exp expansion rules', () => {
	describe('sum expansion: exp(a+b) = exp(a)·exp(b)', () => {
		test('exp(x + y) = exp(x)·exp(y)', () => {
			const expr = fn('exp', add(variable('x'), variable('y')));
			const expected = mul(fn('exp', variable('x')), fn('exp', variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x + y + z) = exp(x)·exp(y)·exp(z)', () => {
			const expr = fn('exp', add(add(variable('x'), variable('y')), variable('z')));
			const expected = mul(
				mul(fn('exp', variable('x')), fn('exp', variable('y'))),
				fn('exp', variable('z'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x - y) = exp(x)/exp(y)', () => {
			const expr = fn('exp', sub(variable('x'), variable('y')));
			const expected = div(fn('exp', variable('x')), fn('exp', variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2x + 3y) = exp(x)²·exp(y)³', () => {
			const expr = fn('exp', add(mul(num('2'), variable('x')), mul(num('3'), variable('y'))));
			const expected = mul(
				power(fn('exp', variable('x')), num('2')),
				power(fn('exp', variable('y')), num('3'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(a + b + c + d) expands to product of 4 exp', () => {
			const expr = fn(
				'exp',
				add(add(add(variable('a'), variable('b')), variable('c')), variable('d'))
			);
			const expected = mul(
				mul(mul(fn('exp', variable('a')), fn('exp', variable('b'))), fn('exp', variable('c'))),
				fn('exp', variable('d'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('coefficient extraction: exp(n·a) = exp(a)^n', () => {
		test('exp(2x) = exp(x)²', () => {
			const expr = fn('exp', mul(num('2'), variable('x')));
			const expected = power(fn('exp', variable('x')), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(3x) = exp(x)³', () => {
			const expr = fn('exp', mul(num('3'), variable('x')));
			const expected = power(fn('exp', variable('x')), num('3'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-x) = 1/exp(x)', () => {
			const expr = fn('exp', opposite(variable('x')));
			const expected = div(num('1'), fn('exp', variable('x')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-2x) = 1/exp(x)²', () => {
			const expr = fn('exp', mul(num('-2'), variable('x')));
			const expected = div(num('1'), power(fn('exp', variable('x')), num('2')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x/2) = exp(x)^(1/2)', () => {
			const expr = fn('exp', div(variable('x'), num('2')));
			const expected = power(fn('exp', variable('x')), div(num('1'), num('2')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp((2/3)·x) = exp(x)^(2/3)', () => {
			const expr = fn('exp', mul(div(num('2'), num('3')), variable('x')));
			const expected = power(fn('exp', variable('x')), div(num('2'), num('3')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp((-3/2)·x) = 1/exp(x)^(3/2)', () => {
			const expr = fn('exp', mul(div(num('-3'), num('2')), variable('x')));
			const expected = div(num('1'), power(fn('exp', variable('x')), div(num('3'), num('2'))));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(5) remains as exp(5) (no variable to extract)', () => {
			const expr = fn('exp', num('5'));
			const norm = normalize(expr);
			// Should be opaque exp(5), not expanded
			expect(norm.numerator.length).toBe(1);
			expect(norm.numerator[0].monomial.length).toBe(1);
		});
	});

	describe('composition preservation: ln(exp(...)) = ...', () => {
		test('ln(exp(x + y)) = x + y (direct composition)', () => {
			const expr = fn('ln', fn('exp', add(variable('x'), variable('y'))));
			const expected = add(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x)·exp(y)) = x + y (via ln product)', () => {
			const expr = fn('ln', mul(fn('exp', variable('x')), fn('exp', variable('y'))));
			const expected = add(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x)²) = 2x (via ln power)', () => {
			const expr = fn('ln', power(fn('exp', variable('x')), num('2')));
			const expected = mul(num('2'), variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(2x + 3y)) = 2x + 3y (direct composition)', () => {
			const expr = fn(
				'ln',
				fn('exp', add(mul(num('2'), variable('x')), mul(num('3'), variable('y'))))
			);
			const expected = add(mul(num('2'), variable('x')), mul(num('3'), variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x)²·exp(y)³) = 2x + 3y (roundtrip)', () => {
			const expr = fn(
				'ln',
				mul(power(fn('exp', variable('x')), num('2')), power(fn('exp', variable('y')), num('3')))
			);
			const expected = add(mul(num('2'), variable('x')), mul(num('3'), variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('mixed cases: exp with ln terms (combination approach)', () => {
		// NOTE: With combination approach, partial ln extraction is NOT performed.
		// exp(ln(x) + y) stays opaque, it does NOT simplify to x·exp(y)
		test('exp(ln(x) + y) stays opaque (no partial ln extraction)', () => {
			const expr = fn('exp', add(fn('ln', variable('x')), variable('y')));
			const result = normalize(expr);
			// Should stay as opaque exp(...)
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(2·ln(x) + y) stays opaque (no partial ln extraction)', () => {
			const expr = fn('exp', add(mul(num('2'), fn('ln', variable('x'))), variable('y')));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(ln(x) + ln(y) + z) stays opaque (no partial ln extraction)', () => {
			const expr = fn(
				'exp',
				add(add(fn('ln', variable('x')), fn('ln', variable('y'))), variable('z'))
			);
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(x + 0) = exp(x)', () => {
			const expr = fn('exp', add(variable('x'), num('0')));
			const expected = fn('exp', variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x - x) = 1', () => {
			const expr = fn('exp', sub(variable('x'), variable('x')));
			const expected = num('1');
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2x - x) = exp(x)', () => {
			const expr = fn('exp', sub(mul(num('2'), variable('x')), variable('x')));
			const expected = fn('exp', variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases - should remain opaque or handle correctly', () => {
		test('exp(x/y) stays as single exp (fraction in argument)', () => {
			const expr = fn('exp', div(variable('x'), variable('y')));
			const norm = normalize(expr);
			// Should remain as opaque exp(x/y), not expanded
			expect(norm.numerator.length).toBe(1);
			expect(norm.numerator[0].monomial.length).toBe(1);
		});

		test('exp(√2·x) stays opaque (irrational coefficient)', () => {
			const expr = fn('exp', mul(sqrt(num('2')), variable('x')));
			const norm = normalize(expr);
			// Cannot extract √2 as rational exponent
			expect(norm.numerator.length).toBe(1);
		});

		test('exp(x·y) stays opaque (product of variables)', () => {
			const expr = fn('exp', mul(variable('x'), variable('y')));
			const norm = normalize(expr);
			// x·y is a single term, not a sum, coefficient is 1
			expect(norm.numerator.length).toBe(1);
		});

		test('exp(x²) stays opaque (single term with power)', () => {
			const expr = fn('exp', power(variable('x'), num('2')));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
		});
	});

	describe('equivalence: different forms of same expression', () => {
		test('exp(x+y) and exp(y+x) are equivalent', () => {
			const expr1 = fn('exp', add(variable('x'), variable('y')));
			const expr2 = fn('exp', add(variable('y'), variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)·exp(y) and exp(y)·exp(x) are equivalent', () => {
			const expr1 = mul(fn('exp', variable('x')), fn('exp', variable('y')));
			const expr2 = mul(fn('exp', variable('y')), fn('exp', variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(2x) and exp(x+x) are equivalent', () => {
			const expr1 = fn('exp', mul(num('2'), variable('x')));
			const expr2 = fn('exp', add(variable('x'), variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)² and exp(x)·exp(x) are equivalent', () => {
			const expr1 = power(fn('exp', variable('x')), num('2'));
			const expr2 = mul(fn('exp', variable('x')), fn('exp', variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	describe('edge cases: large and small coefficients', () => {
		test('exp(10x) = exp(x)^10', () => {
			const expr = fn('exp', mul(num('10'), variable('x')));
			const expected = power(fn('exp', variable('x')), num('10'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-10x) = 1/exp(x)^10', () => {
			const expr = fn('exp', mul(num('-10'), variable('x')));
			const expected = div(num('1'), power(fn('exp', variable('x')), num('10')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(100x) = exp(x)^100', () => {
			const expr = fn('exp', mul(num('100'), variable('x')));
			const expected = power(fn('exp', variable('x')), num('100'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x/10) = exp(x)^(1/10)', () => {
			const expr = fn('exp', div(variable('x'), num('10')));
			const expected = power(fn('exp', variable('x')), div(num('1'), num('10')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x/100) = exp(x)^(1/100)', () => {
			const expr = fn('exp', div(variable('x'), num('100')));
			const expected = power(fn('exp', variable('x')), div(num('1'), num('100')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp((7/11)x) = exp(x)^(7/11)', () => {
			const expr = fn('exp', mul(div(num('7'), num('11')), variable('x')));
			const expected = power(fn('exp', variable('x')), div(num('7'), num('11')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp((-5/7)x) = 1/exp(x)^(5/7)', () => {
			const expr = fn('exp', mul(div(num('-5'), num('7')), variable('x')));
			const expected = div(num('1'), power(fn('exp', variable('x')), div(num('5'), num('7'))));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: zero and identity', () => {
		test('exp(0) = 1', () => {
			const expr = fn('exp', num('0'));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(x - x) = 1', () => {
			const expr = fn('exp', sub(variable('x'), variable('x')));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(2x - 2x) = 1', () => {
			const expr = fn('exp', sub(mul(num('2'), variable('x')), mul(num('2'), variable('x'))));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(x + y - x - y) = 1', () => {
			const expr = fn(
				'exp',
				sub(sub(add(variable('x'), variable('y')), variable('x')), variable('y'))
			);
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(ln(1)) = 1', () => {
			const expr = fn('exp', fn('ln', num('1')));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(0·x) = 1', () => {
			const expr = fn('exp', mul(num('0'), variable('x')));
			expect(normalize(expr).hash).toBe('1');
		});
	});

	describe('edge cases: many terms', () => {
		test('exp(a + b + c + d + e) = exp(a)·exp(b)·exp(c)·exp(d)·exp(e)', () => {
			const expr = fn(
				'exp',
				add(
					add(add(add(variable('a'), variable('b')), variable('c')), variable('d')),
					variable('e')
				)
			);
			const expected = mul(
				mul(
					mul(mul(fn('exp', variable('a')), fn('exp', variable('b'))), fn('exp', variable('c'))),
					fn('exp', variable('d'))
				),
				fn('exp', variable('e'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2a + 3b + 4c) = exp(a)²·exp(b)³·exp(c)⁴', () => {
			const expr = fn(
				'exp',
				add(
					add(mul(num('2'), variable('a')), mul(num('3'), variable('b'))),
					mul(num('4'), variable('c'))
				)
			);
			const expected = mul(
				mul(power(fn('exp', variable('a')), num('2')), power(fn('exp', variable('b')), num('3'))),
				power(fn('exp', variable('c')), num('4'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-a - b - c) = 1/(exp(a)·exp(b)·exp(c))', () => {
			const expr = fn('exp', sub(sub(opposite(variable('a')), variable('b')), variable('c')));
			const expected = div(
				num('1'),
				mul(mul(fn('exp', variable('a')), fn('exp', variable('b'))), fn('exp', variable('c')))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: mixed positive and negative', () => {
		test('exp(2x - 3y) = exp(x)²/exp(y)³', () => {
			const expr = fn('exp', sub(mul(num('2'), variable('x')), mul(num('3'), variable('y'))));
			const expected = div(
				power(fn('exp', variable('x')), num('2')),
				power(fn('exp', variable('y')), num('3'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x - 2y + 3z) = exp(x)·exp(z)³/exp(y)²', () => {
			const expr = fn(
				'exp',
				add(sub(variable('x'), mul(num('2'), variable('y'))), mul(num('3'), variable('z')))
			);
			const expected = div(
				mul(fn('exp', variable('x')), power(fn('exp', variable('z')), num('3'))),
				power(fn('exp', variable('y')), num('2'))
			);
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-x + y) = exp(y)/exp(x)', () => {
			const expr = fn('exp', add(opposite(variable('x')), variable('y')));
			const expected = div(fn('exp', variable('y')), fn('exp', variable('x')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: double negation', () => {
		test('exp(--x) = exp(x)', () => {
			const expr = fn('exp', opposite(opposite(variable('x'))));
			const expected = fn('exp', variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(-(-2x)) = exp(x)²', () => {
			const expr = fn('exp', opposite(mul(num('-2'), variable('x'))));
			const expected = power(fn('exp', variable('x')), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: with constants (combination approach)', () => {
		// NOTE: With combination approach, exp(x+1) stays as exp(x+1), does NOT expand
		test('exp(x + 1) stays as exp(x+1) (no expansion)', () => {
			const expr = fn('exp', add(variable('x'), num('1')));
			const result = normalize(expr);
			// Should stay as opaque exp(x+1)
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(x + 2) stays as exp(x+2) (no expansion)', () => {
			const expr = fn('exp', add(variable('x'), num('2')));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(x - 1) stays as exp(x-1) (no expansion)', () => {
			const expr = fn('exp', sub(variable('x'), num('1')));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(2x + 3) stays as exp(2x+3) (no expansion)', () => {
			const expr = fn('exp', add(mul(num('2'), variable('x')), num('3')));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});
	});

	describe('edge cases: with ln composition (combination approach)', () => {
		// NOTE: With combination approach, partial ln extraction is NOT performed.
		// exp(ln(x) + z) stays opaque, it does NOT simplify to x·exp(z)
		test('exp(ln(x) - ln(y) + z) stays opaque (no partial ln extraction)', () => {
			const expr = fn(
				'exp',
				add(sub(fn('ln', variable('x')), fn('ln', variable('y'))), variable('z'))
			);
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(2ln(x) + 3ln(y) + z) stays opaque (no partial ln extraction)', () => {
			const expr = fn(
				'exp',
				add(
					add(mul(num('2'), fn('ln', variable('x'))), mul(num('3'), fn('ln', variable('y')))),
					variable('z')
				)
			);
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(-ln(x) + y) stays opaque (no partial ln extraction)', () => {
			const expr = fn('exp', add(opposite(fn('ln', variable('x'))), variable('y')));
			const result = normalize(expr);
			expect(result.numerator[0].monomial[0].base.type).toBe('function');
		});

		// This test SHOULD pass because ALL terms are ln terms (no non-ln term mixed in)
		test('exp(ln(x) + ln(y) - ln(z)) = x·y/z (pure ln combination)', () => {
			const expr = fn(
				'exp',
				sub(add(fn('ln', variable('x')), fn('ln', variable('y'))), fn('ln', variable('z')))
			);
			const expected = div(mul(variable('x'), variable('y')), variable('z'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: nested exp', () => {
		test('exp(exp(0)) = e', () => {
			const expr = fn('exp', fn('exp', num('0')));
			const expected = variable('e');
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(exp(x))) = exp(x)', () => {
			const expr = fn('ln', fn('exp', fn('exp', variable('x'))));
			const expected = fn('exp', variable('x'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(exp(ln(x)))) = x', () => {
			const expr = fn('exp', fn('ln', fn('exp', fn('ln', variable('x')))));
			const expected = variable('x');
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: should remain opaque', () => {
		test('exp(sin(x)) stays opaque', () => {
			const expr = fn('exp', fn('sin', variable('x')));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
			expect(norm.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(x + sin(y)) expands but sin part stays opaque', () => {
			const expr = fn('exp', add(variable('x'), fn('sin', variable('y'))));
			const expected = mul(fn('exp', variable('x')), fn('exp', fn('sin', variable('y'))));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x²) stays opaque (non-linear monomial)', () => {
			const expr = fn('exp', power(variable('x'), num('2')));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
			expect(norm.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(1/x) stays opaque (inverse)', () => {
			const expr = fn('exp', div(num('1'), variable('x')));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
		});

		test('exp(x/y + z/w) stays opaque (normalized to single fraction)', () => {
			// x/y + z/w normalizes to (xw + yz)/(yw), which is a fraction, not a sum
			// So exp(fraction) remains opaque - no expansion possible
			const expr = fn(
				'exp',
				add(div(variable('x'), variable('y')), div(variable('z'), variable('w')))
			);
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
			expect(norm.numerator[0].monomial[0].base.type).toBe('function');
		});

		test('exp(π·x) stays opaque (irrational coefficient)', () => {
			const expr = fn('exp', mul(greek('pi'), variable('x')));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
		});
	});

	describe('edge cases: roundtrip consistency', () => {
		test('ln(exp(a+b+c)) = a+b+c', () => {
			const expr = fn('ln', fn('exp', add(add(variable('a'), variable('b')), variable('c'))));
			const expected = add(add(variable('a'), variable('b')), variable('c'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(2x+3y)) = 2x+3y', () => {
			const expr = fn(
				'ln',
				fn('exp', add(mul(num('2'), variable('x')), mul(num('3'), variable('y'))))
			);
			const expected = add(mul(num('2'), variable('x')), mul(num('3'), variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x)·exp(y)·exp(z)) = x+y+z', () => {
			const expr = fn(
				'ln',
				mul(mul(fn('exp', variable('x')), fn('exp', variable('y'))), fn('exp', variable('z')))
			);
			const expected = add(add(variable('x'), variable('y')), variable('z'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('ln(exp(x)³/exp(y)²) = 3x - 2y', () => {
			const expr = fn(
				'ln',
				div(power(fn('exp', variable('x')), num('3')), power(fn('exp', variable('y')), num('2')))
			);
			const expected = sub(mul(num('3'), variable('x')), mul(num('2'), variable('y')));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: equivalence of expanded forms', () => {
		test('exp(3x) = exp(x+x+x) = exp(x)³', () => {
			const form1 = fn('exp', mul(num('3'), variable('x')));
			const form2 = fn('exp', add(add(variable('x'), variable('x')), variable('x')));
			const form3 = power(fn('exp', variable('x')), num('3'));
			const hash1 = normalize(form1).hash;
			expect(normalize(form2).hash).toBe(hash1);
			expect(normalize(form3).hash).toBe(hash1);
		});

		test('exp(x-y) = exp(x)/exp(y) = exp(x)·exp(-y)', () => {
			const form1 = fn('exp', sub(variable('x'), variable('y')));
			const form2 = div(fn('exp', variable('x')), fn('exp', variable('y')));
			const form3 = mul(fn('exp', variable('x')), fn('exp', opposite(variable('y'))));
			const hash1 = normalize(form1).hash;
			expect(normalize(form2).hash).toBe(hash1);
			expect(normalize(form3).hash).toBe(hash1);
		});

		test('exp(x/2)² stays as exp(x)^(1/2)^2 (symbolic power not simplified)', () => {
			// exp(x/2) = exp(x)^(1/2), then ^2 gives exp(x)^(1/2)^2
			// Simplifying (1/2)*2 = 1 requires symbolic exponent arithmetic not yet implemented
			const expr = power(fn('exp', div(variable('x'), num('2'))), num('2'));
			const norm = normalize(expr);
			// Just verify it normalizes without error and has expected structure
			expect(norm.numerator.length).toBe(1);
			expect(norm.denominator.length).toBe(1);
		});

		test('exp(x/3)³ stays as exp(x)^(1/3)^3 (symbolic power not simplified)', () => {
			// Similar to above - exp(x/3) = exp(x)^(1/3), then ^3 gives exp(x)^(1/3)^3
			const expr = power(fn('exp', div(variable('x'), num('3'))), num('3'));
			const norm = normalize(expr);
			expect(norm.numerator.length).toBe(1);
			expect(norm.denominator.length).toBe(1);
		});

		test('(exp(x)·exp(y))² = exp(2x+2y)', () => {
			const expr = power(mul(fn('exp', variable('x')), fn('exp', variable('y'))), num('2'));
			const expected = fn('exp', add(mul(num('2'), variable('x')), mul(num('2'), variable('y'))));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('edge cases: special numeric values', () => {
		test('exp(ln(2) + ln(3)) = 6', () => {
			const expr = fn('exp', add(fn('ln', num('2')), fn('ln', num('3'))));
			expect(normalize(expr).hash).toBe('6');
		});

		test('exp(ln(2) - ln(3)) = 2/3', () => {
			const expr = fn('exp', sub(fn('ln', num('2')), fn('ln', num('3'))));
			const expected = div(num('2'), num('3'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(3·ln(2)) = 8', () => {
			const expr = fn('exp', mul(num('3'), fn('ln', num('2'))));
			expect(normalize(expr).hash).toBe('8');
		});

		test('exp(-ln(2)) = 1/2', () => {
			const expr = fn('exp', opposite(fn('ln', num('2'))));
			const expected = div(num('1'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(4)/2) = 2 (sqrt(4))', () => {
			const expr = fn('exp', div(fn('ln', num('4')), num('2')));
			expect(normalize(expr).hash).toBe('2');
		});
	});

	describe('exp product combination (direction: expansion vs combination)', () => {
		// The combination approach ensures exp(2)*exp(3) = exp(5) by combining
		// exp factors in multiplication: exp(a)*exp(b) → exp(a+b)

		test('exp(2)*exp(3) = exp(5) (constant product combination)', () => {
			const expr = mul(fn('exp', num('2')), fn('exp', num('3')));
			const expected = fn('exp', num('5'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(2+3) = exp(5) (constant folding works)', () => {
			const expr = fn('exp', add(num('2'), num('3')));
			const expected = fn('exp', num('5'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(x)*exp(y) = exp(x+y) (variable product combination)', () => {
			const expr1 = mul(fn('exp', variable('x')), fn('exp', variable('y')));
			const expr2 = fn('exp', add(variable('x'), variable('y')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	describe('ln sum expansion (works correctly - contrast with exp)', () => {
		// ln uses expansion approach and it works because:
		// - ln(a*b) expands to ln(a)+ln(b)
		// - ln(n) for integers expands via prime factorization
		// So both directions converge to the same canonical form (sum of ln)

		test('ln(2)+ln(3) = ln(2*3) (sum of ln equals ln of product)', () => {
			const expr1 = add(fn('ln', num('2')), fn('ln', num('3')));
			const expr2 = fn('ln', mul(num('2'), num('3')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('ln(x)+ln(y) = ln(x*y) (works for variables too)', () => {
			const expr1 = add(fn('ln', variable('x')), fn('ln', variable('y')));
			const expr2 = fn('ln', mul(variable('x'), variable('y')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	// =========================================================================
	// TDD: Exp Combination Approach (replaces expansion)
	// =========================================================================
	// These tests define the expected behavior for the combination approach:
	// exp(a) * exp(b) → exp(a+b) instead of exp(a+b) → exp(a) * exp(b)
	// This ensures a unique canonical form: exp(polynomial)

	describe('exp combination: product of exp → exp(sum)', () => {
		test('exp(2)*exp(3) = exp(5) - constant product combination', () => {
			const expr1 = mul(fn('exp', num('2')), fn('exp', num('3')));
			const expr2 = fn('exp', num('5'));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)*exp(y) = exp(x+y) - variable product combination', () => {
			const expr1 = mul(fn('exp', variable('x')), fn('exp', variable('y')));
			const expr2 = fn('exp', add(variable('x'), variable('y')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)*exp(2)*exp(y) = exp(x+y+2) - mixed product combination', () => {
			const expr1 = mul(
				mul(fn('exp', variable('x')), fn('exp', num('2'))),
				fn('exp', variable('y'))
			);
			const expr2 = fn('exp', add(add(variable('x'), variable('y')), num('2')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(a)*exp(-a) = 1 - cancellation via exp(0)', () => {
			const expr = mul(fn('exp', variable('a')), fn('exp', opposite(variable('a'))));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(x)*exp(x) = exp(2x) - same argument combination', () => {
			const expr1 = mul(fn('exp', variable('x')), fn('exp', variable('x')));
			const expr2 = fn('exp', mul(num('2'), variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	describe('exp combination: exp with exponents → exp(scaled arg)', () => {
		test('exp(x)^2 = exp(2x) - integer exponent', () => {
			const expr1 = power(fn('exp', variable('x')), num('2'));
			const expr2 = fn('exp', mul(num('2'), variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)^3 * exp(y)^2 = exp(3x+2y) - multiple scaled exps', () => {
			const expr1 = mul(
				power(fn('exp', variable('x')), num('3')),
				power(fn('exp', variable('y')), num('2'))
			);
			const expr2 = fn('exp', add(mul(num('3'), variable('x')), mul(num('2'), variable('y'))));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)^(-1) = exp(-x) - negative exponent', () => {
			const expr1 = power(fn('exp', variable('x')), opposite(num('1')));
			const expr2 = fn('exp', opposite(variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x)^(1/2) = exp(x/2) - fractional exponent', () => {
			const expr1 = power(fn('exp', variable('x')), div(num('1'), num('2')));
			const expr2 = fn('exp', div(variable('x'), num('2')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	describe('exp combination: division of exp → exp(difference)', () => {
		test('exp(x)/exp(y) = exp(x-y) - variable division', () => {
			const expr1 = div(fn('exp', variable('x')), fn('exp', variable('y')));
			const expr2 = fn('exp', sub(variable('x'), variable('y')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(5)/exp(2) = exp(3) - constant division', () => {
			const expr1 = div(fn('exp', num('5')), fn('exp', num('2')));
			const expr2 = fn('exp', num('3'));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('1/exp(x) = exp(-x) - reciprocal', () => {
			const expr1 = div(num('1'), fn('exp', variable('x')));
			const expr2 = fn('exp', opposite(variable('x')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});

	describe('exp combination: preserved rules', () => {
		test('exp(0) = 1 - zero argument', () => {
			const expr = fn('exp', num('0'));
			expect(normalize(expr).hash).toBe('1');
		});

		test('exp(ln(x)) = x - inverse composition', () => {
			const expr = fn('exp', fn('ln', variable('x')));
			expect(normalize(expr).hash).toBe(normalize(variable('x')).hash);
		});

		test('exp(2*ln(x)) = x^2 - scaled ln', () => {
			const expr = fn('exp', mul(num('2'), fn('ln', variable('x'))));
			const expected = power(variable('x'), num('2'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});

		test('exp(ln(x) + ln(y)) = x*y - sum of ln', () => {
			const expr = fn('exp', add(fn('ln', variable('x')), fn('ln', variable('y'))));
			const expected = mul(variable('x'), variable('y'));
			expect(normalize(expr).hash).toBe(normalize(expected).hash);
		});
	});

	describe('exp combination: opaque cases (no simplification)', () => {
		test('exp(x*y) stays as exp(x*y) - product argument', () => {
			const expr = fn('exp', mul(variable('x'), variable('y')));
			const norm = normalize(expr);
			// Should contain exp(x*y) as an opaque factor
			expect(norm.hash).toContain('exp');
		});

		test('exp(sin(x)) stays as exp(sin(x)) - function argument', () => {
			const expr = fn('exp', fn('sin', variable('x')));
			const norm = normalize(expr);
			expect(norm.hash).toContain('exp');
			expect(norm.hash).toContain('sin');
		});

		test('exp(x^2) stays as exp(x^2) - power argument', () => {
			const expr = fn('exp', power(variable('x'), num('2')));
			const norm = normalize(expr);
			expect(norm.hash).toContain('exp');
		});
	});

	describe('exp combination: canonical form uniqueness', () => {
		test('exp(x+y) and exp(x)*exp(y) have same hash', () => {
			const expr1 = fn('exp', add(variable('x'), variable('y')));
			const expr2 = mul(fn('exp', variable('x')), fn('exp', variable('y')));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(2x) and exp(x)^2 have same hash', () => {
			const expr1 = fn('exp', mul(num('2'), variable('x')));
			const expr2 = power(fn('exp', variable('x')), num('2'));
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(x+y+2) and exp(x)*exp(y)*exp(2) have same hash', () => {
			const expr1 = fn('exp', add(add(variable('x'), variable('y')), num('2')));
			const expr2 = mul(
				mul(fn('exp', variable('x')), fn('exp', variable('y'))),
				fn('exp', num('2'))
			);
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});

		test('exp(3x+2y) and exp(x)^3*exp(y)^2 have same hash', () => {
			const expr1 = fn('exp', add(mul(num('3'), variable('x')), mul(num('2'), variable('y'))));
			const expr2 = mul(
				power(fn('exp', variable('x')), num('3')),
				power(fn('exp', variable('y')), num('2'))
			);
			expect(normalize(expr1).hash).toBe(normalize(expr2).hash);
		});
	});
});
