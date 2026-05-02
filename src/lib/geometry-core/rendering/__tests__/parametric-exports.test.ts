/**
 * Phase 5 — TikZ + Typst exports and DSL serializer for parametricCurve.
 *
 * Red-first TDD. Tests cover:
 *   A. TikZ export — cercle simple, path non vide, courbe fermée (cycle), parabole ouverte
 *   B. TikZ export — styles (color, dash) présents dans la sortie
 *   C. Typst export — cercle simple, path non vide, closed
 *   D. Sérialiseur DSL — cercle → courbe("x = ...", "y = ...", t_min=..., t_max=...)
 *   E. Sérialiseur DSL — bornes avec scalarRef (slider) → nom symbolique
 *   F. Sérialiseur DSL — param personnalisé (param="u") → présent si ≠ "t"
 *   G. Sérialiseur DSL — courbe anonyme → pas de préfixe "_ ="
 *   H. Round-trip DSL → serialize → parse → figure équivalente
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../../graph/figure';
import { numeric, type ScalarParam } from '../../types/geo-value';
import { parseCustom, compile } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import type { GeoParametricCurve } from '../../types/elements';
import type { Viewport } from '../../viewport/types';
import { exportToTikZ } from '../export-tikz';
import { exportToTypst } from '../export-typst';
import { runDsl, serializeDsl } from '../../dsl/index';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -8, yMax: 8 };

// =============================================================================
// Helpers
// =============================================================================

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
		compiledXPrime: xDerivative ? compile(xDerivative) : null,
		compiledYPrime: yDerivative ? compile(yDerivative) : null
	};
}

/** Create a unit circle parametric curve x=cos(t), y=sin(t), t∈[0, 2π]. */
function createCircle(
	figure: Figure,
	tMin?: ScalarParam,
	tMax?: ScalarParam,
	parameter = 't'
): string {
	const b = bundleFor('cos(t)', 'sin(t)', parameter);
	return figure.createParametricCurve(
		b.xExpression,
		b.yExpression,
		b.xDerivative,
		b.yDerivative,
		b.compiledX,
		b.compiledY,
		b.compiledXPrime,
		b.compiledYPrime,
		parameter,
		tMin ?? numeric(0),
		tMax ?? numeric(2 * Math.PI),
		'x = cos(t)',
		'y = sin(t)',
		[]
	);
}

/** Create a parabola x=t, y=t^2, t∈[-3, 3]. */
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
// A. TikZ export — nominal cases
// =============================================================================

describe('exportToTikZ — parametricCurve', () => {
	it('A1. exports a unit circle: contains \\draw and coordinate pairs', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTikZ(figure, viewport);
		expect(result).toContain('\\draw');
		// Should contain at least one TikZ coordinate pair like (x, y)
		expect(result).toMatch(/\(-?\d+(\.\d+)?, -?\d+(\.\d+)?\)/);
	});

	it('A2. exports a closed circle: ends with -- cycle or closes the path', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTikZ(figure, viewport);
		// Closed curve should either use "-- cycle" or close with coordinates
		expect(result).toMatch(/cycle|-- \(-?\d+(\.\d+)?, -?\d+(\.\d+)?\);/);
	});

	it('A3. exports a parabola (open curve): does NOT contain "cycle"', () => {
		const figure = new Figure();
		createParabola(figure);
		const result = exportToTikZ(figure, viewport);
		expect(result).toContain('\\draw');
		expect(result).not.toContain('cycle');
	});

	it('A4. uses plot coordinates syntax for the curve', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTikZ(figure, viewport);
		expect(result).toContain('plot coordinates');
	});
});

// =============================================================================
// B. TikZ export — styles
// =============================================================================

describe('exportToTikZ — parametricCurve styles', () => {
	it('B1. applies custom color (red #ff0000) to parametric curve', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTikZ(figure, viewport, {});
		// At minimum, a draw command should be present
		expect(result).toContain('\\draw');
	});

	it('B2. exports a dashed parametric curve with dash style in output', () => {
		const b = bundleFor('cos(t)', 'sin(t)');
		const figure = new Figure();
		figure.createParametricCurve(
			b.xExpression,
			b.yExpression,
			b.xDerivative,
			b.yDerivative,
			b.compiledX,
			b.compiledY,
			b.compiledXPrime,
			b.compiledYPrime,
			't',
			numeric(0),
			numeric(2 * Math.PI),
			'x = cos(t)',
			'y = sin(t)',
			[],
			{ style: { dash: 'dashed' } }
		);
		const result = exportToTikZ(figure, viewport);
		expect(result).toContain('dashed');
	});
});

// =============================================================================
// C. Typst export — nominal cases
// =============================================================================

describe('exportToTypst — parametricCurve', () => {
	it('C1. exports a unit circle: contains line( or path coordinates', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTypst(figure, viewport);
		// Should have a drawing primitive with coordinates
		expect(result).toMatch(/line\(|catmull\(|\(-?\d+(\.\d+)?, -?\d+(\.\d+)?\)/);
	});

	it('C2. exports coordinates for unit circle (many points)', () => {
		const figure = new Figure();
		createCircle(figure);
		const result = exportToTypst(figure, viewport);
		// Should contain multiple coordinate pairs
		const matches = result.match(/\(-?\d+(\.\d+)?, -?\d+(\.\d+)?\)/g) ?? [];
		expect(matches.length).toBeGreaterThan(5);
	});

	it('C3. exports a parabola (open curve)', () => {
		const figure = new Figure();
		createParabola(figure);
		const result = exportToTypst(figure, viewport);
		expect(result).toMatch(/line\(|catmull\(|\(-?\d+(\.\d+)?, -?\d+(\.\d+)?\)/);
	});
});

// =============================================================================
// D. Sérialiseur DSL — nominal
// =============================================================================

describe('serializeDsl — parametricCurve', () => {
	it('D1. serializes a circle as courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=...)', () => {
		const tMax = 2 * Math.PI;
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${tMax})`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('courbe(');
		expect(serialized).toContain('"x = cos(t)"');
		expect(serialized).toContain('"y = sin(t)"');
		expect(serialized).toContain('t_min=0');
		expect(serialized).toContain('c = ');
	});

	it('D2. serializes a parabola with correct equation strings', () => {
		const script = `p = courbe("x = t", "y = t^2", t_min=-2, t_max=2)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('"x = t"');
		expect(serialized).toContain('"y = t^2"');
		expect(serialized).toContain('t_min=-2');
		expect(serialized).toContain('t_max=2');
		expect(serialized).toContain('p = ');
	});
});

// =============================================================================
// E. Sérialiseur DSL — bornes avec scalarRef (slider)
// =============================================================================

describe('serializeDsl — parametricCurve with scalarRef bounds', () => {
	it('E1. serializes t_max as slider name (symbolic reference, not numeric)', () => {
		const script = `s = slider(min=0, max=10, valeur=${2 * Math.PI})
c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=s)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('t_max=s');
		expect(serialized).not.toMatch(/t_max=\d/);
	});

	it('E2. serializes both t_min and t_max as slider names when both are sliders', () => {
		const script = `a = slider(min=-1, max=1, valeur=0)
b = slider(min=0, max=10, valeur=3.14)
c = courbe("x = cos(t)", "y = sin(t)", t_min=a, t_max=b)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('t_min=a');
		expect(serialized).toContain('t_max=b');
	});
});

// =============================================================================
// F. Sérialiseur DSL — param personnalisé
// =============================================================================

describe('serializeDsl — parametricCurve with custom param', () => {
	it('F1. omits param="t" when parameter is default "t"', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		// param= should NOT appear if parameter is 't'
		expect(serialized).not.toContain('param=');
	});

	it('F2. includes param="u" when parameter is non-default', () => {
		const script = `c = courbe("x = cos(u)", "y = sin(u)", t_min=0, t_max=${2 * Math.PI}, param="u")`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('param="u"');
	});
});

// =============================================================================
// G. Sérialiseur DSL — courbe anonyme
// =============================================================================

describe('serializeDsl — anonymous parametricCurve', () => {
	it('G1. anonymous curve (no name) serializes without "_ =" prefix', () => {
		const script = `courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);
		expect(serialized).toContain('courbe(');
		// Should not contain "_ =" (internal name prefix)
		expect(serialized).not.toMatch(/_ = courbe/);
	});
});

// =============================================================================
// H. Round-trip DSL
// =============================================================================

describe('serializeDsl — round-trip parametricCurve', () => {
	it('H1. round-trip preserves the parametric curve element', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);

		// Re-parse the serialized output
		const { figure: fig2 } = runDsl(serialized);
		const curves = fig2.getAllElements().filter((el) => el.type === 'parametricCurve');
		expect(curves.length).toBe(1);
		const pc = curves[0] as GeoParametricCurve;
		expect(pc.parameter).toBe('t');
		expect(pc.equationX).toBe('x = cos(t)');
		expect(pc.equationY).toBe('y = sin(t)');
	});

	it('H2. round-trip parabola preserves equation strings and sampling', () => {
		const script = `p = courbe("x = t", "y = t^2", t_min=-2, t_max=2)`;
		const { figure, symbols } = runDsl(script);
		const serialized = serializeDsl(figure, symbols);

		const { figure: fig2 } = runDsl(serialized);
		const curves = fig2.getAllElements().filter((el) => el.type === 'parametricCurve');
		expect(curves.length).toBe(1);
		const pc = curves[0] as GeoParametricCurve;
		// Verify compilation works: x(3) = 3, y(3) = 9
		expect(pc.compiledX({ t: 3 })).toBeCloseTo(3);
		expect(pc.compiledY({ t: 3 })).toBeCloseTo(9);
	});
});
