/**
 * Tests for conic classification from quadratic coefficients.
 *
 * Given Ax² + Bxy + Cy² + Dx + Ey + F = 0, classify the conic
 * and extract geometric parameters (center, semi-axes, rotation).
 */

import { describe, it, expect } from 'vitest';
import { classifyConic, type ConicParams } from '../conic-classify';

/** Shorthand: classify from the 6 numeric coefficients [A, B, C, D, E, F]. */
function classify(A: number, B: number, C: number, D: number, E: number, F: number): ConicParams {
	return classifyConic(A, B, C, D, E, F);
}

/** Assert center is close to expected (avoids -0 vs 0 issues). */
function expectCenter(c: ConicParams, x: number, y: number) {
	expect(c.center).toBeDefined();
	expect(c.center!.x).toBeCloseTo(x);
	expect(c.center!.y).toBeCloseTo(y);
}

describe('classifyConic', () => {
	describe('circles', () => {
		it('x² + y² - 9 = 0 → circle center (0,0) radius 3', () => {
			const c = classify(1, 0, 1, 0, 0, -9);
			expect(c.type).toBe('circle');
			expectCenter(c, 0, 0);
			expect(c.a).toBeCloseTo(3);
			expect(c.b).toBeCloseTo(3);
			expect(c.rotation).toBeCloseTo(0);
		});

		it('x² + y² - 2x + 4y - 4 = 0 → circle center (1,-2) radius 3', () => {
			// (x-1)² + (y+2)² = 9
			const c = classify(1, 0, 1, -2, 4, -4);
			expect(c.type).toBe('circle');
			expect(c.center!.x).toBeCloseTo(1);
			expect(c.center!.y).toBeCloseTo(-2);
			expect(c.a).toBeCloseTo(3);
		});
	});

	describe('ellipses', () => {
		it('x²/4 + y²/9 - 1 = 0 → ellipse center (0,0) a=3, b=2', () => {
			// 0.25·x² + (1/9)·y² - 1 = 0  →  A=0.25, C=1/9
			const c = classify(1 / 4, 0, 1 / 9, 0, 0, -1);
			expect(c.type).toBe('ellipse');
			expectCenter(c, 0, 0);
			// semi-axes: a ≥ b by convention
			expect(c.a).toBeCloseTo(3); // along y
			expect(c.b).toBeCloseTo(2); // along x
		});

		it('x² + 4y² - 4 = 0 → ellipse a=2 b=1', () => {
			const c = classify(1, 0, 4, 0, 0, -4);
			expect(c.type).toBe('ellipse');
			expect(c.a).toBeCloseTo(2);
			expect(c.b).toBeCloseTo(1);
		});
	});

	describe('hyperbolas', () => {
		it('x² - y² - 1 = 0 → hyperbola', () => {
			const c = classify(1, 0, -1, 0, 0, -1);
			expect(c.type).toBe('hyperbola');
			expectCenter(c, 0, 0);
			expect(c.a).toBeCloseTo(1);
			expect(c.b).toBeCloseTo(1);
		});

		it('x²/9 - y²/4 - 1 = 0 → hyperbola a=3 b=2', () => {
			const c = classify(1 / 9, 0, -1 / 4, 0, 0, -1);
			expect(c.type).toBe('hyperbola');
			expect(c.a).toBeCloseTo(3);
			expect(c.b).toBeCloseTo(2);
		});
	});

	describe('parabolas', () => {
		it('y² - 4x = 0 → parabola', () => {
			// C=1, D=-4, rest 0
			const c = classify(0, 0, 1, -4, 0, 0);
			expect(c.type).toBe('parabola');
		});

		it('x² - 2y = 0 → parabola', () => {
			const c = classify(1, 0, 0, 0, -2, 0);
			expect(c.type).toBe('parabola');
		});
	});

	describe('rotated conics (B ≠ 0)', () => {
		it('x² + xy + y² - 1 = 0 → rotated ellipse', () => {
			const c = classify(1, 1, 1, 0, 0, -1);
			expect(c.type).toBe('ellipse');
			expect(c.rotation).not.toBeCloseTo(0);
		});

		it('x² - xy - 1 = 0 → hyperbola with rotation', () => {
			// B² - 4AC = 1 - 0 = 1 > 0
			const c = classify(1, -1, 0, 0, 0, -1);
			expect(c.type).toBe('hyperbola');
		});
	});

	describe('degenerate cases', () => {
		it('x² + y² = 0 → degenerate (single point)', () => {
			const c = classify(1, 0, 1, 0, 0, 0);
			expect(c.type).toBe('degenerate');
		});

		it('xy = 0 → degenerate (crossed lines)', () => {
			const c = classify(0, 1, 0, 0, 0, 0);
			expect(c.type).toBe('degenerate');
		});

		it('x² - 1 = 0 → degenerate (two parallel lines)', () => {
			const c = classify(1, 0, 0, 0, 0, -1);
			expect(c.type).toBe('degenerate');
		});
	});
});
