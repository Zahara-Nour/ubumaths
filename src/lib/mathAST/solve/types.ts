/**
 * Equation Solver Types
 *
 * Type definitions for the equation solving module.
 *
 * @module mathAST/solve/types
 */

import type { MathNode } from '../types';

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
