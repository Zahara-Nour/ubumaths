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

	it('mediatrice @euclide expands into 4 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		// 2 point statements + 4 sub-steps for the decorated mediatrice = 6 entries.
		expect(exec.totalSteps).toBe(6);
		expect(exec.stepDurations.length).toBe(6);
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

		// Choreography adds : 2 arcs + 2 hidden circles + 2 intersection points
		// + 1 segment-trace + 2 scalars (distAB, radiusScalar) = 9 elements.
		expect(sizeEuclide).toBeGreaterThan(sizeDirect);
	});

	it('currentSubStep is populated during each sub-step of mediatrice @euclide', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.step(); // A
		expect(exec.currentSubStep).toBeNull();
		exec.step(); // B
		expect(exec.currentSubStep).toBeNull();
		exec.step(); // SS1 : compass at A
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		expect(exec.currentSubStep?.instrument).toBe('compass');
		exec.step(); // SS2 : compass at B
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : intersections fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(2);
		exec.step(); // SS4 : ruler trace
		expect(exec.currentSubStep?.kind).toBe('ruler-trace');
		expect(exec.currentSubStep?.instrument).toBe('ruler');
		expect(exec.currentSubStep?.secondaryInstrument).toBe('pencil');
	});

	it('currentDecoratorTriple stays populated across all sub-steps of a decorated statement', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		exec.step(); // A
		exec.step(); // B
		// Now 4 sub-steps for the decorated statement.
		for (let i = 0; i < 4; i++) {
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

	it('cercles_rayon_ab voie also produces 4 sub-steps', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = mediatrice(A, B) @euclide @cercles_rayon_ab'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(6); // 2 + 4
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

describe('ConstructionExecutor — parallele @euclide @parallelogramme (4 sub-steps)', () => {
	it('parallele @euclide expands into 4 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'P = point(0, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = parallele(P, A, B) @euclide'
			].join('\n')
		);
		// 3 point statements + 4 sub-steps for the decorated parallele = 7 entries.
		expect(exec.totalSteps).toBe(7);
	});

	it('sub-step kinds : arc at P, arc at A, fade-in Q, ruler trace', () => {
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
		exec.step(); // SS1 : compass at P
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		expect(exec.currentSubStep?.instrument).toBe('compass');
		exec.step(); // SS2 : compass at A
		expect(exec.currentSubStep?.kind).toBe('compass-draw');
		exec.step(); // SS3 : Q fade-in
		expect(exec.currentSubStep?.kind).toBe('point-fade-in');
		expect(exec.currentSubStep?.animatePointIds.length).toBe(1);
		exec.step(); // SS4 : ruler
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

	it('double_perpendiculaire voie remains NOT_YET_IMPLEMENTED (fallback legacy)', () => {
		const exec = new ConstructionExecutor();
		exec.load(
			[
				'P = point(0, 3)',
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = parallele(P, A, B) @euclide @double_perpendiculaire'
			].join('\n')
		);
		// Stub returns subSteps:[] → falls through to legacy timing (1 entry).
		// 3 points + 1 legacy entry = 4 total.
		expect(exec.totalSteps).toBe(4);
	});
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

	it('transporte(al, Vp, P) @euclide expands into 6 sub-step entries', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		// 6 plain statements (A, V, B, al, Vp, P) + 6 sub-steps for transporte = 12 entries.
		expect(exec.totalSteps).toBe(12);
		expect(exec.stepDurations.length).toBe(12);
	});

	it('sub-step kinds: compass-draw × 3, point-fade-in × 2, ruler-trace × 1 (in expected order)', () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		// Skip the 6 plain statements
		for (let i = 0; i < 6; i++) exec.step();
		// 6 sub-steps follow
		const kinds: string[] = [];
		for (let i = 0; i < 6; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-draw',
			'compass-draw',
			'point-fade-in',
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

	it("SS5 fade-in apparait B'' (1 point)", () => {
		const exec = new ConstructionExecutor();
		exec.load(standardScript);
		for (let i = 0; i < 6 + 4; i++) exec.step(); // 6 statements + SS1..SS4
		exec.step(); // SS5
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
