/**
 * Quadratic Equation Solver
 *
 * Solves equations of the form ax^2 + bx + c = 0.
 *
 * @module mathAST/solve/solvers/quadratic
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
import {
	number,
	fraction,
	opposite,
	implicitMultiply,
	add,
	subtract,
	equals,
	variable as varNode,
	sqrt as sqrtNode,
	greaterThanOrEqual
} from '../../factory';
import { normalize, normalFormsEquivalent, ZERO_NORMAL_FORM } from '../../normal';
import { canonicalForm, coefficientsByDegree } from '../../normal/canonical-form';
import { describeCoefficients, describeDiscriminant, describeSolution } from '../descriptions-fr';
import { computeNumericValue } from '../../eval/numeric-value';
import { parameterCondition } from '../literal-parameter';

// =============================================================================
// Coefficient Extraction
// =============================================================================

/**
 * Extract coefficients a, b, c from a quadratic expression ax^2 + bx + c,
 * read as written (no expansion). `null` when a term has degree > 2 or a
 * coefficient still depends on x (`(x-1)^2` must be expanded first).
 *
 * Exported for reuse by `pedagogical-solve/quadratic.ts`.
 */
export function extractQuadraticCoefficients(
	expr: MathNode,
	variable: string
): { readonly a: MathNode; readonly b: MathNode; readonly c: MathNode } | null {
	const coefficients = coefficientsByDegree(expr, variable, 2);
	if (coefficients === null) return null;
	const [c, b, a] = coefficients;
	return { a, b, c };
}

/**
 * Check if a MathNode represents zero.
 */
function isZeroNode(node: MathNode): boolean {
	const norm = normalize(node);
	return norm.numerator.length === 0 || normalFormsEquivalent(norm, ZERO_NORMAL_FORM);
}

/**
 * Check if a MathNode represents a negative number.
 */
function isNegativeNode(node: MathNode): boolean {
	const norm = normalize(node);
	if (norm.numerator.length !== 1) return false;

	const term = norm.numerator[0];
	if (term.monomial.length !== 0) return false;

	const coeff = term.coefficient;
	if (coeff.terms.length !== 1) return false;

	const algebraicTerm = coeff.terms[0];
	if (algebraicTerm.radicals.length !== 0) return false;

	const rat = algebraicTerm.rational;
	return rat.n < 0n;
}

// =============================================================================
// Quadratic Solver Implementation
// =============================================================================

/**
 * Solver for quadratic equations: ax^2 + bx + c = 0
 *
 * Solution using quadratic formula: x = (-b +/- sqrt(b^2 - 4ac)) / (2a)
 *
 * Cases:
 * - Delta > 0: two distinct real solutions
 * - Delta = 0: one double solution
 * - Delta < 0: no real solutions
 */
export const quadraticSolver: EquationSolver = {
	name: 'quadratic',

	canSolve(expr: MathNode, variable: string): boolean {
		const degree = getPolynomialDegree(expr, variable);
		return degree === 2;
	},

	solve(
		expr: MathNode,
		variable: string,
		options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
			initialGuesses?: readonly number[];
		},
		recorder: SolveStepRecorder
	): SolveResult {
		// A degree-2 expression is not necessarily in standard form: `(x-1)^2` is
		// degree 2, yet reading `a`, `b`, `c` off it directly gives coefficients
		// that still depend on x, which the extractor now refuses. Expand once and
		// read again, the way the pedagogical stepper already does.
		const coeffs =
			extractQuadraticCoefficients(expr, variable) ??
			extractQuadraticCoefficients(canonicalForm(expr), variable);

		if (!coeffs) {
			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: 'quadratic',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity),
				error: "Impossible d'extraire les coefficients quadratiques"
			};
		}

		const { a, b, c } = coeffs;

		// Check if a = 0 (not actually quadratic)
		if (isZeroNode(a)) {
			return {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: 'quadratic',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity),
				error: "Le coefficient de x^2 est nul - ce n'est pas une equation quadratique"
			};
		}

		// Record coefficient identification
		recorder.recordStep(
			'identify-coefficients',
			describeCoefficients(a, b, c),
			equals(expr, number('0')),
			equals(expr, number('0')),
			'detailed'
		);

		// Compute discriminant: Delta = b^2 - 4ac
		const bSquared = implicitMultiply(b, b);
		const fourAC = implicitMultiply(number('4'), implicitMultiply(a, c));
		const discriminant = subtract(bSquared, fourAC);
		const discriminantSimplified = canonicalForm(discriminant);
		const discriminantValue = computeNumericValue(discriminantSimplified);

		// Record discriminant computation
		recorder.recordStep(
			'compute-discriminant',
			describeDiscriminant(discriminantSimplified, discriminantValue),
			discriminant,
			discriminantSimplified,
			'detailed'
		);

		// Check discriminant sign
		const isDiscriminantZero = isZeroNode(discriminantSimplified);
		const isDiscriminantNegative = !isDiscriminantZero && isNegativeNode(discriminantSimplified);

		if (isDiscriminantNegative || (discriminantValue !== null && discriminantValue < 0)) {
			// No real solutions
			recorder.recordStep(
				'no-real-solution',
				"Le discriminant est negatif, donc l'equation n'a pas de solution reelle",
				discriminantSimplified,
				discriminantSimplified,
				'summarized'
			);

			return {
				variable,
				status: 'no-real-solution',
				solutions: [],
				equationType: 'quadratic',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity)
			};
		}

		// Discriminant PARAMÉTRÉ (x² = y : Δ = 4y) : les deux racines n'existent
		// que si Δ ≥ 0, condition portée par chaque solution (vide : aucune)
		const parameters = getVariables(discriminantSimplified);
		parameters.delete(variable);
		const condition =
			discriminantValue === null && !isDiscriminantZero && parameters.size > 0
				? parameterCondition([greaterThanOrEqual(discriminantSimplified, number('0'))])
				: null;
		if (condition?.kind === 'never') {
			return {
				variable,
				status: 'no-real-solution',
				solutions: [],
				equationType: 'quadratic',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity)
			};
		}
		const conditionField = condition?.kind === 'when' ? { condition: condition.node } : {};

		// Compute solutions
		const twoA = implicitMultiply(number('2'), a);
		const negB = opposite(b);

		if (isDiscriminantZero || (discriminantValue !== null && discriminantValue === 0)) {
			// One double solution: x = -b / (2a)
			const solution = fraction(negB, twoA);
			const solutionSimplified = canonicalForm(solution);

			recorder.recordStep(
				'double-solution',
				'Le discriminant est nul, donc il y a une solution double',
				solution,
				solutionSimplified,
				'detailed'
			);

			recorder.recordStep(
				'isolate-variable',
				describeSolution(variable, solutionSimplified),
				equals(varNode(variable), solution),
				equals(varNode(variable), solutionSimplified),
				'summarized'
			);

			const approximate = computeNumericValue(solutionSimplified);

			return {
				variable,
				status: 'unique',
				solutions: [
					{
						value: solutionSimplified,
						exact: true,
						approximate: approximate ?? undefined
					}
				],
				equationType: 'quadratic',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(options.verbosity)
			};
		}

		// Two distinct solutions: x = (-b +/- sqrt(Delta)) / (2a)
		const sqrtDiscriminant = sqrtNode(discriminantSimplified);

		// x1 = (-b + sqrt(Delta)) / (2a)
		const x1Numerator = add(negB, sqrtDiscriminant);
		const x1 = fraction(x1Numerator, twoA);
		const x1Simplified = canonicalForm(x1);

		// x2 = (-b - sqrt(Delta)) / (2a)
		const x2Numerator = subtract(negB, sqrtDiscriminant);
		const x2 = fraction(x2Numerator, twoA);
		const x2Simplified = canonicalForm(x2);

		recorder.recordStep(
			'quadratic-formula',
			'On applique la formule quadratique: x = (-b +/- sqrt(Delta)) / (2a)',
			x1,
			x1Simplified,
			'detailed'
		);

		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, x1Simplified) + ' et ' + describeSolution(variable, x2Simplified),
			equals(varNode(variable), x1),
			equals(varNode(variable), x1Simplified),
			'summarized'
		);

		// Compute numeric approximations
		let x1Approx: number | undefined = computeNumericValue(x1Simplified) ?? undefined;
		let x2Approx: number | undefined = computeNumericValue(x2Simplified) ?? undefined;

		// If we couldn't get exact numeric value, try to compute from discriminant
		if (
			(x1Approx === undefined || x1Approx === null) &&
			discriminantValue !== null &&
			discriminantValue >= 0
		) {
			const bValue = computeNumericValue(b);
			const aValue = computeNumericValue(a);
			if (bValue !== null && aValue !== null && aValue !== 0) {
				const sqrtDelta = Math.sqrt(discriminantValue);
				x1Approx = (-bValue + sqrtDelta) / (2 * aValue);
				x2Approx = (-bValue - sqrtDelta) / (2 * aValue);
			}
		}

		const solutions: Solution[] = [
			{
				value: x1Simplified,
				exact: true,
				approximate: x1Approx,
				...conditionField
			},
			{
				value: x2Simplified,
				exact: true,
				approximate: x2Approx,
				...conditionField
			}
		];

		return {
			variable,
			status: 'multiple',
			solutions,
			equationType: 'quadratic',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}
};
