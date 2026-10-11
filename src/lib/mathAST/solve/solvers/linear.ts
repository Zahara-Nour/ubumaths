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
import { computeNumericValue } from '../numeric-value';
import { flattenSumShallow, unflattenSum } from '../../flatten';
import { number, fraction, opposite, equals, variable as varNode } from '../../factory';
import { preprocess, denormalize, normalize, normalFormsEquivalent } from '../../normal';
import { toLatex } from '../../latex-generator';
import { describeSolution, describeCoefficients } from '../descriptions-fr';

// =============================================================================
// Coefficient Extraction
// =============================================================================

/**
 * Extract coefficient and constant from a linear expression ax + b.
 * Returns { a, b } such that expr = ax + b.
 */
function extractLinearCoefficients(
	expr: MathNode,
	variable: string
): { a: MathNode; b: MathNode } | null {
	// Flatten the expression into terms
	const flatSum = flattenSumShallow(expr);

	// Separate terms into those with variable and without
	const variableTerms: MathNode[] = [];
	const constantTerms: MathNode[] = [];

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const vars = getVariables(signedTerm);

		if (vars.has(variable)) {
			variableTerms.push(signedTerm);
		} else {
			constantTerms.push(signedTerm);
		}
	}

	// Build coefficient a (sum of variable terms divided by x)
	// For a linear expression, each variable term should be of form c*x
	// So the coefficient is the sum of the c's

	// Build the constant b — canonicalize so the recorded operand is a clean
	// literal (e.g. `-4`) rather than the raw flat sum (`3 + -7`).
	// Note: unflattenSum returns null only for empty arrays, which we've already handled
	const bRaw =
		constantTerms.length === 0
			? number('0')
			: constantTerms.length === 1
				? constantTerms[0]
				: unflattenSum(constantTerms.map((t) => ({ sign: '+' as const, term: t })))!;
	const b = denormalize(normalize(bRaw));

	// For the coefficient a, we need to extract it from terms like 2x, -3x, x
	// The simplest approach: coefficient = (expr - b) / x when evaluated with x=1
	// But we should keep it symbolic. Let's extract it differently.

	// For each variable term, divide by x symbolically and simplify
	if (variableTerms.length === 0) {
		// No variable terms - a = 0
		return { a: number('0'), b };
	}

	// Sum the variable terms
	// Note: unflattenSum returns null only for empty arrays, which we've already handled
	const variableSum =
		variableTerms.length === 1
			? variableTerms[0]
			: unflattenSum(variableTerms.map((t) => ({ sign: '+' as const, term: t })))!;

	// Extract coefficient by dividing by x
	// variableSum / x should give us the coefficient
	const coeffExpr = fraction(variableSum, varNode(variable));
	const coeffSimplified = denormalize(normalize(coeffExpr));

	// Un coefficient de ax + b ne dépend pas de x. Un terme non développé
	// passe pourtant le tri ci-dessus : dans `2(x-1)` ou `(2x-3)+1`, la
	// constante est cachée DANS le terme en x, et la division par x rendait
	// `(2x-2)/x` — d'où `2(x-1)=4` résolue en x = 2x/(x-1). On refuse : le
	// solveur relit alors la forme développée (même garde que le quadratique).
	if (getVariables(coeffSimplified).has(variable)) return null;

	return { a: coeffSimplified, b };
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
			extractLinearCoefficients(denormalize(normalize(simplified)), variable);

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
