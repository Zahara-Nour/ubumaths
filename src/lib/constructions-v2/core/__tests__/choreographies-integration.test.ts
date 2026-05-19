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

describe('ConstructionExecutor — choreography stubs (Phase 4 deferred)', () => {
	// Concrete choreography animations (arcs, ruler, sequential sub-steps) are
	// deferred to a follow-up session. The current voies are NOT_YET_IMPLEMENTED
	// stubs that return empty steps + the principal element only — so a
	// `@euclide` step produces the same figure as a plain `@direct` step.
	// Decorator parsing, resolution, registry lookup, and voie selection
	// (Phases 1-3) are all live and tested in `choreographies-resolve.test.ts`
	// and the "decorator wiring" block above.

	it('mediatrice @euclide currently produces the same elements as undecorated', () => {
		const execDirect = new ConstructionExecutor();
		execDirect.load(['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B)'].join('\n'));
		execDirect.step();
		execDirect.step();
		execDirect.step();
		const sizeDirect = execDirect.figure.size;

		const execEuclide = new ConstructionExecutor();
		execEuclide.load(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = mediatrice(A, B) @euclide'].join('\n')
		);
		execEuclide.step();
		execEuclide.step();
		execEuclide.step();
		const sizeEuclide = execEuclide.figure.size;

		// Same element count : the stub choreography adds nothing.
		expect(sizeEuclide).toBe(sizeDirect);
	});
});
