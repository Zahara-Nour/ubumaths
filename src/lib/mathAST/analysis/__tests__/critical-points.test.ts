/**
 * Tests for critical points analysis — zeros, extrema, inflections.
 * Hybrid approach: exact (solve) + numeric (bisection) fallback.
 */

import { describe, it, expect } from 'vitest';
import {
	findCriticalZeros,
	findCriticalExtrema,
	findCriticalInflections,
	type CriticalPoint
} from '../critical-points';
import { parseCustom } from '../../parser/custom';
import { compile } from '../../eval/compile';
import { differentiate } from '../../differentiation';

// Helper: parse, compile, and find zeros
function zeros(expr: string, xMin = -10, xMax = 10): CriticalPoint[] {
	const ast = parseCustom(expr);
	const fn = compile(ast);
	return findCriticalZeros(ast, fn, 'x', xMin, xMax);
}

// Helper: parse, compile derivative, and find extrema
function extrema(expr: string, xMin = -10, xMax = 10): CriticalPoint[] {
	const ast = parseCustom(expr);
	const deriv = differentiate(ast, { variable: 'x', simplify: true });
	const fn = compile(ast);
	const dfn = compile(deriv);
	return findCriticalExtrema(ast, deriv, fn, dfn, 'x', xMin, xMax);
}

// Helper: parse, compile f' and f'', and find inflections
function inflections(expr: string, xMin = -10, xMax = 10): CriticalPoint[] {
	const ast = parseCustom(expr);
	const deriv = differentiate(ast, { variable: 'x', simplify: true });
	const deriv2 = differentiate(deriv, { variable: 'x', simplify: true });
	const fn = compile(ast);
	const dfn = compile(deriv);
	const d2fn = compile(deriv2);
	return findCriticalInflections(ast, deriv, fn, dfn, d2fn, 'x', xMin, xMax);
}

// =============================================================================
// Zeros
// =============================================================================

describe('findCriticalZeros', () => {
	it('finds exact zeros of x^2 - 4', () => {
		const pts = zeros('x^2 - 4');
		expect(pts).toHaveLength(2);
		const xs = pts.map((p) => p.xNumeric).sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-2);
		expect(xs[1]).toBeCloseTo(2);
		expect(pts.every((p) => p.type === 'zero')).toBe(true);
	});

	it('finds zeros of x^3 - 3*x', () => {
		const pts = zeros('x^3 - 3*x');
		expect(pts).toHaveLength(3);
		const xs = pts.map((p) => p.xNumeric).sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-Math.sqrt(3));
		expect(xs[1]).toBeCloseTo(0);
		expect(xs[2]).toBeCloseTo(Math.sqrt(3));
	});

	it('finds single zero of e^x - 1', () => {
		// e^x = 1 → x = 0
		const pts = zeros('exp(x) - 1');
		expect(pts.length).toBeGreaterThanOrEqual(1);
		const zeroAtOrigin = pts.find((p) => Math.abs(p.xNumeric) < 0.01);
		expect(zeroAtOrigin).toBeDefined();
	});

	it('respects interval bounds', () => {
		// x^2 - 4 has zeros at ±2, but only x=2 is in [0, 10]
		const pts = zeros('x^2 - 4', 0, 10);
		expect(pts).toHaveLength(1);
		expect(pts[0].xNumeric).toBeCloseTo(2);
	});

	it('returns empty for no zeros in interval', () => {
		// x^2 + 1 > 0 for all x
		const pts = zeros('x^2 + 1');
		expect(pts).toHaveLength(0);
	});

	it('finds zero of sin(x) near 0', () => {
		const pts = zeros('sin(x)', -1, 1);
		expect(pts.length).toBeGreaterThanOrEqual(1);
		expect(pts[0].xNumeric).toBeCloseTo(0);
	});

	it('finds multiple zeros of sin(x) in wide interval', () => {
		// sin(x) = 0 at x = kπ, about 7 zeros in [-10, 10]
		const pts = zeros('sin(x)');
		expect(pts.length).toBeGreaterThanOrEqual(6);
	});
});

// =============================================================================
// Extrema
// =============================================================================

describe('findCriticalExtrema', () => {
	it('finds min and max of x^3 - 3*x', () => {
		// f'(x) = 3x^2 - 3 = 0 → x = ±1
		// f(-1) = 2 (max), f(1) = -2 (min)
		const pts = extrema('x^3 - 3*x');
		expect(pts).toHaveLength(2);

		const maxPt = pts.find((p) => p.type === 'max');
		const minPt = pts.find((p) => p.type === 'min');
		expect(maxPt).toBeDefined();
		expect(minPt).toBeDefined();
		expect(maxPt!.xNumeric).toBeCloseTo(-1);
		expect(maxPt!.yNumeric).toBeCloseTo(2);
		expect(minPt!.xNumeric).toBeCloseTo(1);
		expect(minPt!.yNumeric).toBeCloseTo(-2);
	});

	it('finds minimum of x^2', () => {
		// f'(x) = 2x = 0 → x = 0 (min)
		const pts = extrema('x^2');
		expect(pts).toHaveLength(1);
		expect(pts[0].type).toBe('min');
		expect(pts[0].xNumeric).toBeCloseTo(0);
		expect(pts[0].yNumeric).toBeCloseTo(0);
	});

	it('filters non-extrema: x^3 has no extremum at x=0', () => {
		// f'(x) = 3x^2 = 0 at x=0, but f' does not change sign → not an extremum
		const pts = extrema('x^3');
		expect(pts).toHaveLength(0);
	});

	it('finds extrema of sin(x)', () => {
		// sin'(x) = cos(x) = 0 at x = π/2 + kπ
		const pts = extrema('sin(x)', 0, 2 * Math.PI);
		expect(pts.length).toBeGreaterThanOrEqual(2);
		const maxPt = pts.find((p) => p.type === 'max');
		const minPt = pts.find((p) => p.type === 'min');
		expect(maxPt).toBeDefined();
		expect(minPt).toBeDefined();
		expect(maxPt!.xNumeric).toBeCloseTo(Math.PI / 2, 1);
		expect(minPt!.xNumeric).toBeCloseTo((3 * Math.PI) / 2, 1);
	});
});

// =============================================================================
// Inflections
// =============================================================================

describe('findCriticalInflections', () => {
	it('finds inflection of x^3 at origin', () => {
		// f''(x) = 6x = 0 at x=0, changes sign → inflection
		const pts = inflections('x^3');
		expect(pts).toHaveLength(1);
		expect(pts[0].type).toBe('inflection');
		expect(pts[0].xNumeric).toBeCloseTo(0);
		expect(pts[0].yNumeric).toBeCloseTo(0);
	});

	it('x^4 has no inflection at x=0', () => {
		// f''(x) = 12x^2 = 0 at x=0, but does NOT change sign → not an inflection
		const pts = inflections('x^4');
		expect(pts).toHaveLength(0);
	});

	it('finds inflection of x^3 - 3*x', () => {
		// f''(x) = 6x = 0 at x=0, changes sign → inflection
		const pts = inflections('x^3 - 3*x');
		expect(pts).toHaveLength(1);
		expect(pts[0].xNumeric).toBeCloseTo(0);
	});

	it('finds inflections of sin(x)', () => {
		// f''(x) = -sin(x) = 0 at x = kπ, changes sign → inflection
		const pts = inflections('sin(x)', 0, 2 * Math.PI);
		expect(pts.length).toBeGreaterThanOrEqual(1);
	});
});
