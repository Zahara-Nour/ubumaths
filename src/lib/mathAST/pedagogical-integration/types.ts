/**
 * Pedagogical Integration — Types
 *
 * Domain-specific types for the integration pedagogical pipeline. Distinct
 * from the algorithmic `integrate()` orchestrator (which optimizes for
 * correctness and generality, not for paper-style reasoning).
 *
 * Design rationale (Option 2 — parallel pipeline) — see
 * `docs/wip/integration-stepper-prompt.md` :
 *
 * `integration/integrate.ts` (algorithmic) is a recursive dispatcher that
 * tries 5 integrators in priority order (basic, u-sub, parts, partial-fractions,
 * trig-sub) and returns an antiderivative — but its step trace is
 * implementation-driven, not pedagogical (announces "tabular method" instead
 * of "intégration par parties", emits micro-steps a teacher would never write
 * on a board).
 *
 * This pipeline introduces:
 *
 * - A pedagogical pre-order dispatcher: announces the rule (as a top-level
 *   step) BEFORE recursing into operands (which become subSteps).
 * - Bindings captured per rule (u, du, n, c, …) so descriptions can reference
 *   structural identification ("Avec u = … et u' = …").
 * - Pedagogical special cases prioritised over generic rules:
 *      `u' · e^u` → `apply-composite-exp` (avoids the verbose u-substitution)
 *      `u' / u`   → `apply-composite-ln`
 *      `u' · sin(u)` / `u' · cos(u)` → `apply-composite-sin/cos`
 *      `u' · u^n` → `apply-composite-power`
 * - Definite-integral handling: explicit `apply-fundamental-theorem`,
 *   `substitute-bounds`, `simplify-bounds-result` steps.
 * - Structural reuse of `integration/rules.ts` for the actual computation
 *   (powerRule, expRule, sinRule, cosRule, lnAbsRule, …) — we don't
 *   reimplement antiderivatives, we reorchestrate them.
 *
 * @module mathAST/pedagogical-integration/types
 */

import type { MathNode } from '../types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Rule Names
// =============================================================================

/**
 * Names of the pedagogical integration rules.
 *
 * The set is broader than `integration/descriptions-fr.ts` exports because we
 * distinguish pedagogical special cases (e.g. `apply-composite-exp` vs the
 * generic `u-substitution`, or `apply-power-rule` vs `apply-known-primitive`).
 *
 * Discriminator on `step.rule`. Used by the renderer to look up titles and
 * explanations per school level.
 *
 * IMPORTANT — distinct module from `IntegrationRule` (algorithmic, in
 * `integration/descriptions-fr.ts`). Nine kinds happen to share verbatim
 * names with the algorithmic union (`identify-integrand`,
 * `identify-substitution`, `apply-substitution`, `substitute-back`,
 * `identify-parts`, `choose-u-dv`, `apply-parts-formula`, `simplify-result`,
 * `add-constant`) — they describe the same conceptual step but live in
 * separate string-union types so a renderer can never mix the two by mistake.
 * Other kinds are pedagogy-only (`apply-composite-exp`, `apply-power-rule`,
 * `apply-known-primitive`, `apply-fundamental-theorem`, `apply-cyclic-ipp`,
 * …) and have no algorithmic counterpart.
 */
export type PedagogicalIntegrationRule =
	// ---- Identification (always emitted first when `includeIdentify`) ----
	| 'identify-integrand'
	| 'identify-definite-integral'
	// ---- Direct primitives (basic table) ----
	| 'apply-power-rule' // x^n → x^(n+1)/(n+1)
	| 'apply-constant-rule' // c → c·x
	| 'apply-known-primitive' // 1/x→ln, e^x→e^x, sin→-cos, cos→sin, tan→-ln|cos|
	// ---- Linearity ----
	| 'apply-linearity-sum' // ∫(f+g) = ∫f + ∫g
	| 'extract-constant' // ∫c·f = c·∫f
	// ---- Composite forms (recognised before u-substitution) ----
	| 'apply-composite-power' // u'·u^n → u^(n+1)/(n+1)
	| 'apply-composite-ln' // u'/u → ln|u|
	| 'apply-composite-exp' // u'·e^u → e^u
	| 'apply-composite-sin' // u'·sin(u) → -cos(u)
	| 'apply-composite-cos' // u'·cos(u) → sin(u)
	// ---- Definite integral (fundamental theorem) ----
	| 'apply-fundamental-theorem' // ∫_a^b f = [F]_a^b
	| 'substitute-bounds' // [F]_a^b → F(b) - F(a)
	| 'simplify-bounds-result' // F(b) - F(a) → numeric value
	// ---- Explicit u-substitution (supérieur) ----
	| 'identify-substitution'
	| 'compute-du'
	| 'apply-substitution'
	| 'substitute-back'
	// ---- Integration by parts (lycée Tle spé + supérieur) ----
	| 'identify-parts'
	| 'choose-u-dv'
	| 'apply-parts-formula'
	| 'apply-cyclic-ipp' // V1.1 — ∫e^(αx)·sin(βx)·dx via algebraic resolution after 2 IPPs
	// ---- Partial fractions (V2, lycée Tle spé option + supérieur) ----
	| 'decompose-rational' // P/Q = A/(x-r₁) + B/(x-r₂)
	| 'apply-partial-fractions' // ∫(A/(x-r₁) + B/(x-r₂)) dx = A·ln|x-r₁| + B·ln|x-r₂|
	// ---- Final ----
	| 'add-constant' // « + C »
	| 'simplify-result';

// =============================================================================
// Bindings
// =============================================================================

/**
 * Structural captures attached to a step.
 *
 * Per-rule expected keys (informal — runtime is `Record<string, MathNode>`) :
 *
 * - `identify-integrand`            : `{}` (renderer reads `step.before`)
 * - `identify-definite-integral`    : `{}` (renderer reads `step.before` + `step.definite`)
 * - `apply-power-rule`              : `{ base, n }` (n is the exponent BEFORE +1)
 * - `apply-constant-rule`           : `{ c }`
 * - `apply-known-primitive`         : `{}` (renderer reads `step.before`)
 * - `apply-linearity-sum`           : `{ f, g }` (or empty for n>2 terms — renderer reads `step.before`)
 * - `extract-constant`              : `{ c, f }`
 * - `apply-composite-power`         : `{ u, n }`
 * - `apply-composite-ln`            : `{ u }`
 * - `apply-composite-exp`           : `{ u }`
 * - `apply-composite-sin`           : `{ u }`
 * - `apply-composite-cos`           : `{ u }`
 * - `apply-fundamental-theorem`     : `{ primitive }`
 * - `substitute-bounds`             : `{ primitive }`
 * - `simplify-bounds-result`        : `{}`
 * - `identify-substitution`         : `{ u }`
 * - `compute-du`                    : `{ u, du }`
 * - `apply-substitution`            : `{ u, du, transformed }`
 * - `substitute-back`               : `{ u }`
 * - `identify-parts`                : `{ u, dv }`
 * - `choose-u-dv`                   : `{ u, dv, du, v }`
 * - `apply-parts-formula`           : `{ u, v, du }`
 * - `add-constant`                  : `{}`
 * - `simplify-result`               : `{}`
 *
 * Bindings are captured at the moment the dispatcher selects a rule, BEFORE
 * recursing into operands. They reflect the input expression, not the
 * antiderivative.
 */
export type IntegrationBindings = Record<string, MathNode>;

// =============================================================================
// Step
// =============================================================================

/**
 * A step recorded during pedagogical integration.
 *
 * Extends `BaseStep` so it works with `GenericTechnicalRenderer` for free.
 * Adds bindings, definite-integral context, sub-steps and the integration
 * variable.
 */
export interface PedagogicalIntegrationStep extends BaseStep<PedagogicalIntegrationRule> {
	/** The integration variable (`'x'`, `'t'`, …) */
	readonly variable: string;

	/** Structural captures (`u`, `du`, `n`, …) used by descriptions */
	readonly bindings?: IntegrationBindings;

	/**
	 * The full integrand BEFORE this rule fired. Optional: when undefined the
	 * renderer falls back to `before`.
	 */
	readonly globalBefore?: MathNode;

	/** Counterpart of `globalBefore` (the whole antiderivative so far). */
	readonly globalAfter?: MathNode;

	/**
	 * Optional finer-grained substeps (e.g. integration of each term under a
	 * linearity step, or the antiderivative computation under a fundamental
	 * theorem step).
	 */
	readonly subSteps?: readonly PedagogicalIntegrationStep[];

	/**
	 * Definite-integral bounds — present only when this step is part of a
	 * definite integral computation. Both bounds are MathNodes (typically
	 * numeric constants, but may be expressions).
	 */
	readonly definite?: { readonly lower: MathNode; readonly upper: MathNode };
}

// =============================================================================
// Result
// =============================================================================

/**
 * Output of running the pedagogical integration pipeline.
 *
 * - `antiderivative` is always populated (the F(x) such that F'(x) = f(x)).
 * - `value` is populated only for definite integrals (the numeric value of
 *   F(b) - F(a)).
 */
export interface PedagogicalIntegrationResult {
	/** Antiderivative F(x) such that F'(x) = f(x) — without the `+ C` */
	readonly antiderivative: MathNode;

	/** Numeric value of the definite integral (when `options.definite` was set) */
	readonly value?: MathNode;

	/** Recorded steps (top-level entries; subSteps live inside each entry) */
	readonly steps: readonly PedagogicalIntegrationStep[];
}

// =============================================================================
// School Level
// =============================================================================

/**
 * School levels supported by the integration pipeline.
 *
 * Excludes BOTH `primaire` AND `college` — integration is not in the curriculum
 * before Terminale (lycée). Mirrors `QuadraticSchoolLevel` in
 * `pedagogical-solve/types.ts`. Callers passing a lower level (e.g. from
 * `correction-generator`) must bump it to `lycee` BEFORE invoking the
 * pipeline.
 */
export type IntegrationSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>;

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Options for `generatePedagogicalIntegrationSteps()`.
 */
export interface PedagogicalIntegrationOptions {
	/**
	 * Target school level. Drives strategy selection (vocabulary, granularity,
	 * which composite/IPP/u-sub features are enabled).
	 */
	readonly level: IntegrationSchoolLevel;

	/**
	 * Variable to integrate with respect to (e.g. `'x'`, `'t'`, `'theta'`).
	 * Auto-detected via `detectVariable()` from `integration/classify.ts` if
	 * omitted.
	 *
	 * NOTE — distinct from `PedagogicalDifferentiationOptions.variable` which
	 * is REQUIRED. Integration tolerates omission because the algorithmic
	 * `detectVariable()` already provides a reliable single-variable
	 * detection (an integrand with multiple free variables would be ambiguous
	 * regardless of how the API is shaped, and `detectVariable` throws on that
	 * case). The lever is kept optional to mirror the algorithmic
	 * `IntegrateOptions.variable` and minimise friction at call sites.
	 */
	readonly variable?: string;

	/**
	 * Definite-integral bounds. When provided, the pipeline emits an
	 * `identify-definite-integral` step + the indefinite pipeline + an
	 * `apply-fundamental-theorem` + `substitute-bounds` +
	 * `simplify-bounds-result` step.
	 */
	readonly definite?: { readonly lower: MathNode; readonly upper: MathNode };

	/**
	 * Verbosity level — affects which steps are emitted.
	 * Default: `'detailed'`.
	 */
	readonly verbosity?: Verbosity;

	/**
	 * Maximum recursion depth (guard against IPP cyclic / pathological inputs).
	 * Default: `5`.
	 */
	readonly maxRecursionDepth?: number;

	/** External AbortSignal for cooperative interruption */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms (best-effort cooperative check) */
	readonly timeoutMs?: number;
}

// =============================================================================
// Generation Strategy (per level)
// =============================================================================

/**
 * Per-level strategy controlling step granularity and which features are
 * enabled.
 *
 * - `includeAddConstant`: emit the trailing `add-constant` step (« + C »).
 *   `true` at lycée (constants always shown), `false` at supérieur (implicit).
 * - `includeIdentify`: emit the leading `identify-integrand` step.
 * - `formatBoundsExplicit`: emit a separate `substitute-bounds` step for
 *   definite integrals (`true` lycée), or fold it into
 *   `apply-fundamental-theorem` (`false` supérieur).
 * - `enablePartsSimple`: enable simple integration-by-parts detection.
 *   `true` at lycée per Tle spé maths programme + `true` at supérieur.
 * - `enableUSubstitution`: enable explicit u-substitution dispatch.
 *   `false` at lycée (composite-form recognition is preferred), `true` at
 *   supérieur.
 * - `enableComposite`: enable composite-form recognition (u'/u, u'·e^u,
 *   u'·sin(u), u'·cos(u), u'·u^n). Always `true` at both levels — these are
 *   the standard Tle spé patterns.
 */
export interface IntegrationGenerationStrategy {
	readonly includeAddConstant: boolean;
	readonly includeIdentify: boolean;
	readonly formatBoundsExplicit: boolean;
	readonly enablePartsSimple: boolean;
	readonly enableUSubstitution: boolean;
	readonly enableComposite: boolean;
	/**
	 * V1.1 — Enable cyclic IPP resolution for `∫ e^(αx)·sin(βx) dx` /
	 * `∫ e^(αx)·cos(βx) dx`. Active at both lycée (Tle spé) and supérieur ;
	 * the cyclic case is iconic in Tle spé exam exercises.
	 */
	readonly enableCyclicParts: boolean;
	/**
	 * V1.1 — Enable inverse trig primitives `∫1/(1+x²) dx = arctan(x)` and
	 * `∫1/√(1-x²) dx = arcsin(x)`. Reserved to supérieur (post-bac
	 * programme) ; Tle spé does not introduce arctan/arcsin.
	 */
	readonly enableInverseTrig: boolean;
	/**
	 * V2 — Enable partial-fractions decomposition for `∫P(x)/Q(x) dx` with
	 * Q quadratic (Δ > 0) and deg(P) < 2. Active at both lycée (Tle spé
	 * option) and supérieur.
	 */
	readonly enablePartialFractions: boolean;
}

/**
 * Strategy table for the supported school levels. `primaire` and `college`
 * are intentionally absent (integration is not in the syllabus before
 * Terminale).
 *
 * NOTE — `enablePartsSimple: true` at lycée level is intentional :
 * integration by parts IS part of the Tle spé maths programme (2025).
 */
export const STRATEGIES_INTEGRATION: Readonly<
	Record<IntegrationSchoolLevel, IntegrationGenerationStrategy>
> = {
	lycee: {
		includeAddConstant: true,
		includeIdentify: true,
		formatBoundsExplicit: true,
		enablePartsSimple: true,
		enableUSubstitution: false,
		enableComposite: true,
		enableCyclicParts: true,
		enableInverseTrig: false,
		enablePartialFractions: true
	},
	superieur: {
		includeAddConstant: false,
		includeIdentify: false,
		formatBoundsExplicit: false,
		enablePartsSimple: true,
		enableUSubstitution: true,
		enableComposite: true,
		enableCyclicParts: true,
		enableInverseTrig: true,
		enablePartialFractions: true
	}
};

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when a pedagogical integration cannot be performed within the
 * V1 scope (e.g. requires partial fractions, trigonometric substitution,
 * cyclic IPP, tabular IPP, parametric integrals, improper integrals, or
 * piecewise functions).
 *
 * Caught by `correction-generator.ts` to fall back silently to Mode A.
 */
export class PedagogicalIntegrationNotImplemented extends Error {
	readonly integrand: MathNode;
	readonly reason?: string;

	constructor(integrand: MathNode, reason?: string) {
		super(`Pedagogical integration not implemented${reason ? `: ${reason}` : ''}`);
		this.name = 'PedagogicalIntegrationNotImplemented';
		this.integrand = integrand;
		this.reason = reason;
	}
}
