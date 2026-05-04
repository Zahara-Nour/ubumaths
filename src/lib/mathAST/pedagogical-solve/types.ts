/**
 * Pedagogical Solve — Types
 *
 * Types for the equation-solving pedagogical pipeline. Distinct from the
 * algorithmic `solve()` orchestrator (which now records ONLY structural
 * algorithmic steps for audit/debug).
 *
 * Design rationale (Phase 6) — see
 * `docs/wip/pedagogical-steppers-mvp-progress.md` :
 *
 * The algorithmic solver standardizes `f(x) = g(x)` into `f(x) − g(x) = 0`,
 * extracts coefficients, and applies the formula `x = −b/a`. None of those
 * operations match what a student does on paper. So we introduce a separate
 * pipeline that walks the equation pedagogically (move x-terms one side,
 * constants the other, divide by coefficient) — analogous to
 * `step-generator/arithmetic-steps.ts` for arithmetic but using a richer
 * structured step type adapted to the bilateral nature of equations.
 *
 * @module mathAST/pedagogical-solve/types
 */

import type { MathNode, RelationNode } from '../types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';

// =============================================================================
// Equation Operation
// =============================================================================

/**
 * Structured operation applied at a step. Discriminated union — exhaustive
 * over the operations the linear pipeline emits.
 *
 * Future quadratic / transcendental pipelines may extend this union.
 */
export type EquationOperation =
	/** Initial classification — no transformation, just labels the equation */
	| { readonly kind: 'identify-equation'; readonly equationType: 'linear' }
	/** Add the same expression to both sides */
	| { readonly kind: 'add-both-sides'; readonly operand: MathNode }
	/** Subtract the same expression from both sides */
	| { readonly kind: 'subtract-both-sides'; readonly operand: MathNode }
	/** Multiply both sides by the same expression */
	| { readonly kind: 'multiply-both-sides'; readonly operand: MathNode }
	/** Divide both sides by the same (non-zero) expression */
	| { readonly kind: 'divide-both-sides'; readonly operand: MathNode }
	/** Simplify a side (collecting like terms, evaluating arithmetic) */
	| { readonly kind: 'simplify'; readonly side: 'left' | 'right' | 'both' }
	/**
	 * Combined transposition (lycée+) — moves x-terms to the left side and
	 * constants to the right side IN ONE STEP. The displayed transformation
	 * shows BOTH operands simultaneously in color (`+5x` on the left, `+2`
	 * on the right). Either operand may be `null` when the corresponding
	 * move is not needed (e.g. equation already has x only on left).
	 */
	| {
			readonly kind: 'transpose-terms';
			readonly variableOperand: MathNode | null;
			readonly constantOperand: MathNode | null;
	  }
	/**
	 * Compact division (lycée+) — replaces `divide-both-sides` for terse
	 * presentations. The display shows only the result equation `x = …` ;
	 * the actual division is implicit in the title ("On termine en
	 * simplifiant le coefficient de x").
	 */
	| { readonly kind: 'simplify-coefficient'; readonly coefficient: MathNode }
	/**
	 * Top-level grouping step (lycée-level abstraction). Substeps contain
	 * the actual add/subtract/simplify operations.
	 */
	| { readonly kind: 'group-variable-terms'; readonly variable: string }
	/** Top-level grouping for constants (counterpart to group-variable-terms) */
	| { readonly kind: 'group-constants' }
	/** Top-level abstraction: full reduction to canonical form `ax = b` */
	| { readonly kind: 'reduce-to-canonical' }
	/** Final: read off the solution from `x = …` */
	| { readonly kind: 'read-solution'; readonly variable: string; readonly value: MathNode };

// =============================================================================
// Equation Step
// =============================================================================

/**
 * A step in the equation-solving process. Extends `BaseStep` (so it works with
 * `GenericTechnicalRenderer` for free) but narrows `before`/`after` to
 * `RelationNode` since each step transforms an equation.
 *
 * - `id`, `rule`, `description`, `verbosityLevel` come from `BaseStep`.
 * - `rule` mirrors `operation.kind` when an operation is present.
 * - `before` is the equation BEFORE the operation; `after` is the result.
 * - `subSteps` allows drill-down: a top-level step may contain finer
 *   operations (used at lycée/supérieur for grouping).
 */
export interface EquationStep extends BaseStep {
	/** Equation before this step */
	readonly before: RelationNode;
	/** Equation after this step */
	readonly after: RelationNode;
	/** Structured operation (omitted only for pure-narration steps) */
	readonly operation?: EquationOperation;
	/** Optional finer-grained substeps for drill-down UX */
	readonly subSteps?: readonly EquationStep[];
}

// =============================================================================
// Generation Options
// =============================================================================

/**
 * School levels that linear equations apply to. Excludes `primaire` — linear
 * algebra is not in the primary-school curriculum, so this pipeline refuses
 * that level at the type level.
 */
export type LinearSchoolLevel = Exclude<SchoolLevel, 'primaire'>;

/**
 * Options for `generateLinearEquationSteps`.
 */
export interface LinearEquationStepsOptions {
	/** Target school level — drives top-level granularity. `primaire` excluded. */
	readonly level: LinearSchoolLevel;
	/**
	 * Include `subSteps` for drill-down. Default `true`.
	 * Set to `false` for a flat output (e.g. for tests, logs).
	 */
	readonly includeSubSteps?: boolean;
	/** Variable to solve for. Auto-detected if omitted. */
	readonly variable?: string;
}

// =============================================================================
// Generation Strategy (per level)
// =============================================================================

/**
 * Per-level strategy controlling step granularity and operation choice.
 *
 * - `regroupementMode`:
 *     - `'atomic'` (college) — emit one `add-both-sides` per move, sequentially.
 *     - `'combined'` (lycée+) — emit ONE `transpose-terms` step combining both
 *       moves (x-terms one way, constants the other) with both operands shown
 *       in color simultaneously.
 * - `divisionMode`:
 *     - `'full'` (college) — emit `divide-both-sides`, displayed with the
 *       division operation in color and the simplified result.
 *     - `'compact'` (lycée+) — emit `simplify-coefficient`, displayed as the
 *       result equation only (no transformation block). The division is
 *       implicit in the title.
 * - `includeIdentify`: emit the initial `identify-equation` step.
 * - `mergeAll`: collapse everything into one top-level step with substeps.
 *   Currently used only for the legacy supérieur layout; under review.
 */
export interface GenerationStrategy {
	readonly regroupementMode: 'atomic' | 'combined';
	readonly divisionMode: 'full' | 'compact';
	readonly includeIdentify: boolean;
	readonly mergeAll?: boolean;
}

/**
 * Strategy table for the supported school levels. `primaire` is intentionally
 * absent (linear equations are not in the primary curriculum).
 */
export const STRATEGIES: Readonly<Record<LinearSchoolLevel, GenerationStrategy>> = {
	college: { regroupementMode: 'atomic', divisionMode: 'full', includeIdentify: true },
	lycee: { regroupementMode: 'combined', divisionMode: 'compact', includeIdentify: true },
	// Supérieur — provisoirement avec mergeAll en attendant l'arbitrage utilisateur
	superieur: {
		regroupementMode: 'combined',
		divisionMode: 'compact',
		includeIdentify: false,
		mergeAll: true
	}
};
