/**
 * Pedagogical Arithmetic — Types
 *
 * Domain-specific types for the arithmetic pedagogical pipeline. Distinct from
 * the algorithmic `evaluate()` orchestrator (which optimizes for correctness
 * and generality, not for paper-style reasoning).
 *
 * Design rationale (post-Phase 6 MVP) — see
 * `docs/wip/pedagogical-arithmetic-prompt.md` :
 *
 * `arithmetic-steps.ts` (legacy) emits one step per binary operation with
 * descriptions per `SchoolLevel`, but cannot adapt the STRUCTURE of the
 * computation. This pipeline introduces:
 *
 * - Pattern-based rules with `applicableLevels` and per-level descriptions.
 * - A target-aware orchestrator (`pipeline.ts`) that loads rule-sets based on
 *   `PedagogicalTarget.structure` (TargetForm) and post-processes for
 *   strict cosmetics (reduced fractions, signs, …).
 * - Optional `answerFormat` support extracting a fragment to highlight as the
 *   "answer to enter" (e.g. just the exponent in scientific notation).
 *
 * @module mathAST/pedagogical-arithmetic/types
 */

import type { MathNode } from '../types';
import type { Rule } from '../pattern/types';
import type { BaseStep } from '../common/step-recorder-base';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import type { PedagogicalTarget } from '../pedagogical-evaluate/types';

// =============================================================================
// Rule
// =============================================================================

/**
 * A pedagogical rule for arithmetic computation.
 *
 * Each rule pairs a transformation pattern (`Rule` from `pattern/types`) with
 * pedagogical metadata: which school levels it applies to, its priority in the
 * deterministic loop, and per-level descriptions.
 *
 * The `descriptions` and `explanations` are functions of the captured
 * bindings, so the rule can produce labels that depend on the matched values
 * (e.g. "On additionne 2 et 3" rather than a generic "Addition").
 */
export interface PedagogicalArithmeticRule {
	/** Unique identifier — used in `step.rule` and renderer lookup */
	readonly name: string;

	/** Pattern + rewrite logic (reuses `pattern/rule.createRule()`) */
	readonly rule: Rule;

	/** Which school levels this rule applies to */
	readonly applicableLevels: readonly SchoolLevel[];

	/**
	 * Priority — higher values are tried first by the deterministic engine.
	 * Convention :
	 *  - 200+ : grouping / structural rules (fired before atomic operations)
	 *  - 100  : atomic operations (binary add, sub, mul, div, …)
	 *  -  50  : cosmetic / cleanup rules (simplify-trivial, …)
	 *  -  10  : terminal rules added by the orchestrator (e.g. force-reduce
	 *           when target requires `reduced-fraction`)
	 */
	readonly priority: number;

	/**
	 * Description per school level. Falls back to `lycee` when absent.
	 *
	 * `bindings` are the values captured by the rule pattern (keyed by the
	 * placeholder name, e.g. `'a'`, `'b'`, `'n'`). May be empty for rules
	 * that match without capture.
	 */
	readonly descriptions: Partial<
		Record<SchoolLevel, (bindings: Record<string, MathNode>) => string>
	>;

	/**
	 * Optional pedagogical explanation per school level — only emitted when
	 * the renderer is invoked with `verbosity: 'detailed'`. Falls back to
	 * `lycee` when absent. Returns `undefined` to skip explanation entirely.
	 */
	readonly explanations?: Partial<
		Record<SchoolLevel, (bindings: Record<string, MathNode>) => string | undefined>
	>;
}

// =============================================================================
// Step
// =============================================================================

/**
 * A step recorded during pedagogical arithmetic evaluation.
 *
 * Extends `BaseStep` so it works with `GenericTechnicalRenderer` for free.
 * The `bindings` field captures the pattern match data so the renderer can
 * produce per-binding descriptions ("On additionne 2 et 3" rather than
 * "Addition").
 */
export interface PedagogicalArithmeticStep extends BaseStep {
	/** Pattern bindings captured at the moment the rule fired */
	readonly bindings?: Record<string, MathNode>;

	/**
	 * The full expression BEFORE this rule fired (when the pipeline can
	 * track it). When `before` represents only the sub-tree that changed
	 * (a "fragment"), `globalBefore` holds the whole expression so the
	 * renderer can display the calculation in context.
	 *
	 * Optional : steps emitted by the post-processing path (e.g. the
	 * `evaluate-final` fallback) leave it undefined and the renderer falls
	 * back to `before`.
	 */
	readonly globalBefore?: MathNode;

	/** The full expression AFTER this rule fired (counterpart of `globalBefore`). */
	readonly globalAfter?: MathNode;

	/**
	 * Sub-trees inside `globalBefore` to highlight in the rendering. When
	 * `undefined`, the renderer defaults to highlighting `step.before`
	 * (the single fragment that was rewritten). Populated explicitly by
	 * pipeline rules that transform MULTIPLE sub-trees in a single step
	 * (e.g. `group-multiplications-in-addition` highlights every `n*m`
	 * factor it just collapsed).
	 */
	readonly highlightSubTrees?: readonly MathNode[];

	/**
	 * Optional finer-grained substeps. Used by post-processing groupers
	 * (e.g. group-multiplications-in-addition) to expose the underlying
	 * atomic operations under a top-level summary step.
	 */
	readonly subSteps?: readonly PedagogicalArithmeticStep[];
}

// =============================================================================
// Result
// =============================================================================

/**
 * Output of running the pedagogical arithmetic pipeline.
 */
export interface PedagogicalArithmeticResult {
	/** Final node after all rule applications and post-processing */
	readonly finalNode: MathNode;

	/** Recorded steps (in order of application) */
	readonly steps: readonly PedagogicalArithmeticStep[];

	/** Effective target used (after extraction or override) — undefined if no target */
	readonly target?: PedagogicalTarget;

	/**
	 * When `target.answerFormat` is set, the fragment the student must enter.
	 * `latex` is the LaTeX representation of the value at `placeholderPath`,
	 * `placeholderPath` is the navigation path within the parsed answer-format
	 * AST (e.g. `['superscript']` for `'10^?'`).
	 */
	readonly answerFragment?: {
		readonly latex: string;
		readonly placeholderPath: readonly string[];
	};
}

// =============================================================================
// Generation Options
// =============================================================================

/**
 * Options for `generatePedagogicalArithmeticSteps()`.
 *
 * `target` overrides the auto-extraction from a `QuestionInstance`. When
 * neither is provided, the pipeline runs with no target-driven heuristics.
 */
export interface PedagogicalArithmeticOptions {
	/** Target school level — drives rule filtering and step granularity */
	readonly schoolLevel: SchoolLevel;

	/**
	 * Aggregated target derived from the question parameters (or supplied
	 * directly). Drives rule-set selection and post-processing.
	 */
	readonly target?: PedagogicalTarget;

	/**
	 * Verbosity level — affects which steps are emitted by the renderer.
	 * Default: `'detailed'`.
	 */
	readonly verbosity?: Verbosity;

	/** External AbortSignal for cooperative interruption */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms */
	readonly timeoutMs?: number;

	/**
	 * Track C — enables the `simplify-square-root-of-square` rule
	 * (`√(x²) → |x|`). Off by default (decision C-1) because the rule
	 * produces an absolute value that may surprise authors whose questions
	 * implicitly assume `x ≥ 0` (lengths, magnitudes, norms). Authors who
	 * want the formal `|x|` (e.g. lycée+ proofs) opt in explicitly.
	 */
	readonly enableSquareRootOfSquare?: boolean;
}
