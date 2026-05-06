/**
 * Pedagogical Simplify — Types
 *
 * Domain-specific types for the simplification pedagogical pipeline. Distinct
 * from the algorithmic `simplify()` orchestrator (which uses cost-fixpoint
 * over `rewrite()` and frequently produces non-pedagogical step traces — see
 * `docs/wip/simplify-stepper-progress.md` § A for the empirical analysis).
 *
 * Architecture (Option C′) :
 *
 * - The pipeline is a manual loop in the spirit of `pedagogical-arithmetic/
 *   pipeline.ts` : no `rewrite()`, no cost-fixpoint, no phantom normalize
 *   phases. Each step records its rule, its bindings, and the global
 *   before/after for the renderer.
 *
 * - Pattern rule sets (`pattern/rule-sets/*`) are imported, NOT duplicated.
 *   The selection of active rules is driven by an `intent` flag that the
 *   caller declares explicitly (no implicit default, by design).
 *
 * - The granular `normalize()` step recorder is reused as the source of
 *   `combine-like-terms`, `simplify-fraction`, `radical-simplify`, etc. The
 *   pedagogical pipeline bridges those events into `PedagogicalSimplifyStep`
 *   with a category tag.
 *
 * @module mathAST/pedagogical-simplify/types
 */

import type { MathNode } from '../types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Categories
// =============================================================================

/**
 * Exhaustive list of pedagogical categories. Order is not significant; the
 * array is the single source of truth for the type below and for any
 * exhaustivity test.
 */
export const ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES = [
	'distribution',
	'factorisation',
	'combinaison-termes-semblables',
	'fractions',
	'puissances',
	'radicaux',
	'identites-trig',
	'identites-log-exp',
	'valeur-absolue',
	'autre'
] as const;

/**
 * Sentinel exposed for tests; if a future change adds a category without
 * updating consumers, the count assertion catches it.
 */
export const PEDAGOGICAL_SIMPLIFY_CATEGORY_COUNT = ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES.length;

/** Pedagogical category tag attached to every recorded step. */
export type PedagogicalSimplifyCategory = (typeof ALL_PEDAGOGICAL_SIMPLIFY_CATEGORIES)[number];

// =============================================================================
// Intent
// =============================================================================

/**
 * Explicit intent of the simplification — driven by the question wording at
 * the calling site (Mode B), not heuristics.
 *
 * - `factoriser`  : push toward factored form (no expansion, no normalize).
 * - `developper`  : push toward expanded form (then combine-like-terms).
 * - `reduire`     : tidy up (combine-like-terms, fractions, radicals,
 *                   unambiguous identities) — no factoring/expansion.
 * - `auto`        : `reduire` + unambiguous factoring/expansion only
 *                   (e.g. `√8 → 2√2`, `sin²+cos² → 1`, but `x²-4` stays).
 */
export type SimplifyIntent = 'factoriser' | 'developper' | 'reduire' | 'auto';

// =============================================================================
// Bindings
// =============================================================================

/**
 * Structural captures attached to a step, used by descriptions to reference
 * the parts of the expression involved in the rule application
 * (e.g. `Avec a = 2x et b = 3`).
 */
export type SimplifyBindings = Record<string, MathNode>;

// =============================================================================
// Step
// =============================================================================

/**
 * A step recorded during pedagogical simplification.
 *
 * Extends `BaseStep` so it works with `GenericTechnicalRenderer` for free.
 * Adds the pedagogical category, optional bindings, optional sub-steps
 * (reserved for V2 — flat for V1), and the global before/after used by
 * the renderer to display the colored fragment vs. surrounding context.
 *
 * Note on `step.rule` typing — the field is intentionally left as the open
 * `string` from `BaseStep`'s default generic. Two namespaces feed it
 * (pattern rule names from `pattern/rule-sets/*` and normalize step names
 * from `normal/normalize.ts`), neither of which is a closed union the
 * pedagogical module owns. The renderer must handle the open set via
 * `categorizeRule` + lookup tables, not exhaustive `switch`.
 */
export interface PedagogicalSimplifyStep extends BaseStep {
	/** Pedagogical category — drives renderer titles and grouping. */
	readonly category: PedagogicalSimplifyCategory;

	/** Structural captures keyed by role name. */
	readonly bindings?: SimplifyBindings;

	/** Reserved for V2 hierarchical display; always flat in V1. */
	readonly subSteps?: readonly PedagogicalSimplifyStep[];

	/**
	 * The whole expression BEFORE this rule fired (full context). Optional —
	 * when undefined the renderer falls back to `before`. The pipeline
	 * (Phase 2) populates these on every emitted step; absence is reserved
	 * for hand-crafted test fixtures.
	 */
	readonly globalBefore?: MathNode;

	/** Counterpart of `globalBefore`. Same fallback contract. */
	readonly globalAfter?: MathNode;
}

// =============================================================================
// Options
// =============================================================================

/**
 * Caller-supplied options for the pedagogical simplify pipeline.
 *
 * `intent` and `schoolLevel` are required — neither has a sensible default.
 */
export interface PedagogicalSimplifyOptions {
	/** Required — drives rule selection and which forms are preferred. */
	readonly intent: SimplifyIntent;

	/** Required — drives renderer vocabulary and explanation depth. */
	readonly schoolLevel: SchoolLevel;

	/** Free-text variable hint for descriptions (e.g. `'x'`, `'t'`). */
	readonly variable?: string;

	/**
	 * Enable trig identities. Default depends on `schoolLevel`:
	 *   - `primaire`           : false
	 *   - `college`            : false
	 *   - `lycee` / `superieur`: true
	 */
	readonly enableTrig?: boolean;

	/**
	 * Enable log/exp identities. Same default schedule as `enableTrig`
	 * (off below lycée).
	 */
	readonly enableLogExp?: boolean;

	/** Enable absolute-value identities. Default `true` at every level. */
	readonly enableAbs?: boolean;

	/**
	 * Enable hyperbolic identities. Default `false` (V1 excludes them);
	 * if a Tle spé / sup question explicitly opts in, set to `true`.
	 */
	readonly enableHyperbolic?: boolean;

	/** Verbosity passed through to the recorder. Default `'detailed'`. */
	readonly verbosity?: Verbosity;

	/** Safety bound on the manual rewrite loop. Default 20. */
	readonly maxIterations?: number;

	/** External AbortSignal for cooperative interruption. */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms (combined with `signal`). */
	readonly timeoutMs?: number;
}

// =============================================================================
// Result
// =============================================================================

/**
 * Output of `generatePedagogicalSimplifySteps()`.
 */
export interface PedagogicalSimplifyResult {
	/** The simplified expression in its final pedagogical form. */
	readonly result: MathNode;

	/** Top-level steps; `subSteps` (V2) live inside each entry. */
	readonly steps: readonly PedagogicalSimplifyStep[];

	/**
	 * Set to `true` when the pipeline was interrupted before reaching its
	 * natural fixpoint. In that case `result` is the best form encountered
	 * up to the abort point, which may equal the input.
	 */
	readonly aborted?: boolean;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown when the pedagogical pipeline encounters a construction outside its
 * V1 scope (matrices, equations, hyperbolic identities, cubes, non-binomial
 * products, level/content mismatch, …). Caught by `correction-generator` to
 * fall back to Mode A.
 */
export class PedagogicalSimplifyNotImplemented extends Error {
	/** The offending node, when known. */
	readonly node?: MathNode;

	constructor(message: string, node?: MathNode) {
		super(message);
		this.name = 'PedagogicalSimplifyNotImplemented';
		this.node = node;
	}
}
