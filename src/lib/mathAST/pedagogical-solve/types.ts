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
 * Options for `generateLinearEquationSteps`.
 */
export interface LinearEquationStepsOptions {
	/** Target school level — drives top-level granularity */
	readonly level: SchoolLevel;
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
 * Per-level strategy controlling top-level granularity. The actual generation
 * always knows the full step tree internally; `STRATEGIES[level]` decides which
 * sub-operations get promoted to top-level steps.
 *
 * - `groupRegroupement`: when `true`, the regroupement operations (move x-terms
 *   left, move constants right) are wrapped in a single top-level step. When
 *   `false`, each operation appears as a separate top-level step.
 * - `groupDivision`: similarly for the final division.
 * - `includeIdentify`: emit the initial `identify-equation` step.
 * - `mergeAll`: when `true`, EVERYTHING (regroupement + division + solution)
 *   is collapsed into one top-level step with all substeps inside. Used at
 *   `superieur` level for ultra-condensed display. Implies `groupRegroupement`
 *   and `groupDivision` semantically.
 */
export interface GenerationStrategy {
	readonly groupRegroupement: boolean;
	readonly groupDivision: boolean;
	readonly includeIdentify: boolean;
	readonly mergeAll?: boolean;
}

/**
 * Strategy table — `primaire` falls back to `college` since linear algebra
 * is not in the primaire curriculum.
 */
export const STRATEGIES: Readonly<Record<SchoolLevel, GenerationStrategy>> = {
	primaire: { groupRegroupement: false, groupDivision: false, includeIdentify: true },
	college: { groupRegroupement: false, groupDivision: false, includeIdentify: true },
	lycee: { groupRegroupement: true, groupDivision: false, includeIdentify: false },
	superieur: {
		groupRegroupement: true,
		groupDivision: true,
		includeIdentify: false,
		mergeAll: true
	}
};
