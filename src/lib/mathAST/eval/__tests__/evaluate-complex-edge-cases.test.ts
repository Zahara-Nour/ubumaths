/**
 * Edge case tests for complex number evaluation
 *
 * Comprehensive tests covering:
 * - Powers of i (cyclic behavior)
 * - Division edge cases
 * - Complex arithmetic identities
 *
 * NOTE: In exact mode, evaluate returns MathNode (symbolic).
 * Tests use toLatex to verify symbolic results.
 * Functions like conj, cabs, arg, Re, Im remain as function nodes in exact mode.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { complex, number, func, power, multiply, divide, add, opposite } from '../../factory';
import { parsePratt } from '../../parser/latex/parser-pratt';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Assert symbolic result matches expected latex
 */
function expectLatex(result: ReturnType<typeof evaluate>, expected: string | RegExp) {
	const latex = toLatex(result.node);
	if (typeof expected === 'string') {
		expect(latex).toBe(expected);
	} else {
		expect(latex).toMatch(expected);
	}
}

/**
 * Assert result stays as function (exact mode doesn't evaluate complex functions)
 */
function expectFunction(result: ReturnType<typeof evaluate>, name: string) {
	expect(result.node.type).toBe('function');
	if (result.node.type === 'function') {
		expect(result.node.name).toBe(name);
	}
}

/**
 * Create imaginary unit i
 */
function i() {
	return complex(number('0'), number('1'));
}

/**
 * Create complex number a + bi
 */
function c(a: number, b: number) {
	return complex(number(String(a)), number(String(b)));
}

// =============================================================================
// Powers of i (Critical Mathematical Identity: i^4 = 1)
// =============================================================================

describe('Powers of imaginary unit i', () => {
	describe('positive integer powers', () => {
		it('i^0 = 1', () => {
			const expr = power(i(), number('0'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i^1 = i', () => {
			const expr = power(i(), number('1'));
			const result = evaluate(expr);
			expectLatex(result, '\\imaginaryI');
		});

		it('i^2 = -1', () => {
			const expr = power(i(), number('2'));
			const result = evaluate(expr);
			expectLatex(result, '-1');
		});

		it('i^3 = -i', () => {
			const expr = power(i(), number('3'));
			const result = evaluate(expr);
			expectLatex(result, '-\\imaginaryI');
		});

		it('i^4 = 1 (completes cycle)', () => {
			const expr = power(i(), number('4'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i^5 = i (starts new cycle)', () => {
			const expr = power(i(), number('5'));
			const result = evaluate(expr);
			expectLatex(result, '\\imaginaryI');
		});

		it('i^8 = 1 (two complete cycles)', () => {
			const expr = power(i(), number('8'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i^100 = 1 (100 = 4*25, multiple of 4)', () => {
			const expr = power(i(), number('100'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i^101 = i (101 mod 4 = 1)', () => {
			const expr = power(i(), number('101'));
			const result = evaluate(expr);
			expectLatex(result, '\\imaginaryI');
		});

		it('i^102 = -1 (102 mod 4 = 2)', () => {
			const expr = power(i(), number('102'));
			const result = evaluate(expr);
			expectLatex(result, '-1');
		});

		it('i^103 = -i (103 mod 4 = 3)', () => {
			const expr = power(i(), number('103'));
			const result = evaluate(expr);
			expectLatex(result, '-\\imaginaryI');
		});
	});

	describe('negative integer powers', () => {
		// Complex denominator rationalization is now implemented
		it('i^(-1) = -i (rationalized)', () => {
			const expr = power(i(), number('-1'));
			const result = evaluate(expr);
			expectLatex(result, '-\\imaginaryI');
		});

		it('i^(-2) = -1', () => {
			const expr = power(i(), number('-2'));
			const result = evaluate(expr);
			expectLatex(result, '-1');
		});

		it('i^(-3) = i (rationalized)', () => {
			const expr = power(i(), number('-3'));
			const result = evaluate(expr);
			expectLatex(result, '\\imaginaryI');
		});

		it('i^(-4) = 1', () => {
			const expr = power(i(), number('-4'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i^(-5) = -i (rationalized)', () => {
			const expr = power(i(), number('-5'));
			const result = evaluate(expr);
			expectLatex(result, '-\\imaginaryI');
		});
	});

	describe('powers of general complex numbers', () => {
		it('(1+i)^0 = 1', () => {
			const expr = power(c(1, 1), number('0'));
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('(1+i)^1 = 1+i', () => {
			const expr = power(c(1, 1), number('1'));
			const result = evaluate(expr);
			expectLatex(result, '1 + \\imaginaryI');
		});

		it('(1+i)^2 = 2i', () => {
			// (1+i)^2 = 1 + 2i + i^2 = 1 + 2i - 1 = 2i
			const expr = power(c(1, 1), number('2'));
			const result = evaluate(expr);
			expectLatex(result, '2 \\imaginaryI');
		});

		it('(1+i)^4 = -4', () => {
			// (1+i)^4 = ((1+i)^2)^2 = (2i)^2 = 4i^2 = -4
			const expr = power(c(1, 1), number('4'));
			const result = evaluate(expr);
			expectLatex(result, '-4');
		});

		it('(2+0i)^3 = 8 (real power)', () => {
			const expr = power(c(2, 0), number('3'));
			const result = evaluate(expr);
			expectLatex(result, '8');
		});

		it('(0+2i)^2 = -4', () => {
			// (2i)^2 = 4i^2 = -4
			const expr = power(c(0, 2), number('2'));
			const result = evaluate(expr);
			expectLatex(result, '-4');
		});
	});
});

// =============================================================================
// Division Edge Cases
// =============================================================================

describe('Complex division edge cases', () => {
	describe('division by special values', () => {
		it('z / 1 = z (identity)', () => {
			const z = c(3, 4);
			const expr = divide(z, number('1'), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '3 + 4 \\imaginaryI');
		});

		it('z / (-1) = -z', () => {
			const z = c(3, 4);
			const expr = divide(z, number('-1'), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '-3 - 4 \\imaginaryI');
		});

		// Complex denominator rationalization is now implemented
		it('z / i = 4 - 3i (rationalized)', () => {
			// (3+4i)/i = (3+4i) * (-i) = -3i + 4 = 4 - 3i
			const z = c(3, 4);
			const expr = divide(z, i(), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '4 - 3 \\imaginaryI');
		});

		it('z / (-i) = -4 + 3i (rationalized)', () => {
			// (3+4i)/(-i) = (3+4i) * i = 3i - 4 = -4 + 3i
			const z = c(3, 4);
			const minusI = c(0, -1);
			const expr = divide(z, minusI, 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '-4 + 3 \\imaginaryI');
		});
	});

	describe('self-division', () => {
		// Complex denominator rationalization is now implemented
		// Self-division with complex denominators simplifies to 1
		it('z / z = 1 (rationalized)', () => {
			const z = c(3, 4);
			const expr = divide(z, c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('i / i = 1 (rationalized)', () => {
			const expr = divide(i(), i(), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '1');
		});

		it('(1+i) / (1+i) = 1 (rationalized)', () => {
			const z = c(1, 1);
			const expr = divide(z, c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '1');
		});
	});

	describe('zero numerator', () => {
		it('0 / z = 0 for non-zero z', () => {
			const expr = divide(c(0, 0), c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '0');
		});

		it('0 / i = 0', () => {
			const expr = divide(c(0, 0), i(), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '0');
		});
	});

	describe('reciprocals', () => {
		// Complex denominator rationalization is now implemented
		it('1 / (3+4i) = (3-4i)/25 (rationalized)', () => {
			// 1/(3+4i) * (3-4i)/(3-4i) = (3-4i)/(9+16) = (3-4i)/25
			const expr = divide(number('1'), c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '\\dfrac{3}{25} - \\dfrac{4}{25} \\imaginaryI');
		});

		it('1 / (1+i) = (1-i)/2 (rationalized)', () => {
			const expr = divide(number('1'), c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '\\dfrac{1}{2} - \\dfrac{1}{2} \\imaginaryI');
		});
	});

	describe('pure imaginary division', () => {
		// Complex denominator rationalization is now implemented
		it('(0+4i) / (0+2i) = 2 (rationalized)', () => {
			const expr = divide(c(0, 4), c(0, 2), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '2');
		});

		it('(3+0i) / (0+1i) = -3i (rationalized)', () => {
			const expr = divide(c(3, 0), c(0, 1), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '-3 \\imaginaryI');
		});
	});
});

// =============================================================================
// Conjugate Mathematical Properties
// =============================================================================

describe('Conjugate mathematical properties', () => {
	describe('conjugate function stays unevaluated in exact mode', () => {
		it('conj(3+4i) stays as function', () => {
			const z = c(3, 4);
			const expr = func('conj', [z]);
			const result = evaluate(expr);
			expectFunction(result, 'conj');
		});

		it('conj(i) stays as function', () => {
			const expr = func('conj', [i()]);
			const result = evaluate(expr);
			expectFunction(result, 'conj');
		});

		it('nested conj stays as function', () => {
			const z = c(3, 4);
			const expr = func('conj', [func('conj', [z])]);
			const result = evaluate(expr);
			// Outer conj should stay as function
			expectFunction(result, 'conj');
		});
	});
});

// =============================================================================
// Modulus (Absolute Value) Properties
// =============================================================================

describe('Modulus mathematical properties', () => {
	describe('cabs function stays unevaluated in exact mode', () => {
		it('cabs(3+4i) stays as function', () => {
			const expr = func('cabs', [c(3, 4)]);
			const result = evaluate(expr);
			expectFunction(result, 'cabs');
		});

		it('cabs(i) stays as function', () => {
			const expr = func('cabs', [i()]);
			const result = evaluate(expr);
			expectFunction(result, 'cabs');
		});

		it('cabs(0) stays as function', () => {
			const expr = func('cabs', [c(0, 0)]);
			const result = evaluate(expr);
			expectFunction(result, 'cabs');
		});
	});
});

// =============================================================================
// Argument Function (All Quadrants)
// =============================================================================

describe('Argument function across all quadrants', () => {
	describe('arg function stays unevaluated in exact mode', () => {
		it('arg(1) stays as function', () => {
			const expr = func('arg', [number('1')]);
			const result = evaluate(expr);
			expectFunction(result, 'arg');
		});

		it('arg(i) stays as function', () => {
			const expr = func('arg', [i()]);
			const result = evaluate(expr);
			expectFunction(result, 'arg');
		});

		it('arg(-1) stays as function', () => {
			const expr = func('arg', [number('-1')]);
			const result = evaluate(expr);
			expectFunction(result, 'arg');
		});

		it('arg(1+i) stays as function', () => {
			const expr = func('arg', [c(1, 1)]);
			const result = evaluate(expr);
			expectFunction(result, 'arg');
		});
	});
});

// =============================================================================
// Numerical Precision Tests (Symbolic)
// =============================================================================

describe('Numerical precision and stability', () => {
	describe('arithmetic precision with exact arithmetic', () => {
		it('(1+i)^8 = 16 (exact integer result)', () => {
			// (1+i)^2 = 2i, (2i)^2 = -4, (-4)^2 = 16
			const expr = power(c(1, 1), number('8'));
			const result = evaluate(expr);
			expectLatex(result, '16');
		});

		it('integer multiplication maintains exactness', () => {
			// 10 * i = 10i
			const expr = multiply(number('10'), i(), 'implicit');
			const result = evaluate(expr);
			expectLatex(result, '10 \\imaginaryI');
		});
	});
});

// =============================================================================
// Re and Im Function Edge Cases
// =============================================================================

describe('Re and Im function edge cases', () => {
	describe('Re function stays unevaluated in exact mode', () => {
		it('Re(0) stays as function', () => {
			const expr = func('Re', [number('0')]);
			const result = evaluate(expr);
			expectFunction(result, 'Re');
		});

		it('Re(5i) stays as function', () => {
			const expr = func('Re', [c(0, 5)]);
			const result = evaluate(expr);
			expectFunction(result, 'Re');
		});

		it('Re(-3-4i) stays as function', () => {
			const expr = func('Re', [c(-3, -4)]);
			const result = evaluate(expr);
			expectFunction(result, 'Re');
		});
	});

	describe('Im function stays unevaluated in exact mode', () => {
		it('Im(0) stays as function', () => {
			const expr = func('Im', [number('0')]);
			const result = evaluate(expr);
			expectFunction(result, 'Im');
		});

		it('Im(5) stays as function', () => {
			const expr = func('Im', [number('5')]);
			const result = evaluate(expr);
			expectFunction(result, 'Im');
		});

		it('Im(-3-4i) stays as function', () => {
			const expr = func('Im', [c(-3, -4)]);
			const result = evaluate(expr);
			expectFunction(result, 'Im');
		});
	});
});

// =============================================================================
// Mixed Real/Complex Operations
// =============================================================================

describe('Mixed real and complex operations', () => {
	describe('addition order', () => {
		it('5 + (3+4i) = 8+4i', () => {
			const expr = add(number('5'), c(3, 4));
			const result = evaluate(expr);
			expectLatex(result, '8 + 4 \\imaginaryI');
		});

		it('(3+4i) + 5 = 8+4i', () => {
			const expr = add(c(3, 4), number('5'));
			const result = evaluate(expr);
			expectLatex(result, '8 + 4 \\imaginaryI');
		});
	});

	describe('multiplication order', () => {
		it('2 * (3+4i) = 6+8i', () => {
			const expr = multiply(number('2'), c(3, 4), 'implicit');
			const result = evaluate(expr);
			expectLatex(result, '6 + 8 \\imaginaryI');
		});

		it('(3+4i) * 2 = 6+8i', () => {
			const expr = multiply(c(3, 4), number('2'), 'implicit');
			const result = evaluate(expr);
			expectLatex(result, '6 + 8 \\imaginaryI');
		});
	});

	describe('division order', () => {
		// Complex denominator rationalization is now implemented
		it('10 / (1+i) = 5 - 5i (rationalized)', () => {
			// 10/(1+i) * (1-i)/(1-i) = 10(1-i)/(1+1) = 10(1-i)/2 = 5 - 5i
			const expr = divide(number('10'), c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '5 - 5 \\imaginaryI');
		});

		it('(6+8i) / 2 = 3+4i', () => {
			const expr = divide(c(6, 8), number('2'), 'fraction');
			const result = evaluate(expr);
			expectLatex(result, '3 + 4 \\imaginaryI');
		});
	});
});

// =============================================================================
// Simplification to Real (0 imaginary part)
// =============================================================================

describe('Simplification to real numbers', () => {
	it('(a+bi) + (a-bi) = 2a (imaginary cancels)', () => {
		const z1 = c(3, 4);
		const z2 = c(3, -4);
		const expr = add(z1, z2);
		const result = evaluate(expr);
		expectLatex(result, '6');
	});

	it('(a+bi) - (a+bi) = 0', () => {
		const z1 = c(3, 4);
		const z2 = c(3, 4);
		const expr = add(z1, opposite(z2));
		const result = evaluate(expr);
		expectLatex(result, '0');
	});

	it('(a+bi)(a-bi) = a^2 + b^2 (real)', () => {
		// (3+4i)(3-4i) = 9 + 16 = 25
		const z1 = c(3, 4);
		const z2 = c(3, -4);
		const expr = multiply(z1, z2, 'implicit');
		const result = evaluate(expr);
		expectLatex(result, '25');
	});
});

// =============================================================================
// LaTeX Parsing and Round-Trip
// =============================================================================

describe('LaTeX parsing edge cases', () => {
	it('parses and evaluates -\\imaginaryI correctly', () => {
		const ast = parsePratt('-\\imaginaryI');
		const result = evaluate(ast);
		expectLatex(result, '-\\imaginaryI');
	});

	it('parses 2\\imaginaryI as 2i', () => {
		const ast = parsePratt('2\\imaginaryI');
		const result = evaluate(ast);
		expectLatex(result, '2 \\imaginaryI');
	});

	it('parses complex expression with parentheses', () => {
		const ast = parsePratt('(1 + 2\\imaginaryI) \\times (3 + 4\\imaginaryI)');
		// (1+2i)(3+4i) = 3 + 4i + 6i + 8i^2 = 3 + 10i - 8 = -5 + 10i
		const result = evaluate(ast);
		expectLatex(result, '-5 + 10 \\imaginaryI');
	});

	it('parses nested imaginary expressions', () => {
		const ast = parsePratt('\\imaginaryI^2 + 1');
		// i^2 + 1 = -1 + 1 = 0
		const result = evaluate(ast);
		expectLatex(result, '0');
	});
});
