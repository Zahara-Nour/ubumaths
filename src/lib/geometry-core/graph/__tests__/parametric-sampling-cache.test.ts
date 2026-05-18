/**
 * Unit tests for the parametric-sampling cache (Quick Win #6, 2026-05-18).
 *
 * `Figure.computeParametricCurveSampling` is memoised by a snapshot of the
 * curve's bounds, scalar bindings, and viewport. These tests verify:
 *   - cache hit returns the same ParametricSampleResult reference
 *   - cache miss on viewport change
 *   - cache miss on slider change (when curve depends on a slider)
 *   - cache miss on the bound itself moving (slider-backed tMin/tMax)
 *   - independent cache entries for distinct curve elements
 *   - cache hit even with no viewport (both calls without viewport)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../dsl/parser';
import { interpret } from '../../dsl/interpreter';
import type { Viewport } from '../../viewport/types';

const viewportA: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const viewportB: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function run(script: string) {
	return interpret(parse(script));
}

function curveId(symbols: Map<string, { figureId?: string }>, name: string): string {
	const sym = symbols.get(name);
	if (!sym?.figureId) throw new Error(`Symbol "${name}" not found`);
	return sym.figureId;
}

describe('computeParametricCurveSampling — cache', () => {
	const baseScript = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;

	it('returns the same ParametricSampleResult reference on identical second call (hit)', () => {
		const { figure, symbols } = run(baseScript);
		const cId = curveId(symbols, 'c');
		const r1 = figure.computeParametricCurveSampling(cId, viewportA);
		const r2 = figure.computeParametricCurveSampling(cId, viewportA);
		expect(r2).toBe(r1);
	});

	it('caches results across calls without a viewport argument too', () => {
		const { figure, symbols } = run(baseScript);
		const cId = curveId(symbols, 'c');
		const r1 = figure.computeParametricCurveSampling(cId);
		const r2 = figure.computeParametricCurveSampling(cId);
		expect(r2).toBe(r1);
	});

	it('recomputes on viewport change (miss)', () => {
		const { figure, symbols } = run(baseScript);
		const cId = curveId(symbols, 'c');
		const r1 = figure.computeParametricCurveSampling(cId, viewportA);
		const r2 = figure.computeParametricCurveSampling(cId, viewportB);
		expect(r2).not.toBe(r1);
		expect(r2).not.toBeNull();
	});

	it('distinguishes "no viewport" from "any viewport"', () => {
		const { figure, symbols } = run(baseScript);
		const cId = curveId(symbols, 'c');
		const rNo = figure.computeParametricCurveSampling(cId);
		const rWith = figure.computeParametricCurveSampling(cId, viewportA);
		expect(rNo).not.toBe(rWith);
	});

	it('recomputes when a slider in the curve expression changes', () => {
		// a = slider that scales the radius. Moving a should bust the cache.
		const script = [
			'a = slider(0.5, 3, 1)',
			`c = courbe("x = a*cos(t)", "y = a*sin(t)", t_min=0, t_max=${2 * Math.PI})`
		].join('\n');
		const { figure, symbols } = run(script);
		const cId = curveId(symbols, 'c');
		const aId = symbols.get('a')!.figureId!;

		const r1 = figure.computeParametricCurveSampling(cId, viewportA);
		figure.moveSlider(aId, 2);
		figure.recompute();
		const r2 = figure.computeParametricCurveSampling(cId, viewportA);

		expect(r2).not.toBe(r1);
		expect(r2).not.toBeNull();
	});

	it('recomputes when a slider-backed bound changes', () => {
		const script = [
			'tmax = slider(1, 10, 5)',
			'c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=tmax)'
		].join('\n');
		const { figure, symbols } = run(script);
		const cId = curveId(symbols, 'c');
		const tmaxId = symbols.get('tmax')!.figureId!;

		const r1 = figure.computeParametricCurveSampling(cId, viewportA);
		figure.moveSlider(tmaxId, 3);
		figure.recompute();
		const r2 = figure.computeParametricCurveSampling(cId, viewportA);

		expect(r2).not.toBe(r1);
	});

	it('keeps independent cache entries for two distinct parametric curves', () => {
		const script = [
			`c1 = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`c2 = courbe("x = 2*cos(t)", "y = 2*sin(t)", t_min=0, t_max=${2 * Math.PI})`
		].join('\n');
		const { figure, symbols } = run(script);
		const c1Id = curveId(symbols, 'c1');
		const c2Id = curveId(symbols, 'c2');

		const r1a = figure.computeParametricCurveSampling(c1Id, viewportA);
		const r2a = figure.computeParametricCurveSampling(c2Id, viewportA);
		const r1b = figure.computeParametricCurveSampling(c1Id, viewportA);
		const r2b = figure.computeParametricCurveSampling(c2Id, viewportA);

		expect(r1b).toBe(r1a);
		expect(r2b).toBe(r2a);
		expect(r1a).not.toBe(r2a);
	});

	it('content matches between hit and miss (sanity)', () => {
		const { figure, symbols } = run(baseScript);
		const cId = curveId(symbols, 'c');
		const r1 = figure.computeParametricCurveSampling(cId, viewportA);
		const r2 = figure.computeParametricCurveSampling(cId, viewportA);
		expect(r2).not.toBeNull();
		expect(r1).not.toBeNull();
		expect(r2!.points.length).toBe(r1!.points.length);
	});
});
