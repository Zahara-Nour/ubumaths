/**
 * Equation Solver Module
 *
 * Provides equation solving capabilities for MathAST.
 *
 * @module mathAST/solve
 */

// =============================================================================
// Types
// =============================================================================

export type {
	EquationType,
	SolvingStrategy,
	SolutionStatus,
	SolvingVerbosity,
	Solution,
	SolveStep,
	SolveResult,
	SolveOptions,
	ClassificationResult,
	EquationSolver,
	SolveStepRecorder
} from './types';

export { DEFAULT_SOLVE_OPTIONS, SolveError } from './types';

// =============================================================================
// Classification
// =============================================================================

export {
	classifyEquation,
	toStandardForm,
	detectVariable,
	getPolynomialDegree,
	isPolynomialIn,
	containsTranscendental,
	getTranscendentalType
} from './classify';

// =============================================================================
// Step Recording
// =============================================================================

export { createStepRecorder, shouldIncludeStep, SolvingStepRecorderImpl } from './step-recorder';

// =============================================================================
// Descriptions
// =============================================================================

export {
	getRuleDescription,
	describeSubtract,
	describeAdd,
	describeDivide,
	describeMultiply,
	describeCoefficients,
	describeDiscriminant,
	describeSolution,
	describeNewtonIteration,
	describeConvergence,
	describeVerification,
	DOMAIN_MESSAGES,
	PERIODICITY_NOTES
} from './descriptions-fr';

// =============================================================================
// Solvers
// =============================================================================

export { linearSolver } from './solvers/linear';
export { ALL_SOLVERS, getSolverByName } from './solvers';

// =============================================================================
// Main API
// =============================================================================

export { solve, solveEquation } from './solve';
