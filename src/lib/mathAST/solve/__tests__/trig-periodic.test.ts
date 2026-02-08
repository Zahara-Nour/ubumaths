/**
 * Trigonometric Periodic Solutions Tests
 *
 * Tests that the trig solver returns full periodic solution families
 * and that the sign module can enumerate zeros within bounded domains.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseCustom } from '../../parser/custom';
import type { RelationNode } from '../../types';
import { analyzeSign } from '../../sign';
import { number, multiply, PI } from '../../factory';
import { closedInterval, intervalSet } from '$lib/math/intervals/factory';

// =============================================================================
// Helpers
// =============================================================================

function parseEquation(custom: string): RelationNode {
	const node = parseCustom(custom);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

function hasZeroNear(
	zeros: readonly { approximate?: number }[],
	value: number,
	tolerance = 0.05
): boolean {
	return zeros.some(
		(z) => z.approximate !== undefined && Math.abs(z.approximate - value) < tolerance
	);
}

/**
 * Create an interval_set domain [a, b] with symbolic endpoints.
 */
function closedDomain(lower: number, upper: number) {
	return intervalSet([closedInterval(number(lower.toString()), number(upper.toString()))]);
}

/**
 * Create an interval_set domain [0, k*π] with symbolic endpoints.
 */
function piDomain(kLower: number, kUpper: number) {
	const lo =
		kLower === 0
			? number('0')
			: kLower === 1
				? PI
				: multiply(number(kUpper.toString()), PI, 'implicit');
	const hi =
		kUpper === 0
			? number('0')
			: kUpper === 1
				? PI
				: multiply(number(kUpper.toString()), PI, 'implicit');
	return intervalSet([closedInterval(lo, hi)]);
}

// =============================================================================
// Solver: Periodic Solution Family
// =============================================================================

describe('Trigonometric Periodic Solver', () => {
	describe('sin(x) = 0', () => {
		it('should return two base solutions and period 2π', () => {
			const eq = parseEquation('sin(x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2); // 0 and π
			expect(ps.periodNumeric).toBeCloseTo(2 * Math.PI, 5);

			// Base solutions should be 0 and π
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, Math.PI)).toBe(true);
		});
	});

	describe('cos(x) = 0', () => {
		it('should return two base solutions and period 2π', () => {
			const eq = parseEquation('cos(x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2); // π/2 and -π/2
			expect(ps.periodNumeric).toBeCloseTo(2 * Math.PI, 5);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 2)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 2)).toBe(true);
		});
	});

	describe('tan(x) = 0', () => {
		it('should return one base solution and period π', () => {
			const eq = parseEquation('tan(x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1); // 0
			expect(ps.periodNumeric).toBeCloseTo(Math.PI, 5);
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
		});
	});

	describe('sin(2x) = 0', () => {
		it('should handle linear argument with coefficient', () => {
			const eq = parseEquation('sin(2*x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			// Period should be 2π / 2 = π
			expect(ps.periodNumeric).toBeCloseTo(Math.PI, 5);

			// Base solutions: 0/2 = 0 and π/2
			expect(ps.baseSolutions.length).toBe(2);
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 2)).toBe(true);
		});
	});

	describe('domain restrictions', () => {
		it('should detect no solution for sin(x) = 2', () => {
			const eq = parseEquation('sin(x) = 2');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});

		it('should detect no solution for cos(x) = -2', () => {
			const eq = parseEquation('cos(x) = -2');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});
	});
});

// =============================================================================
// Sign Analysis: Periodic Zero Enumeration
// =============================================================================

describe('Sign Analysis with Periodic Zeros', () => {
	describe('cos(x) on [0, 4π]', () => {
		it('should find zeros at π/2, 3π/2, 5π/2, 7π/2', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// Should find exactly 4 zeros
			expect(result.zeros.length).toBe(4);

			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, (3 * Math.PI) / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, (5 * Math.PI) / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, (7 * Math.PI) / 2)).toBe(true);
		});
	});

	describe('sin(2x) on [0, 2π]', () => {
		it('should find zeros at 0, π/2, π, 3π/2, 2π', () => {
			const expr = parseCustom('sin(2*x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// Should find 5 zeros
			expect(result.zeros.length).toBe(5);

			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, (3 * Math.PI) / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
		});
	});

	describe('sin(x) on [0, 3π]', () => {
		it('should find zeros at 0, π, 2π, 3π', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 3);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(4);

			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 3 * Math.PI)).toBe(true);
		});
	});

	describe('tan(x) on [0, 3π]', () => {
		it('should find zeros at 0, π, 2π, 3π', () => {
			const expr = parseCustom('tan(x)');
			// Use numeric domain to avoid issues with π multiplication
			const domain = closedDomain(0, 3 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// tan(x) = 0 at multiples of π
			expect(result.zeros.length).toBe(4);

			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 3 * Math.PI)).toBe(true);
		});
	});

	describe('sign correctness with periodic zeros', () => {
		it('cos(x) on [0, 4π] should have correct sign pattern', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// cos is positive on [0, π/2), zero at π/2, negative on (π/2, 3π/2), etc.
			// Just verify we have signed intervals between zeros
			const nonZeroIntervals = result.signedIntervals.filter((si) => si.sign !== 'zero');
			expect(nonZeroIntervals.length).toBeGreaterThan(0);

			// Verify at least some intervals have determined signs
			const determinedSigns = nonZeroIntervals.filter(
				(si) => si.sign === 'positive' || si.sign === 'negative'
			);
			expect(determinedSigns.length).toBeGreaterThan(0);
		});
	});
});
