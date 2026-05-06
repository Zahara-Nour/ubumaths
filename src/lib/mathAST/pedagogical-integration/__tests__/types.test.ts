/**
 * Type isolation test for pedagogical-integration types.
 *
 * Verifies that:
 * - The `PedagogicalIntegrationStep` is compatible with `BaseStep` and is
 *   accepted by `GenericTechnicalRenderer`.
 * - The `PedagogicalIntegrationStep` accepts `subSteps` and `definite` fields.
 * - The `PedagogicalIntegrationResult` produces a usable shape with all
 *   optional fields populated.
 * - The `PedagogicalIntegrationOptions` accepts every documented field.
 * - The rule union exhaustively covers every known rule (compile-time
 *   exhaustive switch via the `allRules` literal array).
 * - `STRATEGIES_INTEGRATION` has the correct shape — particularly
 *   `enablePartsSimple: true` at lycée per Tle spé maths programme.
 * - `IntegrationSchoolLevel` correctly excludes `primaire` and `college`.
 * - `PedagogicalIntegrationNotImplemented` carries the integrand and reason.
 *
 * No business logic is exercised here — these are purely compile-time checks
 * coupled to a small runtime smoke test.
 */

import { describe, expect, it } from 'vitest';
import { GenericTechnicalRenderer } from '../../common/technical-renderer';
import { number, variable, func } from '../../factory';
import { PedagogicalIntegrationNotImplemented, STRATEGIES_INTEGRATION } from '../types';
import type {
	IntegrationBindings,
	IntegrationSchoolLevel,
	PedagogicalIntegrationOptions,
	PedagogicalIntegrationResult,
	PedagogicalIntegrationRule,
	PedagogicalIntegrationStep
} from '../types';

describe('pedagogical-integration types', () => {
	it('PedagogicalIntegrationStep is renderable by GenericTechnicalRenderer', () => {
		const step: PedagogicalIntegrationStep = {
			id: 1,
			rule: 'apply-power-rule',
			description: 'Règle de la puissance',
			before: variable('x'),
			after: number('1'),
			variable: 'x',
			verbosityLevel: 'summarized',
			bindings: { base: variable('x'), n: number('2') }
		};

		const renderer = new GenericTechnicalRenderer<PedagogicalIntegrationStep>();
		const rendered = renderer.render(step, { verbosity: 'detailed' });

		expect(rendered.id).toBe(1);
		expect(rendered.rule).toBe('apply-power-rule');
		expect(rendered.title).toBe('Règle de la puissance');
		// GenericTechnicalRenderer uses `\Rightarrow` between before/after.
		expect(rendered.expressionLatex).toContain('Rightarrow');
	});

	it('PedagogicalIntegrationStep accepts subSteps for nested antiderivatives', () => {
		const inner: PedagogicalIntegrationStep = {
			id: 2,
			rule: 'apply-power-rule',
			description: 'Règle de la puissance',
			before: variable('x'),
			after: number('1'),
			variable: 'x',
			verbosityLevel: 'summarized',
			bindings: { base: variable('x'), n: number('1') }
		};
		const outer: PedagogicalIntegrationStep = {
			id: 1,
			rule: 'apply-linearity-sum',
			description: 'Linéarité de la somme',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			verbosityLevel: 'summarized',
			subSteps: [inner]
		};

		expect(outer.subSteps).toHaveLength(1);
		expect(outer.subSteps?.[0].rule).toBe('apply-power-rule');
	});

	it('PedagogicalIntegrationStep accepts definite-integral bounds', () => {
		const step: PedagogicalIntegrationStep = {
			id: 1,
			rule: 'apply-fundamental-theorem',
			description: 'Théorème fondamental',
			before: func('exp', [variable('x')]),
			after: func('exp', [variable('x')]),
			variable: 'x',
			verbosityLevel: 'summarized',
			definite: { lower: number('0'), upper: number('1') },
			bindings: { primitive: func('exp', [variable('x')]) }
		};

		expect(step.definite?.lower.type).toBe('number');
		expect(step.definite?.upper.type).toBe('number');
	});

	it('PedagogicalIntegrationResult shape is usable (indefinite)', () => {
		const result: PedagogicalIntegrationResult = {
			antiderivative: number('0'),
			steps: []
		};

		expect(result.antiderivative.type).toBe('number');
		expect(result.steps).toHaveLength(0);
		expect(result.value).toBeUndefined();
	});

	it('PedagogicalIntegrationResult shape is usable (definite)', () => {
		const result: PedagogicalIntegrationResult = {
			antiderivative: func('exp', [variable('x')]),
			value: number('1.718'),
			steps: []
		};

		expect(result.value?.type).toBe('number');
	});

	it('PedagogicalIntegrationOptions accepts every documented field', () => {
		const opts: PedagogicalIntegrationOptions = {
			level: 'lycee',
			variable: 'x',
			definite: { lower: number('0'), upper: number('1') },
			verbosity: 'detailed',
			maxRecursionDepth: 5,
			signal: new AbortController().signal,
			timeoutMs: 5000
		};

		expect(opts.level).toBe('lycee');
		expect(opts.variable).toBe('x');
		expect(opts.maxRecursionDepth).toBe(5);
	});

	it('PedagogicalIntegrationOptions accepts minimal shape (only level)', () => {
		const opts: PedagogicalIntegrationOptions = { level: 'superieur' };
		expect(opts.level).toBe('superieur');
		expect(opts.variable).toBeUndefined();
	});

	it('IntegrationBindings is a Record<string, MathNode>', () => {
		const bindings: IntegrationBindings = {
			u: variable('x'),
			du: number('1')
		};
		expect(bindings.u.type).toBe('variable');
		expect(bindings.du.type).toBe('number');
	});

	it('IntegrationSchoolLevel excludes primaire and college (compile-time check)', () => {
		const lycee: IntegrationSchoolLevel = 'lycee';
		const superieur: IntegrationSchoolLevel = 'superieur';
		expect(lycee).toBe('lycee');
		expect(superieur).toBe('superieur');

		// @ts-expect-error 'primaire' is excluded from IntegrationSchoolLevel
		const _primaire: IntegrationSchoolLevel = 'primaire';
		// @ts-expect-error 'college' is excluded from IntegrationSchoolLevel
		const _college: IntegrationSchoolLevel = 'college';
		expect(_primaire).toBe('primaire');
		expect(_college).toBe('college');
	});

	it('STRATEGIES_INTEGRATION has correct shape for both levels', () => {
		expect(STRATEGIES_INTEGRATION.lycee).toEqual({
			includeAddConstant: true,
			includeIdentify: true,
			formatBoundsExplicit: true,
			enablePartsSimple: true, // Q3 user override: IPP enabled in lycée per Tle spé programme
			enableUSubstitution: false,
			enableComposite: true
		});

		expect(STRATEGIES_INTEGRATION.superieur).toEqual({
			includeAddConstant: false,
			includeIdentify: false,
			formatBoundsExplicit: false,
			enablePartsSimple: true,
			enableUSubstitution: true,
			enableComposite: true
		});
	});

	it('PedagogicalIntegrationNotImplemented carries integrand and reason', () => {
		const integrand = func('sin', [variable('x')]);
		const err = new PedagogicalIntegrationNotImplemented(integrand, 'Cyclic IPP');

		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('PedagogicalIntegrationNotImplemented');
		expect(err.integrand).toBe(integrand);
		expect(err.reason).toBe('Cyclic IPP');
		expect(err.message).toContain('Cyclic IPP');
	});

	it('PedagogicalIntegrationNotImplemented works without reason', () => {
		const integrand = number('0');
		const err = new PedagogicalIntegrationNotImplemented(integrand);

		expect(err.reason).toBeUndefined();
		expect(err.message).toBe('Pedagogical integration not implemented');
	});

	it('PedagogicalIntegrationNotImplemented preserves prototype across throw/catch', () => {
		const integrand = number('0');
		const err = new PedagogicalIntegrationNotImplemented(integrand, 'oops');

		// Guards against transpiler-target / extends-Error prototype-chain
		// regressions. Catching by class must still work.
		expect(() => {
			throw err;
		}).toThrow(PedagogicalIntegrationNotImplemented);

		try {
			throw err;
		} catch (caught) {
			expect(caught).toBeInstanceOf(PedagogicalIntegrationNotImplemented);
			expect(caught).toBeInstanceOf(Error);
		}
	});

	it('rule union compiles exhaustively for every known rule name', () => {
		const allRules = [
			// Identification
			'identify-integrand',
			'identify-definite-integral',
			// Direct primitives
			'apply-power-rule',
			'apply-constant-rule',
			'apply-known-primitive',
			// Linearity
			'apply-linearity-sum',
			'extract-constant',
			// Composite forms
			'apply-composite-power',
			'apply-composite-ln',
			'apply-composite-exp',
			'apply-composite-sin',
			'apply-composite-cos',
			// Definite integral
			'apply-fundamental-theorem',
			'substitute-bounds',
			'simplify-bounds-result',
			// u-substitution
			'identify-substitution',
			'compute-du',
			'apply-substitution',
			'substitute-back',
			// Integration by parts
			'identify-parts',
			'choose-u-dv',
			'apply-parts-formula',
			// Final
			'add-constant',
			'simplify-result'
		] as const satisfies readonly PedagogicalIntegrationRule[];

		// Count sentinel — matches the union cardinality. Useful as a quick
		// human-readable check ; the real exhaustiveness guarantee is the
		// `_MissingFromAllRules` compile-time check below.
		expect(allRules).toHaveLength(24);

		// Compile-time exhaustiveness check : if any rule of
		// `PedagogicalIntegrationRule` is not in `allRules`, the type
		// `_MissingFromAllRules` becomes a non-never union, the conditional
		// resolves to `false`, and the assignment of `true` fails to compile.
		// The runtime expect() merely sanity-checks the constant.
		type _MissingFromAllRules = Exclude<PedagogicalIntegrationRule, (typeof allRules)[number]>;
		const _exhaustive: _MissingFromAllRules extends never ? true : false = true;
		expect(_exhaustive).toBe(true);
	});
});
