/**
 * Pedagogical Domain — Type isolation tests.
 *
 * Smoke tests that the public types compile and behave as documented at the
 * type level. Real behaviour is tested in renderer.test.ts and
 * compute-instrumented.test.ts.
 */

import { describe, expect, it } from 'vitest';
import { PedagogicalDomainNotImplemented, STRATEGIES_DOMAIN, V1_MVP_RULES } from '../types';
import type {
	DomainGenerationStrategy,
	PedagogicalDomainOptions,
	PedagogicalDomainResult,
	PedagogicalDomainSchoolLevel
} from '../types';

describe('PedagogicalDomainSchoolLevel', () => {
	it('excludes primaire and college', () => {
		// @ts-expect-error - primaire is not assignable
		const _p: PedagogicalDomainSchoolLevel = 'primaire';
		// @ts-expect-error - college is not assignable
		const _c: PedagogicalDomainSchoolLevel = 'college';
		const _l: PedagogicalDomainSchoolLevel = 'lycee';
		const _s: PedagogicalDomainSchoolLevel = 'superieur';
		expect(_l).toBe('lycee');
		expect(_s).toBe('superieur');
	});
});

describe('STRATEGIES_DOMAIN', () => {
	it('exposes lycee and superieur strategies', () => {
		const lycee: DomainGenerationStrategy = STRATEGIES_DOMAIN.lycee;
		const sup: DomainGenerationStrategy = STRATEGIES_DOMAIN.superieur;
		expect(lycee.vocab).toBe('didactic');
		expect(lycee.verbosityCompactConclusion).toBe(false);
		expect(sup.vocab).toBe('compact');
		expect(sup.verbosityCompactConclusion).toBe(true);
	});

	it('does not expose primaire/college keys', () => {
		// @ts-expect-error - primaire is not in the strategy table
		const _p = STRATEGIES_DOMAIN.primaire;
		// @ts-expect-error - college is not in the strategy table
		const _c = STRATEGIES_DOMAIN.college;
		expect(_p).toBeUndefined();
		expect(_c).toBeUndefined();
	});
});

describe('V1_MVP_RULES', () => {
	it('includes the 5 MVP constraint rules + intersection + universal/empty', () => {
		expect(V1_MVP_RULES.has('sqrt_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('ln_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('log_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('division_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('arcsin_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('arccos_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('intersection')).toBe(true);
		expect(V1_MVP_RULES.has('universal')).toBe(true);
		expect(V1_MVP_RULES.has('empty')).toBe(true);
	});

	it('includes V1.1.a rules (trig, hyperbolic inverses, power)', () => {
		expect(V1_MVP_RULES.has('tan_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('cot_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('sec_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('csc_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('arccosh_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('arctanh_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('power_constraint')).toBe(true);
		expect(V1_MVP_RULES.has('even_root_constraint')).toBe(true);
	});

	it('still excludes V1.1.b rules (preimage, composition, set ops)', () => {
		expect(V1_MVP_RULES.has('preimage_quadratic')).toBe(false);
		expect(V1_MVP_RULES.has('preimage_cubic')).toBe(false);
		expect(V1_MVP_RULES.has('composition')).toBe(false);
		expect(V1_MVP_RULES.has('union')).toBe(false);
		expect(V1_MVP_RULES.has('complement')).toBe(false);
		expect(V1_MVP_RULES.has('difference')).toBe(false);
		expect(V1_MVP_RULES.has('periodic_exclusion')).toBe(false);
	});
});

describe('PedagogicalDomainNotImplemented', () => {
	it('carries expression and reason', () => {
		const expr = { type: 'number', value: '0' } as const;
		const err = new PedagogicalDomainNotImplemented(expr, 'tan_constraint not in V1 MVP');
		expect(err.name).toBe('PedagogicalDomainNotImplemented');
		expect(err.expression).toBe(expr);
		expect(err.reason).toBe('tan_constraint not in V1 MVP');
		expect(err.message).toContain('tan_constraint not in V1 MVP');
	});

	it('omits reason when undefined', () => {
		const expr = { type: 'number', value: '0' } as const;
		const err = new PedagogicalDomainNotImplemented(expr);
		expect(err.reason).toBeUndefined();
		expect(err.message).toBe('Pedagogical domain not implemented');
	});
});

describe('PedagogicalDomainOptions / Result shape (compile-only)', () => {
	it('accepts a minimal options shape', () => {
		const opts: PedagogicalDomainOptions = { schoolLevel: 'lycee' };
		expect(opts.schoolLevel).toBe('lycee');
	});

	it('accepts a full options shape', () => {
		const opts: PedagogicalDomainOptions = {
			schoolLevel: 'superieur',
			variable: 'y',
			verbosity: 'detailed',
			timeoutMs: 1000
		};
		expect(opts.variable).toBe('y');
	});

	it('Result shape is consumable as a tuple of fields', () => {
		const stub: PedagogicalDomainResult = {
			steps: [],
			domain: { kind: 'universal' },
			variable: 'x'
		};
		expect(stub.steps).toHaveLength(0);
		expect(stub.domain.kind).toBe('universal');
	});
});
