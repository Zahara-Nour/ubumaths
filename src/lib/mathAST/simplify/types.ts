/**
 * Types for the Simplify Module
 *
 * @module mathAST/simplify/types
 */

import type { MathNode } from '../types';
import type { TypeContext } from '../numtype/types';
import type { Verbosity } from '../common/verbosity';
import type { BaseStep } from '../common/step-recorder-base';

// =============================================================================
// Options
// =============================================================================

/**
 * Options for the simplify pipeline.
 */
export interface SimplifyOptions {
	/** Type context with variable assumptions for conditional rules */
	readonly ctx?: TypeContext;

	/** Verbosity level for step recording */
	readonly verbosity?: Verbosity;

	/** Maximum iterations of the simplify loop (default: 10) */
	readonly maxIterations?: number;

	/** Enable trigonometric identity simplification (default: true) */
	readonly enableTrig?: boolean;

	/** Enable hyperbolic identity simplification (default: true) */
	readonly enableHyperbolic?: boolean;

	/** Enable algebraic identity simplification (default: true) */
	readonly enableAlgebraic?: boolean;

	/** Enable absolute value simplification (default: true) */
	readonly enableAbs?: boolean;

	/**
	 * Cooperative interruption signal. When aborted, simplify returns the best
	 * form found so far with `aborted: true` (no exception thrown). Combine
	 * freely with `timeoutMs`.
	 */
	readonly signal?: AbortSignal;

	/**
	 * Convenience: maximum wall-clock budget in milliseconds. Implemented via a
	 * `performance.now()` deadline captured at call time so it fires during
	 * synchronous simplify execution (an `AbortSignal.timeout` would be starved
	 * by the event loop). If `signal` is also provided, both are combined.
	 */
	readonly timeoutMs?: number;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Phase identifier for a simplify step.
 */
export type SimplifyPhase = 'rules' | 'normalize' | 'identity' | 'post-normalize';

/**
 * A recorded step in the simplification process.
 */
export interface SimplifyStep extends BaseStep {
	/** Which phase of the pipeline produced this step */
	readonly phase: SimplifyPhase;
}

/**
 * Result of the simplify pipeline.
 */
export interface SimplifyResult {
	/** The simplified expression (lowest cost found) */
	readonly result: MathNode;

	/** Recorded steps (filtered by verbosity) */
	readonly steps: readonly SimplifyStep[];

	/** Cost of the result expression */
	readonly cost: number;

	/**
	 * Set to `true` when simplification was interrupted before reaching fixpoint.
	 * In that case `result` is the best-cost form encountered up to the abort
	 * point, which may be the original input.
	 */
	readonly aborted?: boolean;
}
