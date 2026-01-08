/**
 * Edge case tests for complex number evaluation
 *
 * Comprehensive tests covering:
 * - Powers of i (cyclic behavior)
 * - Division edge cases
 * - Conjugate/modulus mathematical identities
 * - Numerical precision
 * - Argument function across all quadrants
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { complex, number, func, power, multiply, divide, add, opposite } from '../../factory';
import { parsePratt } from '../../parser/latex/parser-pratt';
import type { ComplexValueResult } from '../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract complex value from evaluation result for assertions
 */
function getComplexValue(
	result: ReturnType<typeof evaluate>
): { real: number; imag: number } | null {
	const value = result.value;
	if (typeof value === 'object' && 'real' in value && 'imag' in value) {
		return value as ComplexValueResult;
	}
	if (typeof value === 'number') {
		return { real: value, imag: 0 };
	}
	if (typeof value === 'object' && 'n' in value && 'd' in value) {
		return { real: Number(value.n) / Number(value.d), imag: 0 };
	}
	return null;
}

/**
 * Assert complex value equality with tolerance
 */
function expectComplexClose(
	result: ReturnType<typeof evaluate>,
	expectedReal: number,
	expectedImag: number,
	tolerance = 1e-10
) {
	const value = getComplexValue(result);
	expect(value).not.toBeNull();
	if (value) {
		expect(value.real).toBeCloseTo(expectedReal, -Math.log10(tolerance));
		expect(value.imag).toBeCloseTo(expectedImag, -Math.log10(tolerance));
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
			expectComplexClose(result, 1, 0);
		});

		it('i^1 = i', () => {
			const expr = power(i(), number('1'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, 1);
		});

		it('i^2 = -1', () => {
			const expr = power(i(), number('2'));
			const result = evaluate(expr);
			expectComplexClose(result, -1, 0);
		});

		it('i^3 = -i', () => {
			const expr = power(i(), number('3'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, -1);
		});

		it('i^4 = 1 (completes cycle)', () => {
			const expr = power(i(), number('4'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('i^5 = i (starts new cycle)', () => {
			const expr = power(i(), number('5'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, 1);
		});

		it('i^8 = 1 (two complete cycles)', () => {
			const expr = power(i(), number('8'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('i^100 = 1 (100 = 4*25, multiple of 4)', () => {
			const expr = power(i(), number('100'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('i^101 = i (101 mod 4 = 1)', () => {
			const expr = power(i(), number('101'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, 1);
		});

		it('i^102 = -1 (102 mod 4 = 2)', () => {
			const expr = power(i(), number('102'));
			const result = evaluate(expr);
			expectComplexClose(result, -1, 0);
		});

		it('i^103 = -i (103 mod 4 = 3)', () => {
			const expr = power(i(), number('103'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, -1);
		});
	});

	describe('negative integer powers', () => {
		it('i^(-1) = -i (since i * (-i) = 1)', () => {
			const expr = power(i(), number('-1'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, -1);
		});

		it('i^(-2) = -1', () => {
			const expr = power(i(), number('-2'));
			const result = evaluate(expr);
			expectComplexClose(result, -1, 0);
		});

		it('i^(-3) = i', () => {
			const expr = power(i(), number('-3'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, 1);
		});

		it('i^(-4) = 1', () => {
			const expr = power(i(), number('-4'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('i^(-5) = -i', () => {
			const expr = power(i(), number('-5'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, -1);
		});
	});

	describe('powers of general complex numbers', () => {
		it('(1+i)^0 = 1', () => {
			const expr = power(c(1, 1), number('0'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('(1+i)^1 = 1+i', () => {
			const expr = power(c(1, 1), number('1'));
			const result = evaluate(expr);
			expectComplexClose(result, 1, 1);
		});

		it('(1+i)^2 = 2i', () => {
			// (1+i)^2 = 1 + 2i + i^2 = 1 + 2i - 1 = 2i
			const expr = power(c(1, 1), number('2'));
			const result = evaluate(expr);
			expectComplexClose(result, 0, 2);
		});

		it('(1+i)^4 = -4', () => {
			// (1+i)^4 = ((1+i)^2)^2 = (2i)^2 = 4i^2 = -4
			const expr = power(c(1, 1), number('4'));
			const result = evaluate(expr);
			expectComplexClose(result, -4, 0);
		});

		it('(2+0i)^3 = 8 (real power)', () => {
			const expr = power(c(2, 0), number('3'));
			const result = evaluate(expr);
			expectComplexClose(result, 8, 0);
		});

		it('(0+2i)^2 = -4', () => {
			// (2i)^2 = 4i^2 = -4
			const expr = power(c(0, 2), number('2'));
			const result = evaluate(expr);
			expectComplexClose(result, -4, 0);
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
			expectComplexClose(result, 3, 4);
		});

		it('z / (-1) = -z', () => {
			const z = c(3, 4);
			const expr = divide(z, number('-1'), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, -3, -4);
		});

		it('z / i = -iz (since 1/i = -i)', () => {
			// (3+4i)/i = (3+4i)(-i)/(i)(-i) = (-3i - 4i^2)/1 = 4 - 3i
			const z = c(3, 4);
			const expr = divide(z, i(), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 4, -3);
		});

		it('z / (-i) = iz', () => {
			// (3+4i)/(-i) = -4 + 3i
			const z = c(3, 4);
			const minusI = c(0, -1);
			const expr = divide(z, minusI, 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, -4, 3);
		});
	});

	describe('self-division', () => {
		it('z / z = 1 for non-zero z', () => {
			const z = c(3, 4);
			const expr = divide(z, c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('i / i = 1', () => {
			const expr = divide(i(), i(), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('(1+i) / (1+i) = 1', () => {
			const z = c(1, 1);
			const expr = divide(z, c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});
	});

	describe('zero numerator', () => {
		it('0 / z = 0 for non-zero z', () => {
			const expr = divide(c(0, 0), c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('0 / i = 0', () => {
			const expr = divide(c(0, 0), i(), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});
	});

	describe('reciprocals', () => {
		it('1 / (3+4i) = (3-4i)/25', () => {
			// 1/(3+4i) = (3-4i)/((3+4i)(3-4i)) = (3-4i)/25 = 0.12 - 0.16i
			const expr = divide(number('1'), c(3, 4), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 3 / 25, -4 / 25);
		});

		it('1 / (1+i) = (1-i)/2 = 0.5 - 0.5i', () => {
			const expr = divide(number('1'), c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 0.5, -0.5);
		});
	});

	describe('pure imaginary division', () => {
		it('(0+4i) / (0+2i) = 2', () => {
			const expr = divide(c(0, 4), c(0, 2), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 2, 0);
		});

		it('(3+0i) / (0+1i) = -3i', () => {
			const expr = divide(c(3, 0), c(0, 1), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 0, -3);
		});
	});
});

// =============================================================================
// Conjugate Mathematical Properties
// =============================================================================

describe('Conjugate mathematical properties', () => {
	describe('double conjugate', () => {
		it('conj(conj(z)) = z', () => {
			const z = c(3, 4);
			const expr = func('conj', [func('conj', [z])]);
			const result = evaluate(expr);
			expectComplexClose(result, 3, 4);
		});

		it('conj(conj(i)) = i', () => {
			const expr = func('conj', [func('conj', [i()])]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 1);
		});
	});

	describe('z * conj(z) = |z|^2 (always real)', () => {
		it('(3+4i) * conj(3+4i) = 25', () => {
			const z = c(3, 4);
			const expr = multiply(z, func('conj', [c(3, 4)]), 'implicit');
			const result = evaluate(expr);
			// |3+4i|^2 = 9 + 16 = 25
			expectComplexClose(result, 25, 0);
		});

		it('i * conj(i) = 1', () => {
			const expr = multiply(i(), func('conj', [i()]), 'implicit');
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('(1+i) * conj(1+i) = 2', () => {
			const z = c(1, 1);
			const expr = multiply(z, func('conj', [c(1, 1)]), 'implicit');
			const result = evaluate(expr);
			// |1+i|^2 = 1 + 1 = 2
			expectComplexClose(result, 2, 0);
		});
	});

	describe('conjugate of pure imaginary', () => {
		it('conj(3i) = -3i', () => {
			const expr = func('conj', [c(0, 3)]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, -3);
		});

		it('conj(-2i) = 2i', () => {
			const expr = func('conj', [c(0, -2)]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 2);
		});
	});

	describe('conjugate of real', () => {
		it('conj(5) = 5', () => {
			const expr = func('conj', [number('5')]);
			const result = evaluate(expr);
			expectComplexClose(result, 5, 0);
		});

		it('conj(-3) = -3', () => {
			const expr = func('conj', [number('-3')]);
			const result = evaluate(expr);
			expectComplexClose(result, -3, 0);
		});
	});
});

// =============================================================================
// Modulus (Absolute Value) Properties
// =============================================================================

describe('Modulus mathematical properties', () => {
	describe('Pythagorean triples', () => {
		it('|3+4i| = 5 (classic 3-4-5)', () => {
			const expr = func('cabs', [c(3, 4)]);
			const result = evaluate(expr);
			expectComplexClose(result, 5, 0);
		});

		it('|5+12i| = 13 (5-12-13)', () => {
			const expr = func('cabs', [c(5, 12)]);
			const result = evaluate(expr);
			expectComplexClose(result, 13, 0);
		});

		it('|8+15i| = 17 (8-15-17)', () => {
			const expr = func('cabs', [c(8, 15)]);
			const result = evaluate(expr);
			expectComplexClose(result, 17, 0);
		});
	});

	describe('modulus of special values', () => {
		it('|0| = 0', () => {
			const expr = func('cabs', [c(0, 0)]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('|i| = 1', () => {
			const expr = func('cabs', [i()]);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('|-i| = 1', () => {
			const expr = func('cabs', [c(0, -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('|1| = 1', () => {
			const expr = func('cabs', [number('1')]);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});

		it('|-1| = 1', () => {
			const expr = func('cabs', [number('-1')]);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 0);
		});
	});

	describe('|conj(z)| = |z|', () => {
		it('|conj(3+4i)| = |3+4i| = 5', () => {
			const z = c(3, 4);
			const expr = func('cabs', [func('conj', [z])]);
			const result = evaluate(expr);
			expectComplexClose(result, 5, 0);
		});
	});

	describe('modulus of negative', () => {
		it('|-z| = |z|', () => {
			// |-(3+4i)| = |-3-4i| = 5
			// z = c(3, 4), negZ = -z = c(-3, -4)
			const negZ = c(-3, -4);
			const expr = func('cabs', [negZ]);
			const result = evaluate(expr);
			expectComplexClose(result, 5, 0);
		});
	});
});

// =============================================================================
// Argument Function (All Quadrants)
// =============================================================================

describe('Argument function across all quadrants', () => {
	describe('positive real axis', () => {
		it('arg(1) = 0', () => {
			const expr = func('arg', [number('1')]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('arg(5) = 0', () => {
			const expr = func('arg', [number('5')]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});
	});

	describe('positive imaginary axis', () => {
		it('arg(i) = pi/2', () => {
			const expr = func('arg', [i()]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI / 2, 0);
		});

		it('arg(3i) = pi/2', () => {
			const expr = func('arg', [c(0, 3)]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI / 2, 0);
		});
	});

	describe('negative real axis', () => {
		it('arg(-1) = pi', () => {
			const expr = func('arg', [number('-1')]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI, 0);
		});

		it('arg(-5) = pi', () => {
			const expr = func('arg', [number('-5')]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI, 0);
		});
	});

	describe('negative imaginary axis', () => {
		it('arg(-i) = -pi/2', () => {
			const expr = func('arg', [c(0, -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, -Math.PI / 2, 0);
		});

		it('arg(-3i) = -pi/2', () => {
			const expr = func('arg', [c(0, -3)]);
			const result = evaluate(expr);
			expectComplexClose(result, -Math.PI / 2, 0);
		});
	});

	describe('first quadrant (Re > 0, Im > 0)', () => {
		it('arg(1+i) = pi/4', () => {
			const expr = func('arg', [c(1, 1)]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI / 4, 0);
		});

		it('arg(sqrt(3)+i) = pi/6', () => {
			const expr = func('arg', [c(Math.sqrt(3), 1)]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI / 6, 0);
		});

		it('arg(1+sqrt(3)i) = pi/3', () => {
			const expr = func('arg', [c(1, Math.sqrt(3))]);
			const result = evaluate(expr);
			expectComplexClose(result, Math.PI / 3, 0);
		});
	});

	describe('second quadrant (Re < 0, Im > 0)', () => {
		it('arg(-1+i) = 3pi/4', () => {
			const expr = func('arg', [c(-1, 1)]);
			const result = evaluate(expr);
			expectComplexClose(result, (3 * Math.PI) / 4, 0);
		});

		it('arg(-sqrt(3)+i) = 5pi/6', () => {
			const expr = func('arg', [c(-Math.sqrt(3), 1)]);
			const result = evaluate(expr);
			expectComplexClose(result, (5 * Math.PI) / 6, 0);
		});
	});

	describe('third quadrant (Re < 0, Im < 0)', () => {
		it('arg(-1-i) = -3pi/4', () => {
			const expr = func('arg', [c(-1, -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, (-3 * Math.PI) / 4, 0);
		});

		it('arg(-sqrt(3)-i) = -5pi/6', () => {
			const expr = func('arg', [c(-Math.sqrt(3), -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, (-5 * Math.PI) / 6, 0);
		});
	});

	describe('fourth quadrant (Re > 0, Im < 0)', () => {
		it('arg(1-i) = -pi/4', () => {
			const expr = func('arg', [c(1, -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, -Math.PI / 4, 0);
		});

		it('arg(sqrt(3)-i) = -pi/6', () => {
			const expr = func('arg', [c(Math.sqrt(3), -1)]);
			const result = evaluate(expr);
			expectComplexClose(result, -Math.PI / 6, 0);
		});
	});
});

// =============================================================================
// Numerical Precision Tests
// =============================================================================

describe('Numerical precision and stability', () => {
	describe('small values', () => {
		it('handles very small real part', () => {
			const expr = c(1e-15, 1);
			const result = evaluate(expr);
			expectComplexClose(result, 1e-15, 1, 1e-14);
		});

		it('handles very small imaginary part', () => {
			const expr = c(1, 1e-15);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 1e-15, 1e-14);
		});
	});

	describe('large values', () => {
		it('handles large real part', () => {
			const expr = c(1e10, 1);
			const result = evaluate(expr);
			expectComplexClose(result, 1e10, 1, 1);
		});

		it('handles large imaginary part', () => {
			const expr = c(1, 1e10);
			const result = evaluate(expr);
			expectComplexClose(result, 1, 1e10, 1);
		});
	});

	describe('arithmetic precision', () => {
		it('(1+i)^8 = 16 (exact integer result)', () => {
			// (1+i)^2 = 2i, (2i)^2 = -4, (-4)^2 = 16
			const expr = power(c(1, 1), number('8'));
			const result = evaluate(expr);
			expectComplexClose(result, 16, 0, 1e-10);
		});

		it('repeated multiplication maintains precision', () => {
			// (0.1 + 0.1i) * 10 = 1 + i
			const expr = multiply(c(0.1, 0.1), number('10'), 'implicit');
			const result = evaluate(expr);
			expectComplexClose(result, 1, 1, 1e-10);
		});
	});
});

// =============================================================================
// Re and Im Function Edge Cases
// =============================================================================

describe('Re and Im function edge cases', () => {
	describe('Re function', () => {
		it('Re(0) = 0', () => {
			const expr = func('Re', [number('0')]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('Re(pure imaginary 5i) = 0', () => {
			const expr = func('Re', [c(0, 5)]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('Re(negative -3-4i) = -3', () => {
			const expr = func('Re', [c(-3, -4)]);
			const result = evaluate(expr);
			expectComplexClose(result, -3, 0);
		});
	});

	describe('Im function', () => {
		it('Im(0) = 0', () => {
			const expr = func('Im', [number('0')]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('Im(real 5) = 0', () => {
			const expr = func('Im', [number('5')]);
			const result = evaluate(expr);
			expectComplexClose(result, 0, 0);
		});

		it('Im(negative -3-4i) = -4', () => {
			const expr = func('Im', [c(-3, -4)]);
			const result = evaluate(expr);
			expectComplexClose(result, -4, 0);
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
			expectComplexClose(result, 8, 4);
		});

		it('(3+4i) + 5 = 8+4i', () => {
			const expr = add(c(3, 4), number('5'));
			const result = evaluate(expr);
			expectComplexClose(result, 8, 4);
		});
	});

	describe('multiplication order', () => {
		it('2 * (3+4i) = 6+8i', () => {
			const expr = multiply(number('2'), c(3, 4), 'implicit');
			const result = evaluate(expr);
			expectComplexClose(result, 6, 8);
		});

		it('(3+4i) * 2 = 6+8i', () => {
			const expr = multiply(c(3, 4), number('2'), 'implicit');
			const result = evaluate(expr);
			expectComplexClose(result, 6, 8);
		});
	});

	describe('division order', () => {
		it('10 / (1+i) = 5 - 5i', () => {
			// 10 / (1+i) = 10(1-i) / 2 = 5 - 5i
			const expr = divide(number('10'), c(1, 1), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 5, -5);
		});

		it('(6+8i) / 2 = 3+4i', () => {
			const expr = divide(c(6, 8), number('2'), 'fraction');
			const result = evaluate(expr);
			expectComplexClose(result, 3, 4);
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
		expectComplexClose(result, 6, 0);
	});

	it('(a+bi) - (a+bi) = 0', () => {
		const z1 = c(3, 4);
		const z2 = c(3, 4);
		const expr = add(z1, opposite(z2));
		const result = evaluate(expr);
		expectComplexClose(result, 0, 0);
	});

	it('(a+bi)(a-bi) = a^2 + b^2 (real)', () => {
		// (3+4i)(3-4i) = 9 + 16 = 25
		const z1 = c(3, 4);
		const z2 = c(3, -4);
		const expr = multiply(z1, z2, 'implicit');
		const result = evaluate(expr);
		expectComplexClose(result, 25, 0);
	});
});

// =============================================================================
// LaTeX Parsing and Round-Trip
// =============================================================================

describe('LaTeX parsing edge cases', () => {
	it('parses and evaluates -\\imaginaryI correctly', () => {
		const ast = parsePratt('-\\imaginaryI');
		const result = evaluate(ast);
		expectComplexClose(result, 0, -1);
	});

	it('parses 2\\imaginaryI as 2i', () => {
		const ast = parsePratt('2\\imaginaryI');
		const result = evaluate(ast);
		expectComplexClose(result, 0, 2);
	});

	it('parses complex expression with parentheses', () => {
		const ast = parsePratt('(1 + 2\\imaginaryI) \\times (3 + 4\\imaginaryI)');
		// (1+2i)(3+4i) = 3 + 4i + 6i + 8i^2 = 3 + 10i - 8 = -5 + 10i
		const result = evaluate(ast);
		expectComplexClose(result, -5, 10);
	});

	it('parses nested imaginary expressions', () => {
		const ast = parsePratt('\\imaginaryI^2 + 1');
		// i^2 + 1 = -1 + 1 = 0
		const result = evaluate(ast);
		expectComplexClose(result, 0, 0);
	});
});
