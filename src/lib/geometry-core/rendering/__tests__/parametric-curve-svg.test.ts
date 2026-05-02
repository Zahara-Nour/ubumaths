/**
 * Phase 3 — parametricCurveToSVG + figure.computeParametricCurveSampling.
 *
 * Red-first TDD: validates SVG path generation for parametric curves
 * (cercle, parabole), bornes dynamiques (slider), discontinuités, courbe fermée,
 * et cas dégénérés (mauvais type, bornes inversées).
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { createTransformer } from '../../viewport/viewport';
import { numeric, type ScalarParam } from '../../types/geo-value';
import { parseCustom, compile } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import type { GeoParametricCurve } from '../../types/elements';
import { parametricCurveToSVG } from '../svg-primitives';

// Standard viewport: -10..10 on both axes, 800x600 SVG
const viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const transformer = createTransformer(viewport, 800, 600);
const dims = { width: 800, height: 600 };

interface ParametricBundle {
	xExpression: ReturnType<typeof parseCustom>;
	yExpression: ReturnType<typeof parseCustom>;
	xDerivative: ReturnType<typeof parseCustom> | null;
	yDerivative: ReturnType<typeof parseCustom> | null;
	compiledX: ReturnType<typeof compile>;
	compiledY: ReturnType<typeof compile>;
	compiledXPrime: ReturnType<typeof compile> | null;
	compiledYPrime: ReturnType<typeof compile> | null;
}

/** Build the symbolic + compiled bundle for a parametric curve. */
function bundleFor(xSrc: string, ySrc: string, parameter = 't'): ParametricBundle {
	const xExpression = parseCustom(xSrc);
	const yExpression = parseCustom(ySrc);
	const xDerivative = differentiate(xExpression, { variable: parameter, simplify: true });
	const yDerivative = differentiate(yExpression, { variable: parameter, simplify: true });
	return {
		xExpression,
		yExpression,
		xDerivative,
		yDerivative,
		compiledX: compile(xExpression),
		compiledY: compile(yExpression),
		compiledXPrime: compile(xDerivative),
		compiledYPrime: compile(yDerivative)
	};
}

/** Helper: create a unit circle parametric curve x=cos(t), y=sin(t), t∈[0, 2π]. */
function createCircle(figure: Figure, tMin?: ScalarParam, tMax?: ScalarParam): string {
	const b = bundleFor('cos(t)', 'sin(t)');
	const tMinParam: ScalarParam = tMin ?? numeric(0);
	const tMaxParam: ScalarParam = tMax ?? numeric(2 * Math.PI);
	return figure.createParametricCurve(
		b.xExpression,
		b.yExpression,
		b.xDerivative,
		b.yDerivative,
		b.compiledX,
		b.compiledY,
		b.compiledXPrime,
		b.compiledYPrime,
		't',
		tMinParam,
		tMaxParam,
		'x = cos(t)',
		'y = sin(t)',
		[]
	);
}

/** Helper: create a parabola x=t, y=t^2, t∈[-3, 3]. */
function createParabola(figure: Figure): string {
	const b = bundleFor('t', 't^2');
	return figure.createParametricCurve(
		b.xExpression,
		b.yExpression,
		b.xDerivative,
		b.yDerivative,
		b.compiledX,
		b.compiledY,
		b.compiledXPrime,
		b.compiledYPrime,
		't',
		numeric(-3),
		numeric(3),
		'x = t',
		'y = t^2',
		[]
	);
}

// =============================================================================
// A. Nominal: cercle, parabole
// =============================================================================

describe('parametricCurveToSVG — nominal cases', () => {
	it('returns a non-empty SVG path for the unit circle and detects closed=true', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.path.length).toBeGreaterThan(0);
		expect(svg!.path.startsWith('M')).toBe(true);
		expect(svg!.closed).toBe(true);
	});

	it('returns a non-empty SVG path for a parabola (not closed)', () => {
		const figure = new Figure();
		const id = createParabola(figure);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.path.length).toBeGreaterThan(0);
		expect(svg!.path.startsWith('M')).toBe(true);
		expect(svg!.closed).toBe(false);
	});

	it('appends Z to the path when curve is closed', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.closed).toBe(true);
		// Closed path ends with 'Z'
		expect(svg!.path.trimEnd().endsWith('Z')).toBe(true);
	});

	it('does NOT append Z to the path for an open curve', () => {
		const figure = new Figure();
		const id = createParabola(figure);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.closed).toBe(false);
		expect(svg!.path.trimEnd().endsWith('Z')).toBe(false);
	});
});

// =============================================================================
// B. Dynamic bounds (slider-driven tMin/tMax)
// =============================================================================

describe('parametricCurveToSVG — dynamic bounds via sliders', () => {
	it('resolves slider-driven tMax to produce a partial circle', () => {
		const figure = new Figure();
		// Slider for tMax in [0, 2π], starts at π (half circle).
		const sliderId = figure.createSlider(0, 2 * Math.PI, Math.PI);
		const id = createCircle(figure, numeric(0), { scalarRef: sliderId });
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.path.length).toBeGreaterThan(0);
		// Half circle is NOT closed (starts at (1,0), ends at (-1,0))
		expect(svg!.closed).toBe(false);
	});

	it('detects closed when slider tMax = 2π for a circle', () => {
		const figure = new Figure();
		const sliderId = figure.createSlider(0, 2 * Math.PI, 2 * Math.PI);
		const id = createCircle(figure, numeric(0), { scalarRef: sliderId });
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(svg!.closed).toBe(true);
	});
});

// =============================================================================
// C. Edge cases / errors
// =============================================================================

describe('parametricCurveToSVG — edge cases', () => {
	it('returns null for an unknown id', () => {
		const figure = new Figure();
		const svg = parametricCurveToSVG('does-not-exist', figure, transformer, dims);
		expect(svg).toBeNull();
	});

	it('returns null when element is not a parametric curve', () => {
		const figure = new Figure();
		const sliderId = figure.createSlider(0, 10, 5);
		const svg = parametricCurveToSVG(sliderId, figure, transformer, dims);
		expect(svg).toBeNull();
	});

	it('returns null when slider tMax ≤ tMin (inverted bounds)', () => {
		const figure = new Figure();
		// Slider that starts at 0 — same as tMin → empty range
		const sliderId = figure.createSlider(0, 2 * Math.PI, 0);
		const id = createCircle(figure, numeric(0), { scalarRef: sliderId });
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).toBeNull();
	});
});

// =============================================================================
// D. Discontinuity handling
// =============================================================================

describe('parametricCurveToSVG — discontinuities', () => {
	it('produces multiple M commands when curve has a NaN-driven discontinuity', () => {
		const figure = new Figure();
		// y = 1/t, t∈[-2, 2] → discontinuity at t=0.
		const b = bundleFor('t', '1/t');
		const id = figure.createParametricCurve(
			b.xExpression,
			b.yExpression,
			b.xDerivative,
			b.yDerivative,
			b.compiledX,
			b.compiledY,
			b.compiledXPrime,
			b.compiledYPrime,
			't',
			numeric(-2),
			numeric(2),
			'x = t',
			'y = 1/t',
			[]
		);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		// Expect at least 2 'M' commands to indicate a discontinuity break
		const mCount = (svg!.path.match(/M/g) ?? []).length;
		expect(mCount).toBeGreaterThanOrEqual(2);
		expect(svg!.closed).toBe(false);
	});
});

// =============================================================================
// E. figure.computeParametricCurveSampling
// =============================================================================

describe('figure.computeParametricCurveSampling', () => {
	it('returns a result with points for a unit circle', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const result = figure.computeParametricCurveSampling(id);
		expect(result).not.toBeNull();
		expect(result!.points.length).toBeGreaterThan(0);
		expect(result!.closed).toBe(true);
	});

	it('returns null for unknown id', () => {
		const figure = new Figure();
		const result = figure.computeParametricCurveSampling('nope');
		expect(result).toBeNull();
	});

	it('returns null when element is not a parametric curve', () => {
		const figure = new Figure();
		const sliderId = figure.createSlider(0, 10, 5);
		const result = figure.computeParametricCurveSampling(sliderId);
		expect(result).toBeNull();
	});

	it('uses viewport when provided to scale closed-curve detection', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const result = figure.computeParametricCurveSampling(id, viewport);
		expect(result).not.toBeNull();
		expect(result!.closed).toBe(true);
	});
});

// =============================================================================
// F. Type correctness — ensure imported type matches
// =============================================================================

describe('parametricCurveToSVG — type signatures', () => {
	it('output structure has path:string and closed:boolean', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const svg = parametricCurveToSVG(id, figure, transformer, dims);
		expect(svg).not.toBeNull();
		expect(typeof svg!.path).toBe('string');
		expect(typeof svg!.closed).toBe('boolean');
	});

	it('returned element is GeoParametricCurve as expected', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.type).toBe('parametricCurve');
	});
});
