/**
 * Equation Solver Types
 *
 * Type definitions for the equation solving module.
 *
 * ## Role in the sign/variation analysis chain
 *
 * The solve module is the **critical dependency** of the sign module: sign analysis
 * assumes that solve finds ALL zeros of an expression. If a zero is missed, the
 * sign table (and the variation table above it) may be silently incorrect.
 *
 * See solve.ts for the full completeness table and known gaps.
 *
 * @module mathAST/solve/types
 */

import type { MathNode } from '../types';
import type { Domain } from '../domain/types';

// =============================================================================
// Equation Classification
// =============================================================================

/**
 * Classification of equation types for strategy selection.
 */
export type EquationType =
	| 'constant' // c = 0 (no variable)
	| 'linear' // ax + b = 0
	| 'quadratic' // ax^2 + bx + c = 0
	| 'polynomial' // higher degree polynomials
	| 'exponential' // involving exp/e^x
	| 'logarithmic' // involving ln/log
	| 'trigonometric' // involving sin/cos/tan
	| 'mixed' // combination of types
	| 'unknown'; // cannot classify

/**
 * Solving strategy to use.
 */
export type SolvingStrategy = 'algebraic' | 'numeric';

// =============================================================================
// Solution Status
// =============================================================================

/**
 * Solution status indicating outcome type.
 */
export type SolutionStatus =
	| 'unique' // Single unique solution
	| 'multiple' // Finite set of solutions
	| 'infinite' // Infinite solutions (identity)
	| 'no-solution' // No solution exists (contradiction)
	| 'no-real-solution' // Complex solutions only
	| 'approximate'; // Numeric approximation

// =============================================================================
// Verbosity Levels
// =============================================================================

import type { Verbosity } from '../common/verbosity.js';

/**
 * Verbosity levels for step recording.
 * Alias to the common Verbosity type for backwards compatibility.
 *
 * @see Verbosity in common/verbosity.ts
 */
export type SolvingVerbosity = Verbosity;

// =============================================================================
// Solution Types
// =============================================================================

/**
 * A single solution value with optional domain restriction.
 */
export interface Solution {
	/** The solution as a MathNode */
	readonly value: MathNode;

	/** Numeric approximation if available */
	readonly approximate?: number;

	/** Whether this is an exact or approximate solution */
	readonly exact: boolean;

	/** Domain restriction for this solution (e.g., x > 0) */
	readonly condition?: MathNode;
}

/**
 * A single step in the solving process (pedagogical).
 */
export interface SolveStep {
	/** Unique step ID */
	readonly id: number;

	/** Rule/technique applied */
	readonly rule: string;

	/** Description of this step in French */
	readonly description: string;

	/** Expression/equation before this step */
	readonly before: MathNode;

	/** Expression/equation after this step */
	readonly after: MathNode;

	/** Value used in the operation (if applicable) */
	readonly operand?: MathNode;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: SolvingVerbosity;

	/** Domain note if this step introduces restrictions */
	readonly domainNote?: string;
}

/**
 * Periodic solution family for trigonometric equations.
 *
 * For an equation like sin(ax+b) = c, the full solution set is:
 *   x = baseSolution_i + k * period,  for k ∈ ℤ
 *
 * The baseSolutions contain the distinct solutions within one period,
 * and `period` is the repetition interval.
 *
 * Used by the sign module to enumerate all zeros within a bounded domain.
 */
export interface PeriodicSolutionFamily {
	/** Base solutions within one period (in x-space) */
	readonly baseSolutions: readonly Solution[];

	/** Period as a symbolic MathNode (e.g., 2π, π) */
	readonly period: MathNode;

	/** Numeric approximation of the period */
	readonly periodNumeric: number;
}

/**
 * Result of solving an equation.
 */
export interface SolveResult {
	/** The variable being solved for */
	readonly variable: string;

	/** Status of the solution */
	readonly status: SolutionStatus;

	/** List of solutions (empty if no-solution) */
	readonly solutions: readonly Solution[];

	/** Equation type that was detected */
	readonly equationType: EquationType;

	/** Strategy used to solve */
	readonly strategy: SolvingStrategy;

	/** Step-by-step solving process for pedagogy */
	readonly steps: readonly SolveStep[];

	/** Error message if unsupported */
	readonly error?: string;

	/** Periodicity note for trigonometric solutions */
	readonly periodicityNote?: string;

	/** Periodic solution family for trig equations (used by sign module for zero enumeration) */
	readonly periodicSolutions?: PeriodicSolutionFamily;

	/** Domain of definition of the expression (where the equation is defined) */
	readonly domain?: Domain;
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for the solve function.
 */
export interface SolveOptions {
	/** Variable to solve for (default: auto-detect single variable) */
	readonly variable?: string;

	/** Restrict solution search to this domain (intersected with computed domain) */
	readonly domain?: Domain;

	/** Verbosity level for step recording (default: 'summarized') */
	readonly verbosity?: SolvingVerbosity;

	/** Maximum iterations for numeric solver (default: 100) */
	readonly maxIterations?: number;

	/** Tolerance for numeric solver (default: 1e-10) */
	readonly tolerance?: number;

	/** Significant digits for numeric display (default: 10) */
	readonly precision?: number;

	/** Initial guesses for numeric solver */
	readonly initialGuesses?: readonly number[];
}

/**
 * Default solve options.
 */
export const DEFAULT_SOLVE_OPTIONS: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> = {
	verbosity: 'summarized',
	maxIterations: 100,
	tolerance: 1e-10,
	precision: 10
};

// =============================================================================
// Classification Result
// =============================================================================

/**
 * Classification result with metadata.
 */
export interface ClassificationResult {
	/** Primary equation type */
	readonly type: EquationType;

	/** Detected variables in the equation */
	readonly variables: readonly string[];

	/** For polynomials: the degree */
	readonly degree?: number;

	/** Confidence level */
	readonly confidence: 'certain' | 'likely' | 'uncertain';
}

// =============================================================================
// Solver Interface
// =============================================================================

/**
 * Step recorder interface for solving process.
 */
export interface SolveStepRecorder {
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: SolvingVerbosity,
		operand?: MathNode,
		domainNote?: string
	): void;

	getSteps(): readonly SolveStep[];
	getStepsFiltered(verbosity: SolvingVerbosity): readonly SolveStep[];
	clear(): void;
	readonly length: number;
}

/**
 * Base interface for all equation solvers.
 */
export interface EquationSolver {
	/** Name of this solver for debugging/logging */
	readonly name: string;

	/** Check if this solver can handle the given expression */
	canSolve(expr: MathNode, variable: string): boolean;

	/** Solve the equation expr = 0 for variable */
	solve(
		expr: MathNode,
		variable: string,
		options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
			initialGuesses?: readonly number[];
		},
		recorder: SolveStepRecorder
	): SolveResult;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when solving fails.
 */
export class SolveError extends Error {
	constructor(
		message: string,
		public readonly equationType: EquationType,
		public readonly details?: string
	) {
		super(message);
		this.name = 'SolveError';
	}
}
