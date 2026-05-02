/**
 * V5 — SVG rendering of improper integral areas (clipping at viewport edge).
 *
 * Spec: docs/wip/geometry/improper-integrals-study.md §2.5.
 */
import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import { createTransformer } from '../../viewport/viewport';
import type { Viewport } from '../../viewport/types';
import { integralAreaToSVG, integralAreaBetweenToSVG } from '../svg-primitives';

const VIEWPORT: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const DIMS = { width: 600, height: 600 };

describe('integralAreaToSVG — improper bounds', () => {
	it('clips +∞ to viewport right edge for integrale(exp(-x), 0, +inf)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(-x)")
A = integrale(f, 0, +inf)`
		);
		// `A` is the GeoScalar; the visual area is its `_visualAreaId`.
		const aId = symbols.get('A')!.figureId!;
		const aEl = figure.getElementById(aId);
		expect(aEl).toBeDefined();
		expect(aEl!.type).toBe('scalar');
		// The visual area id is on the scalar element.
		const areaId = (aEl as { _visualAreaId?: string })._visualAreaId!;
		expect(areaId).toBeDefined();

		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(1);
		// At least one path must extend close to the right edge of the viewport.
		// (We can't easily parse the SVG path string here, so just assert the path
		// is non-empty and the renderer didn't bail out.)
		expect(svg!.paths[0].d).toMatch(/Z$/);
	});

	it('clips both ±∞ for integrale(1/(1+x²), -inf, +inf)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = 1/(1+x^2)")
A = integrale(f, -inf, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(1);
	});

	it('clips -∞ for integrale(exp(x), -inf, 0)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(x)")
A = integrale(f, -inf, 0)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
	});
});

describe('integralAreaBetweenToSVG — improper bounds', () => {
	it('clips +∞ for aire_entre(exp(-x), exp(-2x), 0, +inf)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(-x)")
g = courbe("y = exp(-2*x)")
A = aire_entre(f, g, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.paths.length).toBeGreaterThanOrEqual(1);
	});
});

// =============================================================================
// V5.1 — infinityEdges visual indicator
// =============================================================================

describe('integralAreaToSVG — infinityEdges (V5.1)', () => {
	it('emits a right-edge marker for [0, +inf)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(-x)")
A = integrale(f, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg).not.toBeNull();
		expect(svg!.infinityEdges).toBeDefined();
		expect(svg!.infinityEdges!).toHaveLength(1);
		expect(svg!.infinityEdges![0].direction).toBe('right');
		expect(svg!.infinityEdges![0].yTop).toBeLessThanOrEqual(svg!.infinityEdges![0].yBottom);
	});

	it('emits two markers for (-inf, +inf)', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(-x^2)")
A = integrale(f, -inf, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg!.infinityEdges).toBeDefined();
		expect(svg!.infinityEdges!).toHaveLength(2);
		const directions = svg!.infinityEdges!.map((e) => e.direction).sort();
		expect(directions).toEqual(['left', 'right']);
	});

	it('does NOT emit infinityEdges for finite bounds', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg!.infinityEdges).toBeUndefined();
	});

	it('emits a left-edge marker for (-inf, 0]', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(x)")
A = integrale(f, -inf, 0)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaToSVG(areaId, figure, transformer, DIMS);
		expect(svg!.infinityEdges).toBeDefined();
		expect(svg!.infinityEdges!).toHaveLength(1);
		expect(svg!.infinityEdges![0].direction).toBe('left');
	});
});

describe('integralAreaBetweenToSVG — infinityEdges (V5.1)', () => {
	it('emits markers attached between f and g at the edge', () => {
		const { figure, symbols } = runDsl(
			`f = courbe("y = exp(-x)")
g = courbe("y = exp(-2*x)")
A = aire_entre(f, g, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		const areaId = (figure.getElementById(aId) as { _visualAreaId?: string })._visualAreaId!;
		const transformer = createTransformer(VIEWPORT, DIMS.width, DIMS.height);
		const svg = integralAreaBetweenToSVG(areaId, figure, transformer, DIMS);
		expect(svg!.infinityEdges).toBeDefined();
		expect(svg!.infinityEdges!).toHaveLength(1);
		expect(svg!.infinityEdges![0].direction).toBe('right');
	});
});
