/**
 * Integration tests for general implicit curves F(x,y) = 0.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { marchingSquares } from '../../rendering/marching-squares';
import { compile, parseCustom, subtract } from '$lib/mathAST';
import type { MathNode } from '$lib/mathAST';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function compileFn(equation: string) {
	const parsed = parseCustom(equation);
	let F: MathNode;
	if ('relation' in parsed && parsed.relation === '=') {
		F = subtract(
			(parsed as { left: MathNode; right: MathNode }).left,
			(parsed as { left: MathNode; right: MathNode }).right
		);
	} else {
		F = parsed;
	}
	return compile(F);
}

describe('courbe — implicit curve creation', () => {
	it('creates GeoImplicitCurve for folium of Descartes', () => {
		const { figure } = run('c = courbe("x^3 + y^3 - 3*x*y = 0")');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(implicits).toHaveLength(1);
		expect(implicits[0].type).toBe('implicitCurve');
	});

	it('creates GeoImplicitCurve for transcendental curve', () => {
		const { figure } = run('c = courbe("sin(x) + cos(y) - 1 = 0")');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(implicits).toHaveLength(1);
	});

	it('creates GeoImplicitCurve for degree-4 curve', () => {
		const { figure } = run('c = courbe("x^4 + y^4 - 1 = 0")');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(implicits).toHaveLength(1);
	});

	it('preserves label', () => {
		const { figure } = run('c = courbe("x^3 + y^3 - 3*x*y = 0")');
		const el = figure.getAllElements().find((e) => e.type === 'implicitCurve');
		expect(el).toBeDefined();
		expect(el!.label).toBe('c');
	});
});

describe('courbe — regression: existing types not affected', () => {
	it('circle x^2+y^2-1=0 remains GeoQuadraticCurve', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 1 = 0")');
		const quads = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(quads).toHaveLength(1);
		expect(implicits).toHaveLength(0);
	});

	it('y=sin(x) remains GeoFunction', () => {
		const { figure } = run('f = courbe("y = sin(x)")');
		const fns = figure.getAllElements().filter((e) => e.type === 'function');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(fns).toHaveLength(1);
		expect(implicits).toHaveLength(0);
	});

	it('line y=2*x+3 remains GeoLine', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(lines).toHaveLength(1);
		expect(implicits).toHaveLength(0);
	});
});

describe('marching squares — rendering', () => {
	it('produces non-empty paths for unit circle', () => {
		const fn = compileFn('x^2 + y^2 - 1');
		const viewport = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
		const curves = marchingSquares(fn, viewport, 100);
		expect(curves.length).toBeGreaterThan(0);
		// Circle should produce a single closed-ish curve
		expect(curves[0].points.length).toBeGreaterThan(10);
	});

	it('produces paths for folium of Descartes', () => {
		const fn = compileFn('x^3 + y^3 - 3*x*y');
		const viewport = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
		const curves = marchingSquares(fn, viewport, 100);
		expect(curves.length).toBeGreaterThan(0);
	});

	it('produces paths for x^4+y^4-1=0', () => {
		const fn = compileFn('x^4 + y^4 - 1');
		const viewport = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
		const curves = marchingSquares(fn, viewport, 100);
		expect(curves.length).toBeGreaterThan(0);
		expect(curves[0].points.length).toBeGreaterThan(10);
	});

	it('returns empty for F(x,y) = 1 (no zero crossing)', () => {
		const fn = compile(parseCustom('1'));
		const viewport = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
		const curves = marchingSquares(fn, viewport, 50);
		expect(curves).toHaveLength(0);
	});
});
