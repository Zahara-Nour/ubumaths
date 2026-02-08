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
 * | Trigonometric (sin(ax+b)=c) | transcendentalSolver| Periodic family           |
 * | Trig non-linear (sin(f(x))=c)| tryTrigRecursive   | First-period u-values     |
 * | Mixed products (x·sin(x)=0) | tryProductDecomp    | Zero-product property     |
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
 * 3. **Mixed transcendental equations** (e^x=x): most not handled.
 *    Product-form equations (x·sin(x)=0) are decomposed via zero-product property.
 *    Non-product mixed equations still require numeric methods.
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
import {
	transcendentalSolver,
	extractTrigEquation,
	computeUSolutions
} from './solvers/transcendental';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { normalize, normalFormsEquivalent, ZERO_NORMAL_FORM } from '../normal';
import { number, equals } from '../factory';
import { flattenSumShallow, flattenProductShallow } from '../flatten';
import { getVariables } from '../eval/substitute';
import { isZeroNode } from './solvers/polynomial';
import type { Solution, PeriodicSolutionFamily } from './types';
import { getRuleDescription } from './descriptions-fr';

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
// Product Decomposition (Zero-Product Property)
// =============================================================================

/**
 * Extract product factors from a standard-form expression (lhs - rhs).
 *
 * toStandardForm returns `lhs - rhs`. If rhs was 0, this is `lhs - 0`,
 * a subtraction node. We flatten the sum to find the non-zero term,
 * then check if it's a multiplication.
 *
 * @returns Array of factors if expr is a product, null otherwise
 */
function extractProductFactors(expr: MathNode): MathNode[] | null {
	const terms = flattenSumShallow(expr);

	// Filter out zero terms
	const nonZeroTerms = terms.filter(({ term }) => !isZeroNode(term));

	// Must have exactly 1 non-zero term, and it must be positive
	if (nonZeroTerms.length !== 1) return null;
	const { sign, term } = nonZeroTerms[0];

	// A negative term means the expression is `-product`, which is fine:
	// -A·B = 0 iff A·B = 0. But we need the inner product node.
	const productNode = sign === '-' && term.type === 'opposite' ? term.operand : term;

	// Check if it's a multiplication
	if (productNode.type !== 'multiplication') return null;

	const factors = flattenProductShallow(productNode);
	if (factors.length < 2) return null;

	return factors.map(({ factor }) => factor);
}

/**
 * Unwrap a delimiter node to get its content.
 * Solvers may not handle delimiter-wrapped expressions correctly,
 * so we unwrap them before passing to solve().
 */
function unwrapDelimiter(node: MathNode): MathNode {
	return node.type === 'delimiter' ? node.content : node;
}

/**
 * Try to compute an approximate numeric value for a solution missing one.
 * Handles the case where the linear solver doesn't set approximate for zero.
 */
function ensureApproximate(sol: Solution): Solution {
	if (sol.approximate !== undefined) return sol;
	const norm = normalize(sol.value);
	if (norm.numerator.length === 0 || normalFormsEquivalent(norm, ZERO_NORMAL_FORM)) {
		return { ...sol, approximate: 0 };
	}
	return sol;
}

/**
 * Deduplicate solutions by approximate numeric value or normalized form.
 */
function deduplicateSolutions(solutions: Solution[], tolerance = 1e-10): Solution[] {
	const result: Solution[] = [];
	for (const sol of solutions) {
		const isDuplicate = result.some((existing) => {
			// Compare by approximate value if both are defined
			if (existing.approximate !== undefined && sol.approximate !== undefined) {
				return Math.abs(existing.approximate - sol.approximate) < tolerance;
			}
			// Compare by normalized form as fallback
			return normalFormsEquivalent(normalize(existing.value), normalize(sol.value));
		});
		if (!isDuplicate) {
			result.push(sol);
		}
	}
	return result;
}

/**
 * Recursion guard for product decomposition.
 * flattenProductShallow fully decomposes products so recursion is unlikely,
 * but this prevents stack overflow on pathological inputs.
 */
let productDecompositionDepth = 0;
const MAX_PRODUCT_DECOMPOSITION_DEPTH = 5;

/**
 * Try to solve an equation by product decomposition (zero-product property).
 *
 * If the standard-form expression is a product A·B·...= 0, solve each
 * variable-dependent factor independently and merge solutions.
 *
 * **Limitation**: When multiple factors produce periodic solution families
 * (e.g., sin(x)·cos(x) = 0), only the first periodic family is attached.
 * For complete zero enumeration in sign analysis, each factor may need
 * to be solved independently.
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryProductDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	}
): SolveResult | null {
	if (productDecompositionDepth >= MAX_PRODUCT_DECOMPOSITION_DEPTH) return null;

	const factors = extractProductFactors(expr);
	if (!factors) return null;

	// Partition into variable-dependent and constant factors
	const variableFactors = factors.filter((f) => getVariables(f).has(variable));

	// Need at least 2 variable-dependent factors for decomposition to be useful
	if (variableFactors.length < 2) return null;

	const recorder = createStepRecorder();
	recorder.recordStep(
		'zero-product-property',
		getRuleDescription('zero-product-property'),
		expr,
		expr,
		'summarized'
	);

	const allSolutions: Solution[] = [];
	const periodicFamilies: PeriodicSolutionFamily[] = [];

	productDecompositionDepth++;
	try {
		for (const factor of variableFactors) {
			const unwrapped = unwrapDelimiter(factor);
			const factorEq = equals(unwrapped, number('0'));
			const factorResult = solve(factorEq, { variable, verbosity: opts.verbosity });

			if (factorResult.status === 'no-solution' || factorResult.status === 'no-real-solution') {
				continue;
			}

			allSolutions.push(...factorResult.solutions.map(ensureApproximate));

			if (factorResult.periodicSolutions) {
				periodicFamilies.push(factorResult.periodicSolutions);
			}
		}
	} finally {
		productDecompositionDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'mixed',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: 'mixed',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity),
		// If there are periodic families, attach the first one
		// (multiple periodic families would need a more complex merge)
		...(periodicFamilies.length > 0 ? { periodicSolutions: periodicFamilies[0] } : {})
	};
}

// =============================================================================
// Trig Recursive Decomposition
// =============================================================================

/**
 * Recursion guard for trig recursive decomposition.
 */
let trigRecursiveDepth = 0;
const MAX_TRIG_RECURSIVE_DEPTH = 3;

/**
 * Try to solve a trig equation with a non-linear argument by recursive decomposition.
 *
 * For sin(f(x)) = c, compute u-values (arcsin(c), π - arcsin(c)),
 * then solve f(x) = u recursively.
 *
 * Only activates when the trig argument is non-linear. Linear arguments
 * (sin(ax+b) = c) are left to the normal solver which produces PeriodicSolutionFamily.
 *
 * **Limitation**: Only first-period u-values are used (k=0). For sin(x²) = 0 this gives
 * {0, ±√π} but not ±√(2π), ±√(3π), etc.
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryTrigRecursiveDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	}
): SolveResult | null {
	if (trigRecursiveDepth >= MAX_TRIG_RECURSIVE_DEPTH) return null;

	const extracted = extractTrigEquation(expr, variable);
	if (!extracted) return null;

	const { funcName, argument, constantNode, constantNumeric } = extracted;

	// Check domain restrictions for sin/cos
	if ((funcName === 'sin' || funcName === 'cos') && Math.abs(constantNumeric) > 1) {
		const recorder = createStepRecorder();
		recorder.recordStep(
			'no-real-solution',
			`L'equation ${funcName}(f(x)) = ${constantNumeric} n'a pas de solution car ${constantNumeric} n'est pas dans [-1, 1]`,
			expr,
			expr,
			'summarized'
		);
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'trigonometric',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	// If argument is linear, let the normal trig solver handle it (with PeriodicSolutionFamily)
	const linearForm = extractLinearForm(argument, variable);
	if (linearForm) return null;

	// Compute u-space solutions
	const basePeriod = funcName === 'tan' ? Math.PI : 2 * Math.PI;
	const uSolutions = computeUSolutions(funcName, constantNode, constantNumeric, basePeriod);

	const recorder = createStepRecorder();
	recorder.recordStep(
		'trig-recursive-decomposition',
		getRuleDescription('trig-recursive-decomposition'),
		expr,
		expr,
		'summarized'
	);

	const allSolutions: Solution[] = [];

	trigRecursiveDepth++;
	try {
		for (const uSol of uSolutions) {
			// Solve: argument = uSol.symbolic
			const subEquation = equals(argument, uSol.symbolic);
			const subResult = solve(subEquation, { variable, verbosity: opts.verbosity });

			if (subResult.status === 'no-solution' || subResult.status === 'no-real-solution') {
				continue;
			}

			// Ensure approximate values and filter out non-real solutions
			for (const sol of subResult.solutions) {
				let approx = sol.approximate;
				if (approx === undefined) {
					try {
						approx = evaluateNodeToApproximatedNumber(sol.value);
					} catch {
						// If evaluation fails, skip this solution (likely imaginary)
						continue;
					}
				}
				if (!isFinite(approx)) continue;
				allSolutions.push({ ...sol, approximate: approx });
			}
		}
	} finally {
		trigRecursiveDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'trigonometric',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: 'trigonometric',
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

	// Try product decomposition (zero-product property) before classification
	const productResult = tryProductDecomposition(expr, variable, opts);
	if (productResult) return productResult;

	// Try trig recursive decomposition for non-linear trig arguments
	const trigRecursiveResult = tryTrigRecursiveDecomposition(expr, variable, opts);
	if (trigRecursiveResult) return trigRecursiveResult;

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
