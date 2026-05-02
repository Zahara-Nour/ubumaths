/**
 * Phase 4 — End-to-end reactivity for parametric curves.
 *
 * Verifies that moving a slider referenced in t_min, t_max, or in x(t)/y(t)
 * causes computeParametricCurveSampling to produce a different result on
 * the next call. This exercises the wiring between Phase 2 (dependsOn
 * collection in the DSL builtin) and Phase 3 (dynamic ScalarParam
 * resolution at compute time).
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import type { GeoParametricCurve } from '../../types/elements';

const TWO_PI = 2 * Math.PI;

function getParametricCurve(figure: ReturnType<typeof runDsl>['figure'], symbolId: string) {
	return figure.getElementById(symbolId) as GeoParametricCurve;
}

describe('parametric curve — reactive bounds via slider', () => {
	it('moving t_max slider changes the sampled point count and last point', () => {
		const script = [
			`unite_angle("radians")`,
			`s = slider(min=0.5, max=${TWO_PI}, valeur=${Math.PI})`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=s)`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const sliderId = symbols.get('s')!.figureId!;
		const curveId = symbols.get('c')!.figureId!;

		const before = figure.computeParametricCurveSampling(curveId);
		expect(before).not.toBeNull();
		const lastBefore = before!.points[before!.points.length - 1];

		figure.beginTransaction();
		figure.moveSlider(sliderId, TWO_PI);
		figure.recompute();
		figure.commit();

		const after = figure.computeParametricCurveSampling(curveId);
		expect(after).not.toBeNull();
		const lastAfter = after!.points[after!.points.length - 1];

		// At t = π → (-1, 0) ; at t = 2π → (1, 0).
		expect(lastBefore.x).toBeCloseTo(-1, 1);
		expect(lastAfter.x).toBeCloseTo(1, 1);
	});

	it('moving t_max slider changes the closed-curve flag', () => {
		const script = [
			`unite_angle("radians")`,
			`s = slider(min=0.5, max=${TWO_PI}, valeur=${Math.PI})`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=s)`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const sliderId = symbols.get('s')!.figureId!;
		const curveId = symbols.get('c')!.figureId!;

		// Half-circle at t_max = π — endpoints (1, 0) and (-1, 0) are 2 apart.
		const half = figure.computeParametricCurveSampling(curveId, {
			xMin: -2,
			xMax: 2,
			yMin: -2,
			yMax: 2
		});
		expect(half!.closed).toBe(false);

		// Full circle at t_max = 2π — endpoints (1, 0) and (1, 0) coincide.
		figure.beginTransaction();
		figure.moveSlider(sliderId, TWO_PI);
		figure.recompute();
		figure.commit();

		const full = figure.computeParametricCurveSampling(curveId, {
			xMin: -2,
			xMax: 2,
			yMin: -2,
			yMax: 2
		});
		expect(full!.closed).toBe(true);
	});

	it('slider in x(t)/y(t) coefficient rescales the sampled points', () => {
		const script = [
			`unite_angle("radians")`,
			`r = slider(min=0.5, max=5, valeur=1)`,
			`c = courbe("x = r * cos(t)", "y = r * sin(t)", t_min=0, t_max=${TWO_PI}, param="t")`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const sliderId = symbols.get('r')!.figureId!;
		const curveId = symbols.get('c')!.figureId!;

		const before = figure.computeParametricCurveSampling(curveId);
		expect(before).not.toBeNull();
		// All points sit on the unit circle.
		for (const p of before!.points) {
			expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 1);
		}

		figure.beginTransaction();
		figure.moveSlider(sliderId, 3);
		figure.recompute();
		figure.commit();

		const after = figure.computeParametricCurveSampling(curveId);
		expect(after).not.toBeNull();
		// Now points sit on the radius-3 circle.
		for (const p of after!.points) {
			expect(Math.hypot(p.x, p.y)).toBeCloseTo(3, 1);
		}
	});

	it('curve dependsOn includes every scalar referenced in x, y, t_min, and t_max', () => {
		const script = [
			`unite_angle("radians")`,
			`a = slider(min=0.5, max=5, valeur=2)`,
			`b = slider(min=0, max=10, valeur=1)`,
			`m = slider(min=0, max=1, valeur=0)`,
			`n = slider(min=1, max=10, valeur=${TWO_PI})`,
			`c = courbe("x = a * cos(t)", "y = b * sin(t)", t_min=m, t_max=n)`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const aId = symbols.get('a')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		const mId = symbols.get('m')!.figureId!;
		const nId = symbols.get('n')!.figureId!;
		const curveId = symbols.get('c')!.figureId!;

		const pc = getParametricCurve(figure, curveId);
		const deps = new Set(pc.dependsOn);
		expect(deps.has(aId)).toBe(true);
		expect(deps.has(bId)).toBe(true);
		expect(deps.has(mId)).toBe(true);
		expect(deps.has(nId)).toBe(true);
	});
});
