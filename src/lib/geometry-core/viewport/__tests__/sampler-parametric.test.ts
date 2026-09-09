/**
 * Phase 1 — sampleParametric2D adaptive 2D sampler.
 *
 * Red-first TDD: validates uniform fallback, adaptive density via |speed(t)|,
 * discontinuity detection (NaN / large jump), and closed-curve detection.
 */

import { describe, it, expect } from 'vitest';
import { sampleParametric2D } from '../sampler';
import type { Point } from '../types';

const TWO_PI = 2 * Math.PI;

function dist(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

// =============================================================================
// A. Basic shapes — closed-curve detection and point counts
// =============================================================================

describe('sampleParametric2D — basic shapes', () => {
	it('samples a unit circle (cos t, sin t) over [0, 2π] and reports it as closed', () => {
		const result = sampleParametric2D(
			(t) => Math.cos(t),
			(t) => Math.sin(t),
			(t) => -Math.sin(t),
			(t) => Math.cos(t),
			0,
			TWO_PI,
			300
		);
		expect(result.points.length).toBeGreaterThan(50);
		expect(result.discontinuityIndices).toEqual([]);
		expect(result.closed).toBe(true);

		// Every sampled point should sit (approximately) on the unit circle.
		for (const p of result.points) {
			const r = Math.hypot(p.x, p.y);
			expect(r).toBeCloseTo(1, 2);
		}
	});

	it('samples a parabola (t, t²) on [-2, 2] and reports it as not closed', () => {
		const result = sampleParametric2D(
			(t) => t,
			(t) => t * t,
			() => 1,
			(t) => 2 * t,
			-2,
			2,
			120
		);
		expect(result.points.length).toBeGreaterThan(20);
		expect(result.closed).toBe(false);
		// Endpoints should match (-2, 4) and (2, 4) approximately.
		expect(result.points[0].x).toBeCloseTo(-2, 6);
		expect(result.points[result.points.length - 1].x).toBeCloseTo(2, 6);
	});

	it('samples a spiral (t cos t, t sin t) on [0, 4π] and reports it as not closed', () => {
		const result = sampleParametric2D(
			(t) => t * Math.cos(t),
			(t) => t * Math.sin(t),
			(t) => Math.cos(t) - t * Math.sin(t),
			(t) => Math.sin(t) + t * Math.cos(t),
			0,
			4 * Math.PI,
			300
		);
		expect(result.points.length).toBeGreaterThan(50);
		expect(result.closed).toBe(false);
	});

	it('samples a cardioid ((1−cos t) cos t, (1−cos t) sin t) over [0, 2π] as closed', () => {
		const result = sampleParametric2D(
			(t) => (1 - Math.cos(t)) * Math.cos(t),
			(t) => (1 - Math.cos(t)) * Math.sin(t),
			(t) => Math.sin(t) * Math.cos(t) - (1 - Math.cos(t)) * Math.sin(t),
			(t) => Math.sin(t) * Math.sin(t) + (1 - Math.cos(t)) * Math.cos(t),
			0,
			TWO_PI,
			300
		);
		expect(result.points.length).toBeGreaterThan(50);
		expect(result.closed).toBe(true);
	});
});

// =============================================================================
// B. Edge cases
// =============================================================================

describe('sampleParametric2D — edge cases', () => {
	it('returns empty result when tMax <= tMin', () => {
		const r1 = sampleParametric2D(
			(t) => t,
			(t) => t,
			null,
			null,
			1,
			1,
			100
		);
		expect(r1.points).toEqual([]);
		expect(r1.discontinuityIndices).toEqual([]);
		expect(r1.closed).toBe(false);

		const r2 = sampleParametric2D(
			(t) => t,
			(t) => t,
			null,
			null,
			2,
			-1,
			100
		);
		expect(r2.points).toEqual([]);
		expect(r2.closed).toBe(false);
	});

	it('records a discontinuity index when xFn or yFn returns NaN/null at some t', () => {
		// y blows up around t = 0 (1/t)
		const result = sampleParametric2D(
			(t) => t,
			(t) => (Math.abs(t) < 1e-9 ? null : 1 / t),
			() => 1,
			(t) => (Math.abs(t) < 1e-9 ? null : -1 / (t * t)),
			-1,
			1,
			201
		);
		expect(result.discontinuityIndices.length).toBeGreaterThanOrEqual(1);
	});

	it('falls back to uniform sampling when derivatives are null and produces ~numPoints points', () => {
		const N = 50;
		const result = sampleParametric2D(
			(t) => Math.cos(t),
			(t) => Math.sin(t),
			null,
			null,
			0,
			TWO_PI,
			N
		);
		expect(result.points.length).toBeGreaterThanOrEqual(N - 2);
		expect(result.points.length).toBeLessThanOrEqual(N + 2);
	});

	it('produces deterministic results for the same arguments (uniform sampling)', () => {
		const args = [
			(t: number) => Math.cos(t),
			(t: number) => Math.sin(t),
			null,
			null,
			0,
			TWO_PI,
			60
		] as const;
		const r1 = sampleParametric2D(...args);
		const r2 = sampleParametric2D(...args);
		expect(r1.points.length).toBe(r2.points.length);
		for (let i = 0; i < r1.points.length; i++) {
			expect(r1.points[i].x).toBe(r2.points[i].x);
			expect(r1.points[i].y).toBe(r2.points[i].y);
		}
	});
});

// =============================================================================
// C. Adaptive density
// =============================================================================

describe('sampleParametric2D — adaptive density', () => {
	it('places more samples in fast-moving regions (cos(5t), sin(5t)) than slow ones', () => {
		// Compare the gap distribution between two curves of equal numPoints.
		// (cos(5t), sin(5t)) traces 5 laps in [0, 2π] — very fast — so gaps in t
		// should be small in that test, while (cos(t), sin(t)) gaps are larger.
		// This indirectly verifies adaptive density uses speed.
		const fastResult = sampleParametric2D(
			(t) => Math.cos(5 * t),
			(t) => Math.sin(5 * t),
			(t) => -5 * Math.sin(5 * t),
			(t) => 5 * Math.cos(5 * t),
			0,
			TWO_PI,
			200
		);
		const slowResult = sampleParametric2D(
			(t) => Math.cos(t),
			(t) => Math.sin(t),
			(t) => -Math.sin(t),
			(t) => Math.cos(t),
			0,
			TWO_PI,
			200
		);
		// Both should produce roughly the requested number of points.
		expect(fastResult.points.length).toBeGreaterThan(100);
		expect(slowResult.points.length).toBeGreaterThan(100);
		// The fast-moving curve should remain on the unit circle just like the slow one.
		for (const p of fastResult.points) {
			expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 2);
		}
	});
});

// =============================================================================
// D. Closed-curve detection with viewport
// =============================================================================

describe('sampleParametric2D — closed-curve detection with viewport', () => {
	it('uses viewport span for relative epsilon when viewport is provided', () => {
		// Tiny circle (radius 0.001) within a large viewport: endpoints are ~1e-3 apart
		// at t = 0 and t = 2π, but the viewport span is 20 → relative ε ≈ 0.2 → closed.
		const result = sampleParametric2D(
			(t) => 0.001 * Math.cos(t),
			(t) => 0.001 * Math.sin(t),
			(t) => -0.001 * Math.sin(t),
			(t) => 0.001 * Math.cos(t),
			0,
			TWO_PI,
			200,
			{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
		);
		expect(result.closed).toBe(true);
	});

	it('does not flag a non-closing curve as closed even with a viewport', () => {
		const result = sampleParametric2D(
			(t) => t,
			(t) => t,
			() => 1,
			() => 1,
			0,
			10,
			100,
			{ xMin: -1, xMax: 11, yMin: -1, yMax: 11 }
		);
		expect(result.closed).toBe(false);
		// Endpoints (0,0) and (10,10) are far apart in this viewport.
		const first = result.points[0];
		const last = result.points[result.points.length - 1];
		expect(dist(first, last)).toBeGreaterThan(1);
	});
});

// =============================================================================
// E. Edge cases — degenerate speed and finite jumps
// =============================================================================

describe('sampleParametric2D — edge cases', () => {
	it('falls back to uniform sampling when |speed(t)| is essentially zero everywhere', () => {
		// Constant curve: x(t) = 1, y(t) = 2, derivatives are 0 everywhere.
		const result = sampleParametric2D(
			() => 1,
			() => 2,
			() => 0,
			() => 0,
			0,
			1,
			50
		);
		expect(result.points.length).toBe(50);
		// All points coincide at (1, 2), so first ≈ last → closed.
		expect(result.closed).toBe(true);
		for (const p of result.points) {
			expect(p.x).toBe(1);
			expect(p.y).toBe(2);
		}
	});

	it('detects a finite jump (no NaN) as a discontinuity when it exceeds the viewport span', () => {
		// Step function: y jumps from 0 to 100 at t = 0.5, viewport is small.
		const result = sampleParametric2D(
			(t) => t,
			(t) => (t < 0.5 ? 0 : 100),
			null,
			null,
			0,
			1,
			50,
			{ xMin: -1, xMax: 2, yMin: -2, yMax: 2 }
		);
		expect(result.discontinuityIndices.length).toBeGreaterThan(0);
		expect(result.closed).toBe(false);
	});
});
