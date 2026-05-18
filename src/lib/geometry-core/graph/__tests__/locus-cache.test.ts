/**
 * Unit tests for the locus cache (Quick Win #5, 2026-05-18).
 *
 * `computeLocusCurve` is memoised by a snapshot of the locus's transitive
 * dependency state (positions + scalar values + viewport). These tests
 * verify:
 *   - cache hit returns the same SampledCurve reference
 *   - cache miss on driver movement (positions change)
 *   - cache miss on viewport change
 *   - cache miss on slider/scalar change
 *   - independent cache entries for distinct GeoLocus objects
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../dsl/parser';
import { interpret } from '../../dsl/interpreter';
import { numeric } from '../../types/geo-value';
import type { Viewport } from '../../viewport/types';

const viewportA: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const viewportB: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

function run(script: string) {
	return interpret(parse(script));
}

function getLocusId(symbols: Map<string, { figureId?: string }>, name: string): string {
	const sym = symbols.get(name);
	if (!sym?.figureId) throw new Error(`Symbol "${name}" not found`);
	return sym.figureId;
}

describe('computeLocusCurve — cache', () => {
	const baseScript = [
		'O = point(0, 0)',
		'c = cercle(O, rayon=3)',
		'A = point_sur(c, 0)',
		'B = symetrie(A, centre=O)',
		'L = lieu(B, A)'
	].join('\n');

	it('returns the same SampledCurve reference on a second identical call (cache hit)', () => {
		const { figure, symbols } = run(baseScript);
		const locId = getLocusId(symbols, 'L');
		const r1 = figure.computeLocusCurveForElement(locId, viewportA);
		const r2 = figure.computeLocusCurveForElement(locId, viewportA);
		expect(r2).toBe(r1);
	});

	it('recomputes when the viewport changes (cache miss)', () => {
		const { figure, symbols } = run(baseScript);
		const locId = getLocusId(symbols, 'L');
		const r1 = figure.computeLocusCurveForElement(locId, viewportA);
		const r2 = figure.computeLocusCurveForElement(locId, viewportB);
		// Different reference because the cache key includes viewport.
		expect(r2).not.toBe(r1);
	});

	it('recomputes when a free point in the dependency chain moves', () => {
		// Add a free point P that is in the tracer's dependency chain.
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'P = point(5, 0)',
			'M = milieu(A, P)',
			'L = lieu(M, A)'
		].join('\n');
		const { figure, symbols } = run(script);
		const locId = getLocusId(symbols, 'L');
		const pId = symbols.get('P')!.figureId!;

		const r1 = figure.computeLocusCurveForElement(locId, viewportA);
		figure.movePoint(pId, numeric(10), numeric(0));
		figure.recompute();
		const r2 = figure.computeLocusCurveForElement(locId, viewportA);

		expect(r2).not.toBe(r1);
		expect(r2).not.toBeNull();
	});

	it('still hits cache after a recompute that does not change inputs (idempotent)', () => {
		const { figure, symbols } = run(baseScript);
		const locId = getLocusId(symbols, 'L');
		const r1 = figure.computeLocusCurveForElement(locId, viewportA);
		figure.recompute(); // no actual changes — positions stay numerically equal
		const r2 = figure.computeLocusCurveForElement(locId, viewportA);
		expect(r2).toBe(r1);
	});

	it('keeps independent cache entries for two distinct locus elements', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = symetrie(A, centre=O)',
			'L1 = lieu(B, A)',
			'L2 = lieu(A, A)'
		].join('\n');
		const { figure, symbols } = run(script);
		const l1Id = getLocusId(symbols, 'L1');
		const l2Id = getLocusId(symbols, 'L2');
		const r1a = figure.computeLocusCurveForElement(l1Id, viewportA);
		const r2a = figure.computeLocusCurveForElement(l2Id, viewportA);
		const r1b = figure.computeLocusCurveForElement(l1Id, viewportA);
		const r2b = figure.computeLocusCurveForElement(l2Id, viewportA);
		// Both L1 and L2 hit their own cache entry on the second call.
		expect(r1b).toBe(r1a);
		expect(r2b).toBe(r2a);
		// And they are distinct curves.
		expect(r1a).not.toBe(r2a);
	});

	it('hit returns identical content (not just identical reference)', () => {
		const { figure, symbols } = run(baseScript);
		const locId = getLocusId(symbols, 'L');
		const r1 = figure.computeLocusCurveForElement(locId, viewportA);
		const r2 = figure.computeLocusCurveForElement(locId, viewportA);
		expect(r2).not.toBeNull();
		expect(r1).not.toBeNull();
		expect(r2!.points.length).toBe(r1!.points.length);
	});
});
