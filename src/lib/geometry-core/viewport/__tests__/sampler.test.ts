/**
 * Sampler tests — sampling functions over a viewport for curve rendering.
 *
 * Moved out of `grapheur/__tests__/evaluator.test.ts` with the module itself:
 * the sampler never depended on the grapheur, and geometry-core imported it
 * from there.
 */

import { describe, it, expect } from 'vitest';
import {
	sampleFunction,
	sampleFunctionAdaptive,
	sampleWithDerivative,
	sampleAtPoints,
	isAsymptote,
	DEFAULT_NUM_POINTS
} from '../sampler';
import type { Viewport } from '../types';

describe('sampler', () => {
	const defaultViewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

	describe('isAsymptote', () => {
		it('returns true when y1 is null', () => {
			expect(isAsymptote(null, 5, 10)).toBe(true);
		});

		it('returns true when y2 is null', () => {
			expect(isAsymptote(5, null, 10)).toBe(true);
		});

		it('returns true when both are null', () => {
			expect(isAsymptote(null, null, 10)).toBe(true);
		});

		it('returns false for small change', () => {
			expect(isAsymptote(1, 2, 10)).toBe(false);
		});

		it('returns true for large jump', () => {
			expect(isAsymptote(100, -100, 10)).toBe(true);
		});

		it('returns true for sign change with large values', () => {
			expect(isAsymptote(10, -10, 10)).toBe(true);
		});

		it('returns false for sign change with small values', () => {
			expect(isAsymptote(1, -1, 10)).toBe(false);
		});
	});

	describe('sampleFunction', () => {
		it('samples a constant function', () => {
			const f = () => 5;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);
			expect(curve.points.every((p) => p.y === 5)).toBe(true);
		});

		it('samples a linear function', () => {
			const f = (x: number) => 2 * x + 1;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check first and last points
			expect(curve.points[0].x).toBeCloseTo(-10, 5);
			expect(curve.points[0].y).toBeCloseTo(-19, 5);
		});

		it('samples a parabola', () => {
			const f = (x: number) => x * x;
			const curve = sampleFunction(f, defaultViewport);

			expect(curve.points.length).toBe(DEFAULT_NUM_POINTS);
			expect(curve.discontinuityIndices).toEqual([]);

			// Check that values near center are small (vertex of parabola)
			// With 200 points from -10 to 10, the midpoint is around x=0
			const nearCenter = curve.points.filter((p) => Math.abs(p.x) < 1);
			expect(nearCenter.length).toBeGreaterThan(0);
			// All y values near x=0 should be close to 0
			nearCenter.forEach((p) => {
				expect(p.y).toBeCloseTo(p.x * p.x, 5);
			});
		});

		it('detects discontinuity in 1/x', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			// Should have at least one discontinuity near x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('handles domain errors gracefully', () => {
			const f = (x: number) => (x < 0 ? null : Math.sqrt(x));
			const curve = sampleFunction(f, defaultViewport);

			// Points should only be for x >= 0
			const positivePoints = curve.points.filter((p) => p.x >= 0);
			expect(positivePoints.length).toBeGreaterThan(0);
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('respects custom number of points', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 50);

			expect(curve.points.length).toBe(50);
		});

		it('handles minimum point count', () => {
			const f = (x: number) => x;
			const curve = sampleFunction(f, defaultViewport, 1);

			// Should enforce minimum of 2 points
			expect(curve.points.length).toBe(2);
		});

		it('returns empty for degenerate viewport', () => {
			const f = (x: number) => x;
			const viewport: Viewport = { xMin: 5, xMax: 5, yMin: -10, yMax: 10 };
			const curve = sampleFunction(f, viewport);

			expect(curve.points).toEqual([]);
		});
	});

	describe('sampleFunctionAdaptive', () => {
		it('provides more points near discontinuities', () => {
			const f = (x: number) => (Math.abs(x) < 0.01 ? null : 1 / x);
			const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };

			const regular = sampleFunction(f, viewport, 100);
			const adaptive = sampleFunctionAdaptive(f, viewport, 100);

			// Adaptive should have more points due to refinement
			expect(adaptive.points.length).toBeGreaterThanOrEqual(regular.points.length);
		});

		it('returns same result for continuous functions', () => {
			const f = (x: number) => x * x;
			const regular = sampleFunction(f, defaultViewport, 100);
			const adaptive = sampleFunctionAdaptive(f, defaultViewport, 100);

			// For continuous function, should be the same
			expect(adaptive.points.length).toBe(regular.points.length);
		});
	});

	describe('sampleWithDerivative', () => {
		const viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };

		it('produces a valid SampledCurve', () => {
			const f = (x: number) => x * x;
			const fPrime = (x: number) => 2 * x;
			const curve = sampleWithDerivative(f, fPrime, viewport, 200);
			expect(curve.points.length).toBeGreaterThan(0);
			expect(curve.points.length).toBeLessThanOrEqual(500); // bounded
		});

		it('puts more points where derivative is large', () => {
			// sin(x) has |f'| = |cos(x)| = 1 near x=0 (steep) and 0 near x=pi/2 (flat)
			const wideViewport = { xMin: 0, xMax: Math.PI, yMin: -1, yMax: 1 };
			const f = (x: number) => Math.sin(x);
			const fPrime = (x: number) => Math.cos(x);
			const curve = sampleWithDerivative(f, fPrime, wideViewport, 100);

			// Count points in first quarter [0, pi/4] (steep) vs last quarter [3pi/4, pi] (steep too)
			// vs middle [pi/4, 3pi/4] (flat near peak)
			const steepPoints = curve.points.filter(
				(p) => p.x < Math.PI / 4 || p.x > (3 * Math.PI) / 4
			).length;
			const flatPoints = curve.points.filter(
				(p) => p.x >= Math.PI / 4 && p.x <= (3 * Math.PI) / 4
			).length;

			// Steep zones should have at least as many points as flat zone
			// (they cover same x-range but need more detail)
			expect(steepPoints).toBeGreaterThanOrEqual(flatPoints);
		});

		it('detects discontinuities', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const fPrime = (x: number) => (x === 0 ? null : -1 / (x * x));
			const curve = sampleWithDerivative(
				f as (x: number) => number | null,
				fPrime as (x: number) => number | null,
				viewport,
				200
			);
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});

		it('handles null derivative gracefully (falls back to uniform)', () => {
			const f = (x: number) => Math.abs(x); // not differentiable at 0
			const fPrime = (x: number) => (x === 0 ? null : x > 0 ? 1 : -1);
			const curve = sampleWithDerivative(f, fPrime as (x: number) => number | null, viewport, 100);
			expect(curve.points.length).toBeGreaterThan(50);
		});

		it('returns same quality as uniform for constant derivative', () => {
			// f(x) = 2x + 1, f'(x) = 2 (constant) → uniform distribution
			const f = (x: number) => 2 * x + 1;
			const fPrime = () => 2;
			const curve = sampleWithDerivative(f, fPrime, viewport, 100);
			const uniformCurve = sampleFunction(f, viewport, 100);
			// Should have similar number of points
			expect(Math.abs(curve.points.length - uniformCurve.points.length)).toBeLessThan(20);
		});
	});

	describe('sampleAtPoints', () => {
		it('samples at specified x values', () => {
			const f = (x: number) => x * x;
			const xValues = [0, 1, 2, 3, 4];
			const curve = sampleAtPoints(f, xValues, 20);

			expect(curve.points.length).toBe(5);
			expect(curve.points.map((p) => p.y)).toEqual([0, 1, 4, 9, 16]);
		});

		it('handles empty x values', () => {
			const f = (x: number) => x;
			const curve = sampleAtPoints(f, [], 10);

			expect(curve.points).toEqual([]);
			expect(curve.discontinuityIndices).toEqual([]);
		});

		it('detects discontinuities in specified points', () => {
			const f = (x: number) => (x === 0 ? null : 1 / x);
			const xValues = [-1, -0.1, 0, 0.1, 1];
			const curve = sampleAtPoints(f, xValues, 10);

			// Should detect discontinuity around x=0
			expect(curve.discontinuityIndices.length).toBeGreaterThan(0);
		});
	});
});
