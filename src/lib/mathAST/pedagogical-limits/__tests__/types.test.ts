/**
 * Type isolation test for pedagogical-limits types.
 *
 * Verifies that:
 * - The `PedagogicalLimitStep` is compatible with `BaseStep` and is accepted
 *   by `GenericTechnicalRenderer`.
 * - The `PedagogicalLimitStep` accepts `subSteps`, `bindings`,
 *   `indeterminateForm`, `direction`, and `approach` (with `InfinityNode`).
 * - The `PedagogicalLimitResult` produces a usable shape covering the three
 *   terminal `PedagogicalLimitStatus` values (`'exact'` / `'infinite'` /
 *   `'does-not-exist'`).
 * - `PedagogicalLimitStatus` excludes `'indeterminate'` and `'unsupported'`
 *   from `LimitStatus` (compile-time check).
 * - The `PedagogicalLimitOptions` accepts every documented field.
 * - The rule union exhaustively covers every known rule (compile-time
 *   exhaustive check via the `_MissingFromAllRules` type).
 * - `STRATEGIES_LIMITS` has the correct shape — particularly
 *   `enableLhopital: false` at lycée (out of syllabus) and
 *   `squeezeVocab: 'gendarmes'` at lycée vs `'squeeze'` at supérieur.
 * - `LimitsSchoolLevel` correctly excludes `primaire` and `college`.
 * - `PedagogicalLimitNotImplemented` carries the expression and reason.
 *
 * No business logic is exercised here — these are purely compile-time checks
 * coupled to a small runtime smoke test.
 */

import { describe, expect, it } from 'vitest';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import { infinity, number, variable } from '../../factory';
import { PedagogicalLimitNotImplemented, STRATEGIES_LIMITS } from '../types';
import type {
	LimitBindings,
	LimitsSchoolLevel,
	PedagogicalLimitOptions,
	PedagogicalLimitResult,
	PedagogicalLimitRule,
	PedagogicalLimitStatus,
	PedagogicalLimitStep
} from '../types';

describe('pedagogical-limits types', () => {
	it('PedagogicalLimitStep is renderable by GenericTechnicalRenderer', () => {
		const step: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: 'Substitution directe',
			before: variable('x'),
			after: number('2'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'summarized',
			bindings: { a: number('2') }
		};

		const renderer = new GenericTechnicalRenderer<PedagogicalLimitStep>();
		const rendered = renderer.render(step, { verbosity: 'detailed' });

		expect(rendered.id).toBe(1);
		expect(rendered.rule).toBe('apply-direct-substitution');
		expect(rendered.title).toBe('Substitution directe');
		expect(rendered.expressionLatex).toContain('Rightarrow');
	});

	it('PedagogicalLimitStep accepts subSteps for nested factorisation', () => {
		const factorNum: PedagogicalLimitStep = {
			id: 2,
			rule: 'factor-numerator',
			description: 'Factorisation du numérateur',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'detailed'
		};
		const factorDen: PedagogicalLimitStep = {
			id: 3,
			rule: 'factor-denominator',
			description: 'Factorisation du dénominateur',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'detailed'
		};
		const parent: PedagogicalLimitStep = {
			id: 1,
			rule: 'simplify-common-factor',
			description: 'Simplification du facteur commun',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'summarized',
			subSteps: [factorNum, factorDen]
		};

		expect(parent.subSteps).toHaveLength(2);
		expect(parent.subSteps?.[0].rule).toBe('factor-numerator');
		expect(parent.subSteps?.[1].rule).toBe('factor-denominator');
	});

	it('PedagogicalLimitStep accepts InfinityNode as approach point', () => {
		const step: PedagogicalLimitStep = {
			id: 1,
			rule: 'identify-dominant-term',
			description: 'Terme dominant identifié',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: infinity('positive'),
			direction: 'both',
			verbosityLevel: 'summarized',
			bindings: { dominant: variable('x') }
		};

		expect(step.approach.type).toBe('infinity');
	});

	it('PedagogicalLimitStep accepts indeterminateForm decoration', () => {
		const step: PedagogicalLimitStep = {
			id: 1,
			rule: 'detect-indeterminate-form',
			description: 'Forme 0/0 reconnue',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'detailed',
			indeterminateForm: '0/0'
		};

		expect(step.indeterminateForm).toBe('0/0');
	});

	it('PedagogicalLimitStep accepts globalBefore / globalAfter context', () => {
		const step: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: 'Substitution directe',
			before: variable('x'),
			after: number('2'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'summarized',
			globalBefore: variable('x'),
			globalAfter: number('2')
		};

		expect(step.globalBefore?.type).toBe('variable');
		expect(step.globalAfter?.type).toBe('number');
	});

	it('PedagogicalLimitStep accepts left/right direction', () => {
		const left: PedagogicalLimitStep = {
			id: 1,
			rule: 'analyze-left-limit',
			description: 'Étude à gauche',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('0'),
			direction: 'left',
			verbosityLevel: 'detailed'
		};
		const right: PedagogicalLimitStep = {
			id: 2,
			rule: 'analyze-right-limit',
			description: 'Étude à droite',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('0'),
			direction: 'right',
			verbosityLevel: 'detailed'
		};

		expect(left.direction).toBe('left');
		expect(right.direction).toBe('right');
	});

	it('PedagogicalLimitResult covers status: exact', () => {
		const result: PedagogicalLimitResult = {
			steps: [],
			value: number('4'),
			status: 'exact',
			indeterminateForm: 'none',
			variable: 'x',
			approach: number('2'),
			direction: 'both'
		};

		expect(result.status).toBe('exact');
		expect(result.value?.type).toBe('number');
	});

	it('PedagogicalLimitResult covers status: infinite', () => {
		const result: PedagogicalLimitResult = {
			steps: [],
			value: infinity('positive'),
			status: 'infinite',
			indeterminateForm: 'none',
			variable: 'x',
			approach: number('0'),
			direction: 'right'
		};

		expect(result.status).toBe('infinite');
		expect(result.value?.type).toBe('infinity');
	});

	it('PedagogicalLimitResult covers status: does-not-exist with null value', () => {
		const result: PedagogicalLimitResult = {
			steps: [],
			value: null,
			status: 'does-not-exist',
			indeterminateForm: 'none',
			variable: 'x',
			approach: number('0'),
			direction: 'both'
		};

		expect(result.status).toBe('does-not-exist');
		expect(result.value).toBeNull();
	});

	it('PedagogicalLimitStatus excludes indeterminate and unsupported (compile-time)', () => {
		// Positive: the three terminal statuses are accepted.
		const exact: PedagogicalLimitStatus = 'exact';
		const infinite: PedagogicalLimitStatus = 'infinite';
		const dne: PedagogicalLimitStatus = 'does-not-exist';

		expect(exact).toBe('exact');
		expect(infinite).toBe('infinite');
		expect(dne).toBe('does-not-exist');

		// Negative: 'indeterminate' (mid-flight) and 'unsupported' (replaced by
		// throw NotImplemented) are not assignable.
		// @ts-expect-error 'indeterminate' is excluded from PedagogicalLimitStatus
		const _indet: PedagogicalLimitStatus = 'indeterminate';
		// @ts-expect-error 'unsupported' is excluded from PedagogicalLimitStatus
		const _unsup: PedagogicalLimitStatus = 'unsupported';
		expect(_indet).toBe('indeterminate');
		expect(_unsup).toBe('unsupported');
	});

	it('PedagogicalLimitOptions accepts every documented field', () => {
		const opts: PedagogicalLimitOptions = {
			variable: 'x',
			approach: infinity('positive'),
			direction: 'both',
			schoolLevel: 'lycee',
			verbosity: 'detailed',
			signal: new AbortController().signal,
			timeoutMs: 5000
		};

		expect(opts.variable).toBe('x');
		expect(opts.schoolLevel).toBe('lycee');
		expect(opts.timeoutMs).toBe(5000);
	});

	it('PedagogicalLimitOptions accepts minimal shape', () => {
		const opts: PedagogicalLimitOptions = {
			variable: 'x',
			approach: number('0'),
			schoolLevel: 'superieur'
		};

		expect(opts.direction).toBeUndefined();
		expect(opts.verbosity).toBeUndefined();
	});

	it('LimitBindings is a Record<string, MathNode>', () => {
		const bindings: LimitBindings = {
			dominant: variable('x'),
			a: number('2'),
			conjugate: variable('x')
		};

		expect(bindings.dominant.type).toBe('variable');
		expect(bindings.a.type).toBe('number');
	});

	it('LimitsSchoolLevel excludes primaire and college (compile-time check)', () => {
		const lycee: LimitsSchoolLevel = 'lycee';
		const superieur: LimitsSchoolLevel = 'superieur';

		expect(lycee).toBe('lycee');
		expect(superieur).toBe('superieur');

		// @ts-expect-error 'primaire' is excluded from LimitsSchoolLevel
		const _primaire: LimitsSchoolLevel = 'primaire';
		// @ts-expect-error 'college' is excluded from LimitsSchoolLevel
		const _college: LimitsSchoolLevel = 'college';
		expect(_primaire).toBe('primaire');
		expect(_college).toBe('college');
	});

	it('STRATEGIES_LIMITS has correct shape for both levels', () => {
		expect(STRATEGIES_LIMITS.lycee).toEqual({
			enableLhopital: false, // L'Hôpital out of lycée syllabus
			enableFactorization: true,
			enableRationalization: true,
			enableInfinityAnalysis: true,
			enableSqueeze: true,
			enableComposition: true,
			squeezeVocab: 'gendarmes',
			includeIdentify: true,
			verbosityCompactConclusion: false
		});

		expect(STRATEGIES_LIMITS.superieur).toEqual({
			enableLhopital: true,
			enableFactorization: true,
			enableRationalization: true,
			enableInfinityAnalysis: true,
			enableSqueeze: true,
			enableComposition: true,
			squeezeVocab: 'squeeze',
			includeIdentify: false,
			verbosityCompactConclusion: true
		});
	});

	it('PedagogicalLimitNotImplemented carries expression and reason', () => {
		const expr = variable('x');
		const err = new PedagogicalLimitNotImplemented(expr, "L'Hôpital required at lycée");

		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('PedagogicalLimitNotImplemented');
		expect(err.expression).toBe(expr);
		expect(err.reason).toBe("L'Hôpital required at lycée");
		expect(err.message).toContain("L'Hôpital required at lycée");
	});

	it('PedagogicalLimitNotImplemented works without reason', () => {
		const expr = number('0');
		const err = new PedagogicalLimitNotImplemented(expr);

		expect(err.reason).toBeUndefined();
		expect(err.message).toBe('Pedagogical limit not implemented');
	});

	it('PedagogicalLimitNotImplemented preserves prototype across throw/catch', () => {
		const expr = number('0');
		const err = new PedagogicalLimitNotImplemented(expr, 'oops');

		// Guards against transpiler-target / extends-Error prototype-chain
		// regressions. Catching by class must still work.
		expect(() => {
			throw err;
		}).toThrow(PedagogicalLimitNotImplemented);

		try {
			throw err;
		} catch (caught) {
			expect(caught).toBeInstanceOf(PedagogicalLimitNotImplemented);
			expect(caught).toBeInstanceOf(Error);
		}
	});

	it('rule union compiles exhaustively for every known rule name', () => {
		const allRules = [
			// Identification
			'identify-limit',
			'detect-indeterminate-form',
			// Direct techniques
			'apply-direct-substitution',
			'apply-known-limit',
			'algebraic-simplification',
			'abs-simplification',
			// Factorisation
			'factor-numerator',
			'factor-denominator',
			'simplify-common-factor',
			// Rationalisation
			'multiply-by-conjugate',
			'simplify-after-rationalization',
			// Comportement à l'infini
			'identify-dominant-term',
			'apply-growth-comparison',
			'compute-asymptotic-equivalent',
			// Limites unilatérales
			'analyze-left-limit',
			'analyze-right-limit',
			'compare-one-sided',
			// Squeeze / gendarmes
			'identify-bounds',
			'apply-squeeze',
			// L'Hôpital
			'apply-lhopital',
			// Composition / opérations
			'identify-composition',
			'apply-composition',
			'apply-linearity',
			'apply-product',
			'apply-quotient',
			// Conclusion
			'conclude',
			'conclude-does-not-exist',
			'conclude-infinite'
		] as const satisfies readonly PedagogicalLimitRule[];

		// Count sentinel — matches the union cardinality.
		expect(allRules).toHaveLength(28);

		// Compile-time exhaustiveness check.
		type _MissingFromAllRules = Exclude<PedagogicalLimitRule, (typeof allRules)[number]>;
		const _exhaustive: _MissingFromAllRules extends never ? true : false = true;
		expect(_exhaustive).toBe(true);
	});
});
