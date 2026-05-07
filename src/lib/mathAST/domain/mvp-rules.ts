/**
 * Pedagogical Domain — V1 MVP Rule Sets
 *
 * Single source of truth for which `DomainRule` are recordable by the V1
 * MVP pedagogical pipeline. Two distinct sets are exposed because:
 *
 * - `V1_MVP_FUNCTION_CONSTRAINT_RULES` is consumed by `domain/compute.ts`
 *   to gate which function constraints emit a step (sqrt, ln, log,
 *   arcsin, arccos). Used at the call site of `getConstraintRuleForFunction`.
 *
 * - `V1_MVP_RULES` is consumed by `pedagogical-domain/dispatch.ts` to
 *   detect a trace that contains an out-of-MVP rule and refuse with
 *   `PedagogicalDomainNotImplemented`. It is a superset that includes
 *   `intersection`, `universal`, `empty` (rules emitted at top-level by
 *   `computeDomain` when composing constraints).
 *
 * This file lives in `domain/` (not `pedagogical-domain/`) because
 * `domain/compute.ts` cannot import from `pedagogical-domain/` (the
 * dependency direction is the other way around).
 *
 * **Sync invariant**: `V1_MVP_FUNCTION_CONSTRAINT_RULES ⊂ V1_MVP_RULES`.
 * Adding a function constraint rule (e.g. `tan_constraint` in V1.1)
 * means adding it to BOTH sets here, then teaching `compute.ts` to emit
 * it at the right call site.
 *
 * @module mathAST/domain/mvp-rules
 */

import type { DomainRule } from './enhanced-step-types';

/**
 * Function constraint rules emitted by the V1 MVP recorder via
 * `getConstraintRuleForFunction(node.name)` in `compute.ts`.
 *
 * V1.1 extends this with the 4 trig functions (tan/cot/sec/csc) and the
 * 2 hyperbolic-inverse functions (arccosh/arctanh, sup-only — refused at
 * lycée by the dispatcher).
 */
export const V1_MVP_FUNCTION_CONSTRAINT_RULES: ReadonlySet<DomainRule> = new Set<DomainRule>([
	'sqrt_constraint',
	'ln_constraint',
	'log_constraint',
	'arcsin_constraint',
	'arccos_constraint',
	// V1.1
	'tan_constraint',
	'cot_constraint',
	'sec_constraint',
	'csc_constraint',
	'arccosh_constraint',
	'arctanh_constraint'
]);

/**
 * Rules that are out of syllabus at lycée and must be refused by the
 * dispatcher when `schoolLevel === 'lycee'`. Programs cover hyperbolic
 * inverses only at the post-bac level.
 */
export const LYCEE_FORBIDDEN_RULES: ReadonlySet<DomainRule> = new Set<DomainRule>([
	'arccosh_constraint',
	'arctanh_constraint'
]);

/**
 * The full V1 MVP rule set: function constraints + division + composition
 * primitives emitted at top-level by `computeDomain` + the V1.1 power
 * rules emitted by `computePowerDomain`.
 *
 * `division_constraint`, `power_constraint`, `even_root_constraint` are
 * NOT in `V1_MVP_FUNCTION_CONSTRAINT_RULES` because they are emitted at
 * non-`getConstraintRuleForFunction` sites (denominator of a division,
 * negative or fractional power exponent).
 */
export const V1_MVP_RULES: ReadonlySet<DomainRule> = new Set<DomainRule>([
	...V1_MVP_FUNCTION_CONSTRAINT_RULES,
	'division_constraint',
	'power_constraint',
	'even_root_constraint',
	'intersection',
	'universal',
	'empty'
]);
