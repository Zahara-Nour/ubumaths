/**
 * Equation Solver - Main Entry Point
 *
 * Provides the main solve() function for solving equations.
 *
 * @module mathAST/solve/solve
 */

import type { MathNode, RelationNode } from '../types';
import type {
	SolveResult,
	SolveOptions,
	ClassificationResult,
	SolvingStrategy,
	EquationSolver
} from './types';
import { DEFAULT_SOLVE_OPTIONS, SolveError } from './types';
import { isRelation } from '../guards';
import { classifyEquation, toStandardForm, detectVariable } from './classify';
import { createStepRecorder } from './step-recorder';
import { linearSolver } from './solvers/linear';
import { quadraticSolver } from './solvers/quadratic';
import { normalize, normalFormsEquivalent } from '../normal';
import { number } from '../factory';

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Select the best solving strategy based on equation classification.
 */
function selectStrategy(classification: ClassificationResult): SolvingStrategy {
	switch (classification.type) {
		case 'linear':
		case 'quadratic':
			return 'algebraic';

		case 'polynomial':
			// Higher degree polynomials may need numeric methods
			return classification.degree && classification.degree <= 4 ? 'algebraic' : 'numeric';

		case 'exponential':
		case 'logarithmic':
			// Simple cases can be algebraic
			return 'algebraic';

		case 'trigonometric':
		case 'mixed':
			// Usually need numeric methods
			return 'numeric';

		default:
			return 'numeric';
	}
}

/**
 * Select the appropriate solver based on classification.
 */
function selectSolver(classification: ClassificationResult): EquationSolver | null {
	switch (classification.type) {
		case 'linear':
			return linearSolver;

		case 'quadratic':
			return quadraticSolver;

		// Future: case 'polynomial': return polynomialSolver;
		// Future: case 'exponential':
		// Future: case 'logarithmic':
		// Future: case 'trigonometric':
		// Future:   return transcendentalSolver;

		default:
			return null;
	}
}

// =============================================================================
// Constant Equation Handler
// =============================================================================

/**
 * Handle constant equations (no variable).
 * - If expr = 0, the equation is always true (infinite solutions)
 * - If expr ≠ 0, the equation is always false (no solution)
 */
function handleConstantEquation(
	expr: MathNode,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	}
): SolveResult {
	const recorder = createStepRecorder();
	const zeroNorm = normalize(number('0'));
	const exprNorm = normalize(expr);

	if (normalFormsEquivalent(exprNorm, zeroNorm)) {
		// 0 = 0: infinite solutions
		recorder.recordStep(
			'infinite-solutions',
			"L'equation 0 = 0 est toujours vraie",
			expr,
			expr,
			'summarized'
		);
		return {
			variable: '',
			status: 'infinite',
			solutions: [],
			equationType: 'constant',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	// c = 0 where c ≠ 0: no solution
	recorder.recordStep(
		'no-solution',
		"L'equation est une contradiction (constante non nulle = 0)",
		expr,
		expr,
		'summarized'
	);
	return {
		variable: '',
		status: 'no-solution',
		solutions: [],
		equationType: 'constant',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Main Solve Function
// =============================================================================

/**
 * Solve an equation for a specified variable.
 *
 * This is the main entry point for equation solving.
 *
 * @param equation - The equation to solve (RelationNode with '=' relation)
 * @param options - Solving options
 * @returns SolveResult with solutions and metadata
 *
 * @example
 * ```typescript
 * // Solve 2x + 4 = 0
 * const eq = equals(add(multiply(number('2'), variable('x')), number('4')), number('0'));
 * const result = solve(eq);
 * // result.solutions = [{ value: number('-2'), exact: true }]
 * ```
 *
 * @example
 * ```typescript
 * // Solve with detailed steps
 * const result = solve(eq, { verbosity: 'detailed' });
 * result.steps.forEach(step => console.log(step.description));
 * ```
 */
export function solve(equation: RelationNode, options?: SolveOptions): SolveResult {
	// Merge options with defaults
	const opts = {
		...DEFAULT_SOLVE_OPTIONS,
		...options
	};

	// Validate input: must be a relation with '='
	if (!isRelation(equation)) {
		throw new SolveError("L'entree doit etre une equation", 'unknown', 'Expected RelationNode');
	}

	if (equation.relation !== '=') {
		throw new SolveError(
			'Seules les egalites peuvent etre resolues',
			'unknown',
			`Relation recue: ${equation.relation}`
		);
	}

	// Convert to standard form: f(x) = 0
	const expr = toStandardForm(equation);

	// Detect variable if not specified
	const variable = opts.variable ?? detectVariable(equation);

	// Handle constant equations (no variable)
	if (!variable) {
		return handleConstantEquation(expr, opts);
	}

	// Classify the equation
	const classification = classifyEquation(equation, variable);

	// Select solving strategy
	const strategy = selectStrategy(classification);

	// Create step recorder
	const recorder = createStepRecorder();

	// Select and run appropriate solver
	const solver = selectSolver(classification);

	if (!solver) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: classification.type,
			strategy,
			steps: recorder.getStepsFiltered(opts.verbosity),
			error: `Type d'equation non supporte: ${classification.type}`
		};
	}

	// Run the solver
	const result = solver.solve(expr, variable, opts, recorder);

	return {
		...result,
		equationType: classification.type,
		strategy,
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

/**
 * Solve an equation from a MathNode (must be a RelationNode).
 * Convenience function that validates the input type.
 */
export function solveEquation(node: MathNode, options?: SolveOptions): SolveResult {
	if (!isRelation(node)) {
		throw new SolveError(
			"L'entree doit etre une equation (ex: 2x + 3 = 0)",
			'unknown',
			`Type recu: ${node.type}`
		);
	}

	return solve(node, options);
}
