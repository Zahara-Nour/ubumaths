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
 * over the operations the linear AND quadratic pipelines emit.
 *
 * Linear-only kinds: `add-both-sides`, `subtract-both-sides`,
 * `multiply-both-sides`, `divide-both-sides`, `transpose-terms`,
 * `simplify-coefficient`, `group-variable-terms`, `group-constants`,
 * `reduce-to-canonical`, `read-solution`.
 *
 * Quadratic-only kinds (Phase 1): `standardize`, `identify-coefficients`,
 * `compute-discriminant`, `discriminant-{positive,zero,negative}`,
 * `apply-quadratic-formula`, `simplify-solutions`, `read-solutions`,
 * `recognize-no-linear-term`, `recognize-no-constant-term`,
 * `recognize-factored`, `isolate-square`, `extract-square-root`,
 * `factor-common-x`, `zero-product`, `solve-each-factor`, `no-real-solution`.
 *
 * Shared kinds: `identify-equation` (carries `equationType`), `simplify`.
 */
export type EquationOperation =
	// =============================================================================
	// Shared kinds
	// =============================================================================
	/** Initial classification — no transformation, just labels the equation. */
	| { readonly kind: 'identify-equation'; readonly equationType: 'linear' | 'quadratic' }
	/** Simplify a side (collecting like terms, evaluating arithmetic). */
	| { readonly kind: 'simplify'; readonly side: 'left' | 'right' | 'both' }

	// =============================================================================
	// Linear pipeline kinds
	// =============================================================================
	/** Add the same expression to both sides. */
	| { readonly kind: 'add-both-sides'; readonly operand: MathNode }
	/** Subtract the same expression from both sides. */
	| { readonly kind: 'subtract-both-sides'; readonly operand: MathNode }
	/**
	 * Multiply both sides by the same expression. For inequalities, set
	 * `flipOperator: true` when the operand is a numerically negative scalar
	 * (the renderer adds the « changement de sens » note).
	 */
	| {
			readonly kind: 'multiply-both-sides';
			readonly operand: MathNode;
			readonly flipOperator?: boolean;
	  }
	/**
	 * Divide both sides by the same (non-zero) expression. For inequalities,
	 * set `flipOperator: true` when the operand is a numerically negative
	 * scalar (the renderer adds the « changement de sens » note).
	 */
	| {
			readonly kind: 'divide-both-sides';
			readonly operand: MathNode;
			readonly flipOperator?: boolean;
	  }
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
	 * simplifiant le coefficient de x"). For inequalities, set
	 * `flipOperator: true` when the coefficient is a numerically negative
	 * scalar.
	 */
	| {
			readonly kind: 'simplify-coefficient';
			readonly coefficient: MathNode;
			readonly flipOperator?: boolean;
	  }
	/**
	 * Top-level grouping step (lycée-level abstraction). Substeps contain
	 * the actual add/subtract/simplify operations.
	 */
	| { readonly kind: 'group-variable-terms'; readonly variable: string }
	/** Top-level grouping for constants (counterpart to group-variable-terms). */
	| { readonly kind: 'group-constants' }
	/** Top-level abstraction: full reduction to canonical form `ax = b`. */
	| { readonly kind: 'reduce-to-canonical' }
	/** Final: read off the solution from `x = …` (linear). */
	| { readonly kind: 'read-solution'; readonly variable: string; readonly value: MathNode }

	// =============================================================================
	// Quadratic pipeline kinds (Phase 1)
	// =============================================================================
	/**
	 * Transpose every term from the right side into the left side so the
	 * equation reads `f(x) = 0`. Emitted only when the input is not already in
	 * standard form (e.g. `x² + 2 = x + 8` → `x² − x − 6 = 0`).
	 */
	| { readonly kind: 'standardize'; readonly from: 'free-form' }
	/** Identify the coefficients a, b, c of `ax² + bx + c = 0`. */
	| {
			readonly kind: 'identify-coefficients';
			readonly a: MathNode;
			readonly b: MathNode;
			readonly c: MathNode;
	  }
	/**
	 * Compute the discriminant `Δ = b² − 4ac`. The `discriminant` field carries
	 * the simplified MathNode (e.g. `1`); `numericValue` is its numeric value
	 * when computable (`1`), used by the renderer to expand square roots.
	 */
	| {
			readonly kind: 'compute-discriminant';
			readonly a: MathNode;
			readonly b: MathNode;
			readonly c: MathNode;
			readonly discriminant: MathNode;
			readonly numericValue?: number;
	  }
	/** Narrative step announcing Δ > 0 ⇒ two distinct real solutions. */
	| {
			readonly kind: 'discriminant-positive';
			readonly discriminant: MathNode;
			readonly numericValue?: number;
	  }
	/** Narrative step announcing Δ = 0 ⇒ one double solution. */
	| {
			readonly kind: 'discriminant-zero';
			readonly discriminant: MathNode;
			readonly numericValue?: number;
	  }
	/** Narrative step announcing Δ < 0 ⇒ no real solution. */
	| {
			readonly kind: 'discriminant-negative';
			readonly discriminant: MathNode;
			readonly numericValue?: number;
	  }
	/**
	 * Apply the quadratic formula. Carries the inputs needed to render
	 * `x = (−b ± √Δ) / (2a)` (or `x = −b / (2a)` for the double-root case)
	 * and the raw solutions before simplification.
	 */
	| {
			readonly kind: 'apply-quadratic-formula';
			readonly a: MathNode;
			readonly b: MathNode;
			readonly discriminant: MathNode;
			readonly case: 'two-distinct' | 'double';
			/** Raw, unsimplified solutions derived directly from the formula. */
			readonly solutions: readonly MathNode[];
	  }
	/**
	 * Simplify the raw solutions produced by `apply-quadratic-formula` to
	 * canonical forms. Carries both the raw and simplified arrays so the
	 * renderer can display the transition without cross-step lookup.
	 */
	| {
			readonly kind: 'simplify-solutions';
			readonly rawSolutions: readonly MathNode[];
			readonly solutions: readonly MathNode[];
	  }
	/**
	 * Final read-off of the solution set `S = {x₁, x₂}` (or `{x₀}` /
	 * `\emptyset`). Plural counterpart to `read-solution` (linear).
	 */
	| {
			readonly kind: 'read-solutions';
			readonly variable: string;
			readonly solutions: readonly MathNode[];
	  }
	/**
	 * Special-case detection: `ax² + c = 0` (no linear term, b = 0).
	 * @see isolate-square — emitted next once detected.
	 */
	| { readonly kind: 'recognize-no-linear-term' }
	/**
	 * Special-case detection: `ax² + bx = 0` (no constant term, c = 0).
	 * @see factor-common-x — emitted next once detected.
	 */
	| { readonly kind: 'recognize-no-constant-term' }
	/**
	 * Special-case detection: input already factored, e.g. `(x − 2)(x + 3) = 0`.
	 * @see zero-product — emitted next once detected.
	 */
	| { readonly kind: 'recognize-factored'; readonly factors: readonly MathNode[] }
	/** b = 0 path — isolate the square: `ax² + c = 0` ⇒ `x² = −c/a`. */
	| { readonly kind: 'isolate-square'; readonly rhs: MathNode }
	/** b = 0 path — extract the square root: `x² = k` ⇒ `x = ±√k`. */
	| { readonly kind: 'extract-square-root'; readonly argument: MathNode }
	/** c = 0 path — factorise common x: `ax² + bx = 0` ⇒ `x(ax + b) = 0`. */
	| { readonly kind: 'factor-common-x'; readonly remainder: MathNode }
	/**
	 * Apply the zero-product property: `A · B = 0` ⇒ `A = 0 ou B = 0`. Used by
	 * both the c = 0 path and the already-factored path.
	 */
	| { readonly kind: 'zero-product'; readonly factors: readonly MathNode[] }
	/**
	 * Solve each linear factor and aggregate the solutions. The `pairs` field
	 * is named distinctly from the `solutions: readonly MathNode[]` of other
	 * kinds because each entry pairs a factor with its solution `(factor, value)`.
	 */
	| {
			readonly kind: 'solve-each-factor';
			readonly pairs: readonly { readonly factor: MathNode; readonly value: MathNode }[];
	  }
	/** Final outcome when Δ < 0 (in ℝ): `S = ∅`. */
	| { readonly kind: 'no-real-solution' }
	/**
	 * V1.1 — Divide both sides by the GCD of the (integer) coefficients before
	 * applying the discriminant or the factorisation. Emitted when
	 * `gcd(|a|, |b|, |c|) > 1` and all coefficients are integers.
	 *
	 * Example : `3x² − 3x − 18 = 0` ⇒ gcd = 3 ⇒ `x² − x − 6 = 0`.
	 */
	| {
			readonly kind: 'factor-gcd';
			readonly gcd: MathNode;
			readonly simplified: MathNode;
	  }

	// =============================================================================
	// Linear inequality pipeline kinds (palier 2a)
	// =============================================================================
	/**
	 * Final step of a degenerate linear inequality (`a = 0`), where the
	 * resulting relation is constant on both sides (e.g. `0 < 4`, `7 < 3`).
	 * The renderer reads `truth` to display "toujours vraie ⇒ S = ℝ" or
	 * "contradiction ⇒ S = ∅".
	 */
	| {
			readonly kind: 'inequality-conclude-truth';
			readonly truth: boolean;
	  }

	// =============================================================================
	// Quadratic inequality pipeline kinds (palier 2b)
	// =============================================================================
	/**
	 * Sign table for a quadratic polynomial `ax² + bx + c`.
	 *
	 * Carries the structural data needed to render the table :
	 * - `a` — coefficient dominant (drives the sign at ±∞)
	 * - `roots` — 0, 1, or 2 exact roots (corresponding to Δ < 0, Δ = 0, Δ > 0)
	 * - `variable` — the unknown name (for column header)
	 *
	 * The renderer turns this into a `\begin{array}{c|...}` LaTeX block (lycée)
	 * and an ASCII table for CLI output.
	 */
	| {
			readonly kind: 'quadratic-sign-table';
			readonly a: MathNode;
			readonly roots: readonly MathNode[];
			readonly variable: string;
	  }
	/**
	 * Final step of a quadratic inequality : reads the solution set from
	 * the sign table and the operator. Carries both a human-readable
	 * description (`"]2, 3["`) and the structural `Domain` (from
	 * `solveInequality`, palier 1) so consumers can post-process.
	 */
	| {
			readonly kind: 'inequality-conclude-quadratic';
			readonly relation: '<' | '>' | '<=' | '>=' | '!=';
			readonly solutionDescription: string;
	  }
	/**
	 * Final step of a `b = 0` quadratic inequality after the `isolate-square`
	 * step has reduced the form to `x² ⊻ k`. The renderer formats the
	 * conclusion directly without going through a sign table — this is the
	 * pedagogical fast-path used by palier 2c when `b = 0`.
	 *
	 * The renderer reads `solutionDescription` (Unicode-safe, post-processed
	 * by `escapeLatexBacktickFreeText`) for both the title and the LaTeX
	 * expression. `relation` is the inequality's operator AS DISPLAYED on the
	 * isolated form (already flipped if `a < 0`).
	 */
	| {
			readonly kind: 'inequality-conclude-from-isolated-square';
			readonly relation: '<' | '>' | '<=' | '>=' | '!=';
			readonly solutionDescription: string;
	  };

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

/**
 * Options for `generateLinearInequalitySteps`. Same shape as
 * `LinearEquationStepsOptions` — the linear inequality pipeline reuses the
 * same `STRATEGIES` table to drive granularity.
 */
export interface LinearInequalityStepsOptions {
	readonly level: LinearSchoolLevel;
	readonly includeSubSteps?: boolean;
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

// =============================================================================
// Quadratic Pipeline (Phase 1)
// =============================================================================

/**
 * School levels that quadratic equations apply to. Excludes BOTH `primaire`
 * AND `college` — the second-degree formula is not in the curriculum before
 * 1ère (lycée). The renderer will refuse these levels at runtime to mirror
 * the type-level constraint.
 */
export type QuadraticSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>;

/**
 * Options for `generateQuadraticEquationSteps`.
 */
export interface QuadraticEquationStepsOptions {
	/** Target school level — drives top-level granularity. `primaire`/`college` excluded. */
	readonly level: QuadraticSchoolLevel;
	/**
	 * Include `subSteps` for drill-down. Default `true`.
	 * Set to `false` for a flat output (e.g. for tests, logs).
	 */
	readonly includeSubSteps?: boolean;
	/** Variable to solve for. Auto-detected if omitted. */
	readonly variable?: string;
}

/**
 * Options for `generateQuadraticInequalitySteps` (palier 2b). Same shape as
 * `QuadraticEquationStepsOptions` — reuses the `STRATEGIES_QUADRATIC` table.
 */
export interface QuadraticInequalityStepsOptions {
	readonly level: QuadraticSchoolLevel;
	readonly includeSubSteps?: boolean;
	readonly variable?: string;
}

/**
 * Per-level strategy controlling step granularity for the quadratic pipeline.
 *
 * - `includeIdentify`: emit the initial `identify-equation` step.
 * - `emitSeparateDiscriminantSign`: when `true` (lycée), emit a dedicated
 *   `discriminant-{positive,zero,negative}` step right after
 *   `compute-discriminant`. When `false` (supérieur), the sign declaration
 *   is folded into the `compute-discriminant` description and no separate
 *   step is produced.
 * - `mergeAll`: optionally collapse top-level steps under a single wrapper
 *   step with sub-steps (currently unused — reserved for future supérieur
 *   layouts).
 */
export interface QuadraticGenerationStrategy {
	readonly includeIdentify: boolean;
	readonly emitSeparateDiscriminantSign: boolean;
	readonly mergeAll?: boolean;
}

/**
 * Strategy table for the supported school levels. `primaire` and `college`
 * are intentionally absent (the quadratic formula is not in the syllabus
 * before 1ère).
 */
export const STRATEGIES_QUADRATIC: Readonly<
	Record<QuadraticSchoolLevel, QuadraticGenerationStrategy>
> = {
	lycee: { includeIdentify: true, emitSeparateDiscriminantSign: true },
	superieur: { includeIdentify: false, emitSeparateDiscriminantSign: false }
};
