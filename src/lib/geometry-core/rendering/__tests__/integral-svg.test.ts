/**
 * Phase 4 — SVG rendering of GeoIntegralArea.
 *
 * Tests:
 * - splitOnZeros: pure helper that splits samples by sign of y.
 * - integralAreaToSVG: the per-element renderer that produces multiple
 *   closed paths (one per sub-region) with sign info.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import { createTransformer } from '../../viewport/viewport';
import { numeric } from '../../types/geo-value';
import type { SampledCurve, Point, Viewport } from '../../viewport/types';
import { splitOnZeros, integralAreaToSVG } from '../svg-primitives';

const VIEWPORT: Viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const DIMS = { width: 600, height: 600 };

function makeCurve(points: Point[], discontinuityIndices: number[] = []): SampledCurve {
	return { points, discontinuityIndices };
}

// =============================================================================
// A. splitOnZeros — basic shapes
// =============================================================================

describe('splitOnZeros — single-sign curves', () => {
	it('returns a single positive sub-interval when all y > 0', () => {
		const curve = makeCurve([
			{ x: 0, y: 1 },
			{ x: 1, y: 2 },
			{ x: 2, y: 1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(1);
		expect(result[0].sign).toBe('positive');
		expect(result[0].points).toHaveLength(3);
	});

	it('returns a single negative sub-interval when all y < 0', () => {
		const curve = makeCurve([
			{ x: 0, y: -1 },
			{ x: 1, y: -2 },
			{ x: 2, y: -1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(1);
		expect(result[0].sign).toBe('negative');
	});

	it('classifies a constant-zero curve as `zero`', () => {
		const curve = makeCurve([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(1);
		expect(result[0].sign).toBe('zero');
	});
});

// =============================================================================
// B. splitOnZeros — sign changes with linear interpolation
// =============================================================================

describe('splitOnZeros — sign changes', () => {
	it('splits a sign change into two sub-intervals with interpolated zero', () => {
		// y goes from -1 (at x=0) to +1 (at x=2). Zero is at x=1.
		const curve = makeCurve([
			{ x: 0, y: -1 },
			{ x: 2, y: 1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(2);
		expect(result[0].sign).toBe('negative');
		expect(result[1].sign).toBe('positive');
		// Each sub-interval has the zero point as its boundary.
		const negEnd = result[0].points[result[0].points.length - 1];
		const posStart = result[1].points[0];
		expect(negEnd.x).toBeCloseTo(1, 8);
		expect(negEnd.y).toBeCloseTo(0, 8);
		expect(posStart.x).toBeCloseTo(1, 8);
		expect(posStart.y).toBeCloseTo(0, 8);
	});

	it('handles three-region curves (- + -)', () => {
		// Mirror: y starts negative, becomes positive, then negative again.
		const curve = makeCurve([
			{ x: -2, y: -1 },
			{ x: -1, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: -1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(3);
		expect(result.map((r) => r.sign)).toEqual(['negative', 'positive', 'negative']);
	});

	it('preserves an exact zero sample as a shared endpoint', () => {
		const curve = makeCurve([
			{ x: 0, y: -1 },
			{ x: 1, y: 0 },
			{ x: 2, y: 1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(2);
		expect(result[0].sign).toBe('negative');
		expect(result[1].sign).toBe('positive');
		// The (1, 0) sample should be the shared boundary.
		expect(result[0].points[result[0].points.length - 1].x).toBeCloseTo(1, 10);
		expect(result[1].points[0].x).toBeCloseTo(1, 10);
	});

	it('does not duplicate the zero point when an exact-zero sample falls between non-zero samples (positive→zero→negative)', () => {
		// This exercises the bug fixed in svg-primitives.ts where
		// interpolation at prev.y === 0 would push a duplicate zero point.
		const curve = makeCurve([
			{ x: 0, y: 1 },
			{ x: 1, y: 0 },
			{ x: 2, y: -1 }
		]);
		const result = splitOnZeros(curve);
		expect(result).toHaveLength(2);
		expect(result[0].sign).toBe('positive');
		expect(result[1].sign).toBe('negative');

		// No consecutive duplicate points in either region.
		for (const region of result) {
			for (let i = 1; i < region.points.length; i++) {
				const prev = region.points[i - 1];
				const curr = region.points[i];
				expect(prev.x === curr.x && prev.y === curr.y).toBe(false);
			}
		}
	});
});

// =============================================================================
// C. splitOnZeros — discontinuities and edge cases
// =============================================================================

describe('splitOnZeros — discontinuities and degenerate cases', () => {
	it('honors discontinuities — does not bridge sub-intervals across them', () => {
		// 4 samples: positive | discontinuity | positive
		const curve = makeCurve(
			[
				{ x: 0, y: 1 },
				{ x: 1, y: 2 },
				{ x: 2, y: 3 },
				{ x: 3, y: 4 }
			],
			[2] // discontinuity before index 2
		);
		const result = splitOnZeros(curve);
		// Two positive sub-intervals because of the discontinuity break.
		expect(result).toHaveLength(2);
		expect(result.every((r) => r.sign === 'positive')).toBe(true);
	});

	it('drops sub-intervals shorter than 2 points', () => {
		const curve = makeCurve([{ x: 0, y: 1 }]);
		expect(splitOnZeros(curve)).toEqual([]);
	});

	it('returns [] for an empty curve', () => {
		expect(splitOnZeros(makeCurve([]))).toEqual([]);
	});
});

// =============================================================================
// D. integralAreaToSVG — basic rendering
// =============================================================================

describe('integralAreaToSVG — basic', () => {
	function setup(eq: string, a: number, b: number) {
		const { figure, symbols } = runDsl(`f = courbe("${eq}")`);
		const fnId = symbols.get('f')!.figureId!;
		const { areaId } = figure.createIntegralArea(fnId, numeric(a), numeric(b));
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		return { figure, areaId, transformer };
	}

	it('returns a single positive path for x² on [0, 1]', () => {
		const { figure, areaId, transformer } = setup('y = x^2', 0, 1);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths).toHaveLength(1);
		expect(svg!.paths[0].sign).toBe('positive');
	});

	it('returns paths covering both signs for x³ - x on [-1, 1]', () => {
		const { figure, areaId, transformer } = setup('y = x^3 - x', -1, 1);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(2);
		// On [-1, 0], x³ - x is positive (e.g., -0.5: -0.125 + 0.5 = 0.375).
		// On [0, 1], it is negative.
		// Sampler-order independent: just assert both signs are present.
		const signs = new Set(svg!.paths.map((p) => p.sign));
		expect(signs.has('positive')).toBe(true);
		expect(signs.has('negative')).toBe(true);
	});

	it('each path is a closed SVG path ending with Z', () => {
		const { figure, areaId, transformer } = setup('y = x^2', 0, 1);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		for (const p of svg!.paths) {
			expect(p.d.trim().endsWith('Z')).toBe(true);
			expect(p.d.startsWith('M')).toBe(true);
		}
	});

	it('returns null when bounds are equal', () => {
		const { figure, areaId, transformer } = setup('y = x^2', 1, 1);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).toBeNull();
	});

	it('returns null when the element does not exist', () => {
		const { figure, symbols } = runDsl(`f = courbe("y = x^2")`);
		void symbols;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG('nope', figure, transformer, DIMS);
		expect(svg).toBeNull();
	});

	it('returns null when called on a non-integralArea element', () => {
		const { figure, symbols } = runDsl(`f = courbe("y = x^2")`);
		const fnId = symbols.get('f')!.figureId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(fnId, figure, transformer, DIMS);
		expect(svg).toBeNull();
	});
});

// =============================================================================
// E. integralAreaToSVG — slider-driven bounds
// =============================================================================

describe('integralAreaToSVG — dynamic bounds', () => {
	it('reflects current slider values in the rendered path', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = x^2")
b = slider(min=0, max=2, valeur=1)
A = integrale(f, 0, b)`
		);
		const areaId = figure.getAllElements().find((e) => e.type === 'integralArea')!.id;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);

		const svgBefore = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svgBefore).not.toBeNull();
		const dBefore = svgBefore!.paths[0].d;

		// Move slider to 2 — sub-interval is now wider, path string changes.
		const bId = symbols.get('b')!.figureId!;
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();

		const svgAfter = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svgAfter).not.toBeNull();
		expect(svgAfter!.paths[0].d).not.toBe(dBefore);
	});
});
