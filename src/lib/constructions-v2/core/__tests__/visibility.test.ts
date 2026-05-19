/**
 * Tests for the final visibility pass (Phase C).
 *
 * After the last sub-step of a decorated statement, `applyFinalVisibility`
 * sets each produced element's `visible` flag according to the visibility
 * decorator :
 *   - `@squelette` (default) : principal + charnières visible, traces hidden.
 *   - `@epure`              : only the principal visible.
 *   - `@complet`            : everything visible, traces in dashed faded style.
 *
 * The executor schedules visibility application via `_pendingVisibility` at
 * the last sub-step and drains it at the next `step()` call (or when
 * `executeAll()` finishes by calling `step()` one extra time which returns
 * false but still drains).
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import { applyFinalVisibility } from '../choreographies/visibility';
import { Figure } from '$lib/geometry-core/graph/figure';
import { numeric, type GeoPoint } from '$lib/geometry-core/types/geo-value';

function pt(x: number, y: number): GeoPoint {
	return { x: numeric(x), y: numeric(y) };
}

describe('applyFinalVisibility — pure function', () => {
	function buildFigure() {
		const fig = new Figure();
		const a = fig.createFreePoint(pt(0, 0), { label: 'A' });
		const b = fig.createFreePoint(pt(4, 0), { label: 'B' });
		// Mock principal + charnière + trace ids.
		const principal = fig.createSegment(a, b);
		const charniere = fig.createFreePoint(pt(2, 1), { label: 'M' });
		const trace = fig.createFreePoint(pt(2, -1), { label: 'T' });
		const hidden = fig.createFreePoint(pt(0, 5), { label: 'H' });
		// All start visible.
		return { fig, principal, charniere, trace, hidden };
	}

	it('@epure hides everything except principal', () => {
		const { fig, principal, charniere, trace, hidden } = buildFigure();
		applyFinalVisibility(
			fig,
			{
				principal,
				charnieres: [charniere],
				traces: [trace],
				hiddenSupport: [hidden]
			},
			'epure'
		);
		expect(fig.getElementById(principal)?.visible).toBe(true);
		expect(fig.getElementById(charniere)?.visible).toBe(false);
		expect(fig.getElementById(trace)?.visible).toBe(false);
		expect(fig.getElementById(hidden)?.visible).toBe(false);
	});

	it('@squelette keeps principal + charnières, hides traces', () => {
		const { fig, principal, charniere, trace, hidden } = buildFigure();
		applyFinalVisibility(
			fig,
			{
				principal,
				charnieres: [charniere],
				traces: [trace],
				hiddenSupport: [hidden]
			},
			'squelette'
		);
		expect(fig.getElementById(principal)?.visible).toBe(true);
		expect(fig.getElementById(charniere)?.visible).toBe(true);
		expect(fig.getElementById(trace)?.visible).toBe(false);
		expect(fig.getElementById(hidden)?.visible).toBe(false);
	});

	it('@complet shows everything with traces in dashed + reduced opacity', () => {
		const { fig, principal, charniere, trace, hidden } = buildFigure();
		applyFinalVisibility(
			fig,
			{
				principal,
				charnieres: [charniere],
				traces: [trace],
				hiddenSupport: [hidden]
			},
			'complet'
		);
		expect(fig.getElementById(principal)?.visible).toBe(true);
		expect(fig.getElementById(charniere)?.visible).toBe(true);
		expect(fig.getElementById(trace)?.visible).toBe(true);
		// Hidden support always stays invisible regardless of mode.
		expect(fig.getElementById(hidden)?.visible).toBe(false);
		// Trace style updated.
		const traceEl = fig.getElementById(trace);
		expect(traceEl?.style?.dash).toBe('dashed');
		expect(traceEl?.style?.opacity).toBe(0.4);
	});
});

describe('ConstructionExecutor — visibility wiring', () => {
	it('mediatrice @euclide (default @squelette) hides arcs and segment-trace at end', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.executeAll();
		// Drain the pending visibility by calling step() once more (returns false).
		exec.step();
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// Principal (line d) visible.
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		// Charnières (I1, I2) visible.
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(true);
		}
		// Traces (arc1, arc2, segmentTrace) hidden.
		for (const id of result!.produced.traces) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
	});

	it('mediatrice @euclide @epure hides everything except principal', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide @epure'].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
		for (const id of result!.produced.traces) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
	});

	it('mediatrice @euclide @complet shows traces with dashed + opacity 0.4', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide @complet'].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// All visible.
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(true);
		}
		for (const id of result!.produced.traces) {
			const el = exec.figure.getElementById(id);
			expect(el?.visible).toBe(true);
			expect(el?.style?.dash).toBe('dashed');
			expect(el?.style?.opacity).toBe(0.4);
		}
	});
});
