/**
 * Unit tests for the marching-squares cache (2026-05-18).
 *
 * The marching-squares cache is a WeakMap keyed by the compiled function
 * identity. These tests verify:
 *   - cache hit returns the exact same SampledCurve[] reference
 *   - cache miss on viewport change recomputes a fresh result
 *   - cache miss on gridSize change recomputes a fresh result
 *   - different functions get independent cache entries
 */

import { describe, it, expect } from 'vitest';
import { parseCustom, compile } from '$lib/mathAST';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import type { Viewport } from '../../viewport/types';
import { marchingSquares } from '../marching-squares';

function makeCircleFn(): CompiledFn {
	// F(x,y) = x² + y² - 1 (unit circle).
	return compile(parseCustom('x^2 + y^2 - 1'));
}

function makeParabolaFn(): CompiledFn {
	// F(x,y) = y - x² (parabola).
	return compile(parseCustom('y - x^2'));
}

const standardViewport: Viewport = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };

describe('marchingSquares — cache', () => {
	it('returns the same array reference on a second call with identical inputs (hit)', () => {
		const fn = makeCircleFn();
		const r1 = marchingSquares(fn, standardViewport);
		const r2 = marchingSquares(fn, standardViewport);
		// Cache hit → same reference, not a fresh array.
		expect(r2).toBe(r1);
	});

	it('returns the same reference even for tiny grid (cheap to test)', () => {
		const fn = makeCircleFn();
		const r1 = marchingSquares(fn, standardViewport, 10);
		const r2 = marchingSquares(fn, standardViewport, 10);
		expect(r2).toBe(r1);
	});

	it('recomputes on viewport change (miss → different reference)', () => {
		const fn = makeCircleFn();
		const r1 = marchingSquares(fn, standardViewport);
		const r2 = marchingSquares(fn, { xMin: -3, xMax: 3, yMin: -3, yMax: 3 });
		expect(r2).not.toBe(r1);
	});

	it('recomputes on gridSize change even with same viewport', () => {
		const fn = makeCircleFn();
		const r1 = marchingSquares(fn, standardViewport, 50);
		const r2 = marchingSquares(fn, standardViewport, 100);
		expect(r2).not.toBe(r1);
	});

	it('different compiled functions get independent cache entries', () => {
		const circle = makeCircleFn();
		const parabola = makeParabolaFn();
		const rC1 = marchingSquares(circle, standardViewport);
		const rP1 = marchingSquares(parabola, standardViewport);
		// Both cached now.
		const rC2 = marchingSquares(circle, standardViewport);
		const rP2 = marchingSquares(parabola, standardViewport);
		expect(rC2).toBe(rC1);
		expect(rP2).toBe(rP1);
		// And of course the two curves are different.
		expect(rC1).not.toBe(rP1);
	});

	it('cache hit returns identical content (sanity check on the optimization)', () => {
		const fn = makeCircleFn();
		const r1 = marchingSquares(fn, standardViewport, 20);
		const r2 = marchingSquares(fn, standardViewport, 20);
		// Same number of connected components.
		expect(r2.length).toBe(r1.length);
		// And same point counts (cheap structural check).
		for (let i = 0; i < r1.length; i++) {
			expect(r2[i].points.length).toBe(r1[i].points.length);
		}
	});

	it('produces a closed unit circle (~2π perimeter) — basic correctness preserved by cache', () => {
		const fn = makeCircleFn();
		const result = marchingSquares(fn, standardViewport, 100);
		expect(result.length).toBeGreaterThan(0);
		// Sum segment lengths to estimate perimeter; should be close to 2π ≈ 6.28.
		let perimeter = 0;
		for (const curve of result) {
			for (let i = 1; i < curve.points.length; i++) {
				const dx = curve.points[i].x - curve.points[i - 1].x;
				const dy = curve.points[i].y - curve.points[i - 1].y;
				perimeter += Math.sqrt(dx * dx + dy * dy);
			}
		}
		expect(perimeter).toBeGreaterThan(5.5);
		expect(perimeter).toBeLessThan(7.0);
	});
});
