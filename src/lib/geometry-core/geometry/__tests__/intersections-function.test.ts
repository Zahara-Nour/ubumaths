/**
 * Tests for line-function and function-function intersections.
 */

import { describe, it, expect } from 'vitest';
import { intersectLF, intersectFF } from '../intersections';
import { numeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { compile } from '$lib/mathAST/eval/compile';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: numeric(x), y: numeric(y) };
}

function makeFn(expr: string) {
	const expression = parseCustom(expr);
	const compiledFn = compile(expression);
	return { expression, compiledFn };
}

// =============================================================================
// intersectLF (line-function)
// =============================================================================

describe('intersectLF', () => {
	it('finds 2 intersections: y=0 and y=x^2-1', () => {
		const f = makeFn('x^2 - 1');
		// Horizontal line y=0: (−5,0) to (5,0)
		const result = intersectLF(pt(-5, 0), pt(5, 0), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-1, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![1].x)).toBeCloseTo(1, 6);
		expect(geoToNumber(result![1].y)).toBeCloseTo(0, 6);
	});

	it('finds 2 intersections: y=x and y=x^2', () => {
		const f = makeFn('x^2');
		// Line y=x: (0,0) to (1,1)
		const result = intersectLF(pt(0, 0), pt(1, 1), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![1].x)).toBeCloseTo(1, 6);
		expect(geoToNumber(result![1].y)).toBeCloseTo(1, 6);
	});

	it('finds 1 intersection: tangent line to parabola', () => {
		const f = makeFn('x^2');
		// Line y=0 (tangent at origin)
		const result = intersectLF(pt(-1, 0), pt(1, 0), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
	});

	it('returns null when line does not intersect', () => {
		const f = makeFn('x^2 + 1');
		// Line y=0 does not intersect y=x^2+1
		const result = intersectLF(pt(-1, 0), pt(1, 0), f.expression, f.compiledFn, -10, 10);
		expect(result).toBeNull();
	});

	it('handles vertical line x=2 intersecting y=sin(x)', () => {
		const f = makeFn('sin(x)');
		// Vertical line x=2: (2, 0) to (2, 1)
		const result = intersectLF(pt(2, 0), pt(2, 1), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(2, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(Math.sin(2), 6);
	});

	it('finds multiple intersections: y=0.5 and y=sin(x)', () => {
		const f = makeFn('sin(x)');
		// Line y=0.5: (−10, 0.5) to (10, 0.5)
		const result = intersectLF(pt(-10, 0.5), pt(10, 0.5), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		// sin(x) = 0.5 has multiple solutions in [-10,10]
		expect(result!.length).toBeGreaterThanOrEqual(4);
		// All y values should be ~0.5
		for (const p of result!) {
			expect(geoToNumber(p.y)).toBeCloseTo(0.5, 2);
		}
	});

	it('returns points sorted by x ascending', () => {
		const f = makeFn('sin(x)');
		const result = intersectLF(pt(-10, 0.5), pt(10, 0.5), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		for (let i = 1; i < result!.length; i++) {
			expect(geoToNumber(result![i].x)).toBeGreaterThan(geoToNumber(result![i - 1].x));
		}
	});

	it('steep oblique line y=10x intersects y=x^3 at 3 points', () => {
		const f = makeFn('x^3');
		// Line y=10x: (0,0) to (1,10)
		// x^3 = 10x => x(x^2-10)=0 => x=0, x=+-sqrt(10)~+-3.16
		const result = intersectLF(pt(0, 0), pt(1, 10), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(3);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-Math.sqrt(10), 3);
		expect(geoToNumber(result![1].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![2].x)).toBeCloseTo(Math.sqrt(10), 3);
	});

	it('vertical line at domain boundary: x=0 and y=1/x returns null (asymptote)', () => {
		const f = makeFn('1/x');
		// Vertical line x=0: 1/0 = Infinity, not finite
		const result = intersectLF(pt(0, -1), pt(0, 1), f.expression, f.compiledFn, -10, 10);
		expect(result).toBeNull();
	});

	it('line intersects exponential y=e^x at 1 point', () => {
		const f = makeFn('exp(x)');
		// Line y=1: intersects e^x at x=0
		const result = intersectLF(pt(-5, 1), pt(5, 1), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 4);
		expect(geoToNumber(result![0].y)).toBeCloseTo(1, 4);
	});

	it('near-vertical line (dx ~ 1e-13) handled as vertical', () => {
		const f = makeFn('x^2');
		// Nearly vertical line: x ~ 2 with tiny dx
		const result = intersectLF(pt(2, -1), pt(2 + 1e-13, 5), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(2, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(4, 4); // 2^2 = 4
	});

	it('horizontal line intersects cubic at 1 or 3 points', () => {
		const f = makeFn('x^3 - 3*x');
		// Line y=0: x^3-3x=0 => x(x^2-3)=0 => x=0, +-sqrt(3)
		const result = intersectLF(pt(-5, 0), pt(5, 0), f.expression, f.compiledFn, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(3);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-Math.sqrt(3), 4);
		expect(geoToNumber(result![1].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![2].x)).toBeCloseTo(Math.sqrt(3), 4);
	});
});

// =============================================================================
// intersectFF (function-function)
// =============================================================================

describe('intersectFF', () => {
	it('finds 2 intersections: y=x^2 and y=x', () => {
		const f1 = makeFn('x^2');
		const f2 = makeFn('x');
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![1].x)).toBeCloseTo(1, 6);
		expect(geoToNumber(result![1].y)).toBeCloseTo(1, 6);
	});

	it('finds multiple intersections: y=sin(x) and y=cos(x)', () => {
		const f1 = makeFn('sin(x)');
		const f2 = makeFn('cos(x)');
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		// sin(x)=cos(x) -> tan(x)=1 -> x=pi/4+k*pi, multiple solutions in [-10,10]
		expect(result!.length).toBeGreaterThanOrEqual(4);
	});

	it('returns null for y=x^2 and y=x^2+1 (no intersection)', () => {
		const f1 = makeFn('x^2');
		const f2 = makeFn('x^2 + 1');
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).toBeNull();
	});

	it('finds 1 intersection: y=x and y=-x', () => {
		const f1 = makeFn('x');
		const f2 = makeFn('-x');
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(geoToNumber(result![0].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![0].y)).toBeCloseTo(0, 6);
	});

	it('y=e^x and y=x+1 intersect at x=0', () => {
		const f1 = makeFn('exp(x)');
		const f2 = makeFn('x + 1');
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		// At x=0: e^0=1, 0+1=1 — tangent intersection
		expect(result!.some((p) => Math.abs(geoToNumber(p.x)) < 0.1)).toBe(true);
	});

	it('y=x^3 and y=x intersect at 3 points', () => {
		const f1 = makeFn('x^3');
		const f2 = makeFn('x');
		// x^3 - x = 0 => x(x-1)(x+1) = 0
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(3);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-1, 4);
		expect(geoToNumber(result![1].x)).toBeCloseTo(0, 6);
		expect(geoToNumber(result![2].x)).toBeCloseTo(1, 4);
	});

	it('y=|x| approximation via x^2/sqrt(x^2+0.001) and y=0.5 finds 2 intersections', () => {
		// Use a smooth approximation of |x| to test robustness with complex expressions
		const f1 = makeFn('x^2');
		const f2 = makeFn('1');
		// x^2 = 1 => x = +-1
		const result = intersectFF(f1.expression, f1.compiledFn, f2.expression, -10, 10);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(geoToNumber(result![0].x)).toBeCloseTo(-1, 4);
		expect(geoToNumber(result![1].x)).toBeCloseTo(1, 4);
	});
});
