/**
 * Tests for generic root-finding: findRoots().
 * Hybrid approach: exact (solve) + numeric (bisection) fallback.
 */

import { describe, it, expect } from 'vitest';
import { findRoots, type RootResult } from '../roots';
import { parseCustom } from '../../parser/custom';
import { compile } from '../../eval/compile';

// Helper: parse, compile, and find roots
function roots(expr: string, xMin = -10, xMax = 10): RootResult[] {
	const ast = parseCustom(expr);
	const fn = compile(ast);
	return findRoots(ast, fn, 'x', xMin, xMax);
}

describe('findRoots', () => {
	// Polynomial degree 2
	it('finds exact roots of x^2 - 1', () => {
		const r = roots('x^2 - 1');
		expect(r).toHaveLength(2);
		expect(r[0].x).toBeCloseTo(-1, 8);
		expect(r[1].x).toBeCloseTo(1, 8);
		expect(r[0].exact).toBe(true);
		expect(r[1].exact).toBe(true);
	});

	// Polynomial degree 3
	it('finds exact roots of x^3 - x', () => {
		const r = roots('x^3 - x');
		expect(r).toHaveLength(3);
		expect(r[0].x).toBeCloseTo(-1, 8);
		expect(r[1].x).toBeCloseTo(0, 8);
		expect(r[2].x).toBeCloseTo(1, 8);
	});

	// Polynomial degree 4
	it('finds roots of x^4 - 1', () => {
		const r = roots('x^4 - 1');
		expect(r).toHaveLength(2);
		expect(r[0].x).toBeCloseTo(-1, 8);
		expect(r[1].x).toBeCloseTo(1, 8);
	});

	// Transcendental: sin(x) = 0
	it('finds numeric roots of sin(x) in [-10,10]', () => {
		const r = roots('sin(x)');
		// 0, +-pi, +-2pi, +-3pi = 7 roots
		expect(r.length).toBeGreaterThanOrEqual(7);
		// Check 0 is present
		expect(r.some((root) => Math.abs(root.x) < 0.01)).toBe(true);
		// Check pi is present
		expect(r.some((root) => Math.abs(root.x - Math.PI) < 0.01)).toBe(true);
		// Check -pi is present
		expect(r.some((root) => Math.abs(root.x + Math.PI) < 0.01)).toBe(true);
	});

	// No roots
	it('returns empty for x^2 + 1', () => {
		const r = roots('x^2 + 1');
		expect(r).toHaveLength(0);
	});

	// Tangent root (double)
	it('finds tangent root x^2 = 0', () => {
		const r = roots('x^2');
		expect(r).toHaveLength(1);
		expect(r[0].x).toBeCloseTo(0, 8);
	});

	// Roots outside window filtered
	it('filters roots outside window', () => {
		// (x - 20) = 0 has root at x=20, outside [-10,10]
		const r = roots('x - 20');
		expect(r).toHaveLength(0);
	});

	// Results sorted by x
	it('returns results sorted by x ascending', () => {
		const r = roots('x^3 - x');
		for (let i = 1; i < r.length; i++) {
			expect(r[i].x).toBeGreaterThan(r[i - 1].x);
		}
	});

	// Exponential
	it('finds root of e^x - 1 at x=0', () => {
		const r = roots('exp(x) - 1');
		expect(r.length).toBeGreaterThanOrEqual(1);
		expect(r.some((root) => Math.abs(root.x) < 0.01)).toBe(true);
	});

	// Narrow window
	it('finds root in narrow window [0.5, 1.5] for x-1', () => {
		const r = roots('x - 1', 0.5, 1.5);
		expect(r).toHaveLength(1);
		expect(r[0].x).toBeCloseTo(1, 8);
	});

	// Handles NaN gracefully (sqrt of negative)
	it('handles NaN evaluations gracefully', () => {
		// sqrt(x) - 1 has root at x=1; for x<0 sqrt returns NaN
		const r = roots('sqrt(x) - 1', 0, 10);
		expect(r.length).toBeGreaterThanOrEqual(1);
		expect(r.some((root) => Math.abs(root.x - 1) < 0.01)).toBe(true);
	});

	// 1/x has no real root but numeric phase may detect sign changes
	it('does not produce false roots for 1/x (asymptote at 0)', () => {
		const r = roots('1/x');
		// 1/x never equals 0; sign change at 0 is an asymptote
		expect(r).toHaveLength(0);
	});

	// Polynomial degree 1
	it('finds exact root of linear expression 2*x - 6', () => {
		const r = roots('2*x - 6');
		expect(r).toHaveLength(1);
		expect(r[0].x).toBeCloseTo(3, 8);
		expect(r[0].exact).toBe(true);
	});

	// cos(x) - periodic roots
	it('finds roots of cos(x) in [-10,10]', () => {
		const r = roots('cos(x)');
		// cos(x)=0 at +-pi/2, +-3pi/2, +-5pi/2, +-7pi/2 => ~6-7 roots
		expect(r.length).toBeGreaterThanOrEqual(6);
		// pi/2 should be present
		expect(r.some((root) => Math.abs(root.x - Math.PI / 2) < 0.01)).toBe(true);
	});
});
