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
});
