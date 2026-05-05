/**
 * Pedagogical Differentiation — Types
 *
 * Domain-specific types for the differentiation pedagogical pipeline. Distinct
 * from the algorithmic `differentiate()` orchestrator (which optimizes for
 * correctness and generality, not for paper-style reasoning).
 *
 * Design rationale (Option 2 — parallel pipeline) — see
 * `docs/wip/differentiation-stepper-prompt.md` :
 *
 * `differentiation/differentiate.ts` (algorithmic) is a recursive post-order
 * dispatcher: it descends into the tree, computes leaf derivatives, then
 * combines results upward via `rules.ts`. This produces correct derivatives but
 * the resulting step trace is post-order — backwards from how a teacher writes
 * on a board (pre-order: announce the rule first, then derive operands).
 *
 * This pipeline introduces:
 *
 * - A pre-order dispatcher: announces the rule (as a top-level step) BEFORE
 *   recursing into operands (which become subSteps).
 * - Bindings captured per rule (u, v, n, c, base, exp, …) so descriptions can
 *   reference structural identification ("Avec u = ... et v = ...").
 * - Pedagogical special cases prioritised over generic rules:
 *      `c · f` → `linear-coefficient` (factorise constant out)
 *      `f ± c` → `sum-with-constant` / `diff-with-constant` (skip `(c)' = 0`)
 *      `x^n` (n natural) → `power-natural`
 *      `1/f` → `inverse`        (avoid the verbose `quotientRule`)
 *      `1/x` → `derivative-of-inverse`
 *      `√x` → `derivative-of-sqrt`
 * - Skip silencieux of trivial sub-steps (`(c)' = 0`, `(x)' = 1`) when not at
 *   the top level of a derivation.
 * - Structural reuse of `differentiation/rules.ts` for the actual computation
 *   (productRule, sinRule, …) — we don't reimplement symbolic differentiation,
 *   we reorchestrate it.
 *
 * @module mathAST/pedagogical-differentiation/types
 */

import type { MathNode } from '../types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Rule Names
// =============================================================================

/**
 * Names of the pedagogical differentiation rules.
 *
 * The set is broader than `differentiation/rules.ts` exports because we
 * distinguish pedagogical special cases (e.g. `power-natural` vs the generic
 * `power-constant-exp`, or `linear-coefficient` vs the generic `product`).
 *
 * Discriminator on `step.rule`. Used by the renderer to look up titles and
 * explanations per school level.
 */
export type PedagogicalDifferentiationRule =
	// ---- Triviae (silently skipped when not top-level) ----
	| 'constant'
	| 'variable'
	| 'greek-letter'
	// ---- Linearity ----
	| 'sum'
	| 'difference'
	| 'negation'
	| 'linear-coefficient' // `c · f(x)` → `c · f'(x)`
	| 'sum-with-constant' // `f(x) ± c` (skips the constant)
	| 'diff-with-constant' // mirror form for difference
	// ---- Powers ----
	| 'power-natural' // `x^n` with n a natural integer ≥ 2
	| 'power-constant-exp' // `f(x)^c` with c constant (non-natural)
	| 'power-constant-base' // `c^f(x)` (generalised exponential)
	| 'general-power' // `f(x)^g(x)`
	// ---- Product / Quotient ----
	| 'product'
	| 'quotient'
	| 'inverse' // `1/f(x)` → `-f'(x)/f(x)²`
	| 'derivative-of-inverse' // `1/x` → `-1/x²`
	// ---- Trigonometric ----
	| 'sin'
	| 'cos'
	| 'tan'
	| 'arcsin'
	| 'arccos'
	| 'arctan'
	// ---- Exponential / Logarithm ----
	| 'exp'
	| 'ln'
	| 'log' // base != e
	// ---- Radical ----
	| 'sqrt'
	| 'derivative-of-sqrt' // `√x` simple → `1/(2√x)`
	// ---- Hyperbolic ----
	| 'sinh'
	| 'cosh'
	| 'tanh'
	| 'asinh'
	| 'acosh'
	| 'atanh';

/**
 * Convenience grouping — useful for filtering or shared description handling.
 */
export const TRIVIAL_RULES: ReadonlySet<PedagogicalDifferentiationRule> = new Set([
	'constant',
	'variable',
	'greek-letter'
]);

// =============================================================================
// Bindings
// =============================================================================

/**
 * Structural captures attached to a step.
 *
 * Per-rule expected keys (informal — runtime is `Record<string, MathNode>`):
 *
 * - `sum`, `difference`              : `{ f, g }`
 * - `negation`                       : `{ f }`
 * - `linear-coefficient`             : `{ c, f }`
 * - `sum-with-constant`              : `{ f, c }`
 * - `diff-with-constant`             : `{ f, c }` (where c may sit on either side)
 * - `power-natural`                  : `{ base, n }`
 * - `power-constant-exp`             : `{ base, exp }`
 * - `power-constant-base`            : `{ base, exp }`
 * - `general-power`                  : `{ base, exp }`
 * - `product`                        : `{ u, v }`
 * - `quotient`                       : `{ u, v }`
 * - `inverse`                        : `{ f }`
 * - `derivative-of-inverse`          : `{}`
 * - `sin/cos/tan/asin/acos/atan`     : `{ u }`
 * - `sinh/cosh/tanh/asinh/acosh/atanh` : `{ u }`
 * - `exp`, `ln`, `sqrt`              : `{ u }`
 * - `log`                            : `{ u, base }`
 * - `derivative-of-sqrt`             : `{}`
 * - `constant`                       : `{ value }`
 * - `variable`                       : `{ name }` (variable node)
 * - `greek-letter`                   : `{ letter }`
 *
 * Bindings are captured at the moment the dispatcher selects a rule, BEFORE
 * recursing into operands. They reflect the input expression, not the
 * derivative.
 */
export type DifferentiationBindings = Record<string, MathNode>;

// =============================================================================
// Step
// =============================================================================

/**
 * A step recorded during pedagogical differentiation.
 *
 * Extends `BaseStep` so it works with `GenericTechnicalRenderer` for free.
 * Adds bindings, global context, sub-steps and the differentiation variable.
 */
export interface PedagogicalDifferentiationStep extends BaseStep<PedagogicalDifferentiationRule> {
	/** The differentiation variable (`'x'`, `'y'`, `'t'`, …) */
	readonly variable: string;

	/** Structural captures (`u`, `v`, `n`, …) used by descriptions */
	readonly bindings?: DifferentiationBindings;

	/**
	 * The full expression BEFORE this rule fired (the whole top-level
	 * `f(x)` whose derivative is being explained). Optional: when undefined
	 * the renderer falls back to `before`.
	 */
	readonly globalBefore?: MathNode;

	/** Counterpart of `globalBefore` (the whole `f'(x)` so far). */
	readonly globalAfter?: MathNode;

	/**
	 * Optional finer-grained substeps (the sub-derivations triggered by the
	 * rule, e.g. derivatives of `u` and `v` under a product rule).
	 */
	readonly subSteps?: readonly PedagogicalDifferentiationStep[];
}

// =============================================================================
// Result
// =============================================================================

/**
 * Output of running the pedagogical differentiation pipeline.
 */
export interface PedagogicalDifferentiationResult {
	/** Symbolic derivative as produced by the underlying `rules.ts` calls */
	readonly derivative: MathNode;

	/** Recorded steps (top-level entries; subSteps live inside each entry) */
	readonly steps: readonly PedagogicalDifferentiationStep[];
}

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Options for `generatePedagogicalDifferentiationSteps()`.
 *
 * `variable` is required (no default 'x' to keep the API explicit and avoid
 * accidental wrong-variable derivations in pedagogical contexts).
 */
export interface PedagogicalDifferentiationOptions {
	/**
	 * Variable to differentiate with respect to (e.g. `'x'`, `'y'`, `'t'`,
	 * `'theta'`). Required.
	 */
	readonly variable: string;

	/**
	 * Target school level. Drives vocabulary and explanation depth.
	 *
	 * `primaire` and `college` are bumped to `lycee` by the renderer
	 * (differentiation is not on the syllabus before 1ère).
	 */
	readonly schoolLevel: SchoolLevel;

	/**
	 * Verbosity level — affects which steps are emitted.
	 * Default: `'detailed'`.
	 */
	readonly verbosity?: Verbosity;

	/** External AbortSignal for cooperative interruption */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms (best-effort cooperative check) */
	readonly timeoutMs?: number;
}
