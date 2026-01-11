/**
 * Integration Module Types
 *
 * Type definitions for the symbolic integration module.
 *
 * @module mathAST/integration/types
 */

import type { MathNode } from '../types';

// =============================================================================
// Integrand Classification
// =============================================================================

/**
 * Classification of integrand types for technique selection.
 */
export type IntegrandType =
	| 'polynomial' // ax^n + bx^(n-1) + ...
	| 'rational' // P(x)/Q(x)
	| 'trigonometric' // sin, cos, tan, etc.
	| 'exponential' // e^x, a^x
	| 'logarithmic' // ln(x), log_a(x)
	| 'inverse-trig' // arcsin, arccos, arctan
	| 'radical' // sqrt, nth roots
	| 'product' // f(x) * g(x)
	| 'composite' // f(g(x))
	| 'mixed' // combination of types
	| 'unknown'; // cannot classify

/**
 * Integration technique used to compute the antiderivative.
 */
export type IntegrationTechnique =
	| 'basic-rule' // Direct application of basic rules
	| 'u-substitution' // u = g(x) substitution
	| 'parts' // Integration by parts
	| 'partial-fractions' // Partial fraction decomposition
	| 'trig-substitution' // Trigonometric substitution
	| 'numeric'; // Numerical approximation

// =============================================================================
// Integration Status
// =============================================================================

/**
 * Status indicating the outcome of integration.
 */
export type IntegrationStatus =
	| 'exact' // Exact symbolic antiderivative found
	| 'approximate' // Numeric approximation only
	| 'unsupported'; // Cannot integrate

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
export type IntegrationVerbosity = Verbosity;

// =============================================================================
// Step Types
// =============================================================================

/**
 * A single step in the integration process (pedagogical).
 */
export interface IntegrateStep {
	/** Unique step ID */
	readonly id: number;

	/** Rule/technique applied */
	readonly rule: string;

	/** Description of this step in French */
	readonly description: string;

	/** Expression before this step */
	readonly before: MathNode;

	/** Expression after this step */
	readonly after: MathNode;

	/** Value used in the operation (e.g., substitution variable) */
	readonly operand?: MathNode;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: IntegrationVerbosity;

	/** Technical note (e.g., u = ..., du = ...) */
	readonly technicalNote?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of computing an indefinite integral.
 */
export interface IntegrateResult {
	/** The variable of integration */
	readonly variable: string;

	/** Status of the integration */
	readonly status: IntegrationStatus;

	/** The antiderivative F(x) such that F'(x) = f(x) */
	readonly antiderivative: MathNode | null;

	/** Integrand type that was detected */
	readonly integrandType: IntegrandType;

	/** Primary technique used to integrate */
	readonly technique: IntegrationTechnique;

	/** Step-by-step integration process for pedagogy */
	readonly steps: readonly IntegrateStep[];

	/** Error message if unsupported */
	readonly error?: string;

	/** Note about the constant of integration */
	readonly constantNote?: string;
}

/**
 * Result of computing a definite integral.
 */
export interface DefiniteIntegrateResult extends IntegrateResult {
	/** Lower bound of integration */
	readonly lowerBound: MathNode;

	/** Upper bound of integration */
	readonly upperBound: MathNode;

	/** Exact symbolic value of the definite integral */
	readonly value: MathNode | null;

	/** Numeric approximation if available */
	readonly approximate?: number;
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for the integrate function.
 */
export interface IntegrateOptions {
	/** Variable to integrate with respect to (default: auto-detect single variable) */
	readonly variable?: string;

	/** Verbosity level for step recording (default: 'summarized') */
	readonly verbosity?: IntegrationVerbosity;

	/** Maximum recursion depth for integration techniques (default: 10) */
	readonly maxDepth?: number;

	/** Allow numeric approximation as fallback (default: true) */
	readonly allowNumeric?: boolean;

	/** Number of intervals for Simpson's rule (default: 100) */
	readonly simpsonIntervals?: number;

	/** Whether to simplify the result (default: true) */
	readonly simplify?: boolean;

	/**
	 * Internal parameter to track recursion depth across integrate() calls.
	 * Used by integrators that call integrate() recursively.
	 * @internal
	 */
	readonly _depth?: number;
}

/**
 * Default integration options.
 */
export const DEFAULT_INTEGRATE_OPTIONS: Required<Omit<IntegrateOptions, 'variable' | '_depth'>> & {
	_depth: number | undefined;
} = {
	verbosity: 'summarized',
	maxDepth: 10,
	allowNumeric: true,
	simpsonIntervals: 100,
	simplify: true,
	_depth: undefined
};

// =============================================================================
// Step Recorder Interface
// =============================================================================

/**
 * Step recorder interface for integration process.
 */
export interface IntegrateStepRecorder {
	/**
	 * Record an integration step.
	 *
	 * @param rule - The rule key (e.g., 'power-rule')
	 * @param description - Human-readable description in French
	 * @param before - Expression before transformation
	 * @param after - Expression after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @param operand - Value used in the operation (optional)
	 * @param technicalNote - Technical note (optional)
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/**
	 * Record a step using a known rule (type-safe).
	 * Uses the default description from descriptions-fr.ts.
	 */
	recordStepByRule(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/**
	 * Record a step with a custom rule name.
	 * Uses a fallback description.
	 */
	recordCustomStep(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: IntegrationVerbosity,
		operand?: MathNode,
		technicalNote?: string
	): void;

	/** Get all recorded steps */
	getSteps(): readonly IntegrateStep[];

	/** Get steps filtered by verbosity level */
	getStepsFiltered(verbosity: IntegrationVerbosity): readonly IntegrateStep[];

	/** Clear all recorded steps */
	clear(): void;

	/** Number of recorded steps */
	readonly length: number;
}

// =============================================================================
// Integrator Interface
// =============================================================================

/**
 * Base interface for all integrators.
 */
export interface Integrator {
	/** Name of this integrator for debugging/logging */
	readonly name: string;

	/** Priority for integrator selection (higher = tried first) */
	readonly priority: number;

	/**
	 * Check if this integrator can handle the given expression.
	 *
	 * @param expr - The expression to integrate
	 * @param variable - The variable of integration
	 */
	canIntegrate(expr: MathNode, variable: string): boolean;

	/**
	 * Integrate the expression.
	 *
	 * @param expr - The expression to integrate
	 * @param variable - The variable of integration
	 * @param options - Integration options
	 * @param recorder - Step recorder for pedagogical output
	 * @param depth - Current recursion depth
	 */
	integrate(
		expr: MathNode,
		variable: string,
		options: Required<Omit<IntegrateOptions, 'variable'>>,
		recorder: IntegrateStepRecorder,
		depth: number
	): IntegrateResult;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when integration fails.
 */
export class IntegrationError extends Error {
	constructor(
		message: string,
		public readonly integrandType: IntegrandType,
		public readonly details?: string
	) {
		super(message);
		this.name = 'IntegrationError';
	}
}
