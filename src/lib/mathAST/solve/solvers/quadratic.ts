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
import { flattenSumShallow, unflattenSum } from '../../flatten';
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
	power
} from '../../factory';
import { denormalize, normalize, normalFormsEquivalent, ZERO_NORMAL_FORM } from '../../normal';
import { describeCoefficients, describeDiscriminant, describeSolution } from '../descriptions-fr';

// =============================================================================
// Coefficient Extraction
// =============================================================================

/**
 * Extract coefficients a, b, c from a quadratic expression ax^2 + bx + c.
 * Returns { a, b, c } such that expr = ax^2 + bx + c.
 */
function extractQuadraticCoefficients(
	expr: MathNode,
	variable: string
): { a: MathNode; b: MathNode; c: MathNode } | null {
	// Flatten the expression into terms
	const flatSum = flattenSumShallow(expr);

	// Separate terms by degree
	const aTerms: MathNode[] = [];
	const bTerms: MathNode[] = [];
	const cTerms: MathNode[] = [];

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const degree = getTermDegree(signedTerm, variable);

		if (degree === 2) {
			aTerms.push(signedTerm);
		} else if (degree === 1) {
			bTerms.push(signedTerm);
		} else if (degree === 0) {
			cTerms.push(signedTerm);
		} else {
			// Term has unexpected degree
			return null;
		}
	}

	// Build coefficient a (sum of x^2 terms divided by x^2)
	const a = extractCoefficient(aTerms, variable, 2);
	const b = extractCoefficient(bTerms, variable, 1);
	// Note: unflattenSum returns null only for empty arrays, which we've already handled
	const c =
		cTerms.length === 0
			? number('0')
			: cTerms.length === 1
				? cTerms[0]
				: unflattenSum(cTerms.map((t) => ({ sign: '+' as const, term: t })))!;

	return { a, b, c };
}

/**
 * Get the degree of a term in the given variable.
 */
function getTermDegree(term: MathNode, variable: string): number {
	const vars = getVariables(term);
	if (!vars.has(variable)) return 0;

	// Simple heuristic: check structure
	// x^2 term
	if (term.type === 'superscript' && term.base.type === 'variable' && term.base.name === variable) {
		const exp = term.superscript;
		if (exp.type === 'number' && exp.value === '2') return 2;
		if (exp.type === 'number' && exp.value === '1') return 1;
	}

	// c * x^2 term (multiplication)
	if (term.type === 'multiplication') {
		// Check left and right for x^2 pattern
		const checkSide = (side: MathNode): number => {
			if (
				side.type === 'superscript' &&
				side.base.type === 'variable' &&
				side.base.name === variable
			) {
				const exp = side.superscript;
				if (exp.type === 'number' && exp.value === '2') return 2;
			}
			if (side.type === 'variable' && side.name === variable) return 1;
			return 0;
		};
		const leftDeg = checkSide(term.left);
		const rightDeg = checkSide(term.right);
		if (leftDeg > 0 || rightDeg > 0) return Math.max(leftDeg, rightDeg);
	}

	// Simple variable x (degree 1)
	if (term.type === 'variable' && term.name === variable) return 1;

	// Opposite term
	if (term.type === 'opposite') {
		return getTermDegree(term.operand, variable);
	}

	// For complex terms, use polynomial degree
	return getPolynomialDegree(term, variable) ?? 0;
}

/**
 * Extract coefficient from terms of given degree.
 */
function extractCoefficient(terms: MathNode[], variable: string, degree: number): MathNode {
	if (terms.length === 0) return number('0');

	// Sum the terms
	// Note: unflattenSum returns null only for empty arrays, which we've already handled
	const termSum =
		terms.length === 1
			? terms[0]
			: unflattenSum(terms.map((t) => ({ sign: '+' as const, term: t })))!;

	// Divide by x^degree to get coefficient
	const divisor = degree === 2 ? power(varNode(variable), number('2')) : varNode(variable);
	const coeffExpr = fraction(termSum, divisor);
	const coeffSimplified = denormalize(normalize(coeffExpr));

	return coeffSimplified;
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

/**
 * Compute numeric value of a node (if possible).
 */
function computeNumericValue(node: MathNode): number | null {
	try {
		const norm = normalize(node);

		// Handle zero case
		if (norm.numerator.length === 0) return 0;

		if (norm.numerator.length !== 1 || norm.denominator.length !== 1) return null;

		const numTerm = norm.numerator[0];
		const denTerm = norm.denominator[0];

		if (numTerm.monomial.length !== 0 || denTerm.monomial.length !== 0) return null;

		const numCoeff = numTerm.coefficient;
		const denCoeff = denTerm.coefficient;

		if (numCoeff.terms.length !== 1 || denCoeff.terms.length !== 1) return null;

		const numAlg = numCoeff.terms[0];
		const denAlg = denCoeff.terms[0];

		if (numAlg.radicals.length !== 0 || denAlg.radicals.length !== 0) return null;

		const numValue = Number(numAlg.rational.n) / Number(numAlg.rational.d);
		const denValue = Number(denAlg.rational.n) / Number(denAlg.rational.d);

		if (denValue === 0) return null;
		return numValue / denValue;
	} catch {
		return null;
	}
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
		// Extract coefficients
		const coeffs = extractQuadraticCoefficients(expr, variable);

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
		const discriminantSimplified = denormalize(normalize(discriminant));
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

		// Compute solutions
		const twoA = implicitMultiply(number('2'), a);
		const negB = opposite(b);

		if (isDiscriminantZero || (discriminantValue !== null && discriminantValue === 0)) {
			// One double solution: x = -b / (2a)
			const solution = fraction(negB, twoA);
			const solutionSimplified = denormalize(normalize(solution));

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
		const x1Simplified = denormalize(normalize(x1));

		// x2 = (-b - sqrt(Delta)) / (2a)
		const x2Numerator = subtract(negB, sqrtDiscriminant);
		const x2 = fraction(x2Numerator, twoA);
		const x2Simplified = denormalize(normalize(x2));

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
				approximate: x1Approx
			},
			{
				value: x2Simplified,
				exact: true,
				approximate: x2Approx
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
