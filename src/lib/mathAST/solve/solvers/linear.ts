/**
 * Linear Equation Solver
 *
 * Solves equations of the form ax + b = 0.
 *
 * @module mathAST/solve/solvers/linear
 */

import type { MathNode } from '../../types';
import type {
	EquationSolver,
	SolveResult,
	SolveOptions,
	SolveStepRecorder,
	Solution
} from '../types';
import { getPolynomialDegree } from '../classify';
import { getVariables } from '../../eval/substitute';
import { computeNumericValue } from '../../eval/numeric-value';
import { number, fraction, opposite, equals, variable as varNode } from '../../factory';
import { preprocess, denormalize, normalize, normalFormsEquivalent } from '../../normal';
import { canonicalForm, coefficientsByDegree } from '../../normal/canonical-form';
import { toLatex } from '../../latex-generator';
import { describeSolution, describeCoefficients } from '../descriptions-fr';

// =============================================================================
// Coefficient Extraction
// =============================================================================

/**
 * Extract coefficient and constant from a linear expression ax + b, read as
 * written. `null` when a coefficient still depends on x: in `2(x-1)` or
 * `(2x-3)+1` the constant hides INSIDE the x term (dividing by x gave
 * `(2x-2)/x`, hence `2(x-1)=4` solved as x = 2x/(x-1)) ; the solver then reads
 * the expanded form.
 */
export function extractLinearCoefficients(
	expr: MathNode,
	variable: string
): { a: MathNode; b: MathNode } | null {
	const coefficients = coefficientsByDegree(expr, variable, 1);
	if (coefficients === null) return null;
	const [b, a] = coefficients;
	return { a, b };
}

/**
 * Check if a MathNode represents zero.
 */
function isZeroNode(node: MathNode): boolean {
	const norm = normalize(node);
	return norm.numerator.length === 0 || normalFormsEquivalent(norm, normalize(number('0')));
}

// =============================================================================
// Linear Solver Implementation
// =============================================================================

/**
 * Solver for linear equations: ax + b = 0
 *
 * Solution: x = -b/a (when a != 0)
 * Edge cases:
 * - a = 0, b = 0: infinite solutions (identity 0 = 0)
 * - a = 0, b != 0: no solution (contradiction)
 */
export const linearSolver: EquationSolver = {
	name: 'linear',

	canSolve(expr: MathNode, variable: string): boolean {
		const degree = getPolynomialDegree(expr, variable);
		return degree === 1;
	},

	solve(
		expr: MathNode,
		variable: string,
		options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
			initialGuesses?: readonly number[];
		},
		recorder: SolveStepRecorder
	): SolveResult {
		// First preprocess the expression (Phase 1 radical rules)
		const simplified = preprocess(expr);

		// Record the simplification if different
		if (toLatex(simplified) !== toLatex(expr)) {
			recorder.recordStep(
				'simplify-expression',
				"On simplifie l'expression",
				equals(expr, number('0')),
				equals(simplified, number('0')),
				'detailed'
			);
		}

		// Extract coefficients — sur la forme développée si l'expression ne se
		// lit pas directement comme ax + b (terme non développé : `2(x-1)`).
		const coeffs =
			extractLinearCoefficients(simplified, variable) ??
			extractLinearCoefficients(canonicalForm(simplified), variable);

		if (!coeffs) {
			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: 'linear',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity),
				error: "Impossible d'extraire les coefficients lineaires"
			};
		}

		const { a, b } = coeffs;

		// Record coefficient identification (linear: a, b only — no c)
		recorder.recordStep(
			'identify-linear-coefficients',
			describeCoefficients(a, b),
			equals(simplified, number('0')),
			equals(simplified, number('0')),
			'detailed'
		);

		// Check if a = 0
		if (isZeroNode(a)) {
			// Check if b = 0 too
			if (isZeroNode(b)) {
				// 0 = 0: infinite solutions
				recorder.recordStep(
					'infinite-solutions',
					"L'equation 0 = 0 a une infinite de solutions",
					equals(number('0'), number('0')),
					equals(number('0'), number('0')),
					'summarized'
				);

				return {
					variable,
					status: 'infinite',
					solutions: [],
					equationType: 'linear',
					strategy: 'algebraic',
					steps: recorder.getStepsFiltered(options.verbosity)
				};
			}

			// b != 0: no solution
			recorder.recordStep(
				'no-solution',
				`L'equation ${toLatex(b)} = 0 n'a pas de solution`,
				equals(b, number('0')),
				equals(b, number('0')),
				'summarized'
			);

			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: 'linear',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity)
			};
		}

		// Compute solution algorithmically: x = -b/a.
		// Phase 6 — the pedagogical narrative (move-x-left, move-const-right,
		// divide-both-sides) is generated separately by
		// `pedagogical-solve/linear`. The solver records ONLY the structural
		// algorithmic step (identify above + isolate-variable here).
		const negB = denormalize(normalize(opposite(b)));
		const solution = fraction(negB, a);
		const solutionSimplified = denormalize(normalize(solution));

		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, solutionSimplified),
			equals(simplified, number('0')),
			equals(varNode(variable), solutionSimplified),
			'summarized'
		);

		// Valeur numérique de la solution, lue sur le nœud entier. L'ancien calcul
		// ne lisait que la partie RATIONNELLE des coefficients normalisés :
		// x = √2 portait `approximate: 1`, et la déduplication fusionnait alors
		// √2 avec 1 dans (x − √2)(x − 1) = 0.
		const approximate =
			getVariables(solutionSimplified).size === 0
				? (computeNumericValue(solutionSimplified) ?? undefined)
				: undefined;

		const solutionObj: Solution = {
			value: solutionSimplified,
			exact: true,
			approximate
		};

		return {
			variable,
			status: 'unique',
			solutions: [solutionObj],
			equationType: 'linear',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}
};
