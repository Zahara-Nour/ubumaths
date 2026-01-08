/**
 * Tests for nth roots of complex numbers
 *
 * Tests: nthroot(z, n, k), rootofunity(n, k), principalroot(z, n)
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
// Tests: rootofunity(n, k)
// =============================================================================

describe('rootofunity(n, k) - nth roots of unity', () => {
	describe('square roots of unity (n=2)', () => {
		it('rootofunity(2, 0) = 1', () => {
			expectComplex('\\rootofunity(2, 0)', 1, 0);
		});

		it('rootofunity(2, 1) = -1', () => {
			expectComplex('\\rootofunity(2, 1)', -1, 0);
		});
	});

	describe('cube roots of unity (n=3)', () => {
		it('rootofunity(3, 0) = 1', () => {
			expectComplex('\\rootofunity(3, 0)', 1, 0);
		});

		it('rootofunity(3, 1) = -1/2 + i*sqrt(3)/2', () => {
			// e^{2πi/3} = cos(2π/3) + i*sin(2π/3)
			expectComplex('\\rootofunity(3, 1)', -0.5, Math.sqrt(3) / 2);
		});

		it('rootofunity(3, 2) = -1/2 - i*sqrt(3)/2', () => {
			// e^{4πi/3} = cos(4π/3) + i*sin(4π/3)
			expectComplex('\\rootofunity(3, 2)', -0.5, -Math.sqrt(3) / 2);
		});
	});

	describe('fourth roots of unity (n=4)', () => {
		it('rootofunity(4, 0) = 1', () => {
			expectComplex('\\rootofunity(4, 0)', 1, 0);
		});

		it('rootofunity(4, 1) = i', () => {
			expectComplex('\\rootofunity(4, 1)', 0, 1);
		});

		it('rootofunity(4, 2) = -1', () => {
			expectComplex('\\rootofunity(4, 2)', -1, 0);
		});

		it('rootofunity(4, 3) = -i', () => {
			expectComplex('\\rootofunity(4, 3)', 0, -1);
		});
	});

	describe('sixth roots of unity (n=6)', () => {
		it('rootofunity(6, 1) = 1/2 + i*sqrt(3)/2', () => {
			// e^{2πi/6} = e^{πi/3} = cos(π/3) + i*sin(π/3)
			expectComplex('\\rootofunity(6, 1)', 0.5, Math.sqrt(3) / 2);
		});

		it('rootofunity(6, 2) = -1/2 + i*sqrt(3)/2', () => {
			// e^{2πi*2/6} = e^{2πi/3}
			expectComplex('\\rootofunity(6, 2)', -0.5, Math.sqrt(3) / 2);
		});

		it('rootofunity(6, 3) = -1', () => {
			expectComplex('\\rootofunity(6, 3)', -1, 0);
		});
	});

	describe('wrapping behavior for k', () => {
		it('rootofunity(4, 4) = rootofunity(4, 0) = 1 (wraps)', () => {
			expectComplex('\\rootofunity(4, 4)', 1, 0);
		});

		it('rootofunity(4, 5) = rootofunity(4, 1) = i (wraps)', () => {
			expectComplex('\\rootofunity(4, 5)', 0, 1);
		});

		it('rootofunity(3, -1) = rootofunity(3, 2) (negative k wraps)', () => {
			// e^{-2πi/3} = e^{4πi/3}
			expectComplex('\\rootofunity(3, -1)', -0.5, -Math.sqrt(3) / 2);
		});
	});

	describe('product of all roots equals 0 or (-1)^(n-1)', () => {
		it('sum of cube roots of unity = 0', () => {
			// ω^0 + ω^1 + ω^2 = 1 + (-1/2 + i√3/2) + (-1/2 - i√3/2) = 0
			const sum = evalComplex('\\rootofunity(3, 0) + \\rootofunity(3, 1) + \\rootofunity(3, 2)');
			expect(sum).not.toBeNull();
			expect(sum!.real).toBeCloseTo(0, 10);
			expect(sum!.imag).toBeCloseTo(0, 10);
		});
	});
});

// =============================================================================
// Tests: nthroot(z, n, k)
// =============================================================================

describe('nthroot(z, n, k) - general nth roots', () => {
	describe('cube roots of 8', () => {
		it('nthroot(8, 3, 0) = 2 (principal root)', () => {
			expectReal('\\nthroot(8, 3, 0)', 2);
		});

		it('nthroot(8, 3, 1) = -1 + i*sqrt(3)', () => {
			// 2 * e^{2πi/3} = 2 * (-1/2 + i*√3/2) = -1 + i√3
			expectComplex('\\nthroot(8, 3, 1)', -1, Math.sqrt(3));
		});

		it('nthroot(8, 3, 2) = -1 - i*sqrt(3)', () => {
			// 2 * e^{4πi/3} = 2 * (-1/2 - i*√3/2) = -1 - i√3
			expectComplex('\\nthroot(8, 3, 2)', -1, -Math.sqrt(3));
		});
	});

	describe('square roots of 4', () => {
		it('nthroot(4, 2, 0) = 2', () => {
			expectReal('\\nthroot(4, 2, 0)', 2);
		});

		it('nthroot(4, 2, 1) = -2', () => {
			expectReal('\\nthroot(4, 2, 1)', -2);
		});
	});

	describe('square roots of -1', () => {
		it('nthroot(-1, 2, 0) = i', () => {
			// sqrt(-1) principal = e^{iπ/2} = i
			expectComplex('\\nthroot(-1, 2, 0)', 0, 1);
		});

		it('nthroot(-1, 2, 1) = -i', () => {
			// sqrt(-1) second root = e^{i(π + 2π)/2} = e^{3πi/2} = -i
			expectComplex('\\nthroot(-1, 2, 1)', 0, -1);
		});
	});

	describe('square roots of -4', () => {
		it('nthroot(-4, 2, 0) = 2i', () => {
			expectComplex('\\nthroot(-4, 2, 0)', 0, 2);
		});

		it('nthroot(-4, 2, 1) = -2i', () => {
			expectComplex('\\nthroot(-4, 2, 1)', 0, -2);
		});
	});

	describe('cube roots of -8', () => {
		it('nthroot(-8, 3, 0) = 1 + i*sqrt(3) (principal)', () => {
			// |-8|^(1/3) = 2, arg(-8) = π
			// Root 0: 2 * e^{iπ/3} = 2 * (1/2 + i√3/2) = 1 + i√3
			expectComplex('\\nthroot(-8, 3, 0)', 1, Math.sqrt(3));
		});

		it('nthroot(-8, 3, 1) = -2 (real root)', () => {
			// Root 1: 2 * e^{i(π + 2π)/3} = 2 * e^{iπ} = -2
			expectReal('\\nthroot(-8, 3, 1)', -2);
		});

		it('nthroot(-8, 3, 2) = 1 - i*sqrt(3)', () => {
			// Root 2: 2 * e^{i(π + 4π)/3} = 2 * e^{5πi/3} = 1 - i√3
			expectComplex('\\nthroot(-8, 3, 2)', 1, -Math.sqrt(3));
		});
	});

	describe('roots of complex numbers', () => {
		it('nthroot(i, 2, 0) = (1 + i)/sqrt(2)', () => {
			// |i| = 1, arg(i) = π/2
			// Root 0: e^{iπ/4} = cos(π/4) + i*sin(π/4) = (√2/2, √2/2)
			const s = Math.sqrt(2) / 2;
			expectComplex('\\nthroot(\\imaginaryI, 2, 0)', s, s);
		});

		it('nthroot(i, 2, 1) = -(1 + i)/sqrt(2)', () => {
			// Root 1: e^{i(π/2 + 2π)/2} = e^{5πi/4}
			const s = Math.sqrt(2) / 2;
			expectComplex('\\nthroot(\\imaginaryI, 2, 1)', -s, -s);
		});

		it('nthroot(1 + i, 2, 0) computes correctly', () => {
			// |1+i| = √2, arg(1+i) = π/4
			// Root 0: (√2)^(1/2) * e^{iπ/8}
			const mod = Math.pow(Math.sqrt(2), 0.5); // = 2^(1/4)
			const theta = Math.PI / 8;
			expectComplex(
				'\\nthroot(1 + \\imaginaryI, 2, 0)',
				mod * Math.cos(theta),
				mod * Math.sin(theta)
			);
		});
	});

	describe('edge cases', () => {
		it('nthroot(0, 3, 0) = 0', () => {
			expectReal('\\nthroot(0, 3, 0)', 0);
		});

		it('nthroot(0, 3, 1) = 0', () => {
			expectReal('\\nthroot(0, 3, 1)', 0);
		});

		it('nthroot(z, 1, 0) = z', () => {
			expectComplex('\\nthroot(3 + 4\\imaginaryI, 1, 0)', 3, 4);
		});

		it('nthroot(1, n, k) = rootofunity(n, k)', () => {
			// nthroot(1, 4, 1) should equal rootofunity(4, 1) = i
			expectComplex('\\nthroot(1, 4, 1)', 0, 1);
		});
	});

	describe('error handling', () => {
		it('throws when k >= n', () => {
			expectThrows('\\nthroot(8, 3, 3)');
		});

		it('throws when k < 0 for nthroot', () => {
			expectThrows('\\nthroot(8, 3, -1)');
		});

		it('throws when n <= 0', () => {
			expectThrows('\\nthroot(8, 0, 0)');
		});

		it('throws when n is not integer', () => {
			expectThrows('\\nthroot(8, 2.5, 0)');
		});
	});
});

// =============================================================================
// Tests: principalroot(z, n)
// =============================================================================

describe('principalroot(z, n) - convenience function', () => {
	it('principalroot(8, 3) = 2', () => {
		expectReal('\\principalroot(8, 3)', 2);
	});

	it('principalroot(16, 4) = 2', () => {
		expectReal('\\principalroot(16, 4)', 2);
	});

	it('principalroot(-1, 2) = i', () => {
		expectComplex('\\principalroot(-1, 2)', 0, 1);
	});

	it('principalroot(-8, 3) = 1 + i*sqrt(3)', () => {
		expectComplex('\\principalroot(-8, 3)', 1, Math.sqrt(3));
	});

	it('principalroot(i, 2) = (1 + i)/sqrt(2)', () => {
		const s = Math.sqrt(2) / 2;
		expectComplex('\\principalroot(\\imaginaryI, 2)', s, s);
	});

	it('principalroot is equivalent to nthroot(z, n, 0)', () => {
		const principal = evalComplex('\\principalroot(8, 3)');
		const nthroot0 = evalComplex('\\nthroot(8, 3, 0)');
		expect(principal).not.toBeNull();
		expect(nthroot0).not.toBeNull();
		expect(principal!.real).toBeCloseTo(nthroot0!.real, 10);
		expect(principal!.imag).toBeCloseTo(nthroot0!.imag, 10);
	});
});

// =============================================================================
// Tests: Mathematical identities
// =============================================================================

describe('mathematical identities', () => {
	it('(nthroot(z, n, k))^n = z (verification)', () => {
		// Verify that the cube root cubed gives back the original
		// nthroot(8, 3, 1)^3 should equal 8
		const root = evalComplex('\\nthroot(8, 3, 1)');
		expect(root).not.toBeNull();
		// Manually compute root^3
		// (-1 + i√3)^3 = (-1)^3 + 3*(-1)^2*(i√3) + 3*(-1)*(i√3)^2 + (i√3)^3
		// = -1 + 3i√3 + 9 + (-3√3)i = 8
		// But let's verify with evaluation
		const cubed = evalComplex('(\\nthroot(8, 3, 1))^{3}');
		expect(cubed).not.toBeNull();
		expect(cubed!.real).toBeCloseTo(8, 9);
		expect(cubed!.imag).toBeCloseTo(0, 9);
	});

	it('rootofunity(n, k)^n = 1 for all k', () => {
		// (e^{2πik/n})^n = e^{2πik} = 1
		const result = evalComplex('(\\rootofunity(5, 3))^{5}');
		expect(result).not.toBeNull();
		expect(result!.real).toBeCloseTo(1, 9);
		expect(result!.imag).toBeCloseTo(0, 9);
	});

	it('rootofunity(n, 1) * rootofunity(n, 1) = rootofunity(n, 2)', () => {
		// ω * ω = ω^2
		const _omega1 = evalComplex('\\rootofunity(5, 1)'); // Used to verify formula
		const omega2 = evalComplex('\\rootofunity(5, 2)');
		const product = evalComplex('\\rootofunity(5, 1) \\cdot \\rootofunity(5, 1)');
		expect(product).not.toBeNull();
		expect(omega2).not.toBeNull();
		expect(product!.real).toBeCloseTo(omega2!.real, 10);
		expect(product!.imag).toBeCloseTo(omega2!.imag, 10);
	});
});
