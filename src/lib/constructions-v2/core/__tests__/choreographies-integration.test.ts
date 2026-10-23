/**
 * Integration tests for choreography decorators in ConstructionExecutor.
 *
 * Phase 3 wires the decorator resolution into the executor : decorators on
 * `DslAssignment` statements are validated at load time (`_loadError` on
 * invalid input) and resolved on each `step()` call (exposing
 * `currentDecoratorTriple` / `currentVoie`).
 *
 * The actual choreography animations are stubbed (`return { steps: [] }`)
 * in Phase 2 and filled in Phase 4 — so these tests verify wiring only.
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';
import type { SubStep } from '../choreographies/types';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { numeric } from '$lib/geometry-core/types/geo-value';
import {
	computeAngleGeometry,
	projectAngleEndpoints
} from '$lib/geometry-core/rendering/angle-geometry-shared';

describe('ConstructionExecutor — decorator wiring (Phase 3)', () => {
	it('no decorators → currentDecoratorTriple is null after step', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B)'].join('\n'));
		exec.step(); // A
		exec.step(); // B
		exec.step(); // d
		expect(exec.currentDecoratorTriple).toBeNull();
		expect(exec.currentVoie).toBeNull();
	});

	it('@euclide on mediatrice → triple and voie populated', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.step(); // A
		expect(exec.currentDecoratorTriple).toBeNull(); // point() has no decorators
		exec.step(); // B
		exec.step(); // d
		const triple = exec.currentDecoratorTriple;
		expect(triple).not.toBeNull();
		expect(triple!.contrainte).toBe('euclide');
		expect(triple!.methode).toBeNull();
		expect(triple!.visibilite).toBe('squelette');
		const voie = exec.currentVoie;
		expect(voie).not.toBeNull();
		expect(voie!.id).toBe('arcs_egaux'); // declared as defaut: true
	});

	it('@euclide @cercles_rayon_ab → voie matches method override', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = mediatrice(A, B) @euclide @cercles_rayon_ab'
			].join('\n')
		);
		exec.step(); // A
		exec.step(); // B
		exec.step(); // d
		const voie = exec.currentVoie;
		expect(voie).not.toBeNull();
		expect(voie!.id).toBe('cercles_rayon_ab');
	});

	it('@invalid → _loadError populated, partial figure preserved', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @invalid'].join('\n'));
		expect(exec.loadError).not.toBeNull();
		expect(exec.loadError!.message).toMatch(/@invalid|invalid/i);
		// loadError.stepIndex points to the failing step (the third).
		expect(exec.loadError!.stepIndex).toBe(2);
		// stepDurations only contains the 2 valid steps.
		expect(exec.stepDurations.length).toBe(2);
	});

	it('@euclide @mesure conflict → loadError with mutex hint', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide @mesure'].join('\n')
		);
		expect(exec.loadError).not.toBeNull();
		expect(exec.loadError!.message).toMatch(/mutuellement exclusives/i);
	});

	it('@equerre on mediatrice (not declared in V1) → loadError', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @equerre'].join('\n'));
		expect(exec.loadError).not.toBeNull();
		expect(exec.loadError!.message).toMatch(/non disponible/i);
	});

	it('@euclide on cercle_circonscrit (composition) → triple resolved', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(-3, 0)',
				'B = point(3, 0)',
				'C = point(0, 4)',
				'cc = cercle_circonscrit(A, B, C) @euclide @squelette'
			].join('\n')
		);
		exec.step(); // A
		exec.step(); // B
		exec.step(); // C
		exec.step(); // cc
		expect(exec.currentDecoratorTriple).toEqual({
			contrainte: 'euclide',
			methode: null,
			visibilite: 'squelette'
		});
		expect(exec.currentVoie).not.toBeNull();
		expect(exec.currentVoie!.id).toBe('mediatrices');
	});

	it('decorators on non-choreographed builtin → loadError', () => {
		const exec = new ConstructionExecutor();
		// `triangle` is a real builtin but not in CHOREOGRAPHED_BUILTINS V1.
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(0, 3)',
				't = triangle(A, B, C) @euclide'
			].join('\n')
		);
		expect(exec.loadError).not.toBeNull();
		expect(exec.loadError!.message).toMatch(/n.a pas de chorégraphie/i);
	});
});

describe('ConstructionExecutor — mediatrice @euclide @arcs_egaux (Phase 4 sub-steps)', () => {
	// The real choreography expands a single decorated DSL statement into 4
	// sequential sub-step entries in the timeline + creates auxiliary
	// elements (2 arcs, 2 hidden circles for the intersection, 2 intersection
	// points, 1 segment-trace, 2 scalars). The principal line is still
	// created by the builtin (Strategy B).

	it('mediatrice @euclide expands into 6 sub-step entries (4 small arcs + fade-in + ruler)', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		// 2 point statements + 6 sub-steps for the decorated mediatrice = 8 entries.
		expect(exec.totalSteps).toBe(8);
		expect(exec.stepDurations.length).toBe(8);
	});

	it('mediatrice @euclide creates auxiliary elements (arcs, intersections, segment-trace)', () => {
		const execDirect = new ConstructionExecutor();
		execDirect.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B)'].join('\n'));
		execDirect.executeAll();
		const sizeDirect = execDirect.figure.size;

		const execEuclide = new ConstructionExecutor();
		execEuclide.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n')
		);
		execEuclide.executeAll();
		const sizeEuclide = execEuclide.figure.size;

		// Choreography adds : 4 small arcs + 2 hidden circles + 2 intersection
		// points + 1 segment-trace + many scalars. Many more elements than
		// the legacy path.
		expect(sizeEuclide).toBeGreaterThan(sizeDirect);
	});

	it('currentSubStep is populated during each sub-step of mediatrice @euclide', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.step(); // A
		expect(exec.currentSubStep).toBeNull();
		exec.step(); // B
		expect(exec.currentSubStep).toBeNull();
		exec.step(); // SS1 : compass at A toward I1
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		expect(exec.currentSubStep?.instrument).toBe('compass');
		exec.step(); // SS2 : compass at A toward I2
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : compass at B toward I1
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS4 : compass at B toward I2
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS5 : intersections fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(2);
		exec.step(); // SS6 : ruler trace
		expect(exec.currentSubStep?.kind).toBe('ruler-trace');
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});

	it('currentDecoratorTriple stays populated across all sub-steps of a decorated statement', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.step(); // A
		exec.step(); // B
		// Now 6 sub-steps for the decorated statement.
		for (let i = 0; i < 6; i++) {
			exec.step();
			expect(exec.currentDecoratorTriple?.contrainte).toBe('euclide');
			expect(exec.currentVoie?.id).toBe('arcs_egaux');
		}
	});

	it('non-decorated statements still produce 1 entry each (legacy path)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'M = milieu(A, B)',
				'd = mediatrice(A, B)' // no decorator → legacy
			].join('\n')
		);
		// 4 statements → 4 entries (no choreography expansion).
		expect(exec.totalSteps).toBe(4);
		for (const entry of exec.plan) {
			expect(entry.subStep).toBeNull();
			expect(entry.isStatementBoundary).toBe(true);
			expect(entry.isLastEntryOfStatement).toBe(true);
		}
	});

	it('cercles_rayon_ab voie also produces 6 sub-steps', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = mediatrice(A, B) @euclide @cercles_rayon_ab'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(8); // 2 + 6
		expect(exec.currentVoie).toBeNull(); // before any step
		exec.executeAll();
		expect(exec.figure.size).toBeGreaterThan(5);
	});
});

describe('ConstructionExecutor — bissectrice @euclide @arcs_egaux (7 sub-steps)', () => {
	it('bissectrice @euclide expands into 7 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		// 3 point statements + 7 sub-steps for the decorated bissectrice = 10 entries.
		expect(exec.totalSteps).toBe(10);
	});

	it("sub-step kinds follow the expected sequence (2 small arcs at V, fade-in, 2 arcs at A'/B', fade-in P, ruler)", () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		exec.step(); // A
		exec.step(); // V
		exec.step(); // B
		expect(exec.currentSubStep).toBeNull();
		exec.step(); // SS1 : small arc at V near VA
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		expect(exec.currentSubStep?.instrument).toBe('compass');
		exec.step(); // SS2 : small arc at V near VB
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : fade-in A', B'
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(2);
		exec.step(); // SS4 : compass at A'
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS5 : compass at B'
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS6 : fade-in P
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(1);
		exec.step(); // SS7 : ruler trace
		expect(exec.currentSubStep?.kind).toBe('ruler-trace');
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});

	it('currentVoie stays `arcs_egaux` across all sub-steps', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		exec.step(); // A
		exec.step(); // V
		exec.step(); // B
		for (let i = 0; i < 7; i++) {
			exec.step();
			expect(exec.currentVoie?.id).toBe('arcs_egaux');
			expect(exec.currentDecoratorTriple?.contrainte).toBe('euclide');
		}
	});

	it("@squelette hides A', B', arcs, cercleV ; only P + bisector remain visible", () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// Principal (the bisector line) is visible.
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		// Charnière (P) is visible.
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(true);
		}
		// Traces (cercleV, arcs, A', B') are hidden in @squelette.
		for (const id of result!.produced.traces) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
	});
});

describe('ConstructionExecutor — bissectrice @euclide @arc_milieu (5 sub-steps)', () => {
	it('arc_milieu voie produces 5 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide @arc_milieu'
			].join('\n')
		);
		// 3 points + 5 sub-steps = 8 entries.
		expect(exec.totalSteps).toBe(8);
	});

	it("sub-step kinds : 2 small arcs, fade-in A'B', fade-in M, ruler trace", () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide @arc_milieu'
			].join('\n')
		);
		exec.step(); // A
		exec.step(); // V
		exec.step(); // B
		exec.step(); // SS1 : small arc near VA
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS2 : small arc near VB
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : fade-in A', B'
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(2);
		exec.step(); // SS4 : M fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(1);
		exec.step(); // SS5 : ruler
		expect(exec.currentSubStep?.kind).toBe('ruler-trace');
	});
});

describe('ConstructionExecutor — parallele @euclide @parallelogramme (6 sub-steps)', () => {
	it('parallele @euclide expands into 6 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'P = point(0, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = parallele(P, A, B) @euclide'
			].join('\n')
		);
		// 3 point statements + 6 sub-steps for the decorated parallele = 9 entries.
		expect(exec.totalSteps).toBe(9);
	});

	it('sub-step kinds : measure |AB|, draw at P, measure |PA|, draw at B, fade-in Q, ruler', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'P = point(0, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = parallele(P, A, B) @euclide'
			].join('\n')
		);
		exec.step(); // P
		exec.step(); // A
		exec.step(); // B
		exec.step(); // SS1 : measure |AB|
		expect(exec.currentSubStep?.kind).toBe('compass-measure');
		expect(exec.currentSubStep?.instrument).toBe('compass');
		exec.step(); // SS2 : draw arc at P
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : measure |PA|
		expect(exec.currentSubStep?.kind).toBe('compass-measure');
		exec.step(); // SS4 : draw arc at B
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS5 : Q fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(1);
		exec.step(); // SS6 : ruler
		expect(exec.currentSubStep?.kind).toBe('ruler-trace');
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});

	it('@squelette hides 2 arcs ; only Q + parallel line remain visible', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'P = point(0, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = parallele(P, A, B) @euclide'
			].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// Principal (parallel line) is visible.
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		// Charnière Q is visible.
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(true);
		}
		// Traces (2 arcs) are hidden in @squelette.
		for (const id of result!.produced.traces) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
	});

	it('cercle_circonscrit @euclide expands into 17 sub-step entries (via ctx.sub)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'cc = cercle_circonscrit(A, B, C) @euclide'
			].join('\n')
		);
		// 3 point statements + 17 sub-steps for the decorated cercle_circonscrit
		// = 20 entries. The 17 sub-steps come from :
		//   6 (sub-mediatrice AB) + 1 (m1 fade-in) + 6 (sub-mediatrice BC)
		//   + 1 (m2 fade-in) + 1 (O fade-in) + 1 (measure |OA|) + 1 (draw circle).
		expect(exec.totalSteps).toBe(20);
		expect(exec.loadError).toBeNull();
	});

	it('cercle_circonscrit @euclide sub-step kinds follow the expected composition', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'cc = cercle_circonscrit(A, B, C) @euclide'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 17; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			// sub-mediatrice(AB) : 6 sub-steps (4 small arcs + fade-in + ruler)
			'compass-draw', // arc at A toward I1
			'compass-draw', // arc at A toward I2
			'compass-draw', // arc at B toward I1
			'compass-draw', // arc at B toward I2
			'point-fade-in', // I1, I2 of sub-mediatrice AB
			'ruler-trace', // ruler trace m1
			// Parent's m1 reveal
			'line-fade-in',
			// sub-mediatrice(BC) : 6 sub-steps
			'compass-draw',
			'compass-draw',
			'compass-draw',
			'compass-draw',
			'point-fade-in',
			'ruler-trace',
			// Parent's m2 reveal
			'line-fade-in',
			// O fade-in
			'point-fade-in',
			// Measure |OA|
			'compass-measure',
			// Draw the circumscribed circle
			'compass-draw'
		]);
	});

	it('cercle_circonscrit @euclide @squelette : O + m1 + m2 + circle visible at end', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'cc = cercle_circonscrit(A, B, C) @euclide'
			].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// Principal (the circle) is visible.
		expect(exec.figure.getElementById(result!.produced.principal)?.visible).toBe(true);
		// All 3 charnières (m1, m2, O) are visible in @squelette.
		expect(result!.produced.charnieres.length).toBe(3);
		for (const id of result!.produced.charnieres) {
			expect(exec.figure.getElementById(id)?.visible).toBe(true);
		}
		// Sub-mediatrices' traces (arcs) are hidden in @squelette.
		for (const id of result!.produced.traces) {
			expect(exec.figure.getElementById(id)?.visible).toBe(false);
		}
	});

	it('cercle_circonscrit @euclide propagates sub-mediatrice traceTags', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(2, 3)',
				'cc = cercle_circonscrit(A, B, C) @euclide'
			].join('\n')
		);
		exec.executeAll();
		exec.step();
		const result = exec.lastChoreographyResult;
		expect(result?.produced.traceTags).toBeDefined();
		// 2 sub-mediatrices × 4 small arcs each = 8 tagged arcs.
		const tags = [...(result?.produced.traceTags?.values() ?? [])];
		expect(tags.length).toBe(8);
		expect(tags.every((t) => t === 'arc')).toBe(true);
	});

	it('parallele @equerre tags traces by category (segment-trace + marker)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = parallele(P, A, B) @equerre'
			].join('\n')
		);
		exec.executeAll();
		exec.step();
		const result = exec.lastChoreographyResult;
		expect(result?.produced.traceTags).toBeDefined();
		const tags = [...(result?.produced.traceTags?.values() ?? [])];
		// 3 segment-traces (2 pencil traces + 1 slide guide segment) + 2 markers.
		expect(tags.filter((t) => t === 'segment-trace').length).toBe(3);
		expect(tags.filter((t) => t === 'marker').length).toBe(2);
	});

	it('perpendiculaire @euclide expands into 7 sub-step entries (defaut = rayon_libre)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @euclide'
			].join('\n')
		);
		// 3 point statements + 7 sub-steps (rayon_libre = 2 small arcs at P
		// + A*,B* fade + 2 small arcs at A*,B* + Q fade + ruler) = 10 entries.
		expect(exec.totalSteps).toBe(10);
		expect(exec.loadError).toBeNull();
	});

	it('perpendiculaire @euclide (defaut = rayon_libre) sub-step kinds follow expected composition', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @euclide'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 7; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-draw', // SS1 : small arc at P → A*
			'compass-draw', // SS2 : small arc at P → B*
			'point-fade-in', // SS3 : A*, B* fade-in
			'compass-draw', // SS4 : small arc at A* (same opening) → Q
			'compass-draw', // SS5 : small arc at B* (same opening) → Q
			'point-fade-in', // SS6 : Q fade-in (= reflection of P across (AB))
			'ruler-trace' // SS7 : ruler P→Q traces the perpendicular
		]);
	});

	it('perpendiculaire @euclide @arcs_egaux sub-step kinds (compact via |PA|)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @euclide @arcs_egaux'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 7; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-measure', // SS1 : measure |PA|
			'compass-draw', // SS2 : small arc at P → B'
			'point-fade-in', // SS3 : B' fade-in
			'compass-draw', // SS4 : small arc at A → Q
			'compass-draw', // SS5 : small arc at B' → Q
			'point-fade-in', // SS6 : Q fade-in
			'ruler-trace' // SS7 : ruler P→Q
		]);
	});

	it('perpendiculaire @euclide handles P on (AB) (degenerate distance = 0)', () => {
		const exec = new ConstructionExecutor();
		// P at midpoint of AB → P ∈ (AB), distance = 0.
		// rayon_libre uses r = RAYON_LIBRE_MIN when d = 0, so arc still
		// crosses (AB) at 2 distinct points.
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 0)',
				'd = perpendiculaire(P, A, B) @euclide'
			].join('\n')
		);
		expect(exec.loadError).toBeNull();
		expect(exec.totalSteps).toBe(10);
	});

	it('perpendiculaire @equerre expands into 5 sub-step entries (pose + slide + trace + swap + extend)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @equerre'
			].join('\n')
		);
		// 3 point statements + 5 sub-steps = 8 entries.
		expect(exec.totalSteps).toBe(8);
		expect(exec.loadError).toBeNull();
	});

	it('perpendiculaire @equerre sub-step kinds follow expected composition', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @equerre'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 5; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-measure', // SS1 : setSquare positions on (AB) at A
			'compass-measure', // SS2 : setSquare slides from A to F
			'ruler-trace', // SS3 : pencil traces portion inside setSquare
			'compass-measure', // SS4 : swap setSquare → ruler (positioned along perpendicular)
			'ruler-trace' // SS5 : pencil extends along ruler to complete perpendicular
		]);
	});

	it('parallele @equerre expands into 6 sub-step entries (pose équerre + pose règle + slide + trace + swap + extend)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = parallele(P, A, B) @equerre'
			].join('\n')
		);
		// 3 point statements + 6 sub-steps = 9 entries.
		expect(exec.totalSteps).toBe(9);
		expect(exec.loadError).toBeNull();
	});

	it('parallele @equerre sub-step kinds follow expected composition', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = parallele(P, A, B) @equerre'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 6; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-measure', // SS1 : setSquare positions on (AB) at A
			'compass-measure', // SS2 : ruler positions against setSquare's vertical edge
			'compass-measure', // SS3 : setSquare slides along ruler to C_final
			'ruler-trace', // SS4 : pencil traces along setSquare's horizontal edge
			'compass-measure', // SS5 : swap setSquare → ruler aligned with parallel
			'ruler-trace' // SS6 : pencil extends parallel along ruler
		]);
	});

	it('parallele @equerre keeps ruler visible during slide (SS3) as a guide', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = parallele(P, A, B) @equerre'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		// Geometry: u_AB=(1,0), dPerp=-3 (P CCW), F=(2,0) (projection of P).
		// equerreInitial = F - (LARGEUR/2)·hEdgeDir = (2 - 1.5, 0) = (0.5, 0).
		// C_final = equerreInitial + slide_vec = (0.5, 0) + (0, 3) = (0.5, 3).
		// SS1 : setSquare positions at equerreInitial.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.instrumentTarget?.x).toBeCloseTo(0.5);
		expect(exec.currentSubStep?.instrumentTarget?.y).toBeCloseTo(0);
		// SS2 : ruler positions against setSquare, secondary keeps setSquare visible.
		// Guide ruler origin shifted by -hEdgeDir × RULER_WIDTH (= 57/40) in u_AB.
		// = (0.5 - 57/40, 0) = (-0.925, 0).
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('setSquare');
		expect(exec.currentSubStep?.instrumentTarget?.x).toBeCloseTo(0.5 - 57 / 40);
		// SS3 : setSquare slides, secondary keeps ruler visible as a guide.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('ruler');
		expect(exec.currentSubStep?.instrumentTarget?.x).toBeCloseTo(0.5);
		expect(exec.currentSubStep?.instrumentTarget?.y).toBeCloseTo(3);
		// SS4 : setSquare + pencil for partial trace.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
		// SS5 : swap to ruler.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		// SS6 : ruler + pencil for extension.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});

	it('perpendiculaire @equerre swaps setSquare → ruler at SS4', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 3)',
				'd = perpendiculaire(P, A, B) @equerre'
			].join('\n')
		);
		// Skip the 3 plain statements.
		for (let i = 0; i < 3; i++) exec.step();
		// SS1 : setSquare positions on A.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.instrumentTarget?.x).toBe(0); // A.x
		// SS2 : setSquare slides to F.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.instrumentTarget?.x).toBe(2); // F.x = 2
		// SS3 : setSquare + pencil for partial trace inside equerre.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('setSquare');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
		// SS4 : swap to ruler (no draw).
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		// SS5 : ruler + pencil for extension.
		exec.step();
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});
});

// =============================================================================
// Lot 5 — parallèle par double perpendiculaire (@euclide et @equerre)
// =============================================================================
//
// Spécification : docs/wip/constructions-progress.md, section « Lot 5 ».
// Décor volontairement oblique ((AB) ni horizontale ni verticale) pour que
// les vérifications de géométrie portent sur de vraies coordonnées.

type Pt = { x: number; y: number };

const DP_POINTS = ['A = point(0, 0)', 'B = point(4, 1)', 'P = point(1, 3)'];
const DP_A: Pt = { x: 0, y: 0 };
const DP_B: Pt = { x: 4, y: 1 };
const DP_P: Pt = { x: 1, y: 3 };
const DP_U: Pt = { x: DP_B.x - DP_A.x, y: DP_B.y - DP_A.y };

function dpScript(decorators: string): string {
	return [...DP_POINTS, `d = parallele(P, A, B) ${decorators}`].join('\n');
}

function posOf(exec: ConstructionExecutor, id: string): Pt {
	const p = exec.figure.getPosition(id);
	if (!p) throw new Error(`position introuvable : ${id}`);
	return { x: geoToNumber(p.x), y: geoToNumber(p.y) };
}

/** Les deux points qui portent une droite ou un segment. */
function carriers(exec: ConstructionExecutor, id: string): [Pt, Pt] {
	const el = exec.figure.getElementById(id);
	if (el?.type === 'line') return [posOf(exec, el.point1Id), posOf(exec, el.point2Id)];
	if (el?.type === 'segment') return [posOf(exec, el.startId), posOf(exec, el.endId)];
	throw new Error(`ni droite ni segment : ${id}`);
}

function cross(u: Pt, v: Pt): number {
	return u.x * v.y - u.y * v.x;
}

function dot(u: Pt, v: Pt): number {
	return u.x * v.x + u.y * v.y;
}

function minus(p: Pt, q: Pt): Pt {
	return { x: p.x - q.x, y: p.y - q.y };
}

/** Joue les 3 points puis les sous-étapes ; rend la liste des sous-étapes vues. */
function playSubSteps(exec: ConstructionExecutor): SubStep[] {
	for (let i = 0; i < DP_POINTS.length; i++) exec.step();
	const seen: SubStep[] = [];
	while (exec.step()) {
		const ss = exec.currentSubStep;
		if (ss) seen.push(ss);
	}
	return seen;
}

/** Droite `e` : celle que révèle l'unique sous-étape `line-fade-in`. */
function lineE(steps: readonly SubStep[]): string {
	const fades = steps.filter((s) => s.kind === 'line-fade-in');
	expect(fades).toHaveLength(1);
	expect(fades[0].animateLineIds).toHaveLength(1);
	return fades[0].animateLineIds[0];
}

function expectPerpendicularToAB(exec: ConstructionExecutor, id: string): void {
	const [p1, p2] = carriers(exec, id);
	const dir = minus(p2, p1);
	expect(Math.hypot(dir.x, dir.y)).toBeGreaterThan(1e-6);
	expect(dot(dir, DP_U)).toBeCloseTo(0, 9);
}

/** Le segment tracé est porté par la parallèle à (AB) passant par P. */
function expectOnParallelThroughP(exec: ConstructionExecutor, id: string): void {
	const [p1, p2] = carriers(exec, id);
	const dir = minus(p2, p1);
	expect(Math.hypot(dir.x, dir.y)).toBeGreaterThan(1e-6);
	expect(cross(dir, DP_U)).toBeCloseTo(0, 9);
	expect(cross(minus(DP_P, p1), dir)).toBeCloseTo(0, 9);
}

describe('ConstructionExecutor — parallele @euclide @double_perpendiculaire (16 sous-étapes)', () => {
	it('16 sous-étapes : perpendiculaire rayon_libre (7), e, puis perpendiculaire à e en P (8)', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		expect(exec.loadError).toBeNull();
		expect(exec.totalSteps).toBe(3 + 16);
		const steps = playSubSteps(exec);
		expect(steps.map((s) => s.kind)).toEqual([
			// perpendiculaire(P, A, B) @euclide @rayon_libre, par ctx.sub
			'compass-draw',
			'compass-draw',
			'point-fade-in',
			'compass-draw',
			'compass-draw',
			'point-fade-in',
			'ruler-trace',
			// la droite auxiliaire e apparaît
			'line-fade-in',
			// perpendiculaire à e au point P
			'compass-draw', // petit arc en P → C*
			'compass-draw', // petit arc en P → D*
			'point-fade-in', // C*, D*
			'compass-measure', // ouverture plus grande
			'compass-draw', // arc en C*
			'compass-draw', // arc en D*
			'point-fade-in', // R
			'ruler-trace' // règle (PR)
		]);
	});

	it('chaque sous-étape porte une consigne en français', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		for (const s of steps) expect(s.instruction?.length ?? 0).toBeGreaterThan(0);
		expect(steps[7].instruction).toMatch(/\be\b/);
	});

	it('e est perpendiculaire à (AB) et passe par P', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		const e = lineE(steps);
		expectPerpendicularToAB(exec, e);
		const [p1, p2] = carriers(exec, e);
		expect(cross(minus(DP_P, p1), minus(p2, p1))).toBeCloseTo(0, 9);
	});

	it('C*, D* sur e de part et d’autre de P ; R à égale distance de C* et D* ; (PR) ∥ (AB)', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		expect(steps[10].animatePointIds).toHaveLength(2);
		const [Cs, Ds] = steps[10].animatePointIds.map((id) => posOf(exec, id));
		// C* et D* : sur e (direction ⟂ (AB)), symétriques par rapport à P.
		expect(dot(minus(Cs, DP_P), DP_U)).toBeCloseTo(0, 9);
		expect(Cs.x + Ds.x).toBeCloseTo(2 * DP_P.x, 9);
		expect(Cs.y + Ds.y).toBeCloseTo(2 * DP_P.y, 9);
		const rPC = Math.hypot(Cs.x - DP_P.x, Cs.y - DP_P.y);
		expect(rPC).toBeGreaterThan(0.1);
		// Ouverture plus grande que |PC*| pour les arcs en C* et D*.
		const measure = steps[11];
		expect(measure.instrument).toBe('compass');
		expect(measure.compassRadius ?? 0).toBeGreaterThan(rPC);
		expect(steps[12].instrumentTarget?.x).toBeCloseTo(Cs.x, 9);
		expect(steps[12].instrumentTarget?.y).toBeCloseTo(Cs.y, 9);
		expect(steps[13].instrumentTarget?.x).toBeCloseTo(Ds.x, 9);
		expect(steps[13].instrumentTarget?.y).toBeCloseTo(Ds.y, 9);
		// R : intersection des deux arcs, sur la parallèle à (AB) par P.
		expect(steps[14].animatePointIds).toHaveLength(1);
		const R = posOf(exec, steps[14].animatePointIds[0]);
		const r2 = measure.compassRadius ?? 0;
		expect(Math.hypot(R.x - Cs.x, R.y - Cs.y)).toBeCloseTo(r2, 9);
		expect(Math.hypot(R.x - Ds.x, R.y - Ds.y)).toBeCloseTo(r2, 9);
		expect(Math.hypot(R.x - DP_P.x, R.y - DP_P.y)).toBeGreaterThan(0.1);
		expect(cross(minus(R, DP_P), DP_U)).toBeCloseTo(0, 9);
	});

	it('la règle trace la parallèle à (AB) passant par P', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		const last = steps[steps.length - 1];
		expect(last.instrument).toBe('ruler');
		expect(last.secondaryInstrument).toBe('pencil');
		expect(last.animateDrawableIds).toHaveLength(1);
		expectOnParallelThroughP(exec, last.animateDrawableIds[0]);
		// La droite finale (principale) aussi.
		const result = exec.lastChoreographyResult;
		expectOnParallelThroughP(exec, result!.produced.principal);
	});
});

describe('ConstructionExecutor — parallele @equerre @double_perpendiculaire (10 sous-étapes)', () => {
	it('10 sous-étapes : perpendiculaire à l’équerre (5), e, puis équerre sur e en P (4)', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@equerre @double_perpendiculaire'));
		expect(exec.loadError).toBeNull();
		expect(exec.totalSteps).toBe(3 + 10);
		const steps = playSubSteps(exec);
		expect(steps.map((s) => s.kind)).toEqual([
			// perpendiculaire(P, A, B) @equerre, par ctx.sub
			'compass-measure', // équerre posée sur (AB)
			'compass-measure', // glissement jusqu'au pied
			'ruler-trace', // tracé de e le long de l'équerre
			'compass-measure', // règle
			'ruler-trace', // prolongement de e
			// la droite auxiliaire e apparaît
			'line-fade-in',
			// équerre posée sur e, angle droit en P
			'compass-measure',
			'ruler-trace', // tracé d'une portion de la parallèle
			'compass-measure', // règle
			'ruler-trace' // prolongement
		]);
		expect(steps.map((s) => s.instrument ?? null)).toEqual([
			'setSquare',
			'setSquare',
			'setSquare',
			'ruler',
			'ruler',
			null,
			'setSquare',
			'setSquare',
			'ruler',
			'ruler'
		]);
	});

	it('chaque sous-étape porte une consigne en français', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@equerre @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		for (const s of steps) expect(s.instruction?.length ?? 0).toBeGreaterThan(0);
		expect(steps[6].instruction).toMatch(/\be\b/);
	});

	it('e ⟂ (AB) ; l’angle droit de l’équerre est en P ; les deux tracés finaux sont sur la parallèle', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@equerre @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		expectPerpendicularToAB(exec, lineE(steps));
		// L'équerre est posée l'angle droit en P (sous-étapes 7 et 8).
		for (const s of [steps[6], steps[7]]) {
			expect(s.instrumentTarget?.x).toBeCloseTo(DP_P.x, 9);
			expect(s.instrumentTarget?.y).toBeCloseTo(DP_P.y, 9);
		}
		// Son bord horizontal est sur e : rotation ⟂ (AB).
		const rot = ((steps[6].instrumentTarget?.rotation ?? 0) * Math.PI) / 180;
		expect(dot({ x: Math.cos(rot), y: Math.sin(rot) }, DP_U)).toBeCloseTo(0, 9);
		for (const s of [steps[7], steps[9]]) {
			expect(s.animateDrawableIds).toHaveLength(1);
			expectOnParallelThroughP(exec, s.animateDrawableIds[0]);
		}
		expect(steps[9].secondaryInstrument).toBe('pencil');
	});

	it('P glissé sur (AB) après coup : les tracés restent de vraie longueur, ∥ (AB), par P', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@equerre @double_perpendiculaire @complet'));
		const steps = playSubSteps(exec);
		const Pid = exec.figure.getAllElements()[2].id;
		const onAB: Pt = { x: 8, y: 2 };
		exec.figure.movePoint(Pid, numeric(onAB.x), numeric(onAB.y));
		exec.figure.recompute();
		for (const s of [steps[7], steps[9]]) {
			const [p1, p2] = carriers(exec, s.animateDrawableIds[0]);
			const dir = minus(p2, p1);
			expect(Math.hypot(dir.x, dir.y)).toBeGreaterThan(1);
			expect(cross(dir, DP_U)).toBeCloseTo(0, 9);
			expect(cross(minus(p1, onAB), DP_U)).toBeCloseTo(0, 9);
		}
	});
});

describe('parallele @double_perpendiculaire — visibilité finale dans les 3 modes', () => {
	const VOIES = ['@euclide @double_perpendiculaire', '@equerre @double_perpendiculaire'];
	const MODES = ['@epure', '@squelette', '@complet'] as const;

	for (const voie of VOIES) {
		for (const mode of MODES) {
			it(`${voie} ${mode}`, () => {
				const exec = new ConstructionExecutor();
				exec.load(dpScript(`${voie} ${mode}`));
				const steps = playSubSteps(exec);
				exec.step(); // applique la visibilité finale
				const e = lineE(steps);
				const produced = exec.lastChoreographyResult!.produced;
				const visible = (id: string) => exec.figure.getElementById(id)?.visible;
				// La parallèle est toujours visible.
				expect(visible(produced.principal)).toBe(true);
				// e est une charnière : visible en @squelette et @complet, masquée en @epure.
				expect(produced.charnieres).toContain(e);
				expect(visible(e)).toBe(mode !== '@epure');
				// Arcs, tracés, marqueurs, points auxiliaires : seulement en @complet.
				expect(produced.traces.length).toBeGreaterThan(0);
				for (const id of produced.traces) expect(visible(id)).toBe(mode === '@complet');
				for (const id of produced.traces) expect(produced.traceTags?.get(id)).toBeDefined();
				for (const id of produced.hiddenSupport ?? []) expect(visible(id)).toBe(false);
			});
		}
	}

	it('@euclide : les arcs des deux perpendiculaires sont des traces étiquetées « arc »', () => {
		const exec = new ConstructionExecutor();
		exec.load(dpScript('@euclide @double_perpendiculaire'));
		const steps = playSubSteps(exec);
		const produced = exec.lastChoreographyResult!.produced;
		const arcs = steps
			.filter((s) => s.kind === 'compass-draw')
			.flatMap((s) => s.animateDrawableIds);
		expect(arcs).toHaveLength(8);
		for (const id of arcs) expect(produced.traceTags?.get(id)).toBe('arc');
	});
});

describe('parallele @double_perpendiculaire — P sur (AB)', () => {
	for (const voie of ['@euclide @double_perpendiculaire', '@equerre @double_perpendiculaire']) {
		it(`${voie} : erreur claire, aucune sous-étape jouée`, () => {
			const exec = new ConstructionExecutor();
			exec.load(
				[
					'A = point(0, 0)',
					'B = point(4, 1)',
					'P = point(8, 2)',
					`d = parallele(P, A, B) ${voie}`
				].join('\n')
			);
			expect(exec.loadError).not.toBeNull();
			expect(exec.loadError!.message).toMatch(/P est sur la droite \(AB\)/);
			expect(exec.loadError!.line).toBe(4);
			expect(exec.loadError!.stepIndex).toBe(3);
			// Seuls les 3 points restent dans la frise.
			expect(exec.totalSteps).toBe(3);
		});
	}

	it('les voies par défaut ne changent pas (parallelogramme, pose_equerre)', () => {
		for (const [deco, id] of [
			['@euclide', 'parallelogramme'],
			['@equerre', 'pose_equerre']
		]) {
			const exec = new ConstructionExecutor();
			exec.load(dpScript(deco));
			for (let i = 0; i < 4; i++) exec.step();
			expect(exec.currentVoie?.id).toBe(id);
		}
	});
});

// -----------------------------------------------------------------------------
// Lot 5 — double perpendiculaire sur d'autres décors : (AB) verticale (P à
// gauche, P à droite) et (AB) oblique avec P en dessous. On asserte ce que
// voit l'élève : droites finales, poses de l'équerre (coin et branches),
// marqueurs d'angle droit, point R du compas.
// -----------------------------------------------------------------------------

interface DpDecor {
	name: string;
	A: Pt;
	B: Pt;
	P: Pt;
}

const DP_DECORS: readonly DpDecor[] = [
	{ name: '(AB) verticale, P à gauche', A: { x: 0, y: 0 }, B: { x: 0, y: 4 }, P: { x: -3, y: 1 } },
	{ name: '(AB) verticale, P à droite', A: { x: 0, y: 0 }, B: { x: 0, y: 4 }, P: { x: 3, y: 1 } },
	{ name: '(AB) oblique, P en dessous', A: { x: 0, y: 0 }, B: { x: 4, y: 3 }, P: { x: 4, y: -1 } }
];

// Longueur de la branche verticale de l'équerre (SetSquare : HAUTEUR_MATH).
const SET_SQUARE_VERTICAL_LEG = 223 / 40;

function decorScript(decor: DpDecor, decorators: string): string {
	const fmt = (v: number) => String(Number(v.toFixed(9)));
	return [
		`A = point(${fmt(decor.A.x)}, ${fmt(decor.A.y)})`,
		`B = point(${fmt(decor.B.x)}, ${fmt(decor.B.y)})`,
		`P = point(${fmt(decor.P.x)}, ${fmt(decor.P.y)})`,
		`d = parallele(P, A, B) ${decorators}`
	].join('\n');
}

function unit(v: Pt): Pt {
	const len = Math.hypot(v.x, v.y);
	return { x: v.x / len, y: v.y / len };
}

/** Pied F de la perpendiculaire à (AB) issue de P. */
function footOn(A: Pt, B: Pt, P: Pt): Pt {
	const u = unit(minus(B, A));
	const t = dot(minus(P, A), u);
	return { x: A.x + t * u.x, y: A.y + t * u.y };
}

/** Symétrique de P par rapport à (AB) : P passe de l'autre côté. */
function mirrorAcross(A: Pt, B: Pt, P: Pt): Pt {
	const F = footOn(A, B, P);
	return { x: 2 * F.x - P.x, y: 2 * F.y - P.y };
}

/** Côté de Q par rapport à (AB) : signe du produit vectoriel AB ∧ AQ. */
function sideOf(A: Pt, B: Pt, Q: Pt): number {
	return Math.sign(cross(minus(B, A), minus(Q, A)));
}

/** Distance de Q à la droite portée par (p1, p2). */
function distToLine(p1: Pt, p2: Pt, Q: Pt): number {
	const dir = minus(p2, p1);
	return Math.abs(cross(dir, minus(Q, p1))) / Math.hypot(dir.x, dir.y);
}

/**
 * Branches de l'équerre posée : rotation θ (degrés, repère mathématique),
 * coin = angle droit ; branche horizontale selon (cos θ, sin θ), branche
 * verticale tournée de +90° (SetSquare.svelte : verticale vers −y écran,
 * le canvas applique rotate(−θ) et retourne l'axe des y).
 */
function setSquareLegs(s: SubStep): { corner: Pt; h: Pt; v: Pt } {
	const t = s.instrumentTarget;
	if (!t) throw new Error('sous-étape sans pose d’instrument');
	const rot = ((t.rotation ?? 0) * Math.PI) / 180;
	return {
		corner: { x: t.x, y: t.y },
		h: { x: Math.cos(rot), y: Math.sin(rot) },
		v: { x: -Math.sin(rot), y: Math.cos(rot) }
	};
}

/** Marqueurs d'angle droit (carré) : sommet et coin du petit carré, tels que rendus. */
function rightAngleMarkers(
	exec: ConstructionExecutor
): { vertex: Pt; corner: Pt; interior: number }[] {
	const produced = exec.lastChoreographyResult!.produced;
	const markers: { vertex: Pt; corner: Pt; interior: number }[] = [];
	for (const id of produced.traces) {
		if (produced.traceTags?.get(id) !== 'marker') continue;
		const el = exec.figure.getElementById(id);
		if (el?.type !== 'angle' || el.marque !== 'carre') continue;
		const coords = projectAngleEndpoints(el, exec.figure, (x, y) => ({ x, y }));
		if (!coords) throw new Error(`marqueur dégénéré : ${id}`);
		const g = computeAngleGeometry(el, coords, {
			arcRadius: 0.5,
			arcSpacing: 0.1,
			rightAngleSize: 0.3,
			labelOffset: 0.2
		});
		if (!g?.rightAngle) throw new Error(`marqueur sans carré : ${id}`);
		markers.push({
			vertex: { x: g.vertexX, y: g.vertexY },
			corner: { x: g.rightAngle.cornerX, y: g.rightAngle.cornerY },
			interior: g.interiorRad
		});
	}
	return markers;
}

function expectNear(p: Pt, q: Pt): void {
	expect(p.x).toBeCloseTo(q.x, 9);
	expect(p.y).toBeCloseTo(q.y, 9);
}

/** La droite (ou le segment) `id` est parallèle à (AB) et passe par P. */
function expectParallelThrough(exec: ConstructionExecutor, id: string, d: DpDecor): void {
	const [p1, p2] = carriers(exec, id);
	const dir = unit(minus(p2, p1));
	const u = unit(minus(d.B, d.A));
	expect(cross(dir, u)).toBeCloseTo(0, 9);
	expect(distToLine(p1, p2, d.P)).toBeCloseTo(0, 9);
}

/** La droite `id` est perpendiculaire à (AB) et passe par P. */
function expectPerpendicularThrough(exec: ConstructionExecutor, id: string, d: DpDecor): void {
	const [p1, p2] = carriers(exec, id);
	const dir = unit(minus(p2, p1));
	const u = unit(minus(d.B, d.A));
	expect(dot(dir, u)).toBeCloseTo(0, 9);
	expect(distToLine(p1, p2, d.P)).toBeCloseTo(0, 9);
}

/** Poses de l'équerre et marqueurs d'angle droit, pour un décor donné. */
function expectEquerreSeenByStudent(
	exec: ConstructionExecutor,
	steps: readonly SubStep[],
	d: DpDecor
): void {
	const u = unit(minus(d.B, d.A));
	const F = footOn(d.A, d.B, d.P);
	const towardP = unit(minus(d.P, F));
	// 1re pose (perpendiculaire à (AB)) : coin sur (AB), branche horizontale
	// le long de (AB), branche verticale tournée vers P.
	for (const i of [0, 1, 2]) {
		expect(steps[i].instrument).toBe('setSquare');
		const { corner, h, v } = setSquareLegs(steps[i]);
		expect(distToLine(d.A, d.B, corner)).toBeCloseTo(0, 9);
		expect(cross(h, u)).toBeCloseTo(0, 9);
		expect(dot(v, towardP)).toBeCloseTo(1, 9);
	}
	// Le glissement amène le coin au pied F.
	expectNear(setSquareLegs(steps[1]).corner, F);
	expectNear(setSquareLegs(steps[2]).corner, F);
	// 2e pose : coin en P, branche horizontale sur e, du côté opposé à (AB)
	// (elle ne chevauche pas (AB)) ; branche verticale parallèle à (AB).
	for (const i of [6, 7]) {
		expect(steps[i].instrument).toBe('setSquare');
		const { corner, h, v } = setSquareLegs(steps[i]);
		expectNear(corner, d.P);
		expect(dot(h, towardP)).toBeCloseTo(1, 9);
		expect(cross(v, u)).toBeCloseTo(0, 9);
	}
	// Le crayon trace le long de la branche verticale, sans en sortir.
	const { v } = setSquareLegs(steps[7]);
	const [start, end] = carriers(exec, steps[7].animateDrawableIds[0]);
	expectNear(start, d.P);
	const along = minus(end, start);
	expect(cross(along, v)).toBeCloseTo(0, 9);
	expect(dot(along, v)).toBeGreaterThan(1);
	expect(dot(along, v)).toBeLessThanOrEqual(SET_SQUARE_VERTICAL_LEG);
	// Marqueurs : un en F (carré du côté de P par rapport à (AB)), un en P
	// (carré entre P et (AB), du côté du tracé fait à l'équerre).
	const markers = rightAngleMarkers(exec);
	expect(markers).toHaveLength(2);
	for (const m of markers) expect(m.interior).toBeCloseTo(Math.PI / 2, 9);
	const atF = markers.filter((m) => Math.hypot(m.vertex.x - F.x, m.vertex.y - F.y) < 1e-9);
	const atP = markers.filter((m) => Math.hypot(m.vertex.x - d.P.x, m.vertex.y - d.P.y) < 1e-9);
	expect(atF).toHaveLength(1);
	expect(atP).toHaveLength(1);
	expect(sideOf(d.A, d.B, atF[0].corner)).toBe(sideOf(d.A, d.B, d.P));
	expect(dot(minus(atF[0].corner, F), towardP)).toBeGreaterThan(0);
	expect(dot(minus(atP[0].corner, d.P), towardP)).toBeLessThan(0);
	expect(dot(minus(atP[0].corner, d.P), v)).toBeGreaterThan(0);
}

/** R (compas) : distinct de P, hors de e ; (PR) ∥ (AB). */
function expectCompassR(exec: ConstructionExecutor, steps: readonly SubStep[], d: DpDecor): void {
	expect(steps[14].kind).toBe('point-fade-in');
	expect(steps[14].animatePointIds).toHaveLength(1);
	const R = posOf(exec, steps[14].animatePointIds[0]);
	const [e1, e2] = carriers(exec, lineE(steps));
	expect(Math.hypot(R.x - d.P.x, R.y - d.P.y)).toBeGreaterThan(0.1);
	expect(distToLine(e1, e2, R)).toBeGreaterThan(0.1);
	expect(cross(unit(minus(R, d.P)), unit(minus(d.B, d.A)))).toBeCloseTo(0, 9);
}

describe('parallele @double_perpendiculaire — autres décors', () => {
	for (const d of DP_DECORS) {
		describe(d.name, () => {
			it('@euclide : parallèle par P, e ⟂ (AB) par P, R hors de e', () => {
				const exec = new ConstructionExecutor();
				exec.load(decorScript(d, '@euclide @double_perpendiculaire'));
				expect(exec.loadError).toBeNull();
				const steps = playSubSteps(exec);
				expect(steps).toHaveLength(16);
				expectParallelThrough(exec, exec.lastChoreographyResult!.produced.principal, d);
				expectParallelThrough(exec, steps[15].animateDrawableIds[0], d);
				expectPerpendicularThrough(exec, lineE(steps), d);
				expectCompassR(exec, steps, d);
			});

			it('@equerre : parallèle par P, e ⟂ (AB) par P, équerre et marqueurs du côté de P', () => {
				const exec = new ConstructionExecutor();
				exec.load(decorScript(d, '@equerre @double_perpendiculaire @complet'));
				expect(exec.loadError).toBeNull();
				const steps = playSubSteps(exec);
				expect(steps).toHaveLength(10);
				expectParallelThrough(exec, exec.lastChoreographyResult!.produced.principal, d);
				for (const i of [7, 9]) expectParallelThrough(exec, steps[i].animateDrawableIds[0], d);
				expectPerpendicularThrough(exec, lineE(steps), d);
				expectEquerreSeenByStudent(exec, steps, d);
			});

			const moved: DpDecor = { ...d, P: mirrorAcross(d.A, d.B, d.P) };

			it('@euclide : P passé de l’autre côté de (AB) → parallèle par P, R hors de e', () => {
				const exec = new ConstructionExecutor();
				exec.load(decorScript(d, '@euclide @double_perpendiculaire @complet'));
				const steps = playSubSteps(exec);
				const Pid = exec.symbols.get('P')?.figureId;
				if (!Pid) throw new Error('P introuvable');
				exec.figure.movePoint(Pid, numeric(moved.P.x), numeric(moved.P.y));
				exec.figure.recompute();
				expectNear(posOf(exec, Pid), moved.P);
				expectParallelThrough(exec, exec.lastChoreographyResult!.produced.principal, moved);
				expectParallelThrough(exec, steps[15].animateDrawableIds[0], moved);
				expectPerpendicularThrough(exec, lineE(steps), moved);
				expectCompassR(exec, steps, moved);
			});

			it('@equerre : P passé de l’autre côté de (AB) → parallèle par P, marqueurs suivent, équerre retournée au rejeu', () => {
				const exec = new ConstructionExecutor();
				exec.load(decorScript(d, '@equerre @double_perpendiculaire @complet'));
				const before = playSubSteps(exec);
				const Pid = exec.symbols.get('P')?.figureId;
				if (!Pid) throw new Error('P introuvable');
				exec.figure.movePoint(Pid, numeric(moved.P.x), numeric(moved.P.y));
				exec.figure.recompute();
				expectNear(posOf(exec, Pid), moved.P);
				// Ce que la figure montre après le déplacement.
				expectParallelThrough(exec, exec.lastChoreographyResult!.produced.principal, moved);
				for (const i of [7, 9]) expectParallelThrough(exec, before[i].animateDrawableIds[0], moved);
				expectPerpendicularThrough(exec, lineE(before), moved);
				const F = footOn(moved.A, moved.B, moved.P);
				const markers = rightAngleMarkers(exec);
				const atF = markers.find((m) => Math.hypot(m.vertex.x - F.x, m.vertex.y - F.y) < 1e-9);
				expect(atF).toBeDefined();
				expect(sideOf(moved.A, moved.B, atF!.corner)).toBe(sideOf(moved.A, moved.B, moved.P));
				// Rejeu depuis P déplacé : l'équerre se retourne.
				const replay = new ConstructionExecutor();
				replay.load(decorScript(moved, '@equerre @double_perpendiculaire @complet'));
				expect(replay.loadError).toBeNull();
				const after = playSubSteps(replay);
				for (const i of [0, 1, 2, 6, 7]) {
					const hBefore = setSquareLegs(before[i]).h;
					const hAfter = setSquareLegs(after[i]).h;
					expect(dot(hBefore, hAfter)).toBeCloseTo(-1, 9);
				}
				expectEquerreSeenByStudent(replay, after, moved);
			});
		});
	}
});

// =============================================================================
// V3a — Chorégraphie `bissectrice(angle) @euclide` (extension d'input)
// =============================================================================
//
// La chorégraphie `bissectrice(A, V, B) @euclide` (V2) accepte en V3a un
// `GeoAngle` en input via dispatch initial : extrait (p1, vertex, p2) et
// délègue au flow d'animation existant. Aucune nouvelle animation, juste un
// nouveau type d'entrée.
//
// Reference : docs/wip/geometry/angle-v3a-progress.md §3.

describe('ConstructionExecutor — bissectrice(α) @euclide (V3a input dispatch)', () => {
	it('bissectrice(α) @euclide produit le même totalSteps que bissectrice(A,V,B) @euclide sur la même figure', () => {
		const execThreePoints = new ConstructionExecutor();
		execThreePoints.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		const execAngle = new ConstructionExecutor();
		execAngle.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'd = bissectrice(al) @euclide'
			].join('\n')
		);
		// 3 points + 7 sub-steps for the bisector = 10 (3-points form).
		expect(execThreePoints.totalSteps).toBe(10);
		// 3 points + 1 angle (statique, sans chorégraphie) + 7 sub-steps = 11.
		expect(execAngle.totalSteps).toBe(execThreePoints.totalSteps + 1);
	});

	it('bissectrice(α) @euclide : stepDurations identiques à bissectrice(A,V,B) @euclide (même timing)', () => {
		const execThreePoints = new ConstructionExecutor();
		execThreePoints.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'd = bissectrice(A, V, B) @euclide'
			].join('\n')
		);
		const execAngle = new ConstructionExecutor();
		execAngle.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'd = bissectrice(al) @euclide'
			].join('\n')
		);
		// The 7 sub-step durations of the bisector animation must match
		// exactly between the two forms. They are the last 7 entries of
		// stepDurations in both cases (3-points form : indices 3..9 ;
		// angle form : indices 4..10).
		const threePointDurations = execThreePoints.stepDurations.slice(3);
		const angleDurations = execAngle.stepDurations.slice(4);
		expect(angleDurations).toEqual(threePointDurations);
	});

	it('bissectrice(α) @euclide : extrait correctement (p1, vertex, p2) depuis α = angle(A, V, B)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'd = bissectrice(al) @euclide'
			].join('\n')
		);
		exec.executeAll();
		exec.step(); // drain visibility
		const result = exec.lastChoreographyResult;
		expect(result).not.toBeNull();
		// The sub-step kinds must match the 7-sub-step bisector sequence
		// (proof that the choreography ran on the extracted 3-point form,
		// not on the single angle id).
		const exec2 = new ConstructionExecutor();
		exec2.load(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'd = bissectrice(al) @euclide'
			].join('\n')
		);
		exec2.step(); // A
		exec2.step(); // V
		exec2.step(); // B
		exec2.step(); // α (static angle, no choreography)
		expect(exec2.currentSubStep).toBeNull();
		exec2.step(); // SS1 : small arc at V near VA
		expect(exec2.currentSubStep?.kind).toBe('compass-draw');
		exec2.step(); // SS2 : small arc at V near VB
		expect(exec2.currentSubStep?.kind).toBe('compass-draw');
		exec2.step(); // SS3 : fade-in A', B'
		expect(exec2.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec2.currentSubStep?.animatePointIds.length).toBe(2);
		exec2.step(); // SS4
		expect(exec2.currentSubStep?.kind).toBe('compass-draw');
		exec2.step(); // SS5
		expect(exec2.currentSubStep?.kind).toBe('compass-draw');
		exec2.step(); // SS6 : fade-in P
		expect(exec2.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec2.currentSubStep?.animatePointIds.length).toBe(1);
		exec2.step(); // SS7 : ruler trace
		expect(exec2.currentSubStep?.kind).toBe('ruler-trace');
		expect(exec2.currentSubStep?.instrument).toBe('ruler');
	});
});

// =============================================================================
// A1 — transporte @euclide chorégraphie (report d'angle Euclide I.23)
// =============================================================================

describe('A1 — transporte @euclide chorégraphie', () => {
	// Standard setup : α = angle 90° at V=(0,0), and we transport to V'=(5,0)
	// with direction P=(6,1). Expected mesure(β) ≈ π/2.
	const standardScript = [
		'A = point(3, 0)',
		'V = point(0, 0)',
		'B = point(0, 3)',
		'al = angle(A, V, B)',
		'Vp = point(5, 0)',
		'P = point(6, 1)',
		'be = transporte(al, Vp, P) @euclide'
	].join('\n');

	it('transporte(al, Vp, P) @euclide expands into 7 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		// 6 plain statements (A, V, B, al, Vp, P) + 7 sub-steps for transporte = 13 entries.
		expect(exec.totalSteps).toBe(13);
		expect(exec.stepDurations.length).toBe(13);
	});

	it('sub-step kinds: 2 compass-draw + fade-in + compass-measure + compass-draw + fade-in + ruler-trace', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		// Skip the 6 plain statements
		for (let i = 0; i < 6; i++) exec.step();
		// 7 sub-steps follow
		const kinds: string[] = [];
		for (let i = 0; i < 7; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-draw',
			'compass-draw',
			'point-fade-in',
			'compass-measure',
			'compass-draw',
			'point-fade-in',
			'ruler-trace'
		]);
	});

	it('stepDurations.length === totalSteps after load', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		expect(exec.stepDurations.length).toBe(exec.totalSteps);
	});

	it("SS3 fade-in apparait A', B', A'' simultanement (3 points)", () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		for (let i = 0; i < 6 + 2; i++) exec.step(); // 6 statements + SS1 + SS2
		exec.step(); // SS3
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(3);
	});

	it("SS6 fade-in apparait B'' (1 point)", () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		// 6 statements + SS1..SS5 (5 sub-steps : 2 compass-draw + fade-in + measure + compass-draw)
		for (let i = 0; i < 6 + 5; i++) exec.step();
		exec.step(); // SS6 : B'' fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(1);
	});

	it('mesure(beta) ≈ mesure(al) apres execution complete de la choregraphie', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		exec.executeAll();
		// Both angles created by handleTransporte share the same measure.
		// We look up via the figure's symbol table.
		const alphaSym = exec.figure
			.getAllElements()
			.find((el) => el.type === 'angle' && el.label === 'al');
		const betaSym = exec.figure
			.getAllElements()
			.find((el) => el.type === 'angle' && el.label === 'be');
		expect(alphaSym).toBeDefined();
		expect(betaSym).toBeDefined();
		const measureAl = exec.figure.createScalarAngleMeasure(
			(alphaSym as { p1Id: string }).p1Id,
			(alphaSym as { vertexId: string }).vertexId,
			(alphaSym as { p2Id: string }).p2Id
		);
		const measureBe = exec.figure.createScalarAngleMeasure(
			(betaSym as { p1Id: string }).p1Id,
			(betaSym as { vertexId: string }).vertexId,
			(betaSym as { p2Id: string }).p2Id
		);
		expect(exec.figure.getScalarValue(measureBe)).toBeCloseTo(
			exec.figure.getScalarValue(measureAl)!,
			5
		);
	});
});

// -----------------------------------------------------------------------------
// Formes (P, d) — `parallele(P, d)` et `perpendiculaire(P, d)` avec d une
// droite, un segment ou une demi-droite : même chorégraphie que la forme
// (P, A, B) écrite avec les deux points qui portent d. Quand l'instrument se
// pose sur un point de d resté caché, ce point apparaît d'abord en fondu.
// -----------------------------------------------------------------------------

describe('formes (P, d)', () => {
	const POINTS = ['A = point(0, 0)', 'B = point(4, 1)', 'P = point(1, 3)'];
	const U: Pt = { x: 4, y: 1 };
	const P0: Pt = { x: 1, y: 3 };
	const LINE_KINDS = ['droite', 'segment', 'demidroite'] as const;
	const VOIES: readonly { builtin: 'parallele' | 'perpendiculaire'; deco: string }[] = [
		{ builtin: 'parallele', deco: '@euclide' },
		{ builtin: 'parallele', deco: '@euclide @parallelogramme' },
		{ builtin: 'parallele', deco: '@euclide @double_perpendiculaire' },
		{ builtin: 'parallele', deco: '@equerre' },
		{ builtin: 'parallele', deco: '@equerre @pose_equerre' },
		{ builtin: 'parallele', deco: '@equerre @double_perpendiculaire' },
		{ builtin: 'perpendiculaire', deco: '@euclide' },
		{ builtin: 'perpendiculaire', deco: '@euclide @rayon_libre' },
		{ builtin: 'perpendiculaire', deco: '@euclide @arcs_egaux' },
		{ builtin: 'perpendiculaire', deco: '@equerre' }
	];

	/** Joue tout le script ; rend les sous-étapes vues (la visibilité finale est appliquée). */
	function playAll(script: string): { exec: ConstructionExecutor; steps: SubStep[] } {
		const exec = new ConstructionExecutor();
		exec.load(script);
		expect(exec.loadError).toBeNull();
		const steps: SubStep[] = [];
		while (exec.step()) {
			const ss = exec.currentSubStep;
			if (ss) steps.push(ss);
		}
		return { exec, steps };
	}

	/** Ce que voit l'élève d'une sous-étape, sans les ids (qui dépendent du script). */
	function shape(ss: SubStep) {
		return {
			kind: ss.kind,
			instrument: ss.instrument,
			secondaryInstrument: ss.secondaryInstrument,
			instruction: ss.instruction,
			drawables: ss.animateDrawableIds.length,
			points: ss.animatePointIds.length,
			lines: ss.animateLineIds.length,
			x: ss.instrumentTarget?.x.toFixed(9),
			y: ss.instrumentTarget?.y.toFixed(9),
			rotation: ss.instrumentTarget?.rotation.toFixed(9),
			compassRadius: ss.compassRadius?.toFixed(9),
			geometricDistance: ss.geometricDistance.toFixed(9)
		};
	}

	function principalOf(exec: ConstructionExecutor, name: string): string {
		const id = exec.symbols.get(name)?.figureId;
		if (!id) throw new Error(`symbole introuvable : ${name}`);
		return id;
	}

	function expectFinalLine(exec: ConstructionExecutor, builtin: string): void {
		const [p1, p2] = carriers(exec, principalOf(exec, 'm'));
		const dir = minus(p2, p1);
		expect(Math.hypot(dir.x, dir.y)).toBeGreaterThan(1e-6);
		if (builtin === 'parallele') expect(cross(dir, U)).toBeCloseTo(0, 9);
		else expect(dot(dir, U)).toBeCloseTo(0, 9);
		// La droite passe par P.
		expect(cross(minus(P0, p1), dir)).toBeCloseTo(0, 9);
	}

	for (const { builtin, deco } of VOIES) {
		for (const kind of LINE_KINDS) {
			it(`${builtin}(P, d) ${deco}, d = ${kind}(A, B) : même animation que (P, A, B)`, () => {
				const ref = playAll([...POINTS, `m = ${builtin}(P, A, B) ${deco}`].join('\n'));
				const viaLine = playAll(
					[...POINTS, `d = ${kind}(A, B)`, `m = ${builtin}(P, d) ${deco}`].join('\n')
				);
				expect(ref.steps.length).toBeGreaterThan(0);
				// Lot 8 : seule différence, la consigne nomme d au lieu de (AB).
				const named = viaLine.steps.map((ss) => ({
					...shape(ss),
					instruction: ss.instruction?.replace(/(?<![\w'’])d(?![\w'’])/g, '(AB)')
				}));
				expect(named).toEqual(ref.steps.map(shape));
				expectFinalLine(viaLine.exec, builtin);
			});
		}
	}

	const MODES = ['@epure', '@squelette', '@complet'] as const;
	for (const deco of ['parallele @euclide', 'perpendiculaire @equerre']) {
		const [builtin, contrainte] = deco.split(' ');
		for (const mode of MODES) {
			it(`${deco} ${mode} : visibilité finale identique à (P, A, B)`, () => {
				const visibility = (script: string) => {
					const { exec } = playAll(script);
					const produced = exec.lastChoreographyResult!.produced;
					const visible = (id: string) => exec.figure.getElementById(id)?.visible !== false;
					return {
						principal: visible(produced.principal),
						charnieres: produced.charnieres.map(visible),
						traces: produced.traces.map(visible),
						hidden: (produced.hiddenSupport ?? []).map(visible)
					};
				};
				const ref = visibility(
					[...POINTS, `m = ${builtin}(P, A, B) ${contrainte} ${mode}`].join('\n')
				);
				const viaLine = visibility(
					[...POINTS, 'd = droite(A, B)', `m = ${builtin}(P, d) ${contrainte} ${mode}`].join('\n')
				);
				expect(viaLine).toEqual(ref);
				expect(viaLine.principal).toBe(true);
			});
		}
	}

	// ─── Point caché de d ───

	/**
	 * d1 = perpendiculaire(C, A, B) : porté par C (visible) et par un point
	 * caché R. d2 = mediatrice(A, B) : ses deux points sont cachés.
	 */
	const HIDDEN_DECOR = [
		'A = point(0, 0)',
		'B = point(4, 1)',
		'C = point(2, -1)',
		'P = point(5, 3)'
	];

	function carrierIds(exec: ConstructionExecutor, name: string): [string, string] {
		const el = exec.figure.getElementById(principalOf(exec, name));
		if (el?.type !== 'line') throw new Error(`pas une droite : ${name}`);
		return [el.point1Id, el.point2Id];
	}

	function playHidden(
		dDef: string,
		call: string
	): { exec: ConstructionExecutor; steps: SubStep[]; visibleDuring: Map<string, boolean[]> } {
		const exec = new ConstructionExecutor();
		exec.load([...HIDDEN_DECOR, `d = ${dDef}`, `m = ${call}`].join('\n'));
		expect(exec.loadError).toBeNull();
		for (let i = 0; i < HIDDEN_DECOR.length + 1; i++) exec.step();
		const [p1, p2] = carrierIds(exec, 'd');
		const visibleDuring = new Map<string, boolean[]>([
			[p1, []],
			[p2, []]
		]);
		const steps: SubStep[] = [];
		while (exec.step()) {
			const ss = exec.currentSubStep;
			if (!ss) continue;
			steps.push(ss);
			for (const [id, seen] of visibleDuring) {
				seen.push(exec.figure.getElementById(id)?.visible !== false);
			}
		}
		return { exec, steps, visibleDuring };
	}

	/** Nombre de sous-étapes de la même voie avec une droite aux deux points visibles. */
	function visibleCount(call: string): number {
		return playAll([...HIDDEN_DECOR, 'd = droite(A, B)', `m = ${call}`].join('\n')).steps.length;
	}

	it('parallele(P, d) @euclide @parallelogramme : le point caché R apparaît avant le compas', () => {
		const call = 'parallele(P, d) @euclide @parallelogramme';
		const { exec, steps, visibleDuring } = playHidden('perpendiculaire(C, A, B)', call);
		const [Cid, Rid] = carrierIds(exec, 'd');
		expect(steps).toHaveLength(visibleCount(call) + 1);
		expect(steps[0].kind).toBe('point-fade-in');
		expect(steps[0].animatePointIds).toEqual([Rid]);
		expect(steps[0].instruction).toBe('On choisit un point de la droite');
		// Lot 8 : d est portée par C (visible) et R (caché, sans nom).
		expect(steps[1].instruction).toBe("Compas en C, on prend l'écart jusqu'au point choisi");
		// R reste visible pendant toute l'animation ; C n'a rien à faire.
		expect(visibleDuring.get(Rid)).toEqual(steps.map(() => true));
		expect(exec.figure.getElementById(Cid)?.visible).not.toBe(false);
		// Classé comme les autres points auxiliaires de la voie.
		const produced = exec.lastChoreographyResult!.produced;
		expect(produced.traces).toContain(Rid);
		expect(produced.traceTags?.get(Rid)).toBe('auxiliary-point');
		expectFinalLineThrough(exec, 'parallele');
	});

	it('parallele(P, d) @euclide @parallelogramme : deux points cachés → un seul fondu', () => {
		const call = 'parallele(P, d) @euclide @parallelogramme';
		const { exec, steps, visibleDuring } = playHidden('mediatrice(A, B)', call);
		const [M, H] = carrierIds(exec, 'd');
		expect(steps).toHaveLength(visibleCount(call) + 1);
		expect(steps[0].kind).toBe('point-fade-in');
		expect(steps[0].animatePointIds).toEqual([M, H]);
		expect(steps[0].instruction).toBe('On choisit deux points de la droite');
		expect(visibleDuring.get(M)).toEqual(steps.map(() => true));
		expect(visibleDuring.get(H)).toEqual(steps.map(() => true));
		expectFinalLineThrough(exec, 'parallele');
	});

	for (const call of [
		'perpendiculaire(P, d) @euclide @arcs_egaux',
		'perpendiculaire(P, d) @equerre @pose_equerre',
		'parallele(P, d) @equerre @double_perpendiculaire'
	]) {
		it(`${call} : seul le premier point de d (celui qu'on utilise) apparaît`, () => {
			const { exec, steps, visibleDuring } = playHidden('mediatrice(A, B)', call);
			const [M, H] = carrierIds(exec, 'd');
			expect(steps).toHaveLength(visibleCount(call) + 1);
			expect(steps[0].kind).toBe('point-fade-in');
			expect(steps[0].animatePointIds).toEqual([M]);
			expect(steps[0].instruction).toBe('On choisit un point de la droite');
			expect(visibleDuring.get(M)).toEqual(steps.map(() => true));
			expect(visibleDuring.get(H)).toEqual(steps.map(() => false));
			const produced = exec.lastChoreographyResult!.produced;
			expect(produced.traceTags?.get(M)).toBe('auxiliary-point');
			expectFinalLineThrough(exec, call.split('(')[0]);
		});

		it(`${call} : C visible et utilisé → aucun fondu en plus`, () => {
			const { steps } = playHidden('perpendiculaire(C, A, B)', call);
			expect(steps).toHaveLength(visibleCount(call));
			expect(steps.filter((s) => s.instruction?.startsWith('On choisit'))).toEqual([]);
		});
	}

	for (const call of [
		'parallele(P, d) @euclide @double_perpendiculaire',
		'parallele(P, d) @equerre @pose_equerre',
		'perpendiculaire(P, d) @euclide @rayon_libre'
	]) {
		it(`${call} : la voie n'utilise que la direction de d → aucun fondu`, () => {
			const { steps } = playHidden('mediatrice(A, B)', call);
			expect(steps).toHaveLength(visibleCount(call));
			expect(steps.filter((s) => s.instruction?.startsWith('On choisit'))).toEqual([]);
		});
	}

	for (const mode of MODES) {
		it(`point caché révélé ${mode} : masqué sauf en @complet`, () => {
			const { exec } = playHidden(
				'perpendiculaire(C, A, B)',
				`parallele(P, d) @euclide @parallelogramme ${mode}`
			);
			const [, Rid] = carrierIds(exec, 'd');
			expect(exec.figure.getElementById(Rid)?.visible !== false).toBe(mode === '@complet');
		});
	}

	function expectFinalLineThrough(exec: ConstructionExecutor, builtin: string): void {
		const [p1, p2] = carriers(exec, principalOf(exec, 'm'));
		const [d1, d2] = carriers(exec, principalOf(exec, 'd'));
		const dir = minus(p2, p1);
		const dirD = minus(d2, d1);
		if (builtin === 'parallele') expect(cross(dir, dirD)).toBeCloseTo(0, 9);
		else expect(dot(dir, dirD)).toBeCloseTo(0, 9);
		expect(cross(minus({ x: 5, y: 3 }, p1), dir)).toBeCloseTo(0, 9);
	}

	// ─── Deux constructions sur la même droite d : la pré-passe (qui bâtit le
	// plan) doit voir R comme l'élève le voit au moment de n. ───

	for (const mode of MODES) {
		const fadeExpected = mode !== '@complet';
		it(`m ${mode} puis n sur la même d : ${fadeExpected ? 'R remasqué → fondu' : 'R déjà visible → pas de fondu'} pour n`, () => {
			const exec = new ConstructionExecutor();
			exec.load(
				[
					...HIDDEN_DECOR,
					'Q = point(-2, 4)',
					'd = perpendiculaire(C, A, B)',
					`m = parallele(P, d) @euclide ${mode}`,
					'n = parallele(Q, d) @euclide'
				].join('\n')
			);
			expect(exec.loadError).toBeNull();
			for (let i = 0; i < HIDDEN_DECOR.length + 2; i++) exec.step();
			const [, Rid] = carrierIds(exec, 'd');
			const nSteps: SubStep[] = [];
			const nVisible: boolean[] = [];
			let inN = false;
			while (exec.step()) {
				const ss = exec.currentSubStep;
				if (!ss) continue;
				const stmt = exec.plan[exec.currentStepIndex].statement;
				if (stmt.kind === 'assignment' && stmt.name === 'n') inN = true;
				if (!inN) continue;
				nSteps.push(ss);
				nVisible.push(exec.figure.getElementById(Rid)?.visible !== false);
			}
			const fades = nSteps.filter(
				(s) => s.kind === 'point-fade-in' && s.animatePointIds.includes(Rid)
			);
			expect(fades).toHaveLength(fadeExpected ? 1 : 0);
			// R visible pendant toute l'animation de n.
			expect(nVisible).toEqual(nSteps.map(() => true));
			// Classement : rangé dans les traces de n seulement s'il a été révélé par n.
			const produced = exec.lastChoreographyResult!.produced;
			expect(produced.traces.includes(Rid)).toBe(fadeExpected);
			// Visibilité finale (n en @squelette) : R masqué s'il est un point auxiliaire de n.
			expect(exec.figure.getElementById(Rid)?.visible !== false).toBe(!fadeExpected);
		});
	}

	// ─── Erreurs ───

	it('premier argument non-point : erreur du langage inchangée', () => {
		const exec = new ConstructionExecutor();
		exec.load([...POINTS, 'd = droite(A, B)', 'm = parallele(d, d) @euclide'].join('\n'));
		expect(exec.loadError?.message).toMatch(/le premier argument doit être un point/);
	});

	it('second argument non-droite : erreur du langage inchangée', () => {
		const exec = new ConstructionExecutor();
		exec.load([...POINTS, 'm = perpendiculaire(P, A) @euclide'].join('\n'));
		expect(exec.loadError?.message).toMatch(/le second argument doit être une droite/);
	});

	for (const voie of ['@euclide @double_perpendiculaire', '@equerre @double_perpendiculaire']) {
		it(`P sur d, ${voie} : même erreur qu'avec (P, A, B)`, () => {
			const exec = new ConstructionExecutor();
			exec.load(
				[
					'A = point(0, 0)',
					'B = point(4, 1)',
					'P = point(8, 2)',
					'd = droite(A, B)',
					`m = parallele(P, d) ${voie}`
				].join('\n')
			);
			expect(exec.loadError).not.toBeNull();
			// Lot 8 : la forme (P, d) nomme d au lieu de (AB).
			expect(exec.loadError!.message).toMatch(/P est sur la droite d :/);
			expect(exec.loadError!.line).toBe(5);
			expect(exec.totalSteps).toBe(4);
		});
	}
});

// -----------------------------------------------------------------------------
// Lot 8 — les consignes écrivent le nom affiché des arguments du script.
describe('consignes : vrais noms', () => {
	/** Scripts de référence : arguments nommés comme les lettres des gabarits. */
	const REF: Record<string, string[]> = {
		'mediatrice @arcs_egaux': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'm = mediatrice(A, B) @euclide @arcs_egaux'
		],
		'mediatrice @cercles_rayon_ab': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'm = mediatrice(A, B) @euclide @cercles_rayon_ab'
		],
		'bissectrice @arcs_egaux': [
			'A = point(3, 0)',
			'V = point(0, 0)',
			'B = point(1, 3)',
			'm = bissectrice(A, V, B) @euclide @arcs_egaux'
		],
		'bissectrice @arc_milieu': [
			'A = point(3, 0)',
			'V = point(0, 0)',
			'B = point(1, 3)',
			'm = bissectrice(A, V, B) @euclide @arc_milieu'
		],
		'parallele @parallelogramme': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = parallele(P, A, B) @euclide @parallelogramme'
		],
		'parallele @euclide @double_perpendiculaire': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = parallele(P, A, B) @euclide @double_perpendiculaire'
		],
		'parallele @pose_equerre': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = parallele(P, A, B) @equerre @pose_equerre'
		],
		'parallele @equerre @double_perpendiculaire': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = parallele(P, A, B) @equerre @double_perpendiculaire'
		],
		'perpendiculaire @arcs_egaux': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = perpendiculaire(P, A, B) @euclide @arcs_egaux'
		],
		'perpendiculaire @rayon_libre': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = perpendiculaire(P, A, B) @euclide @rayon_libre'
		],
		'perpendiculaire @pose_equerre': [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'P = point(1, 3)',
			'm = perpendiculaire(P, A, B) @equerre @pose_equerre'
		],
		cercle_circonscrit: [
			'A = point(0, 0)',
			'B = point(4, 1)',
			'C = point(1, 3)',
			'm = cercle_circonscrit(A, B, C) @euclide'
		],
		transporte: [
			'A = point(3, 0)',
			'V = point(0, 0)',
			'B = point(0, 3)',
			'al = angle(A, V, B)',
			'Vp = point(5, 0)',
			'P = point(6, 1)',
			'be = transporte(al, Vp, P) @euclide'
		]
	};

	/**
	 * Consignes relevées avant le lot 8, identiques au caractère près, sauf
	 * deux corrections voulues : la 2e médiatrice de `cercle_circonscrit`
	 * (« Compas en B / C » au lieu de « A / B ») et `transporte` (V' s'appelle
	 * Vp dans le script ; α, β sans nom affiché → « l'angle », « le nouvel angle »).
	 * Lot 9 : les points auxiliaires prennent le prime typographique (B′, A″),
	 * comme leur étiquette sur la figure.
	 */
	const EXPECTED: Record<string, string[]> = {
		'mediatrice @arcs_egaux': [
			"Compas en A, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			"Compas en B, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			'Les arcs se coupent en deux points',
			'Règle sur les 2 points : on trace la médiatrice'
		],
		'mediatrice @cercles_rayon_ab': [
			"Compas en A, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			"Compas en B, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			'Les arcs se coupent en deux points',
			'Règle sur les 2 points : on trace la médiatrice'
		],
		'bissectrice @arcs_egaux': [
			'Compas en V, petit arc qui coupe (VA)',
			'Compas en V (même ouverture), petit arc qui coupe (VB)',
			'Les arcs coupent les côtés en A′ et B′',
			'Compas en A′, petit arc en direction du croisement',
			'Compas en B′ (même ouverture), petit arc qui croise le précédent',
			'Les arcs se coupent en P',
			'Règle de V à P : on trace la bissectrice'
		],
		'bissectrice @arc_milieu': [
			'Compas en V, petit arc qui coupe (VA)',
			'Compas en V (même ouverture), petit arc qui coupe (VB)',
			'Les arcs coupent les côtés en A′ et B′',
			'On marque le milieu M de [A′B′]',
			'Règle de V à M : on trace la bissectrice'
		],
		'parallele @parallelogramme': [
			'Compas en A, on prend la mesure |AB|',
			'On reporte cette ouverture en P et on trace un arc vers Q',
			'Compas en P, on prend la mesure |PA|',
			'On reporte en B et on trace un arc qui croise le précédent',
			'Les arcs se croisent en Q',
			'Règle par P et Q : on trace la parallèle'
		],
		'parallele @euclide @double_perpendiculaire': [
			'Compas en P, on trace un petit arc qui coupe (AB) en A*',
			'Même ouverture, second petit arc qui coupe (AB) en B*',
			'A* et B* apparaissent (équidistants de P)',
			'On reporte la même ouverture en A* et on trace un petit arc',
			'On reporte en B* : les deux petits arcs se croisent',
			'Les arcs se croisent en Q (symétrique de P par rapport à (AB))',
			'Règle par P et Q : on trace la perpendiculaire',
			'La perpendiculaire e à (AB) passant par P apparaît',
			'Compas en P, petite ouverture : un petit arc coupe e en C*',
			'Même ouverture, de l’autre côté de P : un petit arc coupe e en D*',
			'C* et D* apparaissent sur e, à égale distance de P',
			'Compas en C*, on l’ouvre davantage (plus grand que PC*)',
			'On trace un arc de centre C*',
			'Même ouverture en D* : l’arc croise le précédent',
			'Les arcs se croisent en R',
			'Règle par P et R : on trace la parallèle à (AB)'
		],
		'parallele @pose_equerre': [
			"On pose l'équerre avec son bord horizontal sur (AB), près du projeté de P sur (AB)",
			"On pose la règle contre le bord vertical de l'équerre",
			"On fait glisser l'équerre le long de la règle jusqu'à ce que le bord horizontal passe par P",
			"Le long du bord horizontal de l'équerre, on trace une portion de la parallèle",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle pour compléter la parallèle'
		],
		'parallele @equerre @double_perpendiculaire': [
			"On pose l'équerre avec son bord sur (AB), le coin sur A",
			"On fait glisser l'équerre le long de (AB) jusqu'à ce que le bord vertical passe par P",
			"Le long du bord vertical de l'équerre, on trace une portion de la perpendiculaire",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle pour compléter la perpendiculaire',
			'La perpendiculaire e à (AB) passant par P apparaît',
			"On pose l'équerre avec un bord sur e, l'angle droit en P",
			"Le long de l'autre bord de l'équerre, on trace une portion de la parallèle",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle : c’est la parallèle à (AB)'
		],
		'perpendiculaire @arcs_egaux': [
			'Compas en P, on prend la mesure |PA|',
			'On trace un petit arc qui coupe (AB) en B′',
			'B′ apparaît : un autre point de (AB), équidistant de P comme A',
			'On reporte cette ouverture en A et on trace un petit arc',
			'On reporte en B′ : les deux petits arcs se croisent',
			'Les arcs se croisent en Q (symétrique de P par rapport à (AB))',
			'Règle par P et Q : on trace la perpendiculaire'
		],
		'perpendiculaire @rayon_libre': [
			'Compas en P, on trace un petit arc qui coupe (AB) en A*',
			'Même ouverture, second petit arc qui coupe (AB) en B*',
			'A* et B* apparaissent (équidistants de P)',
			'On reporte la même ouverture en A* et on trace un petit arc',
			'On reporte en B* : les deux petits arcs se croisent',
			'Les arcs se croisent en Q (symétrique de P par rapport à (AB))',
			'Règle par P et Q : on trace la perpendiculaire'
		],
		'perpendiculaire @pose_equerre': [
			"On pose l'équerre avec son bord sur (AB), le coin sur A",
			"On fait glisser l'équerre le long de (AB) jusqu'à ce que le bord vertical passe par P",
			"Le long du bord vertical de l'équerre, on trace une portion de la perpendiculaire",
			"On retire l'équerre et on pose la règle le long de la portion tracée",
			'On prolonge le tracé le long de la règle pour compléter la perpendiculaire'
		],
		cercle_circonscrit: [
			"Compas en A, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			"Compas en B, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			'Les arcs se coupent en deux points',
			'Règle sur les 2 points : on trace la médiatrice',
			'La médiatrice de [AB] apparaît',
			"Compas en B, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			"Compas en C, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			'Les arcs se coupent en deux points',
			'Règle sur les 2 points : on trace la médiatrice',
			'La médiatrice de [BC] apparaît',
			'Les médiatrices se croisent en O, centre du cercle',
			'Compas en O, on prend la mesure |OA|',
			'On trace le cercle circonscrit passant par A, B, C'
		],
		transporte: [
			"Compas en V, on trace l'arc qui coupe les côtés",
			'Compas en Vp (même ouverture), petit arc sur la direction',
			"On marque A′, B′ (sur les côtés de l'angle) et A″ (sur la direction)",
			'Compas en A′, on prend la mesure |A′B′|',
			'On reporte cette ouverture en A″ et on trace un arc',
			'Les deux arcs se coupent en B″',
			'Règle de Vp à B″ : on trace le second côté du nouvel angle'
		]
	};

	/** Renommage des arguments : A→C, B→D, P→M, V→S ; cercle A, B, C → D, E, F. */
	const RENAMED: Record<string, { script: string[]; absent: string[] }> = {
		mediatrice: { script: ['C = point(0, 0)', 'D = point(4, 1)'], absent: ['A', 'B'] },
		bissectrice: {
			script: ['C = point(3, 0)', 'S = point(0, 0)', 'D = point(1, 3)'],
			absent: ['A', 'B', 'V']
		},
		ligne: {
			script: ['C = point(0, 0)', 'D = point(4, 1)', 'M = point(1, 3)'],
			absent: ['A', 'B', 'P']
		},
		cercle_circonscrit: {
			script: ['D = point(0, 0)', 'E = point(4, 1)', 'F = point(1, 3)'],
			absent: ['A', 'B', 'C']
		},
		transporte: {
			script: [
				'C = point(3, 0)',
				'S = point(0, 0)',
				'D = point(0, 3)',
				'al = angle(C, S, D)',
				'T = point(5, 0)',
				'N = point(6, 1)'
			],
			absent: ['A', 'B', 'V', 'Vp', 'V′', 'P']
		}
	};
	const RENAMED_CALLS: readonly { family: string; call: string }[] = [
		{ family: 'mediatrice', call: 'mediatrice(C, D) @euclide @arcs_egaux' },
		{ family: 'mediatrice', call: 'mediatrice(C, D) @euclide @cercles_rayon_ab' },
		{ family: 'bissectrice', call: 'bissectrice(C, S, D) @euclide @arcs_egaux' },
		{ family: 'bissectrice', call: 'bissectrice(C, S, D) @euclide @arc_milieu' },
		{ family: 'ligne', call: 'parallele(M, C, D) @euclide @parallelogramme' },
		{ family: 'ligne', call: 'parallele(M, C, D) @euclide @double_perpendiculaire' },
		{ family: 'ligne', call: 'parallele(M, C, D) @equerre @pose_equerre' },
		{ family: 'ligne', call: 'parallele(M, C, D) @equerre @double_perpendiculaire' },
		{ family: 'ligne', call: 'perpendiculaire(M, C, D) @euclide @arcs_egaux' },
		{ family: 'ligne', call: 'perpendiculaire(M, C, D) @euclide @rayon_libre' },
		{ family: 'ligne', call: 'perpendiculaire(M, C, D) @equerre @pose_equerre' },
		{ family: 'cercle_circonscrit', call: 'cercle_circonscrit(D, E, F) @euclide' },
		{ family: 'transporte', call: 'transporte(al, T, N) @euclide' }
	];

	/** Consignes des sous-étapes jouées par le script. */
	function consignes(lines: readonly string[]): string[] {
		const exec = new ConstructionExecutor();
		exec.load(lines.join('\n'));
		expect(exec.loadError).toBeNull();
		const out: string[] = [];
		while (exec.step()) {
			const ss = exec.currentSubStep;
			if (ss) out.push(ss.instruction ?? '');
		}
		return out;
	}

	/** La lettre `letter` comme mot, hors A*, B′, A″ (points auxiliaires). */
	function mentions(text: string, letter: string): boolean {
		const escaped = letter.replace(/'/g, "\\'");
		return new RegExp(`(?<![\\w'’*′″])${escaped}(?![\\w'’*′″])`).test(text);
	}

	for (const [key, lines] of Object.entries(REF)) {
		it(`non-régression ${key} : mêmes consignes qu'avant le lot 8`, () => {
			expect(consignes(lines)).toEqual(EXPECTED[key]);
		});
	}

	for (const { family, call } of RENAMED_CALLS) {
		it(`${call} : aucune lettre d'argument absente du script`, () => {
			const { script, absent } = RENAMED[family];
			const texts = consignes([...script, `m = ${call}`]);
			expect(texts.length).toBeGreaterThan(0);
			for (const text of texts) {
				for (const letter of absent)
					expect({ text, letter, found: mentions(text, letter) }).toEqual({
						text,
						letter,
						found: false
					});
				expect(text).not.toMatch(/undefined|null/);
			}
		});
	}

	it('parallele(M, C, D) @euclide @parallelogramme : textes exacts', () => {
		const texts = consignes([
			...RENAMED.ligne.script,
			'm = parallele(M, C, D) @euclide @parallelogramme'
		]);
		expect(texts).toEqual([
			'Compas en C, on prend la mesure |CD|',
			'On reporte cette ouverture en M et on trace un arc vers Q',
			'Compas en M, on prend la mesure |MC|',
			'On reporte en D et on trace un arc qui croise le précédent',
			'Les arcs se croisent en Q',
			'Règle par M et Q : on trace la parallèle'
		]);
	});

	it('perpendiculaire(M, C, D) @equerre : (CD), coin sur C, passe par M', () => {
		const texts = consignes([...RENAMED.ligne.script, 'm = perpendiculaire(M, C, D) @equerre']);
		expect(texts[0]).toBe("On pose l'équerre avec son bord sur (CD), le coin sur C");
		expect(texts[1]).toBe(
			"On fait glisser l'équerre le long de (CD) jusqu'à ce que le bord vertical passe par M"
		);
	});

	it('bissectrice(C, S, D) : sommet S, côtés (SC) et (SD)', () => {
		const texts = consignes([...RENAMED.bissectrice.script, 'm = bissectrice(C, S, D) @euclide']);
		expect(texts[0]).toBe('Compas en S, petit arc qui coupe (SC)');
		expect(texts[1]).toBe('Compas en S (même ouverture), petit arc qui coupe (SD)');
		expect(texts.at(-1)).toBe('Règle de S à P : on trace la bissectrice');
	});

	it('bissectrice(al) : les points de l’angle', () => {
		const texts = consignes([
			...RENAMED.bissectrice.script,
			'al = angle(C, S, D)',
			'm = bissectrice(al) @euclide'
		]);
		expect(texts[0]).toBe('Compas en S, petit arc qui coupe (SC)');
	});

	it('cercle_circonscrit(D, E, F) : les sous-médiatrices reçoivent les vrais noms', () => {
		const texts = consignes([
			...RENAMED.cercle_circonscrit.script,
			'm = cercle_circonscrit(D, E, F) @euclide'
		]);
		expect(
			texts.filter((t) => t.startsWith('Compas en ') && t.endsWith("petit arc d'un côté"))
		).toEqual([
			"Compas en D, petit arc d'un côté",
			"Compas en E, petit arc d'un côté",
			"Compas en E, petit arc d'un côté",
			"Compas en F, petit arc d'un côté"
		]);
		expect(texts).toContain('La médiatrice de [DE] apparaît');
		expect(texts).toContain('La médiatrice de [EF] apparaît');
		expect(texts).toContain('Compas en O, on prend la mesure |OD|');
		expect(texts.at(-1)).toBe('On trace le cercle circonscrit passant par D, E, F');
	});

	it('transporte(al, T, N) : sommets S et T ; α, β nommés à l’écran → leurs noms', () => {
		const texts = consignes([...RENAMED.transporte.script, 'be = transporte(al, T, N) @euclide']);
		expect(texts[0]).toBe("Compas en S, on trace l'arc qui coupe les côtés");
		expect(texts[1]).toBe('Compas en T (même ouverture), petit arc sur la direction');
		expect(texts.at(-1)).toBe('Règle de T à B″ : on trace le second côté du nouvel angle');
		const shown = consignes([
			'C = point(3, 0)',
			'S = point(0, 0)',
			'D = point(0, 3)',
			'al = angle(C, S, D, showLabel="nom")',
			'T = point(5, 0)',
			'N = point(6, 1)',
			'be = transporte(al, T, N) @euclide'
		]);
		expect(shown[2]).toBe('On marque A′, B′ (sur les côtés de al) et A″ (sur la direction)');
		expect(shown.at(-1)).toBe('Règle de T à B″ : on trace le second côté de be');
	});

	// ─── Forme (P, d) ───

	it('parallele(M, d) @euclide @double_perpendiculaire : « (AB) » devient « d », jusque dans la sous-chorégraphie', () => {
		const texts = consignes([
			...RENAMED.ligne.script,
			'd = droite(C, D)',
			'm = parallele(M, d) @euclide @double_perpendiculaire'
		]);
		expect(texts[0]).toBe('Compas en M, on trace un petit arc qui coupe d en A*');
		expect(texts[5]).toBe('Les arcs se croisent en Q (symétrique de M par rapport à d)');
		expect(texts[7]).toBe('La perpendiculaire e à d passant par M apparaît');
		expect(texts.at(-1)).toBe('Règle par M et R : on trace la parallèle à d');
		for (const t of texts) expect(t).not.toMatch(/\(CD\)/);
	});

	it('perpendiculaire(M, s) @euclide @arcs_egaux, s segment : « coupe s »', () => {
		const texts = consignes([
			...RENAMED.ligne.script,
			's = segment(C, D)',
			'm = perpendiculaire(M, s) @euclide @arcs_egaux'
		]);
		expect(texts[0]).toBe('Compas en M, on prend la mesure |MC|');
		expect(texts[1]).toBe('On trace un petit arc qui coupe s en B′');
		expect(texts[2]).toBe('B′ apparaît : un autre point de s, équidistant de M comme C');
	});

	it('parallele(M, d) @equerre @pose_equerre : bord sur d', () => {
		const texts = consignes([
			...RENAMED.ligne.script,
			'd = droite(C, D)',
			'm = parallele(M, d) @equerre @pose_equerre'
		]);
		expect(texts[0]).toBe(
			"On pose l'équerre avec son bord horizontal sur d, près du projeté de M sur d"
		);
	});

	// ─── Point caché ou sans étiquette ───

	const HIDDEN = ['C = point(0, 0)', 'D = point(4, 1)', 'K = point(2, -1)', 'M = point(5, 3)'];

	it('d portée par K et un point caché : « le point choisi »', () => {
		const texts = consignes([
			...HIDDEN,
			'd = perpendiculaire(K, C, D)',
			'm = parallele(M, d) @euclide @parallelogramme'
		]);
		expect(texts).toEqual([
			'On choisit un point de la droite',
			"Compas en K, on prend l'écart jusqu'au point choisi",
			'On reporte cette ouverture en M et on trace un arc vers Q',
			'Compas en M, on prend la mesure |MK|',
			'On reporte sur le point choisi et on trace un arc qui croise le précédent',
			'Les arcs se croisent en Q',
			'Règle par M et Q : on trace la parallèle'
		]);
	});

	it('d aux deux points cachés : premier et second point choisis', () => {
		const texts = consignes([
			...HIDDEN,
			'd = mediatrice(C, D)',
			'm = parallele(M, d) @euclide @parallelogramme'
		]);
		expect(texts[0]).toBe('On choisit deux points de la droite');
		expect(texts[1]).toBe(
			"Compas sur le premier point choisi, on prend l'écart jusqu'au second point choisi"
		);
		expect(texts[3]).toBe("Compas en M, on prend l'écart jusqu'au premier point choisi");
		expect(texts[4]).toBe(
			'On reporte sur le second point choisi et on trace un arc qui croise le précédent'
		);
	});

	it('perpendiculaire(M, d) @equerre, point de d caché : « le coin sur le point choisi »', () => {
		const texts = consignes([
			...HIDDEN,
			'd = mediatrice(C, D)',
			'm = perpendiculaire(M, d) @equerre'
		]);
		expect(texts[0]).toBe('On choisit un point de la droite');
		expect(texts[1]).toBe("On pose l'équerre avec son bord sur d, le coin sur le point choisi");
	});

	it('point au nom masqué (etiquette="aucune") : tournure neutre, ni lettre ni undefined', () => {
		const texts = consignes([
			'C = point(0, 0, etiquette="aucune")',
			'D = point(4, 1)',
			'M = point(1, 3)',
			'm = parallele(M, C, D) @euclide @parallelogramme'
		]);
		expect(texts[0]).toBe("Compas sur le point choisi, on prend l'écart jusqu'à D");
		for (const t of texts) expect(t).not.toMatch(/undefined|null|\bC\b|\(/);
	});

	it('mediatrice(C, D) avec C masqué : « Compas sur le premier point »', () => {
		const texts = consignes([
			'C = point(0, 0)',
			'D = point(4, 1)',
			'masque(C)',
			'm = mediatrice(C, D) @euclide'
		]);
		expect(texts[0]).toBe("Compas sur le premier point, petit arc d'un côté");
		expect(texts[2]).toBe("Compas en D, petit arc d'un côté");
	});

	// ─── Tournures neutres, une par famille (textes exacts) ───

	it('bissectrice, sommet caché : « le sommet », « le premier / second côté »', () => {
		const texts = consignes([
			...RENAMED.bissectrice.script,
			'masque(S)',
			'm = bissectrice(C, S, D) @euclide'
		]);
		expect(texts).toEqual([
			'Compas sur le sommet, petit arc qui coupe le premier côté',
			'Compas sur le sommet (même ouverture), petit arc qui coupe le second côté',
			'Les arcs coupent les côtés en A′ et B′',
			'Compas en A′, petit arc en direction du croisement',
			'Compas en B′ (même ouverture), petit arc qui croise le précédent',
			'Les arcs se coupent en P',
			'Règle du sommet à P : on trace la bissectrice'
		]);
	});

	it('bissectrice, un côté caché : (SC) puis « le second côté »', () => {
		const texts = consignes([
			...RENAMED.bissectrice.script,
			'masque(D)',
			'm = bissectrice(C, S, D) @euclide @arc_milieu'
		]);
		expect(texts).toEqual([
			'Compas en S, petit arc qui coupe (SC)',
			'Compas en S (même ouverture), petit arc qui coupe le second côté',
			'Les arcs coupent les côtés en A′ et B′',
			'On marque le milieu M de [A′B′]',
			'Règle de S à M : on trace la bissectrice'
		]);
	});

	it('mediatrice, un point sans nom : « Compas sur le second point »', () => {
		const texts = consignes([
			'C = point(0, 0)',
			'D = point(4, 1, etiquette="aucune")',
			'm = mediatrice(C, D) @euclide'
		]);
		expect(texts).toEqual([
			"Compas en C, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			"Compas sur le second point, petit arc d'un côté",
			"Petit arc de l'autre côté, même ouverture",
			'Les arcs se coupent en deux points',
			'Règle sur les 2 points : on trace la médiatrice'
		]);
	});

	it('cercle_circonscrit, un point sans nom : première médiatrice, « les trois points »', () => {
		const texts = consignes([
			'D = point(0, 0, etiquette="aucune")',
			'E = point(4, 1)',
			'F = point(1, 3)',
			'm = cercle_circonscrit(D, E, F) @euclide'
		]);
		expect(texts[0]).toBe("Compas sur le premier point, petit arc d'un côté");
		expect(texts[2]).toBe("Compas en E, petit arc d'un côté");
		expect(texts.slice(6, 8)).toEqual([
			'La première médiatrice apparaît',
			"Compas en E, petit arc d'un côté"
		]);
		expect(texts.slice(13)).toEqual([
			'La médiatrice de [EF] apparaît',
			'Les médiatrices se croisent en O, centre du cercle',
			"Compas en O, on prend l'écart jusqu'au premier point",
			'On trace le cercle circonscrit passant par les trois points'
		]);
	});

	it('perpendiculaire, P sans nom : « le point de passage »', () => {
		const texts = consignes([
			'C = point(0, 0)',
			'D = point(4, 1)',
			'M = point(1, 3, etiquette="aucune")',
			'm = perpendiculaire(M, C, D) @euclide @arcs_egaux'
		]);
		expect(texts).toEqual([
			"Compas sur le point de passage, on prend l'écart jusqu'à C",
			'On trace un petit arc qui coupe (CD) en B′',
			'B′ apparaît : un autre point de (CD), équidistant du point de passage comme C',
			'On reporte cette ouverture en C et on trace un petit arc',
			'On reporte en B′ : les deux petits arcs se croisent',
			'Les arcs se croisent en Q (symétrique du point de passage par rapport à (CD))',
			'Règle par le point de passage et Q : on trace la perpendiculaire'
		]);
	});

	it('perpendiculaire(M, d), point de d caché : d nommée, « le point choisi »', () => {
		const texts = consignes([
			...HIDDEN,
			'd = mediatrice(C, D)',
			'm = perpendiculaire(M, d) @euclide @arcs_egaux'
		]);
		expect(texts).toEqual([
			'On choisit un point de la droite',
			"Compas en M, on prend l'écart jusqu'au point choisi",
			'On trace un petit arc qui coupe d en B′',
			'B′ apparaît : un autre point de d, équidistant de M comme le point choisi',
			'On reporte cette ouverture sur le point choisi et on trace un petit arc',
			'On reporte en B′ : les deux petits arcs se croisent',
			'Les arcs se croisent en Q (symétrique de M par rapport à d)',
			'Règle par M et Q : on trace la perpendiculaire'
		]);
	});

	it('transporte, sommet caché : « le sommet de l’angle »', () => {
		const [C, S, D, al, ...rest] = RENAMED.transporte.script;
		const texts = consignes([
			C,
			S,
			D,
			al,
			'masque(S)',
			...rest,
			'be = transporte(al, T, N) @euclide'
		]);
		expect(texts).toEqual([
			"Compas sur le sommet de l'angle, on trace l'arc qui coupe les côtés",
			'Compas en T (même ouverture), petit arc sur la direction',
			"On marque A′, B′ (sur les côtés de l'angle) et A″ (sur la direction)",
			'Compas en A′, on prend la mesure |A′B′|',
			'On reporte cette ouverture en A″ et on trace un arc',
			'Les deux arcs se coupent en B″',
			'Règle de T à B″ : on trace le second côté du nouvel angle'
		]);
	});

	// ─── Message d'erreur « P sur la droite » ───

	for (const voie of ['@euclide @double_perpendiculaire', '@equerre @double_perpendiculaire']) {
		it(`M sur (CD), ${voie} : le message nomme M et (CD)`, () => {
			const exec = new ConstructionExecutor();
			exec.load(
				[
					'C = point(0, 0)',
					'D = point(4, 1)',
					'M = point(8, 2)',
					`m = parallele(M, C, D) ${voie}`
				].join('\n')
			);
			expect(exec.loadError!.message).toBe(
				'Ligne 4 : `parallele(M, C, D) @double_perpendiculaire` : M est sur la droite (CD) : la parallèle est (CD) elle-même, il n’y a rien à construire.'
			);
		});

		it(`M sur d, ${voie} : le message nomme d`, () => {
			const exec = new ConstructionExecutor();
			exec.load(
				[
					'C = point(0, 0)',
					'D = point(4, 1)',
					'M = point(8, 2)',
					'd = droite(C, D)',
					`m = parallele(M, d) ${voie}`
				].join('\n')
			);
			expect(exec.loadError!.message).toBe(
				'Ligne 5 : `parallele(M, d) @double_perpendiculaire` : M est sur la droite d : la parallèle est d elle-même, il n’y a rien à construire.'
			);
		});
	}
});
