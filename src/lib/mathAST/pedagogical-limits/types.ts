/**
 * Pedagogical Limits — Types
 *
 * Domain-specific types for the limits pedagogical pipeline. Distinct from the
 * algorithmic `evaluateLimit()` orchestrator (which optimises for correctness
 * and generality, not for paper-style reasoning).
 *
 * Design rationale (Option B — parallel pipeline) — see
 * `docs/wip/limits-renderer-prompt.md` :
 *
 * Empirical spike on `evaluateLimit()` showed it does NOT produce
 * pedagogical traces : `(x²−4)/(x−2)` at x=2 falls into L'Hôpital (out of
 * lycée syllabus) ; with `maxLhopitalIterations: 0` it returns
 * `does-not-exist` because `tryFactorization` declines on this trivial case.
 * `evaluate()` records 1–2 meta-steps describing the technique, never the
 * sub-steps a teacher would write at the board.
 *
 * This pipeline therefore reorchestrates the same techniques pedagogically :
 *
 * - **Pre-order dispatcher** : announce the technique (form indéterminée
 *   detected, factorisation choisie, …) BEFORE recursing into sub-steps
 *   (factor numérateur, factor dénominateur, simplifier).
 * - **Bindings** captured per rule (`u`, `v`, `n`, `c`, `k`, dominantTerm, …)
 *   so descriptions can reference structural identification.
 * - **Strategies per `LimitsSchoolLevel`** : L'Hôpital is locked behind
 *   `superieur` (out of lycée syllabus) ; squeeze vocabulary adapts
 *   (« théorème des gendarmes » lycée vs « théorème d'encadrement » sup).
 * - **Reuse of `limits/` utilities** for identification and final-value
 *   computation (`matchKnownLimit`, `getKnownLimitValue`,
 *   `evaluateNodeToApproximatedNumber`, `isInfinity`, …) — we don't
 *   reimplement matching, we reorchestrate it.
 *
 * @module mathAST/pedagogical-limits/types
 */

import type { MathNode } from '../types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import type { LimitDirection, LimitStatus, IndeterminateForm } from '../limits/types';

// =============================================================================
// School Level
// =============================================================================

/**
 * School levels covered by the pedagogical limits pipeline.
 *
 * Limits are not on the syllabus before Terminale, so `primaire` and `college`
 * are deliberately excluded. Calling the pipeline with one of these levels
 * throws `PedagogicalLimitNotImplemented`.
 */
export type LimitsSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>;

// =============================================================================
// Pedagogical Rule Names
// =============================================================================

/**
 * Names of the pedagogical limits rules.
 *
 * The set is broader than `LimitRule` (in `limits/types.ts`) because we
 * distinguish identification, sub-steps of factorisation/rationalisation, and
 * conclusion variants that the algorithmic recorder does not separate.
 *
 * Discriminator on `step.rule`. Used by the renderer to look up titles and
 * explanations per school level.
 */
export type PedagogicalLimitRule =
	// ---- Identification (always emitted first when `includeIdentify`) ----
	| 'identify-limit' // « On veut calculer lim_{x→a} f(x) »
	| 'detect-indeterminate-form' // « Forme indéterminée 0/0 / ∞/∞ / ∞−∞ / 0·∞ … »
	// ---- Direct techniques ----
	| 'apply-direct-substitution' // « f(a) = … »
	| 'apply-known-limit' // table de référence (sin x / x, …)
	| 'algebraic-simplification' // simplification générique
	| 'abs-simplification' // résolution du signe d'une valeur absolue
	// ---- Factorisation (with sub-steps) ----
	| 'factor-numerator' // « x² − 4 = (x − 2)(x + 2) »
	| 'factor-denominator' // factorisation du dénominateur
	| 'simplify-common-factor' // « (x − 2) au num. et dén. → simplification »
	// ---- Rationalisation ----
	| 'multiply-by-conjugate' // « multiplier par le conjugué (√(x+1) + 1) »
	| 'simplify-after-rationalization' // simplification après produit conjugué
	// ---- Comportement à l'infini ----
	| 'identify-dominant-term' // « x² domine devant 1 quand x → +∞ »
	| 'apply-growth-comparison' // « e^x ≫ x^n quand x → +∞ »
	| 'compute-asymptotic-equivalent' // sup : f(x) ∼ g(x)
	// ---- Limites unilatérales ----
	| 'analyze-left-limit' // étude de lim à gauche
	| 'analyze-right-limit' // étude de lim à droite
	| 'compare-one-sided' // comparaison gauche / droite
	// ---- Théorème des gendarmes / squeeze ----
	| 'identify-bounds' // « -1 ≤ sin(1/x) ≤ 1 »
	| 'apply-squeeze' // application du théorème
	// ---- L'Hôpital (sup uniquement) ----
	| 'apply-lhopital' // « lim f/g = lim f'/g' »
	// ---- Composition / opérations ----
	| 'identify-composition' // « f(g(x)) avec lim g = b »
	| 'apply-composition' // « lim f(g(x)) = f(b) »
	| 'apply-linearity' // « lim(αf + βg) = α lim f + β lim g »
	| 'apply-product' // « lim(fg) = lim f · lim g »
	| 'apply-quotient' // « lim(f/g) = lim f / lim g »
	// ---- Conclusion ----
	| 'conclude' // « la limite vaut … »
	| 'conclude-does-not-exist' // « la limite n'existe pas (gauche ≠ droite) »
	| 'conclude-infinite'; // « la limite vaut ±∞ »

/**
 * Convenience grouping — the three rules that together describe a
 * factorisation transformation:
 *
 * - `simplify-common-factor` is the **parent** step (top-level entry).
 * - `factor-numerator` and `factor-denominator` are its **sub-steps**
 *   (nested in `parent.subSteps`).
 *
 * Used by the renderer to apply a shared visual treatment to the cluster
 * (e.g. show all three at the same indentation in detailed verbosity).
 *
 * Note : the parent itself is included in the set on purpose — the name is
 * "factorisation cluster", not "sub-steps only".
 */
export const FACTORISATION_CLUSTER_RULES: ReadonlySet<PedagogicalLimitRule> = new Set([
	'factor-numerator',
	'factor-denominator',
	'simplify-common-factor'
]);

// =============================================================================
// Bindings
// =============================================================================

/**
 * Structural captures attached to a step.
 *
 * Per-rule expected keys (informal — runtime is `Record<string, MathNode>`) :
 *
 * - `identify-limit`                       : `{}` (renderer reads `step.before`)
 * - `detect-indeterminate-form`            : `{}` (renderer reads `step.indeterminateForm`)
 * - `apply-direct-substitution`            : `{ a }` (the approach point as a node)
 * - `apply-known-limit`                    : `{ pattern, value }`
 * - `algebraic-simplification`             : `{}` (renderer reads `step.before` / `step.after`)
 * - `abs-simplification`                   : `{ sign }` (`'positive'` / `'negative'` as a number node)
 * - `factor-numerator`                     : `{ before, after }` (raw segments around the cancelled factor)
 * - `factor-denominator`                   : `{ before, after }`
 * - `simplify-common-factor`               : `{ factor }`
 * - `multiply-by-conjugate`                : `{ conjugate }`
 * - `simplify-after-rationalization`       : `{}`
 * - `identify-dominant-term`               : `{ dominant }` (e.g. `x²`)
 * - `apply-growth-comparison`              : `{ fast, slow }` (e.g. `{ fast: e^x, slow: x }`)
 * - `compute-asymptotic-equivalent`        : `{ equivalent }`
 * - `analyze-left-limit`, `analyze-right-limit` : `{ side }`
 * - `compare-one-sided`                    : `{ left, right }`
 * - `identify-bounds`                      : `{ lower, upper }`
 * - `apply-squeeze`                        : `{ commonLimit }`
 * - `apply-lhopital`                       : `{ numeratorDerivative, denominatorDerivative }`
 * - `identify-composition`, `apply-composition` : `{ outer, inner, innerLimit }`
 * - `apply-linearity`, `apply-product`, `apply-quotient` : `{ f, g, alpha?, beta? }`
 * - `conclude`, `conclude-does-not-exist`, `conclude-infinite` : `{ value? }`
 *
 * Bindings are captured at the moment the dispatcher selects a rule, BEFORE
 * recursing into operands. They reflect the input expression, not the result.
 */
export type LimitBindings = Record<string, MathNode>;

// =============================================================================
// Step
// =============================================================================

/**
 * A step recorded during pedagogical limit evaluation.
 *
 * Extends `BaseStep` so it works with `GenericTechnicalRenderer` for free.
 * Adds bindings, the limit context (variable / approach / direction), the
 * indeterminate form being resolved, sub-steps, and the global before/after
 * forms (so deep sub-steps can reference the original `lim_{x→a} f(x)` even
 * when their own `before`/`after` describe a sub-expression).
 */
export interface PedagogicalLimitStep extends BaseStep<PedagogicalLimitRule> {
	/** Variable being passed to the limit (`'x'`, `'n'`, `'t'`, …) */
	readonly variable: string;

	/** Point being approached (a `MathNode`, possibly an `InfinityNode`) */
	readonly approach: MathNode;

	/** Direction of approach (`'left'` / `'right'` / `'both'`) */
	readonly direction: LimitDirection;

	/** Structural captures (`u`, `v`, `n`, `dominant`, …) used by descriptions */
	readonly bindings?: LimitBindings;

	/**
	 * The full expression BEFORE this rule fired (the whole top-level
	 * `f(x)` whose limit is being explained). Optional : when undefined the
	 * renderer falls back to `before`.
	 */
	readonly globalBefore?: MathNode;

	/** Counterpart of `globalBefore` (the whole limit value so far). */
	readonly globalAfter?: MathNode;

	/**
	 * Indeterminate form detected at this step (`'0/0'`, `'∞/∞'`, …) —
	 * informational, used by the renderer to decorate `detect-indeterminate-form`
	 * and `apply-lhopital` titles.
	 */
	readonly indeterminateForm?: IndeterminateForm;

	/**
	 * Optional finer-grained sub-steps (e.g. the factor-numerator /
	 * factor-denominator / simplify-common-factor triple under a top-level
	 * factorisation parent step).
	 */
	readonly subSteps?: readonly PedagogicalLimitStep[];
}

// =============================================================================
// Result
// =============================================================================

/**
 * Terminal statuses produced by the pedagogical pipeline.
 *
 * Narrower than the algorithmic `LimitStatus` (in `limits/types.ts`) which
 * additionally has `'indeterminate'` (a mid-flight intermediate state) and
 * `'unsupported'` (replaced here by `throw PedagogicalLimitNotImplemented`).
 *
 * Encoding the distinction in the type prevents the renderer from carrying
 * dead branches for states the pipeline cannot return.
 */
export type PedagogicalLimitStatus = Exclude<LimitStatus, 'indeterminate' | 'unsupported'>;

/**
 * Output of running the pedagogical limits pipeline.
 */
export interface PedagogicalLimitResult {
	/** Recorded steps (top-level entries; subSteps live inside each entry) */
	readonly steps: readonly PedagogicalLimitStep[];

	/** Limit value (null only when status is `'does-not-exist'`) */
	readonly value: MathNode | null;

	/** Terminal status — never `'indeterminate'` or `'unsupported'` (see `PedagogicalLimitStatus`) */
	readonly status: PedagogicalLimitStatus;

	/** Indeterminate form encountered, or `'none'` */
	readonly indeterminateForm: IndeterminateForm;

	/** The variable approaching the limit point */
	readonly variable: string;

	/** The point being approached */
	readonly approach: MathNode;

	/** Direction of approach */
	readonly direction: LimitDirection;
}

// =============================================================================
// Generation Strategy (per school level)
// =============================================================================

/**
 * Per-level configuration controlling which techniques the pipeline tries.
 *
 * Each flag is checked by the dispatcher in priority order. The strategy is
 * deliberately a flat record (no inheritance) so a reader can scan the table
 * end-to-end and predict pipeline behaviour.
 *
 * - `enableLhopital` : try L'Hôpital's rule on `0/0` / `∞/∞`. Locked to
 *   `superieur` (programme CPGE) — at lycée this is OUT of syllabus.
 * - `enableFactorization`, `enableRationalization`, `enableInfinityAnalysis`,
 *   `enableSqueeze`, `enableComposition` : enable the corresponding
 *   technique. Active at both levels (Tle spé syllabus).
 * - `squeezeVocab` : `'gendarmes'` at lycée, `'squeeze'` at supérieur.
 * - `includeIdentify` : when `true`, prepend an `identify-limit` step that
 *   announces the limit being computed. Useful at lycée (drill-down format)
 *   but redundant at sup (where the audience knows what's being computed).
 * - `verbosityCompactConclusion` : at sup, the conclusion is one line
 *   (`= 4`); at lycée, an explicit `conclude` step closes the chain.
 */
export interface LimitGenerationStrategy {
	readonly enableLhopital: boolean;
	readonly enableFactorization: boolean;
	readonly enableRationalization: boolean;
	readonly enableInfinityAnalysis: boolean;
	readonly enableSqueeze: boolean;
	readonly enableComposition: boolean;
	readonly squeezeVocab: 'gendarmes' | 'squeeze';
	readonly includeIdentify: boolean;
	readonly verbosityCompactConclusion: boolean;
}

/**
 * Strategy table for the supported school levels.
 *
 * `primaire` and `college` are intentionally absent — limits are not on the
 * syllabus before Terminale. Calling the pipeline with one of those levels
 * throws `PedagogicalLimitNotImplemented`.
 */
export const STRATEGIES_LIMITS: Readonly<Record<LimitsSchoolLevel, LimitGenerationStrategy>> = {
	lycee: {
		enableLhopital: false,
		enableFactorization: true,
		enableRationalization: true,
		enableInfinityAnalysis: true,
		enableSqueeze: true,
		enableComposition: true,
		squeezeVocab: 'gendarmes',
		includeIdentify: true,
		verbosityCompactConclusion: false
	},
	superieur: {
		enableLhopital: true,
		enableFactorization: true,
		enableRationalization: true,
		enableInfinityAnalysis: true,
		enableSqueeze: true,
		enableComposition: true,
		squeezeVocab: 'squeeze',
		includeIdentify: false,
		verbosityCompactConclusion: true
	}
};

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Options for `generatePedagogicalLimitSteps()`.
 *
 * `variable` and `approach` are required (no implicit `'x'` to keep the API
 * explicit and avoid accidental wrong-variable derivations in pedagogical
 * contexts).
 */
export interface PedagogicalLimitOptions {
	/**
	 * Variable approaching the limit point (e.g. `'x'`, `'n'`, `'t'`).
	 * Required.
	 */
	readonly variable: string;

	/**
	 * Point being approached, as a `MathNode`. May be an `InfinityNode`
	 * (`±∞`), a numeric node, or a variable.
	 */
	readonly approach: MathNode;

	/**
	 * Direction of approach. Default: `'both'`.
	 */
	readonly direction?: LimitDirection;

	/**
	 * Target school level. Drives strategy selection and vocabulary.
	 *
	 * `primaire` and `college` are refused — limits are not on the syllabus
	 * before Terminale (the dispatcher throws `PedagogicalLimitNotImplemented`).
	 *
	 * Naming note : aligned with `PedagogicalDifferentiationOptions.schoolLevel`.
	 * `PedagogicalIntegrationOptions` uses `level` instead — that is a pre-existing
	 * inconsistency in the codebase, not an oversight here. New pedagogical
	 * modules should prefer `schoolLevel` (the canonical name from
	 * `common/step-renderer-base.ts`).
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

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when a pedagogical limit cannot be performed within the V1
 * scope.
 *
 * Caught by `correction-generator.ts` to fall back silently to Mode A. The
 * `expression` and `reason` fields are debug-only and not surfaced in the
 * UI — the silent fallback produces no log either (consistent with the 9
 * other Mode B kinds).
 *
 * Throw cases :
 *
 * - `schoolLevel === 'primaire' || 'college'` (limits out of syllabus)
 * - All strategies declined (no factorisation root, no known limit, no
 *   conjugate to multiply by, no dominant term, …)
 * - L'Hôpital required at lycée (the iconic case is the spike's `(x²-4)/(x-2)`
 *   at x=2 — guarded by Option B's strategy table)
 * - Unsupported feature : parametric limits with formal parameter,
 *   recursion-defined sequences, Cauchy uniform limits
 * - Composition with nesting depth > 2 (V1 scope cap)
 */
export class PedagogicalLimitNotImplemented extends Error {
	readonly expression: MathNode;
	readonly reason?: string;

	constructor(expression: MathNode, reason?: string) {
		super(`Pedagogical limit not implemented${reason ? `: ${reason}` : ''}`);
		this.name = 'PedagogicalLimitNotImplemented';
		this.expression = expression;
		this.reason = reason;
	}
}
