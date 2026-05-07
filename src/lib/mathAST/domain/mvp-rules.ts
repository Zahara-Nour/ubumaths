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
 * V1.1 will extend this with `tan_constraint`, `cot_constraint`,
 * `sec_constraint`, `csc_constraint`, `arccosh_constraint`,
 * `arctanh_constraint`, `power_constraint`, `even_root_constraint`.
 */
export const V1_MVP_FUNCTION_CONSTRAINT_RULES: ReadonlySet<DomainRule> = new Set<DomainRule>([
	'sqrt_constraint',
	'ln_constraint',
	'log_constraint',
	'arcsin_constraint',
	'arccos_constraint'
]);

/**
 * The full V1 MVP rule set: function constraints + division + composition
 * primitives emitted at top-level by `computeDomain`.
 *
 * `division_constraint` is emitted in `computeDivisionDomain` (not via
 * `getConstraintRuleForFunction`), so it is in this superset but NOT in
 * `V1_MVP_FUNCTION_CONSTRAINT_RULES`. Same for `intersection` (top-level
 * combinator) and the synthesized `universal`/`empty` cases.
 */
export const V1_MVP_RULES: ReadonlySet<DomainRule> = new Set<DomainRule>([
	...V1_MVP_FUNCTION_CONSTRAINT_RULES,
	'division_constraint',
	'intersection',
	'universal',
	'empty'
]);
