/**
 * Trigonometric Periodic Solutions Tests
 *
 * Tests that the trig solver returns full periodic solution families
 * and that the sign module can enumerate zeros within bounded domains.
 *
 * Coverage:
 * - Solver: sin/cos/tan base solutions, period, special values, deduplication
 * - Linear arguments: coefficients (2x, 3x), negative coefficients (-x, -2x)
 * - Non-zero constants: sin(x) = 1/2, cos(x) = 1/2, tan(x) = 1
 * - Domain restrictions: out-of-range constants
 * - Sign analysis: zero enumeration on various domain shapes
 * - Boundary handling: open/closed endpoints, exact boundary zeros
 * - Large domains: many periods
 * - Narrow domains: single period, sub-period
 * - Negative domains: [-2π, 0], [-π, π]
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseCustom } from '../../parser/custom';
import type { RelationNode } from '../../types';
import { analyzeSign } from '../../sign';
import { number, multiply, PI } from '../../factory';
import {
	closedInterval,
	openInterval,
	leftClosedInterval,
	rightClosedInterval,
	intervalSet
} from '$lib/math/intervals/factory';

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

function hasNoZeroNear(
	zeros: readonly { approximate?: number }[],
	value: number,
	tolerance = 0.05
): boolean {
	return !hasZeroNear(zeros, value, tolerance);
}

/**
 * Create an interval_set domain [a, b] with symbolic endpoints.
 */
function closedDomain(lower: number, upper: number) {
	return intervalSet([closedInterval(number(lower.toString()), number(upper.toString()))]);
}

/**
 * Create an interval_set domain (a, b) with symbolic endpoints.
 */
function openDomain(lower: number, upper: number) {
	return intervalSet([openInterval(number(lower.toString()), number(upper.toString()))]);
}

/**
 * Create an interval_set domain [a, b) with symbolic endpoints.
 */
function leftClosedDomain(lower: number, upper: number) {
	return intervalSet([leftClosedInterval(number(lower.toString()), number(upper.toString()))]);
}

/**
 * Create an interval_set domain (a, b] with symbolic endpoints.
 */
function rightClosedDomain(lower: number, upper: number) {
	return intervalSet([rightClosedInterval(number(lower.toString()), number(upper.toString()))]);
}

/**
 * Create an interval_set domain [kLower*π, kUpper*π] with symbolic endpoints.
 */
function piDomain(kLower: number, kUpper: number) {
	const lo =
		kLower === 0
			? number('0')
			: kLower === 1
				? PI
				: multiply(number(kLower.toString()), PI, 'implicit');
	const hi =
		kUpper === 0
			? number('0')
			: kUpper === 1
				? PI
				: multiply(number(kUpper.toString()), PI, 'implicit');
	return intervalSet([closedInterval(lo, hi)]);
}

/**
 * Create an interval union [a, b] ∪ [c, d].
 */
function closedUnion(a: number, b: number, c: number, d: number) {
	return intervalSet([
		closedInterval(number(a.toString()), number(b.toString())),
		closedInterval(number(c.toString()), number(d.toString()))
	]);
}

// =============================================================================
// Solver: Periodic Solution Family
// =============================================================================

describe('Trigonometric Periodic Solver', () => {
	// =========================================================================
	// Basic trig = 0 cases
	// =========================================================================

	describe('sin(x) = 0', () => {
		it('should return two base solutions and period 2π', () => {
			const eq = parseEquation('sin(x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2); // 0 and π
			expect(ps.periodNumeric).toBeCloseTo(2 * Math.PI, 5);

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

	// =========================================================================
	// Linear argument coefficients: sin(ax) = 0
	// =========================================================================

	describe('sin(2x) = 0', () => {
		it('should handle linear argument with coefficient', () => {
			const eq = parseEquation('sin(2*x) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			// Period should be 2π / 2 = π
			expect(ps.periodNumeric).toBeCloseTo(Math.PI, 5);

			// Base solutions: 0 and π/2
			expect(ps.baseSolutions.length).toBe(2);
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 2)).toBe(true);
		});
	});

	describe('cos(3*x) = 0', () => {
		it('should have period 2π/3', () => {
			const eq = parseEquation('cos(3*x) = 0');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			expect(ps.periodNumeric).toBeCloseTo((2 * Math.PI) / 3, 5);

			// cos(u) = 0 → u = π/2, -π/2
			// x = u/3 → x = π/6, -π/6
			expect(ps.baseSolutions.length).toBe(2);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 6)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 6)).toBe(true);
		});
	});

	describe('tan(2*x) = 0', () => {
		it('should have period π/2', () => {
			const eq = parseEquation('tan(2*x) = 0');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			expect(ps.periodNumeric).toBeCloseTo(Math.PI / 2, 5);

			// tan(u) = 0 → u = 0 → x = 0
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
		});
	});

	// =========================================================================
	// Deduplication: solutions that merge modulo period
	// =========================================================================

	describe('sin(x) = 1 (single solution per period)', () => {
		it('should deduplicate arcsin(1) and π - arcsin(1) since both give π/2', () => {
			const eq = parseEquation('sin(x) = 1');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			// arcsin(1) = π/2, π - arcsin(1) = π/2 → same solution → only 1 base
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 2)).toBe(true);
		});
	});

	describe('sin(x) = -1 (single solution per period)', () => {
		it('should deduplicate to a single base solution at -π/2', () => {
			const eq = parseEquation('sin(x) = -1');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			// arcsin(-1) = -π/2, π - arcsin(-1) = 3π/2 ≡ -π/2 mod 2π → same
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 2)).toBe(true);
		});
	});

	describe('cos(x) = 1 (single solution per period)', () => {
		it('should deduplicate arccos(1) and -arccos(1) since both give 0', () => {
			const eq = parseEquation('cos(x) = 1');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			// arccos(1) = 0, -arccos(1) = 0 → same → only 1 base
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, 0)).toBe(true);
		});
	});

	describe('cos(x) = -1 (single solution per period)', () => {
		it('should deduplicate to a single base solution at π', () => {
			const eq = parseEquation('cos(x) = -1');
			const result = solve(eq);

			expect(result.periodicSolutions).toBeDefined();
			const ps = result.periodicSolutions!;
			// arccos(-1) = π, -arccos(-1) = -π ≡ π mod 2π → same → only 1 base
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, Math.PI)).toBe(true);
		});
	});

	// =========================================================================
	// Non-zero constants: trig(x) = c (remarkable values)
	// =========================================================================

	describe('remarkable values: simple fractions', () => {
		it('sin(x) = 1/2 should return two base solutions: π/6 and 5π/6', () => {
			const eq = parseEquation('sin(x) - 1/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);
			expect(ps.periodNumeric).toBeCloseTo(2 * Math.PI, 5);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 6)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, (5 * Math.PI) / 6)).toBe(true);
		});

		it('cos(x) = 1/2 should return two base solutions: π/3 and -π/3', () => {
			const eq = parseEquation('cos(x) - 1/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);
			expect(ps.periodNumeric).toBeCloseTo(2 * Math.PI, 5);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 3)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 3)).toBe(true);
		});

		it('cos(x) = -1/2 should return two base solutions: 2π/3 and -2π/3', () => {
			const eq = parseEquation('cos(x) + 1/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, (2 * Math.PI) / 3)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, (-2 * Math.PI) / 3)).toBe(true);
		});

		it('sin(x) = -1/2 should return two base solutions: -π/6 and 7π/6', () => {
			const eq = parseEquation('sin(x) + 1/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 6)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, Math.PI + Math.PI / 6)).toBe(true);
		});

		it('tan(x) = 1 should return one base solution: π/4', () => {
			const eq = parseEquation('tan(x) - 1 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1);
			expect(ps.periodNumeric).toBeCloseTo(Math.PI, 5);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 4)).toBe(true);
		});

		it('tan(x) = -1 should return one base solution: -π/4', () => {
			const eq = parseEquation('tan(x) + 1 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 4)).toBe(true);
		});
	});

	describe('remarkable values: radicals (√2/2, √3/2, √3)', () => {
		it('cos(x) = √2/2 should return two base solutions: π/4 and -π/4', () => {
			const eq = parseEquation('cos(x) - sqrt(2)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 4)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 4)).toBe(true);
		});

		it('sin(x) = √2/2 should return two base solutions: π/4 and 3π/4', () => {
			const eq = parseEquation('sin(x) - sqrt(2)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 4)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, (3 * Math.PI) / 4)).toBe(true);
		});

		it('cos(x) = √3/2 should return two base solutions: π/6 and -π/6', () => {
			const eq = parseEquation('cos(x) - sqrt(3)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 6)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 6)).toBe(true);
		});

		it('sin(x) = √3/2 should return two base solutions: π/3 and 2π/3', () => {
			const eq = parseEquation('sin(x) - sqrt(3)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, Math.PI / 3)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, (2 * Math.PI) / 3)).toBe(true);
		});

		it('tan(x) = √3 should return one base solution: π/3', () => {
			const eq = parseEquation('tan(x) - sqrt(3) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 3)).toBe(true);
		});

		it('tan(x) = √3/3 (= 1/√3) should return one base solution: π/6', () => {
			const eq = parseEquation('tan(x) - sqrt(3)/3 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, Math.PI / 6)).toBe(true);
		});

		it('tan(x) = -√3 should return one base solution: -π/3', () => {
			const eq = parseEquation('tan(x) + sqrt(3) = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(1);
			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 3)).toBe(true);
		});

		it('cos(x) = -√2/2 should return two base solutions: 3π/4 and -3π/4', () => {
			const eq = parseEquation('cos(x) + sqrt(2)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, (3 * Math.PI) / 4)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, (-3 * Math.PI) / 4)).toBe(true);
		});

		it('sin(x) = -√3/2 should return two base solutions: -π/3 and π + π/3', () => {
			const eq = parseEquation('sin(x) + sqrt(3)/2 = 0');
			const result = solve(eq);

			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();

			const ps = result.periodicSolutions!;
			expect(ps.baseSolutions.length).toBe(2);

			expect(hasZeroNear(ps.baseSolutions, -Math.PI / 3)).toBe(true);
			expect(hasZeroNear(ps.baseSolutions, Math.PI + Math.PI / 3)).toBe(true);
		});
	});

	// =========================================================================
	// Domain restrictions (no solution)
	// =========================================================================

	describe('domain restrictions', () => {
		it('should detect no solution for sin(x) = 2', () => {
			const eq = parseEquation('sin(x) = 2');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});

		it('should detect no solution for sin(x) = -2', () => {
			const eq = parseEquation('sin(x) = -2');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});

		it('should detect no solution for cos(x) = -2', () => {
			const eq = parseEquation('cos(x) = -2');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});

		it('should detect no-real-solution for cos(x) = 1.5', () => {
			const eq = parseEquation('cos(x) - 3/2 = 0');
			const result = solve(eq);
			expect(result.status).toBe('no-real-solution');
		});

		it('tan(x) = 1000 should have a solution', () => {
			const eq = parseEquation('tan(x) - 1000 = 0');
			const result = solve(eq);
			expect(result.equationType).toBe('trigonometric');
			expect(result.periodicSolutions).toBeDefined();
			expect(result.periodicSolutions!.baseSolutions.length).toBe(1);
			expect(result.periodicSolutions!.baseSolutions[0].approximate).toBeCloseTo(
				Math.atan(1000),
				5
			);
		});
	});

	// =========================================================================
	// Solutions have correct exact flag
	// =========================================================================

	describe('solution metadata', () => {
		it('all solutions should be marked as exact', () => {
			const eq = parseEquation('sin(x) = 0');
			const result = solve(eq);
			for (const sol of result.solutions) {
				expect(sol.exact).toBe(true);
			}
		});

		it('all solutions should have numeric approximation', () => {
			const eq = parseEquation('cos(x) = 0');
			const result = solve(eq);
			for (const sol of result.solutions) {
				expect(sol.approximate).toBeDefined();
				expect(typeof sol.approximate).toBe('number');
				expect(isFinite(sol.approximate!)).toBe(true);
			}
		});
	});
});

// =============================================================================
// Non-linear Trig Arguments (Recursive Decomposition)
// =============================================================================

describe('Non-linear trig arguments (recursive decomposition)', () => {
	it('sin(x²) = 0 → x = 0, ±√π', () => {
		const eq = parseEquation('sin(x^2) = 0');
		const result = solve(eq);

		expect(result.equationType).toBe('trigonometric');
		expect(result.periodicSolutions).toBeUndefined();

		// sin(u) = 0 → u = 0, π → x² = 0 or x² = π → x = 0, ±√π
		expect(result.solutions.length).toBe(3);
		expect(hasZeroNear(result.solutions, 0)).toBe(true);
		expect(hasZeroNear(result.solutions, Math.sqrt(Math.PI))).toBe(true);
		expect(hasZeroNear(result.solutions, -Math.sqrt(Math.PI))).toBe(true);
	});

	it('sin(x²) = 1/2 → x = ±√(π/6), ±√(5π/6)', () => {
		const eq = parseEquation('sin(x^2) - 1/2 = 0');
		const result = solve(eq);

		expect(result.equationType).toBe('trigonometric');
		expect(result.periodicSolutions).toBeUndefined();

		// sin(u) = 1/2 → u = π/6, 5π/6 → x² = π/6 or x² = 5π/6
		expect(result.solutions.length).toBe(4);
		expect(hasZeroNear(result.solutions, Math.sqrt(Math.PI / 6))).toBe(true);
		expect(hasZeroNear(result.solutions, -Math.sqrt(Math.PI / 6))).toBe(true);
		expect(hasZeroNear(result.solutions, Math.sqrt((5 * Math.PI) / 6))).toBe(true);
		expect(hasZeroNear(result.solutions, -Math.sqrt((5 * Math.PI) / 6))).toBe(true);
	});

	it('cos(x²) = 1/2 → x = ±√(π/3)', () => {
		const eq = parseEquation('cos(x^2) - 1/2 = 0');
		const result = solve(eq);

		expect(result.equationType).toBe('trigonometric');
		expect(result.periodicSolutions).toBeUndefined();

		// cos(u) = 1/2 → u = π/3, -π/3 → x² = π/3 (x² = -π/3 impossible)
		expect(result.solutions.length).toBe(2);
		expect(hasZeroNear(result.solutions, Math.sqrt(Math.PI / 3))).toBe(true);
		expect(hasZeroNear(result.solutions, -Math.sqrt(Math.PI / 3))).toBe(true);
	});

	it('cos(x²) = 1 → x = 0', () => {
		const eq = parseEquation('cos(x^2) - 1 = 0');
		const result = solve(eq);

		expect(result.equationType).toBe('trigonometric');
		// cos(u) = 1 → u = 0 → x² = 0 → x = 0
		expect(result.solutions.length).toBe(1);
		expect(hasZeroNear(result.solutions, 0)).toBe(true);
	});

	it('tan(x²) = 1 → x = ±√(π/4)', () => {
		const eq = parseEquation('tan(x^2) - 1 = 0');
		const result = solve(eq);

		expect(result.equationType).toBe('trigonometric');
		expect(result.periodicSolutions).toBeUndefined();

		// tan(u) = 1 → u = π/4 → x² = π/4
		expect(result.solutions.length).toBe(2);
		expect(hasZeroNear(result.solutions, Math.sqrt(Math.PI / 4))).toBe(true);
		expect(hasZeroNear(result.solutions, -Math.sqrt(Math.PI / 4))).toBe(true);
	});

	it('sin(x²) = 2 → no solution', () => {
		const eq = parseEquation('sin(x^2) - 2 = 0');
		const result = solve(eq);

		expect(result.status).toBe('no-real-solution');
	});

	describe('backward compatibility: linear args still produce periodicSolutions', () => {
		it('sin(2x) = 0 → periodicSolutions defined', () => {
			const eq = parseEquation('sin(2*x) = 0');
			const result = solve(eq);
			expect(result.periodicSolutions).toBeDefined();
		});

		it('cos(x) - 1/2 = 0 → periodicSolutions defined', () => {
			const eq = parseEquation('cos(x) - 1/2 = 0');
			const result = solve(eq);
			expect(result.periodicSolutions).toBeDefined();
		});
	});
});

// =============================================================================
// Sign Analysis: Periodic Zero Enumeration
// =============================================================================

describe('Sign Analysis with Periodic Zeros', () => {
	// =========================================================================
	// Basic zero enumeration on closed domains
	// =========================================================================

	describe('cos(x) on [0, 4π]', () => {
		it('should find zeros at π/2, 3π/2, 5π/2, 7π/2', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

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
			const domain = closedDomain(0, 3 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(4);

			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 3 * Math.PI)).toBe(true);
		});
	});

	// =========================================================================
	// Single period — exactly one period
	// =========================================================================

	describe('sin(x) on [0, 2π] — exactly one period', () => {
		it('should find zeros at 0, π, 2π', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(3);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
		});
	});

	describe('cos(x) on [0, 2π] — exactly one period', () => {
		it('should find zeros at π/2, 3π/2', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, (3 * Math.PI) / 2)).toBe(true);
		});
	});

	// =========================================================================
	// Sub-period domain (narrower than one period)
	// =========================================================================

	describe('sin(x) on [0, π/2] — sub-period', () => {
		it('should find only the zero at 0', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(0, Math.PI / 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(x) = 0 at 0 within [0, π/2]; next zero (π) is outside
			expect(result.zeros.length).toBe(1);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
		});
	});

	describe('cos(x) on [0, π/4] — no zeros inside', () => {
		it('should find no zeros (cos > 0 on [0, π/4])', () => {
			const expr = parseCustom('cos(x)');
			const domain = closedDomain(0, Math.PI / 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// cos has no zeros in [0, π/4] (first zero at π/2)
			expect(result.zeros.length).toBe(0);
		});
	});

	describe('sin(x) on [π/4, 3π/4] — no zeros inside', () => {
		it('should find no zeros (sin > 0 on this interval)', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(Math.PI / 4, (3 * Math.PI) / 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(0);
		});
	});

	// =========================================================================
	// Negative domains
	// =========================================================================

	describe('sin(x) on [-2π, 0]', () => {
		it('should find zeros at -2π, -π, 0', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(-2 * Math.PI, 0);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(3);
			expect(hasZeroNear(result.zeros, -2 * Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, -Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
		});
	});

	describe('cos(x) on [-π, π]', () => {
		it('should find zeros at -π/2, π/2', () => {
			const expr = parseCustom('cos(x)');
			const domain = closedDomain(-Math.PI, Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, -Math.PI / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
		});
	});

	describe('sin(x) on [-π, π]', () => {
		it('should find zeros at -π, 0, π', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(-Math.PI, Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(3);
			expect(hasZeroNear(result.zeros, -Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
		});
	});

	// =========================================================================
	// Open and half-open boundaries
	// =========================================================================

	describe('sin(x) on (0, 2π) — open boundaries', () => {
		it('should exclude boundary zeros at 0 and 2π, keep π', () => {
			const expr = parseCustom('sin(x)');
			const domain = openDomain(0, 2 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// 0 and 2π excluded (open), only π remains
			expect(result.zeros.length).toBe(1);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasNoZeroNear(result.zeros, 0)).toBe(true);
			expect(hasNoZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
		});
	});

	describe('sin(x) on [0, 2π) — left-closed, right-open', () => {
		it('should include 0, include π, exclude 2π', () => {
			const expr = parseCustom('sin(x)');
			const domain = leftClosedDomain(0, 2 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasNoZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
		});
	});

	describe('sin(x) on (0, 2π] — left-open, right-closed', () => {
		it('should exclude 0, include π, include 2π', () => {
			const expr = parseCustom('sin(x)');
			const domain = rightClosedDomain(0, 2 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasNoZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
		});
	});

	describe('cos(x) on (0, π) — zero at π/2 only', () => {
		it('should find exactly 1 zero at π/2', () => {
			const expr = parseCustom('cos(x)');
			const domain = openDomain(0, Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(1);
			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
		});
	});

	// =========================================================================
	// Interval unions — zeros in gaps should be excluded
	// =========================================================================

	describe('sin(x) on [0, π/2] ∪ [3π/2, 2π] — skipping middle', () => {
		it('should find zeros at 0 and 2π, but NOT at π', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedUnion(0, Math.PI / 2, (3 * Math.PI) / 2, 2 * Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// π is in the gap → excluded
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, 2 * Math.PI)).toBe(true);
			expect(hasNoZeroNear(result.zeros, Math.PI)).toBe(true);
			expect(result.zeros.length).toBe(2);
		});
	});

	describe('cos(x) on [0, 1] ∪ [2, 3] — numeric interval union', () => {
		it('should find zero at π/2 ≈ 1.57 only if in an interval', () => {
			const expr = parseCustom('cos(x)');
			// π/2 ≈ 1.5708 → in the gap between [0,1] and [2,3]
			const domain = closedUnion(0, 1, 2, 3);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// π/2 ≈ 1.57 is in the gap → no zeros
			expect(hasNoZeroNear(result.zeros, Math.PI / 2)).toBe(true);
			expect(result.zeros.length).toBe(0);
		});
	});

	// =========================================================================
	// Large domain — many periods
	// =========================================================================

	describe('sin(x) on [0, 10π] — 5 full periods', () => {
		it('should find 11 zeros (0, π, 2π, ..., 10π)', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 10);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(x) = 0 at kπ for k = 0, 1, ..., 10 → 11 zeros
			expect(result.zeros.length).toBe(11);

			for (let k = 0; k <= 10; k++) {
				expect(hasZeroNear(result.zeros, k * Math.PI)).toBe(true);
			}
		});
	});

	describe('cos(3x) on [0, 2π] — high frequency', () => {
		it('should find 6 zeros', () => {
			const expr = parseCustom('cos(3*x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// cos(3x) = 0 when 3x = π/2 + kπ → x = π/6 + kπ/3
			// In [0, 2π]: π/6, π/2, 5π/6, 7π/6, 3π/2, 11π/6
			expect(result.zeros.length).toBe(6);

			const expectedZeros = [1, 3, 5, 7, 9, 11].map((n) => (n * Math.PI) / 6);
			for (const z of expectedZeros) {
				expect(hasZeroNear(result.zeros, z)).toBe(true);
			}
		});
	});

	describe('tan(2x) on [0, 2π] — higher frequency tan', () => {
		it('should find 4 zeros (0, π/2, π, 3π/2) + boundary 2π', () => {
			const expr = parseCustom('tan(2*x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// tan(2x) = 0 when 2x = kπ → x = kπ/2
			// In [0, 2π]: 0, π/2, π, 3π/2, 2π → 5 zeros
			expect(result.zeros.length).toBe(5);

			for (let k = 0; k <= 4; k++) {
				expect(hasZeroNear(result.zeros, (k * Math.PI) / 2)).toBe(true);
			}
		});
	});

	// =========================================================================
	// Boundary precision edge cases
	// =========================================================================

	describe('boundary precision', () => {
		it('sin(x) on [0, π] should include both boundary zeros', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 1);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(0) = 0, sin(π) = 0 → both boundaries are zeros
			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, 0)).toBe(true);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
		});

		it('cos(x) on [π/2, 3π/2] should include both boundary zeros', () => {
			const expr = parseCustom('cos(x)');
			const domain = closedDomain(Math.PI / 2, (3 * Math.PI) / 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, Math.PI / 2)).toBe(true);
			expect(hasZeroNear(result.zeros, (3 * Math.PI) / 2)).toBe(true);
		});

		it('sin(x) on [kπ, (k+1)π] for large k should still work', () => {
			// Use k = 50 → domain [50π, 51π]
			const lo = 50 * Math.PI;
			const hi = 51 * Math.PI;
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(lo, hi);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(x) = 0 at 50π and 51π
			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, lo)).toBe(true);
			expect(hasZeroNear(result.zeros, hi)).toBe(true);
		});
	});

	// =========================================================================
	// Zero count with non-zero constant
	// =========================================================================

	// Non-zero constant sign analysis: depends on solver supporting trig(x) = c
	describe('non-zero constant sign analysis (known limitation)', () => {
		it.todo(
			'sin(x) - 1/2 on [0, 2π] should find 2 zeros at π/6 and 5π/6 (needs extractTrigEquation extension)'
		);
		it.todo('cos(x) - 1/2 on [0, 4π] should find 4 zeros (needs extractTrigEquation extension)');
		it.todo(
			'tan(x) - 1 on [0, 3π] should find 3 zeros at π/4 + kπ (needs extractTrigEquation extension)'
		);
	});

	// =========================================================================
	// Zeros are sorted by numeric value
	// =========================================================================

	describe('zeros ordering', () => {
		it('zeros should be sorted in ascending order', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// Check ascending order
			for (let i = 1; i < result.zeros.length; i++) {
				const prev = result.zeros[i - 1].approximate!;
				const curr = result.zeros[i].approximate!;
				expect(curr).toBeGreaterThanOrEqual(prev);
			}
		});
	});

	// =========================================================================
	// Sign correctness
	// =========================================================================

	describe('sign correctness with periodic zeros', () => {
		it('cos(x) on [0, 4π] should have correct sign pattern', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 4);

			const result = analyzeSign(expr, { variable: 'x', domain });

			const nonZeroIntervals = result.signedIntervals.filter((si) => si.sign !== 'zero');
			expect(nonZeroIntervals.length).toBeGreaterThan(0);

			const determinedSigns = nonZeroIntervals.filter(
				(si) => si.sign === 'positive' || si.sign === 'negative'
			);
			expect(determinedSigns.length).toBeGreaterThan(0);
		});

		it('sin(x) on [0, 2π] should be positive then negative', () => {
			const expr = parseCustom('sin(x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(x) on (0, π) is positive, on (π, 2π) is negative
			const positiveIntervals = result.signedIntervals.filter((si) => si.sign === 'positive');
			const negativeIntervals = result.signedIntervals.filter((si) => si.sign === 'negative');

			expect(positiveIntervals.length).toBeGreaterThan(0);
			expect(negativeIntervals.length).toBeGreaterThan(0);
		});

		it('cos(x) on [0, 2π] should start positive, go negative, then positive', () => {
			const expr = parseCustom('cos(x)');
			const domain = piDomain(0, 2);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// cos(x): positive on [0, π/2), negative on (π/2, 3π/2), positive on (3π/2, 2π]
			const signSequence = result.signedIntervals
				.filter((si) => si.sign === 'positive' || si.sign === 'negative')
				.map((si) => si.sign);

			// Should have alternating signs
			expect(signSequence.length).toBeGreaterThanOrEqual(3);
			expect(signSequence[0]).toBe('positive');
			expect(signSequence[1]).toBe('negative');
			expect(signSequence[2]).toBe('positive');
		});
	});

	// =========================================================================
	// Point domain: [a, a] (degenerate)
	// =========================================================================

	describe('sin(x) on [π, π] — point domain', () => {
		it('should find 1 zero at π (if sin(π) = 0)', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(Math.PI, Math.PI);

			const result = analyzeSign(expr, { variable: 'x', domain });

			// sin(π) = 0, so π is a zero
			expect(result.zeros.length).toBe(1);
			expect(hasZeroNear(result.zeros, Math.PI)).toBe(true);
		});
	});

	describe('sin(x) on [1, 1] — point domain, no zero', () => {
		it('should find 0 zeros since sin(1) ≠ 0', () => {
			const expr = parseCustom('sin(x)');
			const domain = closedDomain(1, 1);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(0);
		});
	});

	// =========================================================================
	// No periodic solutions path (non-trig expressions still work)
	// =========================================================================

	describe('non-trig expression: x^2 - 4 on [-5, 5]', () => {
		it('should find zeros at -2 and 2 (non-periodic path)', () => {
			const expr = parseCustom('x^2 - 4');
			const domain = closedDomain(-5, 5);

			const result = analyzeSign(expr, { variable: 'x', domain });

			expect(result.zeros.length).toBe(2);
			expect(hasZeroNear(result.zeros, -2)).toBe(true);
			expect(hasZeroNear(result.zeros, 2)).toBe(true);
		});
	});
});
