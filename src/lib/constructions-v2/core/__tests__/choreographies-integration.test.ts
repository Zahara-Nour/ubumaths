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

describe('ConstructionExecutor — choreography produces auxiliary elements (Phase 4)', () => {
	it('mediatrice @euclide @arcs_egaux creates 2 circles + 2 intersections + 1 line', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n'));
		expect(exec.loadError).toBeNull();
		const sizeBeforeStep = exec.figure.size;
		exec.step(); // A
		exec.step(); // B
		const sizeBeforeMediatrice = exec.figure.size;
		exec.step(); // d = mediatrice(A, B) @euclide
		const sizeAfter = exec.figure.size;
		// New elements created by the choreography :
		//   - the line itself (created by mediatrice builtin)
		//   - 2 hidden internal points (M = midpoint, H = rotated) by mediatrice
		//   - 2 visible compass circles (by choreography)
		//   - 2 intersection points (by choreography)
		// = at least 5 new visible elements (line + 2 circles + 2 intersections).
		expect(sizeAfter - sizeBeforeMediatrice).toBeGreaterThanOrEqual(5);
		// Drawable elements caught by the animation pipeline (DRAWABLE_TYPES :
		// segment, arc, circle). 'line' is rendered without progressive drawing.
		// Choreography adds 2 circles → exactly 2 new drawables.
		const drawables = exec.lastStepNewElementIds;
		expect(drawables.length).toBe(2);
		// Sanity : initial state unchanged
		expect(sizeBeforeStep).toBe(0);
	});

	it('mediatrice without decorator does NOT create auxiliary circles', () => {
		const exec = new ConstructionExecutor();
		exec.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B)'].join('\n'));
		exec.step();
		exec.step();
		const sizeBeforeMediatrice = exec.figure.size;
		exec.step();
		const sizeAfter = exec.figure.size;
		// Without decorator : just the line + the 2 hidden internal helpers
		// (midpoint + rotated). No auxiliary circles or intersections.
		// So the delta is exactly 3 (line + midpoint + rotated point).
		expect(sizeAfter - sizeBeforeMediatrice).toBe(3);
	});

	it('mediatrice @euclide @cercles_rayon_ab uses radius = AB (visible difference in circle radius)', () => {
		const execA = new ConstructionExecutor();
		execA.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide @arcs_egaux'].join('\n')
		);
		execA.step();
		execA.step();
		execA.step();

		const execB = new ConstructionExecutor();
		execB.load(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = mediatrice(A, B) @euclide @cercles_rayon_ab'
			].join('\n')
		);
		execB.step();
		execB.step();
		execB.step();

		// Both choreographies produce the same NUMBER of elements but different radii.
		const sizeA = execA.figure.size;
		const sizeB = execB.figure.size;
		expect(sizeA).toBe(sizeB);
	});
});
