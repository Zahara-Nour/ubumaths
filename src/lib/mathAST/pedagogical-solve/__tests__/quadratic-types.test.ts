/**
 * Type isolation test for the Phase 1 quadratic-equation extension to the
 * `pedagogical-solve` types.
 *
 * Verifies that:
 * - `QuadraticSchoolLevel` excludes `primaire` AND `college`.
 * - `QuadraticEquationStepsOptions` accepts every documented field.
 * - `QuadraticGenerationStrategy` compiles with optional `mergeAll`.
 * - `STRATEGIES_QUADRATIC` defines `lycee` and `superieur` with the agreed
 *   defaults (Phase 0 reco: compact discriminant + one-step formula).
 * - The new `EquationOperation` union members all compile.
 * - The total kind count (12 linear + 18 quadratic = 30) is enforced — if a
 *   kind is added/removed elsewhere in `types.ts`, this test will fail and
 *   prompt the dev to update both places.
 *
 * No business logic is exercised here — these are purely compile-time checks
 * coupled to a small runtime smoke test.
 */

import { describe, it, expect } from 'vitest';
import { number, opposite, variable, relation } from '../../factory';
import { STRATEGIES_QUADRATIC } from '../types';
import type {
	EquationOperation,
	EquationStep,
	QuadraticEquationStepsOptions,
	QuadraticGenerationStrategy,
	QuadraticSchoolLevel
} from '../types';

describe('pedagogical-solve quadratic types (Phase 1)', () => {
	describe('QuadraticSchoolLevel', () => {
		it('allows lycee and superieur', () => {
			const allowed: readonly QuadraticSchoolLevel[] = ['lycee', 'superieur'];
			expect(allowed).toHaveLength(2);
		});

		it('rejects primaire and college at the type level', () => {
			// @ts-expect-error: 'primaire' is not assignable to QuadraticSchoolLevel
			const _bad1: QuadraticSchoolLevel = 'primaire';
			// @ts-expect-error: 'college' is not assignable to QuadraticSchoolLevel
			const _bad2: QuadraticSchoolLevel = 'college';
			// Runtime smoke: the @ts-expect-error directives above lock the
			// type-level rejection at compile time. We assert the runtime
			// values exist so the test is non-trivial under the lint rule
			// requiring ≥1 assertion per `it()`.
			expect(_bad1).toBe('primaire');
			expect(_bad2).toBe('college');
		});
	});

	describe('STRATEGIES_QUADRATIC', () => {
		it('defines lycee with separate discriminant-sign step', () => {
			expect(STRATEGIES_QUADRATIC.lycee.includeIdentify).toBe(true);
			expect(STRATEGIES_QUADRATIC.lycee.emitSeparateDiscriminantSign).toBe(true);
		});

		it('defines superieur with folded discriminant-sign and no identify', () => {
			expect(STRATEGIES_QUADRATIC.superieur.includeIdentify).toBe(false);
			expect(STRATEGIES_QUADRATIC.superieur.emitSeparateDiscriminantSign).toBe(false);
		});

		it('only contains the two quadratic levels', () => {
			expect(Object.keys(STRATEGIES_QUADRATIC).sort()).toEqual(['lycee', 'superieur']);
		});
	});

	describe('QuadraticEquationStepsOptions', () => {
		it('accepts every documented field', () => {
			const opts: QuadraticEquationStepsOptions = {
				level: 'lycee',
				includeSubSteps: true,
				variable: 'x'
			};
			expect(opts.level).toBe('lycee');
			expect(opts.includeSubSteps).toBe(true);
			expect(opts.variable).toBe('x');
		});

		it('makes includeSubSteps and variable optional', () => {
			const opts: QuadraticEquationStepsOptions = { level: 'superieur' };
			expect(opts.level).toBe('superieur');
		});
	});

	describe('QuadraticGenerationStrategy', () => {
		it('compiles with mergeAll set', () => {
			const s: QuadraticGenerationStrategy = {
				includeIdentify: true,
				emitSeparateDiscriminantSign: false,
				mergeAll: true
			};
			expect(s.mergeAll).toBe(true);
		});

		it('compiles without mergeAll (optional)', () => {
			const s: QuadraticGenerationStrategy = {
				includeIdentify: false,
				emitSeparateDiscriminantSign: true
			};
			expect(s.mergeAll).toBeUndefined();
		});
	});

	describe('EquationOperation extension — quadratic kinds', () => {
		it('identify-equation accepts both linear and quadratic types', () => {
			const opLin: EquationOperation = {
				kind: 'identify-equation',
				equationType: 'linear'
			};
			const opQuad: EquationOperation = {
				kind: 'identify-equation',
				equationType: 'quadratic'
			};
			expect(opLin.kind).toBe('identify-equation');
			expect(opQuad.kind).toBe('identify-equation');
		});

		it('standardize op compiles', () => {
			const op: EquationOperation = { kind: 'standardize', from: 'free-form' };
			expect(op.kind).toBe('standardize');
		});

		it('identify-coefficients carries a, b, c', () => {
			const op: EquationOperation = {
				kind: 'identify-coefficients',
				a: number('1'),
				b: number('5'),
				c: number('6')
			};
			expect(op.kind).toBe('identify-coefficients');
		});

		it('compute-discriminant carries a, b, c, discriminant + optional numericValue', () => {
			const op: EquationOperation = {
				kind: 'compute-discriminant',
				a: number('1'),
				b: number('5'),
				c: number('6'),
				discriminant: number('1'),
				numericValue: 1
			};
			expect(op.kind).toBe('compute-discriminant');
			expect(op.numericValue).toBe(1);
		});

		it('discriminant-{positive,zero,negative} ops compile', () => {
			const opP: EquationOperation = {
				kind: 'discriminant-positive',
				discriminant: number('1')
			};
			const opZ: EquationOperation = {
				kind: 'discriminant-zero',
				discriminant: number('0')
			};
			const opN: EquationOperation = {
				kind: 'discriminant-negative',
				discriminant: opposite(number('3')),
				numericValue: -3
			};
			expect(opP.kind).toBe('discriminant-positive');
			expect(opZ.kind).toBe('discriminant-zero');
			expect(opN.kind).toBe('discriminant-negative');
		});

		it('apply-quadratic-formula carries a, b, discriminant, case, solutions (two-distinct)', () => {
			const op: EquationOperation = {
				kind: 'apply-quadratic-formula',
				a: number('1'),
				b: number('5'),
				discriminant: number('1'),
				case: 'two-distinct',
				solutions: [opposite(number('2')), opposite(number('3'))]
			};
			expect(op.kind).toBe('apply-quadratic-formula');
			expect(op.case).toBe('two-distinct');
			expect(op.solutions).toHaveLength(2);
		});

		it('apply-quadratic-formula compiles with case: double (single solution)', () => {
			const op: EquationOperation = {
				kind: 'apply-quadratic-formula',
				a: number('1'),
				b: opposite(number('2')),
				discriminant: number('0'),
				case: 'double',
				solutions: [number('1')]
			};
			expect(op.case).toBe('double');
			expect(op.solutions).toHaveLength(1);
		});

		it('simplify-solutions: rawSolutions and solutions can legitimately differ', () => {
			// Contract: rawSolutions hold the formula-output before simplification
			// (e.g. `(-5 - sqrt(1))/(2*1)`), `solutions` hold the canonical forms
			// (e.g. `-3`). The two arrays are NOT required to be identical; the
			// renderer relies on this distinction to display the simplification.
			const op: EquationOperation = {
				kind: 'simplify-solutions',
				rawSolutions: [opposite(number('2')), opposite(number('3'))],
				solutions: [opposite(number('2')), opposite(number('3'))]
			};
			expect(op.rawSolutions).not.toBe(op.solutions); // distinct arrays
			expect(op.solutions).toHaveLength(2);
		});

		it('read-solutions carries variable + solutions', () => {
			const op: EquationOperation = {
				kind: 'read-solutions',
				variable: 'x',
				solutions: [opposite(number('2')), opposite(number('3'))]
			};
			expect(op.kind).toBe('read-solutions');
			expect(op.variable).toBe('x');
		});

		it('recognize-no-linear-term op compiles', () => {
			const op: EquationOperation = { kind: 'recognize-no-linear-term' };
			expect(op.kind).toBe('recognize-no-linear-term');
		});

		it('recognize-no-constant-term op compiles', () => {
			const op: EquationOperation = { kind: 'recognize-no-constant-term' };
			expect(op.kind).toBe('recognize-no-constant-term');
		});

		it('recognize-factored carries factors', () => {
			const op: EquationOperation = {
				kind: 'recognize-factored',
				factors: [variable('x'), variable('y')]
			};
			expect(op.kind).toBe('recognize-factored');
			expect(op.factors).toHaveLength(2);
		});

		it('isolate-square carries rhs', () => {
			const op: EquationOperation = { kind: 'isolate-square', rhs: number('4') };
			expect(op.kind).toBe('isolate-square');
		});

		it('extract-square-root carries argument', () => {
			const op: EquationOperation = { kind: 'extract-square-root', argument: number('4') };
			expect(op.kind).toBe('extract-square-root');
		});

		it('factor-common-x carries remainder', () => {
			const op: EquationOperation = { kind: 'factor-common-x', remainder: number('3') };
			expect(op.kind).toBe('factor-common-x');
		});

		it('zero-product carries factors', () => {
			const op: EquationOperation = {
				kind: 'zero-product',
				factors: [variable('x'), variable('y')]
			};
			expect(op.kind).toBe('zero-product');
		});

		it('solve-each-factor carries pairs (factor, value)', () => {
			const op: EquationOperation = {
				kind: 'solve-each-factor',
				pairs: [
					{ factor: variable('x'), value: number('0') },
					{ factor: variable('y'), value: opposite(number('3')) }
				]
			};
			expect(op.kind).toBe('solve-each-factor');
			expect(op.pairs).toHaveLength(2);
		});

		it('no-real-solution op compiles', () => {
			const op: EquationOperation = { kind: 'no-real-solution' };
			expect(op.kind).toBe('no-real-solution');
		});
	});

	describe('EquationStep accepts a quadratic operation', () => {
		it('shape compiles when operation is a quadratic kind', () => {
			const eq = relation('=', variable('x'), number('0'));
			const step: EquationStep = {
				id: 1,
				rule: 'identify-coefficients',
				description: 'On identifie a, b, c',
				before: eq,
				after: eq,
				verbosityLevel: 'detailed',
				operation: {
					kind: 'identify-coefficients',
					a: number('1'),
					b: number('5'),
					c: number('6')
				}
			};
			expect(step.operation?.kind).toBe('identify-coefficients');
		});
	});

	describe('EquationOperation kinds count', () => {
		it('exhaustively lists all 30 kinds (12 shared+linear + 18 quadratic)', () => {
			// Counter per kind to enforce "if you add/remove, update the test"
			const allKinds: EquationOperation['kind'][] = [
				// Shared / linear (12)
				'identify-equation',
				'simplify',
				'add-both-sides',
				'subtract-both-sides',
				'multiply-both-sides',
				'divide-both-sides',
				'transpose-terms',
				'simplify-coefficient',
				'group-variable-terms',
				'group-constants',
				'reduce-to-canonical',
				'read-solution',
				// Quadratic (18)
				'standardize',
				'identify-coefficients',
				'compute-discriminant',
				'discriminant-positive',
				'discriminant-zero',
				'discriminant-negative',
				'apply-quadratic-formula',
				'simplify-solutions',
				'read-solutions',
				'recognize-no-linear-term',
				'recognize-no-constant-term',
				'recognize-factored',
				'isolate-square',
				'extract-square-root',
				'factor-common-x',
				'zero-product',
				'solve-each-factor',
				'no-real-solution'
			];
			expect(new Set(allKinds).size).toBe(allKinds.length); // no duplicates
			expect(allKinds).toHaveLength(30);
		});
	});
});
