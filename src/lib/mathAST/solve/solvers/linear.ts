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
import { flattenSumShallow, unflattenSum } from '../../flatten';
import {
	number,
	fraction,
	opposite,
	implicitMultiply,
	equals,
	variable as varNode
} from '../../factory';
import { simplify, denormalize, normalize, normalFormsEquivalent } from '../../normal';
import { toLatex } from '../../latex-generator';
import {
	describeSubtract,
	describeDivide,
	describeSolution,
	describeCoefficients
} from '../descriptions-fr';

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

	// Build the constant b
	// Note: unflattenSum returns null only for empty arrays, which we've already handled
	const b =
		constantTerms.length === 0
			? number('0')
			: constantTerms.length === 1
				? constantTerms[0]
				: unflattenSum(constantTerms.map((t) => ({ sign: '+' as const, term: t })))!;

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
		// First simplify the expression
		const simplified = simplify(expr);

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

		// Extract coefficients
		const coeffs = extractLinearCoefficients(simplified, variable);

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

		// Record coefficient identification
		recorder.recordStep(
			'identify-coefficients',
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

		// Solve: x = -b/a
		// Step 1: ax = -b (subtract b from both sides)
		const negB = opposite(b);
		const axEqualsNegB = equals(implicitMultiply(a, varNode(variable)), negB);

		recorder.recordStep(
			'subtract-constant',
			describeSubtract(b),
			equals(simplified, number('0')),
			axEqualsNegB,
			'detailed',
			b
		);

		// Step 2: x = -b/a (divide both sides by a)
		const solution = fraction(negB, a);
		const solutionSimplified = denormalize(normalize(solution));

		recorder.recordStep(
			'divide-coefficient',
			describeDivide(a),
			axEqualsNegB,
			equals(varNode(variable), solutionSimplified),
			'detailed',
			a
		);

		// Record final solution
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, solutionSimplified),
			equals(varNode(variable), solution),
			equals(varNode(variable), solutionSimplified),
			'summarized'
		);

		// Compute numeric approximation if the solution contains variables
		const solutionVars = getVariables(solutionSimplified);
		let approximate: number | undefined;

		if (solutionVars.size === 0) {
			// Try to evaluate numerically
			try {
				const norm = normalize(solutionSimplified);
				if (norm.numerator.length === 1 && norm.denominator.length === 1) {
					const numTerm = norm.numerator[0];
					const denTerm = norm.denominator[0];

					// Simple case: just a rational number
					if (numTerm.monomial.length === 0 && denTerm.monomial.length === 0) {
						const numCoeff = numTerm.coefficient;
						const denCoeff = denTerm.coefficient;

						// If both are simple rationals, compute the value
						if (numCoeff.terms.length === 1 && denCoeff.terms.length === 1) {
							const numRat = numCoeff.terms[0].rational;
							const denRat = denCoeff.terms[0].rational;

							const numValue = Number(numRat.n) / Number(numRat.d);
							const denValue = Number(denRat.n) / Number(denRat.d);

							if (denValue !== 0) {
								approximate = numValue / denValue;
							}
						}
					}
				}
			} catch {
				// Ignore errors in numeric approximation
			}
		}

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
