/**
 * Tests for polar/exponential form of complex numbers
 *
 * Tests: exp(complex), ln(complex), cis(), complex power z^w,
 * toPolar(), fromPolar()
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { parsePratt } from '../../parser/latex/parser-pratt';
import type { ComplexValueResult } from '../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract complex value from evaluation result
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
 * Evaluate LaTeX and return complex value
 */
function evalComplex(latex: string): { real: number; imag: number } | null {
	const ast = parsePratt(latex);
	const result = evaluate(ast);
	return getComplexValue(result);
}

/**
 * Assert complex value equality with tolerance
 */
function expectComplex(
	latex: string,
	expectedReal: number,
	expectedImag: number,
	tolerance = 1e-10
) {
	const value = evalComplex(latex);
	expect(value).not.toBeNull();
	expect(value!.real).toBeCloseTo(expectedReal, -Math.log10(tolerance));
	expect(value!.imag).toBeCloseTo(expectedImag, -Math.log10(tolerance));
}

/**
 * Assert real value (possibly from complex with zero imag)
 */
function expectReal(latex: string, expected: number, tolerance = 1e-10) {
	const value = evalComplex(latex);
	expect(value).not.toBeNull();
	expect(value!.imag).toBeCloseTo(0, -Math.log10(tolerance));
	expect(value!.real).toBeCloseTo(expected, -Math.log10(tolerance));
}

/**
 * Assert evaluation throws
 */
function expectThrows(latex: string) {
	const ast = parsePratt(latex);
	expect(() => evaluate(ast)).toThrow();
}

// =============================================================================
// Tests: exp() with complex arguments
// =============================================================================

describe('exp() with complex arguments', () => {
	describe('Euler formula: exp(a + bi) = e^a * (cos(b) + i*sin(b))', () => {
		it('exp(0) = 1 (real)', () => {
			expectReal('\\exp(0)', 1);
		});

		it('exp(i*0) = 1 (complex with zero imaginary)', () => {
			expectComplex('\\exp(\\imaginaryI \\cdot 0)', 1, 0);
		});

		it('exp(i*pi) = -1 (Euler identity)', () => {
			expectComplex('\\exp(\\imaginaryI \\cdot \\pi)', -1, 0);
		});

		it('exp(i*pi/2) = i', () => {
			expectComplex('\\exp(\\imaginaryI \\cdot \\frac{\\pi}{2})', 0, 1);
		});

		it('exp(-i*pi/2) = -i', () => {
			expectComplex('\\exp(-\\imaginaryI \\cdot \\frac{\\pi}{2})', 0, -1);
		});

		it('exp(2*i*pi) = 1 (full rotation)', () => {
			expectComplex('\\exp(2 \\cdot \\imaginaryI \\cdot \\pi)', 1, 0);
		});

		it('exp(1 + i*pi) = -e', () => {
			expectComplex('\\exp(1 + \\imaginaryI \\cdot \\pi)', -Math.E, 0);
		});

		it('exp(1 + i*pi/2) = e*i', () => {
			expectComplex('\\exp(1 + \\imaginaryI \\cdot \\frac{\\pi}{2})', 0, Math.E);
		});

		it('exp(i*pi/4) = (sqrt(2)/2) + i*(sqrt(2)/2)', () => {
			const s = Math.sqrt(2) / 2;
			expectComplex('\\exp(\\imaginaryI \\cdot \\frac{\\pi}{4})', s, s);
		});

		it('exp(2 + 3i) computes correctly', () => {
			// exp(2+3i) = e^2 * (cos(3) + i*sin(3))
			const e2 = Math.exp(2);
			expectComplex('\\exp(2 + 3\\imaginaryI)', e2 * Math.cos(3), e2 * Math.sin(3));
		});

		it('exp(-1 - i) computes correctly', () => {
			const eNeg1 = Math.exp(-1);
			expectComplex('\\exp(-1 - \\imaginaryI)', eNeg1 * Math.cos(-1), eNeg1 * Math.sin(-1));
		});
	});

	describe('exp() with pure imaginary', () => {
		it('exp(i) = cos(1) + i*sin(1)', () => {
			expectComplex('\\exp(\\imaginaryI)', Math.cos(1), Math.sin(1));
		});

		it('exp(-i) = cos(1) - i*sin(1)', () => {
			expectComplex('\\exp(-\\imaginaryI)', Math.cos(1), -Math.sin(1));
		});

		it('exp(2i) = cos(2) + i*sin(2)', () => {
			expectComplex('\\exp(2\\imaginaryI)', Math.cos(2), Math.sin(2));
		});
	});
});

// =============================================================================
// Tests: ln() with complex arguments
// =============================================================================

describe('ln() with complex arguments', () => {
	describe('principal value: ln(z) = ln|z| + i*arg(z)', () => {
		it('ln(1) = 0', () => {
			expectReal('\\ln(1)', 0);
		});

		it('ln(e) = 1', () => {
			// Use exp(1) instead of e since e is not a recognized constant
			expectReal('\\ln(\\exp(1))', 1);
		});

		it('ln(-1) = i*pi', () => {
			expectComplex('\\ln(-1)', 0, Math.PI);
		});

		it('ln(i) = i*pi/2', () => {
			expectComplex('\\ln(\\imaginaryI)', 0, Math.PI / 2);
		});

		it('ln(-i) = -i*pi/2', () => {
			expectComplex('\\ln(-\\imaginaryI)', 0, -Math.PI / 2);
		});

		it('ln(-e) = 1 + i*pi', () => {
			// ln(-e) = ln(e) + i*pi = 1 + i*pi
			expectComplex('\\ln(-\\exp(1))', 1, Math.PI);
		});

		it('ln(2i) = ln(2) + i*pi/2', () => {
			expectComplex('\\ln(2\\imaginaryI)', Math.log(2), Math.PI / 2);
		});

		it('ln(1 + i) = ln(sqrt(2)) + i*pi/4', () => {
			expectComplex('\\ln(1 + \\imaginaryI)', Math.log(Math.sqrt(2)), Math.PI / 4);
		});

		it('ln(3 + 4i) = ln(5) + i*atan(4/3)', () => {
			expectComplex('\\ln(3 + 4\\imaginaryI)', Math.log(5), Math.atan2(4, 3));
		});

		it('ln(-3 + 4i) computes correctly', () => {
			const modulus = Math.sqrt(9 + 16); // 5
			const arg = Math.atan2(4, -3);
			expectComplex('\\ln(-3 + 4\\imaginaryI)', Math.log(modulus), arg);
		});

		it('ln(-3 - 4i) computes correctly', () => {
			const modulus = Math.sqrt(9 + 16); // 5
			const arg = Math.atan2(-4, -3);
			expectComplex('\\ln(-3 - 4\\imaginaryI)', Math.log(modulus), arg);
		});
	});

	describe('ln(0) throws error', () => {
		it('ln(0) throws', () => {
			expectThrows('\\ln(0)');
		});

		it('ln(0 + 0i) throws', () => {
			expectThrows('\\ln(0 + 0\\imaginaryI)');
		});
	});
});

// =============================================================================
// Tests: cis() function
// =============================================================================

describe('cis() function', () => {
	describe('cis(theta) = cos(theta) + i*sin(theta)', () => {
		it('cis(0) = 1', () => {
			expectComplex('\\cis(0)', 1, 0);
		});

		it('cis(pi) = -1', () => {
			expectComplex('\\cis(\\pi)', -1, 0);
		});

		it('cis(pi/2) = i', () => {
			expectComplex('\\cis(\\frac{\\pi}{2})', 0, 1);
		});

		it('cis(-pi/2) = -i', () => {
			expectComplex('\\cis(-\\frac{\\pi}{2})', 0, -1);
		});

		it('cis(pi/4) = sqrt(2)/2 + i*sqrt(2)/2', () => {
			const s = Math.sqrt(2) / 2;
			expectComplex('\\cis(\\frac{\\pi}{4})', s, s);
		});

		it('cis(2*pi) = 1', () => {
			expectComplex('\\cis(2\\pi)', 1, 0);
		});

		it('cis(1) = cos(1) + i*sin(1)', () => {
			expectComplex('\\cis(1)', Math.cos(1), Math.sin(1));
		});

		it('cis(-1) = cos(1) - i*sin(1)', () => {
			expectComplex('\\cis(-1)', Math.cos(1), -Math.sin(1));
		});
	});

	describe('cis equivalence to exp(i*theta)', () => {
		it('cis(pi/3) equals exp(i*pi/3)', () => {
			const cis = evalComplex('\\cis(\\frac{\\pi}{3})');
			const exp = evalComplex('\\exp(\\imaginaryI \\cdot \\frac{\\pi}{3})');
			expect(cis).not.toBeNull();
			expect(exp).not.toBeNull();
			expect(cis!.real).toBeCloseTo(exp!.real, 10);
			expect(cis!.imag).toBeCloseTo(exp!.imag, 10);
		});
	});
});

// =============================================================================
// Tests: Complex power z^w
// =============================================================================

describe('Complex power z^w', () => {
	describe('z^w = exp(w * ln(z))', () => {
		it('i^2 = -1', () => {
			expectComplex('\\imaginaryI^{2}', -1, 0);
		});

		it('i^3 = -i', () => {
			expectComplex('\\imaginaryI^{3}', 0, -1);
		});

		it('i^4 = 1', () => {
			expectComplex('\\imaginaryI^{4}', 1, 0);
		});

		it('i^i = e^(-pi/2)', () => {
			// i^i = exp(i * ln(i)) = exp(i * i*pi/2) = exp(-pi/2)
			expectReal('\\imaginaryI^{\\imaginaryI}', Math.exp(-Math.PI / 2));
		});

		it('(-1)^0.5 = i (principal value)', () => {
			expectComplex('(-1)^{0.5}', 0, 1);
		});

		it('(-1)^(1/2) = i', () => {
			expectComplex('(-1)^{\\frac{1}{2}}', 0, 1);
		});

		it('(1+i)^2 = 2i', () => {
			expectComplex('(1 + \\imaginaryI)^{2}', 0, 2);
		});

		it('(1+i)^3 = -2 + 2i', () => {
			expectComplex('(1 + \\imaginaryI)^{3}', -2, 2);
		});

		it('(2+i)^(1+i) computes correctly', () => {
			// (2+i)^(1+i) = exp((1+i) * ln(2+i))
			// ln(2+i) = ln(sqrt(5)) + i*atan(1/2)
			const lnMod = Math.log(Math.sqrt(5));
			const lnArg = Math.atan2(1, 2);
			// (1+i) * (lnMod + i*lnArg) = lnMod - lnArg + i*(lnMod + lnArg)
			const realPart = lnMod - lnArg;
			const imagPart = lnMod + lnArg;
			// exp(realPart + i*imagPart)
			const expectedReal = Math.exp(realPart) * Math.cos(imagPart);
			const expectedImag = Math.exp(realPart) * Math.sin(imagPart);
			expectComplex('(2 + \\imaginaryI)^{1 + \\imaginaryI}', expectedReal, expectedImag);
		});
	});

	describe('special cases', () => {
		it('z^0 = 1 for any non-zero z', () => {
			expectComplex('(3 + 4\\imaginaryI)^{0}', 1, 0);
		});

		it('z^1 = z', () => {
			expectComplex('(3 + 4\\imaginaryI)^{1}', 3, 4);
		});

		it('0^n = 0 for n > 0', () => {
			expectReal('0^{2}', 0);
		});

		it('exp(i*pi) = -1 via exp function', () => {
			// Test exp(i*pi) using the exp function directly
			expectComplex('\\exp(\\imaginaryI \\cdot \\pi)', -1, 0);
		});
	});

	describe('negative base with real exponent', () => {
		it('(-8)^(1/3) computes principal value', () => {
			// Principal value: (-8)^(1/3) = 2*exp(i*pi/3) = 1 + i*sqrt(3)
			const mod = Math.pow(8, 1 / 3);
			const arg = Math.PI / 3;
			expectComplex('(-8)^{\\frac{1}{3}}', mod * Math.cos(arg), mod * Math.sin(arg));
		});

		it('(-4)^(1/2) = 2i', () => {
			expectComplex('(-4)^{\\frac{1}{2}}', 0, 2);
		});
	});
});

// =============================================================================
// Tests: fromPolar() conversion
// =============================================================================

describe('fromPolar() conversion', () => {
	describe('fromPolar(r, theta) = r*cis(theta)', () => {
		it('fromPolar(1, 0) = 1', () => {
			expectComplex('\\frompolar(1, 0)', 1, 0);
		});

		it('fromPolar(1, pi/2) = i', () => {
			expectComplex('\\frompolar(1, \\frac{\\pi}{2})', 0, 1);
		});

		it('fromPolar(1, pi) = -1', () => {
			expectComplex('\\frompolar(1, \\pi)', -1, 0);
		});

		it('fromPolar(2, pi/4) = sqrt(2) + i*sqrt(2)', () => {
			expectComplex('\\frompolar(2, \\frac{\\pi}{4})', Math.sqrt(2), Math.sqrt(2));
		});

		it('fromPolar(5, arg(3+4i)) = 3 + 4i (round-trip)', () => {
			// atan2(4, 3) ≈ 0.9273
			const theta = Math.atan2(4, 3);
			// Test using a numeric theta value via direct calculation
			const result = evalComplex(`\\frompolar(5, ${theta})`);
			expect(result).not.toBeNull();
			expect(result!.real).toBeCloseTo(3, 9);
			expect(result!.imag).toBeCloseTo(4, 9);
		});
	});
});

// =============================================================================
// Tests: exp and ln are inverses
// =============================================================================

describe('exp and ln are inverses', () => {
	it('ln(exp(1 + i)) = 1 + i (modulo 2pi)', () => {
		// Note: We test modulo 2*pi*i by checking values match
		const z = evalComplex('\\ln(\\exp(1 + \\imaginaryI))');
		expect(z).not.toBeNull();
		expect(z!.real).toBeCloseTo(1, 10);
		// Imaginary should be 1 (principal value)
		expect(z!.imag).toBeCloseTo(1, 10);
	});

	it('exp(ln(2 + 3i)) = 2 + 3i', () => {
		const z = evalComplex('\\exp(\\ln(2 + 3\\imaginaryI))');
		expect(z).not.toBeNull();
		expect(z!.real).toBeCloseTo(2, 10);
		expect(z!.imag).toBeCloseTo(3, 10);
	});
});
