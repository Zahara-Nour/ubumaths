/**
 * Tests for routing math-pure RHS through mathAST when one or more free
 * variables resolve to scalars/sliders (Phase 4 of dsl-mathast-routing plan).
 *
 * Hybrid model:
 *   - All free vars static (numbers in symbol table) → result = number
 *   - At least one free var is a scalar/slider → result = GeoScalar reactive
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(source: string) {
	return interpret(parse(source));
}

function getId(symbols: ReturnType<typeof run>['symbols'], name: string): string {
	const entry = symbols.get(name);
	if (!entry?.figureId) throw new Error(`No figureId for "${name}"`);
	return entry.figureId;
}

describe('Phase 4 — Variables réactives via mathAST routing', () => {
	it('D1: r = 2*s where s is a slider → r is a reactive scalar', () => {
		const { figure, symbols } = run('s = slider(min=0, max=10, valeur=3)\nr = 2*s');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(rEntry?.figureId).toBeDefined();
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(6, 10);
	});

	it('D2: moveSlider triggers recompute of derived scalar', () => {
		const { figure, symbols } = run('s = slider(min=0, max=10, valeur=3)\nr = 2*s');
		const sId = getId(symbols, 's');
		const rId = getId(symbols, 'r');
		expect(figure.getScalarValue(rId)).toBeCloseTo(6, 10);

		figure.moveSlider(sId, 5);
		figure.recompute();
		expect(figure.getScalarValue(rId)).toBeCloseTo(10, 10);
	});

	it('D4: a = \\pi ; r = 2*a → r static (a is number)', () => {
		const { symbols } = run('a = \\pi\nr = 2*a');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('nombre');
		expect(rEntry?.value).toBeCloseTo(2 * Math.PI, 10);
	});

	it('D5: a = 5 ; b = a + s (s slider) → b reactive', () => {
		const { figure, symbols } = run('a = 5\ns = slider(min=0, max=10, valeur=2)\nb = a + s');
		const bEntry = symbols.get('b');
		expect(bEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(bEntry!.figureId!)).toBeCloseTo(7, 10);

		figure.moveSlider(getId(symbols, 's'), 4);
		figure.recompute();
		expect(figure.getScalarValue(bEntry!.figureId!)).toBeCloseTo(9, 10);
	});

	it('D6: r = sqrt(s) (math function + scalar dep) → r reactive', () => {
		const { figure, symbols } = run('s = slider(min=0, max=100, valeur=4)\nr = sqrt(s)');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(2, 10);

		figure.moveSlider(getId(symbols, 's'), 9);
		figure.recompute();
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(3, 10);
	});

	it('D7a: r = exp(s) - mathAST exp + scalar dep → r reactive', () => {
		const { figure, symbols } = run('s = slider(min=-2, max=2, valeur=0)\nr = exp(s)');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(1, 10);

		figure.moveSlider(getId(symbols, 's'), 1);
		figure.recompute();
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(Math.E, 10);
	});

	it('D8: réassignation r = 2*s puis r = 3*s — la nouvelle prend la place', () => {
		const { figure, symbols } = run('s = slider(min=0, max=10, valeur=2)\nr = 2*s\nr = 3*s');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(6, 10);
	});

	it('Composition: r = 2*s + \\pi (mixed scalar + constant) → r reactive', () => {
		const { figure, symbols } = run('s = slider(min=0, max=10, valeur=1)\nr = 2*s + \\pi');
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(2 + Math.PI, 10);

		figure.moveSlider(getId(symbols, 's'), 3);
		figure.recompute();
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(6 + Math.PI, 10);
	});

	it('Composition statique then reactive: a = \\pi; b = a*s → b reactive', () => {
		const { figure, symbols } = run('a = \\pi\ns = slider(min=0, max=10, valeur=2)\nb = a*s');
		const bEntry = symbols.get('b');
		expect(bEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(bEntry!.figureId!)).toBeCloseTo(2 * Math.PI, 10);
	});

	it('Backward compat: scalar binary on existing path still works (slider + slider)', () => {
		const { figure, symbols } = run(
			's1 = slider(min=0, max=10, valeur=3)\ns2 = slider(min=0, max=10, valeur=4)\nr = s1 + s2'
		);
		const rEntry = symbols.get('r');
		expect(rEntry?.type).toBe('scalar');
		expect(figure.getScalarValue(rEntry!.figureId!)).toBeCloseTo(7, 10);
	});

	it('Cascade D3: r = 2*s ; courbe(t_max=r) — moveSlider re-samples the curve', () => {
		// Full reactive chain: slider s → derived scalar r → curve t_max bound.
		// Moving s must propagate to r, which must propagate to the curve's
		// effective sampling range.
		const { figure, symbols } = run(
			[
				'unite_angle("radians")',
				's = slider(min=1, max=10, valeur=2)',
				'r = 2*s',
				'c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=r)'
			].join('\n')
		);
		const sId = getId(symbols, 's');
		const rId = getId(symbols, 'r');
		const cId = getId(symbols, 'c');

		// Sanity: r reflects 2*s = 4 initially.
		expect(figure.getScalarValue(rId)).toBeCloseTo(4, 10);

		// Curve depends on r (transitively on s).
		const curve = figure.getElementById(cId);
		expect(curve?.dependsOn).toContain(rId);

		// Sampling at t_max=4 → last point ≈ (cos(4), sin(4)).
		const before = figure.computeParametricCurveSampling(cId);
		expect(before).not.toBeNull();
		const lastBefore = before!.points[before!.points.length - 1];
		expect(lastBefore.x).toBeCloseTo(Math.cos(4), 1);
		expect(lastBefore.y).toBeCloseTo(Math.sin(4), 1);

		// Move s → r becomes 2*3=6, curve resamples up to t=6.
		figure.beginTransaction();
		figure.moveSlider(sId, 3);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(rId)).toBeCloseTo(6, 10);

		const after = figure.computeParametricCurveSampling(cId);
		expect(after).not.toBeNull();
		const lastAfter = after!.points[after!.points.length - 1];
		expect(lastAfter.x).toBeCloseTo(Math.cos(6), 1);
		expect(lastAfter.y).toBeCloseTo(Math.sin(6), 1);
	});
});
