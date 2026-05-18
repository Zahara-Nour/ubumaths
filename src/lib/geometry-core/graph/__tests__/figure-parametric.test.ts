/**
 * Phase 1 — figure.createParametricCurve() factory.
 *
 * Red-first TDD: validates id generation, element shape, dependency tracking
 * (notably for slider-driven bounds), label and style propagation.
 */

import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { parseCustom, compile } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import { numeric, type ScalarParam } from '../../types/geo-value';
import type { GeoParametricCurve } from '../../types/elements';
import { isParametricCurve } from '../../types/elements';

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

function createCircle(figure: Figure, opts?: Parameters<Figure['createParametricCurve']>[14]) {
	const b = bundleFor('cos(t)', 'sin(t)');
	const tMin: ScalarParam = numeric(0);
	const tMax: ScalarParam = numeric(2 * Math.PI);
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
		tMin,
		tMax,
		'x = cos(t)',
		'y = sin(t)',
		[],
		opts
	);
}

// =============================================================================
// A. Basic creation
// =============================================================================

describe('figure.createParametricCurve — basic creation', () => {
	it('returns a non-empty id starting with the parametric-curve prefix', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		expect(id).toBeTruthy();
		expect(id.startsWith('pc_')).toBe(true);
	});

	it('creates an element of type "parametricCurve" retrievable by id', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const el = figure.getElementById(id);
		expect(el).toBeDefined();
		expect(isParametricCurve(el!)).toBe(true);
		expect(el!.type).toBe('parametricCurve');
	});

	it('stores xExpression, yExpression, parameter, tMin, tMax and equations', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.parameter).toBe('t');
		expect(el.tMin).toEqual(numeric(0));
		expect(el.tMax).toEqual(numeric(2 * Math.PI));
		expect(el.equationX).toBe('x = cos(t)');
		expect(el.equationY).toBe('y = sin(t)');
		// Compiled closures should evaluate correctly.
		expect(el.compiledX({ t: 0 })).toBeCloseTo(1, 10);
		expect(el.compiledY({ t: Math.PI / 2 })).toBeCloseTo(1, 10);
	});

	it('eagerly compiles second derivatives so curvature hot paths skip re-differentiation', () => {
		// Performance optimization (2026-05-18): compiledXSecond/compiledYSecond
		// are populated at creation time. For (cos t, sin t), x'' = -cos t and
		// y'' = -sin t.
		const figure = new Figure();
		const id = createCircle(figure);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.compiledXSecond).not.toBeNull();
		expect(el.compiledYSecond).not.toBeNull();
		expect(el.compiledXSecond!({ t: 0 })).toBeCloseTo(-1, 10);
		expect(el.compiledYSecond!({ t: Math.PI / 2 })).toBeCloseTo(-1, 10);
	});

	it('leaves compiledXSecond / compiledYSecond null when first derivatives are missing', () => {
		const figure = new Figure();
		const xExpr = parseCustom('cos(t)');
		const yExpr = parseCustom('sin(t)');
		const id = figure.createParametricCurve(
			xExpr,
			yExpr,
			null,
			null,
			compile(xExpr),
			compile(yExpr),
			null,
			null,
			't',
			numeric(0),
			numeric(2 * Math.PI),
			'x = cos(t)',
			'y = sin(t)',
			[]
		);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.compiledXSecond).toBeNull();
		expect(el.compiledYSecond).toBeNull();
	});
});

// =============================================================================
// B. Dependencies
// =============================================================================

describe('figure.createParametricCurve — dependencies', () => {
	it('autonomous curve has empty dependsOn when dependencies = []', () => {
		const figure = new Figure();
		const id = createCircle(figure);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.dependsOn).toEqual([]);
	});

	it('dependsOn reflects scalar/slider dependencies passed by the caller', () => {
		const figure = new Figure();
		const sliderId = figure.createSlider(0, 10, 1, { label: 'a' });
		const b = bundleFor('cos(t)', 'sin(t)');
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
			{ scalarRef: sliderId },
			numeric(2 * Math.PI),
			'x = cos(t)',
			'y = sin(t)',
			[sliderId]
		);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.dependsOn).toContain(sliderId);
	});
});

// =============================================================================
// C. Options propagation
// =============================================================================

describe('figure.createParametricCurve — options', () => {
	it('applies a label from options', () => {
		const figure = new Figure();
		const id = createCircle(figure, { label: 'C' });
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.label).toBe('C');
	});

	it('applies color and style overrides', () => {
		const figure = new Figure();
		const id = createCircle(figure, {
			color: '#ff0000',
			style: { dash: 'dashed', strokeWidth: 2 }
		});
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.color).toBe('#ff0000');
		expect(el.style?.dash).toBe('dashed');
		expect(el.style?.strokeWidth).toBe(2);
	});

	it('uses figure default color when none is provided', () => {
		const figure = new Figure({ defaultColor: '#00aa00' });
		const id = createCircle(figure);
		const el = figure.getElementById(id) as GeoParametricCurve;
		expect(el.color).toBe('#00aa00');
	});
});

// =============================================================================
// D. Multiple curves coexist
// =============================================================================

describe('figure.createParametricCurve — multiple curves', () => {
	it('generates distinct ids for two parametric curves in the same figure', () => {
		const figure = new Figure();
		const id1 = createCircle(figure);
		const id2 = createCircle(figure);
		expect(id1).not.toBe(id2);
		expect(figure.getElementById(id1)).toBeDefined();
		expect(figure.getElementById(id2)).toBeDefined();
	});
});
