/**
 * solveInequality — Types
 *
 * @module mathAST/solve/inequality/types
 */

import type { MathNode } from '../../types';
import type { Domain } from '../../domain/types';
import type { SignAnalysisResult } from '../../sign/types';

/**
 * Operators supported by `solveInequality`. Equality (`=`) is rejected and
 * routed to the equation solver.
 */
export type InequalityOp = '<' | '>' | '<=' | '>=' | '!=';

/**
 * Options for `solveInequality`.
 */
export interface SolveInequalityOptions {
	/** Variable to solve for. Auto-detected if omitted. */
	readonly variable?: string;

	/**
	 * Restrict the solution to a user-provided domain. Intersected with the
	 * computed domain of definition.
	 */
	readonly domain?: Domain;

	/**
	 * Allow `analyzeSign` to fall back to numeric sampling when algebraic
	 * sign determination returns 'unknown'. Default: true.
	 */
	readonly numericFallback?: boolean;

	/**
	 * If true, throw `SolveInequalityError` when at least one sub-interval
	 * remains 'unknown' (status would be 'partial'). Default: false.
	 */
	readonly strictMode?: boolean;

	/** Tolerance forwarded to `analyzeSign`. Default: 1e-10. */
	readonly tolerance?: number;
}

/**
 * Status of a `solveInequality` result.
 *
 * - `'complete'`     all sub-intervals were decided algebraically or by sampling.
 * - `'partial'`      at least one sub-interval remained 'unknown'; `warnings` populated.
 * - `'no-solution'`  the solution set is empty (e.g. `x² + 1 < 0`).
 * - `'all-real'`     the solution covers the whole domain of definition.
 * - `'empty-domain'` the domain of definition is empty (no x satisfies even the type constraints).
 */
export type InequalityStatus = 'complete' | 'partial' | 'no-solution' | 'all-real' | 'empty-domain';

/**
 * Result of `solveInequality`.
 */
export interface SolveInequalityResult {
	/** Variable solved for. */
	readonly variable: string;

	/** Operator from the input relation. */
	readonly relation: InequalityOp;

	/** Standard-form expression `f − g` (canonicalized) used internally. */
	readonly expression: MathNode;

	/** Domain of definition of `expression`, intersected with `options.domain` if any. */
	readonly domain: Domain;

	/** Solution set (the actual answer). Bounds are exact symbolic MathNodes. */
	readonly solution: Domain;

	/** Status describing completeness and shape of the solution. */
	readonly status: InequalityStatus;

	/** Warnings emitted by `analyzeSign` or by this wrapper. */
	readonly warnings?: readonly string[];

	/** Underlying sign-analysis result, exposed for debugging and future pedagogy. */
	readonly signTable?: SignAnalysisResult;
}

/**
 * Thrown for misuse: relation is `=`, no variable detectable in a non-constant
 * expression, etc.
 */
export class SolveInequalityError extends Error {
	constructor(
		message: string,
		public readonly details?: string
	) {
		super(message);
		this.name = 'SolveInequalityError';
	}
}

/**
 * Thrown when the inequality is well-formed but out of V1 scope: parametric
 * coefficients (free variables other than the unknown), and any case the
 * underlying pipeline cannot decide while `strictMode` is set.
 */
export class InequalityNotSolvable extends Error {
	constructor(
		message: string,
		public readonly reason?: string
	) {
		super(message);
		this.name = 'InequalityNotSolvable';
	}
}
