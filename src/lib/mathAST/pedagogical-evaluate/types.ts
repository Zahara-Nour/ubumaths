/**
 * Pedagogical Evaluate — Type Stubs (Phase 5+ scope)
 *
 * Skeleton types for a future pedagogical orchestrator that builds an
 * aggregated `PedagogicalTarget` from question parameters and emits step
 * sequences adapted to a `SchoolLevel`.
 *
 * **Status: TYPES ONLY** — no logic implemented in the MVP. The
 * implementation is scheduled for Phase 5+ (see
 * `docs/wip/pedagogical-steppers-mvp-prompt.md` § "Hors scope MVP").
 *
 * Not exported from `mathAST/index.ts` — these types live here so the API
 * shape is captured once, and the implementer can pick them up without
 * having to redesign the contract.
 *
 * @module mathAST/pedagogical-evaluate/types
 */

import type {
	RequiredForm,
	PrecisionType,
	ConstraintOptions,
	ValidationRule
} from '$lib/questions/types';
import type { SchoolLevel } from '../common/step-renderer-base';

// =============================================================================
// Target Form
// =============================================================================

/**
 * Target form for pedagogical step generation.
 *
 * Reuses `RequiredForm` from the question system (`product` / `sum` /
 * `fraction` / `power` / `{ pattern }`) and adds presets useful for
 * pedagogical contexts:
 *
 * - `'scientific'` — scientific notation (a × 10^n with 1 ≤ |a| < 10)
 * - `'reduced-fraction'` — fully reduced fraction (gcd(num, den) = 1)
 * - `'decimal'` — decimal expansion
 *
 * @see RequiredForm in `src/lib/questions/types.ts:846`
 */
export type TargetForm = RequiredForm | 'scientific' | 'reduced-fraction' | 'decimal';

// =============================================================================
// Pedagogical Target
// =============================================================================

/**
 * Aggregated pedagogical target derived from question parameters.
 *
 * Built by a future `extractPedagogicalTarget(instance, blank)` (Phase 5+)
 * that pulls together `requiredForm`, `precision`, the strict subset of
 * `ConstraintOptions`, validation rules, and unit expectations into a single
 * read-only target object consumed by the pedagogical evaluator.
 *
 * @see ConstraintOptions in `src/lib/questions/types.ts:801`
 * @see ValidationRule in `src/lib/questions/types.ts:933`
 */
export interface PedagogicalTarget {
	/** Structural form expected (e.g., `'fraction'` for fraction reduction problems) */
	readonly structure?: RequiredForm;

	/** Precision specification (decimal places, significant digits, …) */
	readonly precision?: PrecisionType;

	/** Free-form answer-format hint (e.g., `'a + b·i'` for complex numbers) */
	readonly answerFormat?: string;

	/** Unit expectations: whether a unit is expected and which one */
	readonly unit?: {
		readonly expected: boolean;
		readonly required?: string;
	};

	/**
	 * Cosmetic options that must hold strictly in the final form.
	 * Subset of `ConstraintOptions` relevant to pedagogical strictness.
	 */
	readonly strictCosmetics?: Pick<
		ConstraintOptions,
		'reducedFractions' | 'signs' | 'nullTerms' | 'factorOne' | 'zeros'
	>;

	/** Additional validation rules that the final form must satisfy */
	readonly validationRules?: readonly ValidationRule[];
}

// =============================================================================
// Pedagogical Evaluate Options
// =============================================================================

/**
 * Skeleton options for the future pedagogical evaluator.
 *
 * Phase 5+ will add fields for `symbolicComputation` (Poincaré-style enum:
 * `replace-or-undefine`, `replace-and-evaluate`, `replace-functions-only`)
 * to control granularity of substitution behavior.
 */
export interface PedagogicalEvaluateOptions {
	/** Target school level for vocabulary and step depth */
	readonly schoolLevel: SchoolLevel;

	/** Aggregated target derived from the question parameters */
	readonly target?: PedagogicalTarget;

	/** External AbortSignal for cooperative interruption */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms */
	readonly timeoutMs?: number;
}
