/**
 * Equation Solver - Main Entry Point
 *
 * Provides the main solve() function for solving equations.
 *
 * ## Supported equation types and completeness guarantees
 *
 * | Type                        | Solver              | Completeness              |
 * |-----------------------------|---------------------|---------------------------|
 * | Linear (ax+b=0)             | linearSolver        | Complete                  |
 * | Quadratic (ax²+bx+c=0)     | quadraticSolver     | Complete                  |
 * | Cubic (ax³+bx²+cx+d=0)     | polynomialSolver    | Complete (Cardano)        |
 * | Pure power (x^n=k)          | polynomialSolver    | Complete                  |
 * | Quartic (ax⁴+bx³+cx²+dx+e=0)| quarticSolver       | Complete (Ferrari)        |
 * | General polynomial deg > 4  | —                   | NOT supported             |
 * | Exponential (e^x=c)         | transcendentalSolver| Simple cases only         |
 * | Logarithmic (ln(x)=c)       | transcendentalSolver| Simple cases only         |
 * | Trigonometric (sin(x)=c)    | transcendentalSolver| Principal solution only   |
 * | Mixed (x·e^x=1, etc.)      | —                   | NOT supported             |
 *
 * ## Critical role in sign analysis
 *
 * The sign module (and the variations module above it) depends on solve finding
 * **all** zeros of an expression. If solve misses a zero, the sign analysis may
 * silently produce incorrect results (see sign/index.ts for details).
 *
 * ## Known gaps (affecting sign/variation correctness)
 *
 * 1. **Polynomials degree >= 5**: no general formula exists (Abel-Ruffini theorem).
 *    Needs numeric methods (Newton) + Sturm sequences for root counting.
 * 2. **Trigonometric solutions**: only the principal value is returned, not the
 *    full periodic family (x = arcsin(c) + 2kπ). For sign analysis on R, all
 *    zeros in the domain must be enumerated. The periodicity module
 *    (analysis/periodicity.ts) can detect periods and could be used to generate
 *    all zeros within a given interval.
 * 3. **Mixed transcendental equations** (x·sin(x)=0, e^x=x): not handled at all.
 *    Some can be decomposed (x·sin(x)=0 → x=0 or sin(x)=0), others require
 *    numeric methods.
 *
 * For the UbuMaths pedagogical scope (high school level), the most impactful
 * gap is trigonometric periodic solutions: derivatives like cos(x) have infinitely
 * many zeros and the current solver only returns one.
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
import { polynomialSolver } from './solvers/polynomial';
import { quarticSolver } from './solvers/quartic';
import { transcendentalSolver } from './solvers/transcendental';
import { normalize, normalFormsEquivalent } from '../normal';
import { number } from '../factory';

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Select the best solving strategy based on equation classification.
 *
 * Note: 'algebraic' means an exact closed-form solution exists.
 * 'numeric' means we'd need iterative methods (Newton, bisection, …).
 * Currently, 'numeric' strategy is declared but not fully implemented —
 * equations classified as numeric will typically fail to solve.
 */
function selectStrategy(classification: ClassificationResult): SolvingStrategy {
	switch (classification.type) {
		case 'linear':
		case 'quadratic':
			return 'algebraic';

		case 'polynomial':
			// Degree 3 (Cardano) and 4 (Ferrari) are algebraic.
			// Degree >= 5 needs numeric methods (Abel-Ruffini theorem).
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

		case 'polynomial':
			if (classification.degree === 4) return quarticSolver;
			return polynomialSolver;

		case 'exponential':
		case 'logarithmic':
		case 'trigonometric':
			return transcendentalSolver;

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
