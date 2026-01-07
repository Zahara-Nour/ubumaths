/**
 * Polynomial Equation Solver
 *
 * Solves polynomial equations:
 * - Power equations: x^n = k (nth roots)
 * - Cubic equations: ax³ + bx² + cx + d = 0 (Cardano's formula)
 *
 * @module mathAST/solve/solvers/polynomial
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
	opposite,
	equals,
	variable as varNode,
	func,
	add,
	subtract,
	multiply,
	fraction,
	power
} from '../../factory';
import { denormalize, normalize, normalFormsEquivalent, ZERO_NORMAL_FORM } from '../../normal';
import { integerNthRoot } from '../../normal/radical';
import {
	describeIdentifyPowerEquation,
	describeExtractNthRoot,
	describeExtractNthRootBothSigns,
	describeNoRealSolutionEvenNegative,
	describeSolution,
	describeIdentifyCubic,
	describeCubicDiscriminant,
	describeFactorCommonRoot
} from '../descriptions-fr';

// =============================================================================
// Helper Functions
// =============================================================================

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

/**
 * Extract BigInt value from a constant MathNode (if possible).
 */
function extractBigInt(node: MathNode): bigint | null {
	const numValue = computeNumericValue(node);
	if (numValue === null) return null;
	if (!Number.isInteger(numValue)) return null;
	return BigInt(Math.round(numValue));
}

/**
 * Extract a power equation x^n = k from standard form x^n - k = 0.
 * Returns { n, k } where n is the exponent and k is the constant.
 */
function extractPowerEquation(expr: MathNode, variable: string): { n: number; k: MathNode } | null {
	// Flatten to get terms
	const flatSum = flattenSumShallow(expr);

	// We need exactly two terms: x^n and -k (or just x^n if k=0)
	if (flatSum.length === 0 || flatSum.length > 2) return null;

	let powerTerm: MathNode | null = null;
	let powerDegree: number | null = null;
	let constantTerm: MathNode = number('0');

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const degree = getPolynomialDegree(signedTerm, variable);

		if (degree === null) return null;

		if (degree >= 3) {
			// This is the power term - check it's a pure power (x^n, not 2x^n)
			if (!isPurePower(signedTerm, variable)) return null;
			powerTerm = signedTerm;
			powerDegree = degree;
		} else if (degree === 0) {
			// Constant term: we have -k in standard form, so k = -constantTerm
			constantTerm = signedTerm;
		} else {
			// Has x or x^2 terms - not a pure power equation
			return null;
		}
	}

	if (powerTerm === null || powerDegree === null) return null;

	// k is the opposite of the constant term (x^n - k = 0 => k = -constant)
	const k = isZeroNode(constantTerm) ? number('0') : opposite(constantTerm);
	const kSimplified = denormalize(normalize(k));

	return { n: powerDegree, k: kSimplified };
}

/**
 * Check if a term is a pure power x^n (not coefficient * x^n).
 */
function isPurePower(term: MathNode, variable: string): boolean {
	// Direct x^n
	if (term.type === 'superscript' && term.base.type === 'variable' && term.base.name === variable) {
		return true;
	}

	// Handle opposite: -x^n -> check operand
	if (term.type === 'opposite') {
		return isPurePower(term.operand, variable);
	}

	// 1 * x^n multiplication (implicit)
	if (term.type === 'multiplication') {
		const left = term.left;
		const right = term.right;

		// Check if one side is 1 and the other is x^n
		if (isOneNode(left) && isPurePower(right, variable)) return true;
		if (isOneNode(right) && isPurePower(left, variable)) return true;
	}

	return false;
}

/**
 * Check if a node represents 1.
 */
function isOneNode(node: MathNode): boolean {
	const numValue = computeNumericValue(node);
	return numValue === 1;
}

/**
 * Create an nth root node for the solution.
 * - n=2: sqrt(k)
 * - n=3: cbrt(k)
 * - n>3: root(k, n) or k^(1/n)
 */
function createNthRootNode(radicand: MathNode, n: number): MathNode {
	if (n === 2) {
		return func('sqrt', [radicand]);
	}
	if (n === 3) {
		return func('cbrt', [radicand]);
	}
	// General nth root: root(radicand, index)
	return func('root', [radicand, number(n.toString())]);
}

// =============================================================================
// Cubic Coefficient Extraction
// =============================================================================

/**
 * Get the degree of a term in the given variable.
 */
function getTermDegree(term: MathNode, variable: string): number {
	const vars = getVariables(term);
	if (!vars.has(variable)) return 0;

	// x^n pattern
	if (term.type === 'superscript' && term.base.type === 'variable' && term.base.name === variable) {
		const exp = term.superscript;
		if (exp.type === 'number') {
			const n = parseInt(exp.value, 10);
			if (!isNaN(n)) return n;
		}
	}

	// c * x^n pattern (multiplication)
	if (term.type === 'multiplication') {
		const checkSide = (side: MathNode): number => {
			if (
				side.type === 'superscript' &&
				side.base.type === 'variable' &&
				side.base.name === variable
			) {
				const exp = side.superscript;
				if (exp.type === 'number') {
					const n = parseInt(exp.value, 10);
					if (!isNaN(n)) return n;
				}
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

	// Fallback to polynomial degree
	return getPolynomialDegree(term, variable) ?? 0;
}

/**
 * Extract coefficient from terms of given degree.
 */
function extractCoefficient(terms: MathNode[], variable: string, degree: number): MathNode {
	if (terms.length === 0) return number('0');

	const termSum =
		terms.length === 1
			? terms[0]
			: unflattenSum(terms.map((t) => ({ sign: '+' as const, term: t })))!;

	if (degree === 0) {
		return denormalize(normalize(termSum));
	}

	// Divide by x^degree to get coefficient
	const divisor =
		degree === 1 ? varNode(variable) : power(varNode(variable), number(degree.toString()));
	const coeffExpr = fraction(termSum, divisor);
	return denormalize(normalize(coeffExpr));
}

/**
 * Extract coefficients a, b, c, d from cubic expression ax³ + bx² + cx + d.
 */
function extractCubicCoefficients(
	expr: MathNode,
	variable: string
): { a: MathNode; b: MathNode; c: MathNode; d: MathNode } | null {
	const flatSum = flattenSumShallow(expr);

	const aTerms: MathNode[] = []; // degree 3
	const bTerms: MathNode[] = []; // degree 2
	const cTerms: MathNode[] = []; // degree 1
	const dTerms: MathNode[] = []; // degree 0

	for (const { sign, term } of flatSum) {
		const signedTerm = sign === '-' ? opposite(term) : term;
		const degree = getTermDegree(signedTerm, variable);

		if (degree === 3) {
			aTerms.push(signedTerm);
		} else if (degree === 2) {
			bTerms.push(signedTerm);
		} else if (degree === 1) {
			cTerms.push(signedTerm);
		} else if (degree === 0) {
			dTerms.push(signedTerm);
		} else {
			// Unexpected degree (>3 or transcendental)
			return null;
		}
	}

	// Must have x³ term
	if (aTerms.length === 0) return null;

	const a = extractCoefficient(aTerms, variable, 3);
	const b = extractCoefficient(bTerms, variable, 2);
	const c = extractCoefficient(cTerms, variable, 1);
	const d = extractCoefficient(dTerms, variable, 0);

	// Verify a ≠ 0
	if (isZeroNode(a)) return null;

	return { a, b, c, d };
}

// =============================================================================
// Polynomial Solver Implementation
// =============================================================================

/**
 * Solver for polynomial equations (degree >= 3)
 * - Power equations: x^n = k
 * - Cubic equations: ax³ + bx² + cx + d = 0 (Cardano)
 */
export const polynomialSolver: EquationSolver = {
	name: 'polynomial',

	canSolve(expr: MathNode, variable: string): boolean {
		const degree = getPolynomialDegree(expr, variable);
		if (degree === null || degree <= 2) return false;

		// Handle degree 3 (cubics) or pure power equations
		if (degree === 3) {
			return extractCubicCoefficients(expr, variable) !== null;
		}

		// For degree > 3, only handle pure power equations x^n = k
		return extractPowerEquation(expr, variable) !== null;
	},

	solve(
		expr: MathNode,
		variable: string,
		options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
			initialGuesses?: readonly number[];
		},
		recorder: SolveStepRecorder
	): SolveResult {
		const degree = getPolynomialDegree(expr, variable);

		// For degree 3, try cubic solver (Cardano)
		if (degree === 3) {
			// First check if it's a pure power equation x³ = k
			const powerExtracted = extractPowerEquation(expr, variable);
			if (powerExtracted) {
				return solvePowerEquation(expr, variable, powerExtracted, options, recorder);
			}

			// Otherwise use Cardano for general cubic
			const cubicCoeffs = extractCubicCoefficients(expr, variable);
			if (cubicCoeffs) {
				return solveCubicCardano(variable, cubicCoeffs, options, recorder);
			}
		}

		// For degree > 3, only pure power equations
		const extracted = extractPowerEquation(expr, variable);
		if (extracted) {
			return solvePowerEquation(expr, variable, extracted, options, recorder);
		}

		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity),
			error: "Type d'equation polynomiale non supporte"
		};
	}
};

/**
 * Solve a power equation x^n = k
 */
function solvePowerEquation(
	expr: MathNode,
	variable: string,
	extracted: { n: number; k: MathNode },
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	const { n, k } = extracted;
	const isOdd = n % 2 === 1;

	// Record initial equation identification
	recorder.recordStep(
		'identify-power-equation',
		describeIdentifyPowerEquation(variable, n, k),
		equals(expr, number('0')),
		equals(expr, number('0')),
		'detailed'
	);

	// Case 1: k = 0 -> x = 0 (unique solution)
	if (isZeroNode(k)) {
		return handleZeroCase(variable, n, options, recorder);
	}

	// Determine sign of k
	const kValue = computeNumericValue(k);
	const kIsNegative = isNegativeNode(k) || (kValue !== null && kValue < 0);

	// Case 2: n even, k < 0 -> no real solution
	if (!isOdd && kIsNegative) {
		return handleNoRealSolution(variable, n, k, options, recorder);
	}

	// Case 3: n odd -> one real solution x = k^(1/n)
	if (isOdd) {
		return handleOddExponent(variable, n, k, kValue, options, recorder);
	}

	// Case 4: n even, k > 0 -> two solutions x = ±k^(1/n)
	return handleEvenPositive(variable, n, k, kValue, options, recorder);
}

// =============================================================================
// Case Handlers
// =============================================================================

/**
 * Handle k = 0: x^n = 0 -> x = 0
 */
function handleZeroCase(
	variable: string,
	n: number,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	const zero = number('0');

	recorder.recordStep(
		'isolate-variable',
		describeSolution(variable, zero),
		equals(varNode(variable), zero),
		equals(varNode(variable), zero),
		'summarized'
	);

	return {
		variable,
		status: 'unique',
		solutions: [{ value: zero, exact: true, approximate: 0 }],
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle n even, k < 0: no real solution
 */
function handleNoRealSolution(
	variable: string,
	n: number,
	k: MathNode,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	recorder.recordStep(
		'even-negative-no-solution',
		describeNoRealSolutionEvenNegative(n),
		equals(varNode(variable), createNthRootNode(k, n)),
		equals(varNode(variable), createNthRootNode(k, n)),
		'summarized'
	);

	return {
		variable,
		status: 'no-real-solution',
		solutions: [],
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle odd n: x = k^(1/n) (one real solution)
 */
function handleOddExponent(
	variable: string,
	n: number,
	k: MathNode,
	kValue: number | null,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	// Record root extraction step
	recorder.recordStep(
		'extract-nth-root',
		describeExtractNthRoot(n),
		equals(varNode(variable), createNthRootNode(k, n)),
		equals(varNode(variable), createNthRootNode(k, n)),
		'detailed'
	);

	// Try to find exact integer root
	const kBigInt = extractBigInt(k);
	let solutionNode: MathNode;
	let approximate: number | undefined;
	const exact = true;

	if (kBigInt !== null) {
		const exactRoot = integerNthRoot(kBigInt, BigInt(n));
		if (exactRoot !== null) {
			// Perfect power - exact integer solution
			solutionNode = number(exactRoot.toString());
			approximate = Number(exactRoot);
		} else {
			// Not a perfect power - symbolic root
			solutionNode = createNthRootNode(k, n);
			approximate =
				kValue !== null ? Math.sign(kValue) * Math.pow(Math.abs(kValue), 1 / n) : undefined;
		}
	} else {
		// Non-integer k - symbolic root
		solutionNode = createNthRootNode(k, n);
		approximate =
			kValue !== null ? Math.sign(kValue) * Math.pow(Math.abs(kValue), 1 / n) : undefined;
	}

	// Simplify the solution
	const solutionSimplified = denormalize(normalize(solutionNode));

	// Record final solution
	recorder.recordStep(
		'isolate-variable',
		describeSolution(variable, solutionSimplified),
		equals(varNode(variable), solutionNode),
		equals(varNode(variable), solutionSimplified),
		'summarized'
	);

	const solution: Solution = {
		value: solutionSimplified,
		exact,
		approximate
	};

	return {
		variable,
		status: 'unique',
		solutions: [solution],
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle even n, k > 0: x = ±k^(1/n) (two solutions)
 */
function handleEvenPositive(
	variable: string,
	n: number,
	k: MathNode,
	kValue: number | null,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	// Record root extraction step
	recorder.recordStep(
		'extract-nth-root-both-signs',
		describeExtractNthRootBothSigns(n),
		equals(varNode(variable), createNthRootNode(k, n)),
		equals(varNode(variable), createNthRootNode(k, n)),
		'detailed'
	);

	// Try to find exact integer root
	const kBigInt = extractBigInt(k);
	let positiveRoot: MathNode;
	let approximatePositive: number | undefined;

	if (kBigInt !== null && kBigInt > 0n) {
		const exactRoot = integerNthRoot(kBigInt, BigInt(n));
		if (exactRoot !== null) {
			// Perfect power - exact integer solution
			positiveRoot = number(exactRoot.toString());
			approximatePositive = Number(exactRoot);
		} else {
			// Not a perfect power - symbolic root
			positiveRoot = createNthRootNode(k, n);
			approximatePositive = kValue !== null ? Math.pow(kValue, 1 / n) : undefined;
		}
	} else {
		// Non-integer k - symbolic root
		positiveRoot = createNthRootNode(k, n);
		approximatePositive = kValue !== null ? Math.pow(kValue, 1 / n) : undefined;
	}

	// Simplify roots
	const positiveSimplified = denormalize(normalize(positiveRoot));
	const negativeRoot = opposite(positiveRoot);
	const negativeSimplified = denormalize(normalize(negativeRoot));

	// Record final solutions
	recorder.recordStep(
		'isolate-variable',
		describeSolution(variable, positiveSimplified, 1) +
			' et ' +
			describeSolution(variable, negativeSimplified, 2),
		equals(varNode(variable), positiveRoot),
		equals(varNode(variable), positiveSimplified),
		'summarized'
	);

	const solutions: Solution[] = [
		{
			value: positiveSimplified,
			exact: true,
			approximate: approximatePositive
		},
		{
			value: negativeSimplified,
			exact: true,
			approximate: approximatePositive !== undefined ? -approximatePositive : undefined
		}
	];

	return {
		variable,
		status: 'multiple',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

// =============================================================================
// Cubic Solver (Cardano's Formula)
// =============================================================================

/**
 * Solve a cubic equation ax³ + bx² + cx + d = 0 using Cardano's formula.
 *
 * Algorithm:
 * 1. Convert to depressed cubic t³ + pt + q = 0 via x = t - b/(3a)
 * 2. Compute discriminant Δ = -4p³ - 27q²
 * 3. Apply appropriate formula based on discriminant sign
 */
function solveCubicCardano(
	variable: string,
	coeffs: { a: MathNode; b: MathNode; c: MathNode; d: MathNode },
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	const { a, b, c, d } = coeffs;

	// Record identification step
	recorder.recordStep(
		'identify-cubic',
		describeIdentifyCubic(a, b, c, d),
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// Check for x as common factor (d = 0)
	if (isZeroNode(d)) {
		return handleCubicWithCommonFactor(variable, a, b, c, options, recorder);
	}

	// Compute p and q for depressed cubic t³ + pt + q = 0
	// p = (3ac - b²) / (3a²)
	// q = (2b³ - 9abc + 27a²d) / (27a³)
	const three = number('3');
	const two = number('2');
	const nine = number('9');
	const twentySeven = number('27');

	// p = (3ac - b²) / (3a²)
	const threeAC = multiply(three, multiply(a, c, 'implicit'), 'implicit');
	const bSquared = power(b, two);
	const pNumerator = subtract(threeAC, bSquared);
	const threeASquared = multiply(three, power(a, two), 'implicit');
	const p = fraction(pNumerator, threeASquared);
	const pSimplified = denormalize(normalize(p));

	// q = (2b³ - 9abc + 27a²d) / (27a³)
	const twoBCubed = multiply(two, power(b, three), 'implicit');
	const nineABC = multiply(nine, multiply(a, multiply(b, c, 'implicit'), 'implicit'), 'implicit');
	const twentySevenASquaredD = multiply(
		twentySeven,
		multiply(power(a, two), d, 'implicit'),
		'implicit'
	);
	const qNumerator = add(subtract(twoBCubed, nineABC), twentySevenASquaredD);
	const twentySevenACubed = multiply(twentySeven, power(a, three), 'implicit');
	const q = fraction(qNumerator, twentySevenACubed);
	const qSimplified = denormalize(normalize(q));

	// Compute numeric values for discriminant check
	const pValue = computeNumericValue(pSimplified);
	const qValue = computeNumericValue(qSimplified);

	// Discriminant: Δ = -4p³ - 27q²
	const four = number('4');
	const pCubed = power(pSimplified, three);
	const qSquared = power(qSimplified, two);
	const delta = subtract(
		opposite(multiply(four, pCubed, 'implicit')),
		multiply(twentySeven, qSquared, 'implicit')
	);
	const deltaSimplified = denormalize(normalize(delta));
	const deltaValue = computeNumericValue(deltaSimplified);

	// Record discriminant computation
	recorder.recordStep(
		'compute-cubic-discriminant',
		describeCubicDiscriminant(deltaSimplified, deltaValue),
		delta,
		deltaSimplified,
		'detailed'
	);

	// Shift for back-substitution: x = t - b/(3a)
	const shift = fraction(b, multiply(three, a, 'implicit'));
	const shiftSimplified = denormalize(normalize(shift));

	// Branch based on discriminant
	if (deltaValue !== null) {
		const EPSILON = 1e-10;

		if (Math.abs(deltaValue) < EPSILON) {
			// Δ ≈ 0: Multiple roots
			return handleCubicMultipleRoot(
				variable,
				pSimplified,
				qSimplified,
				pValue,
				qValue,
				shiftSimplified,
				options,
				recorder
			);
		} else if (deltaValue < 0) {
			// Δ < 0: One real root (Cardano direct)
			return handleCubicOneReal(
				variable,
				pSimplified,
				qSimplified,
				pValue,
				qValue,
				shiftSimplified,
				options,
				recorder
			);
		} else {
			// Δ > 0: Three real roots (trigonometric form)
			return handleCubicThreeReal(
				variable,
				pSimplified,
				qSimplified,
				pValue,
				qValue,
				shiftSimplified,
				options,
				recorder
			);
		}
	}

	// Symbolic case - try Cardano formula (treats as one real root case)
	return handleCubicOneReal(
		variable,
		pSimplified,
		qSimplified,
		pValue,
		qValue,
		shiftSimplified,
		options,
		recorder
	);
}

/**
 * Handle cubic with common factor: ax³ + bx² + cx = 0 → x(ax² + bx + c) = 0
 */
function handleCubicWithCommonFactor(
	variable: string,
	a: MathNode,
	b: MathNode,
	c: MathNode,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	recorder.recordStep(
		'factor-common-root',
		describeFactorCommonRoot(variable),
		equals(varNode(variable), number('0')),
		equals(varNode(variable), number('0')),
		'detailed'
	);

	// x = 0 is one solution
	const zeroSolution: Solution = { value: number('0'), exact: true, approximate: 0 };
	const solutions: Solution[] = [zeroSolution];

	// Solve the quadratic ax² + bx + c = 0
	const aValue = computeNumericValue(a);
	const bValue = computeNumericValue(b);
	const cValue = computeNumericValue(c);

	if (aValue !== null && bValue !== null && cValue !== null) {
		const discriminant = bValue * bValue - 4 * aValue * cValue;

		if (discriminant >= 0) {
			const sqrtDisc = Math.sqrt(discriminant);
			const x1 = (-bValue + sqrtDisc) / (2 * aValue);
			const x2 = (-bValue - sqrtDisc) / (2 * aValue);

			// Check if roots are integers or simple fractions
			const twoA = multiply(number('2'), a, 'implicit');
			const negB = opposite(b);

			if (Math.abs(discriminant) < 1e-10) {
				// Double root
				const root = denormalize(normalize(fraction(negB, twoA)));
				solutions.push({ value: root, exact: true, approximate: x1 });
			} else {
				// Two distinct roots
				const discNode = func('sqrt', [
					subtract(
						power(b, number('2')),
						multiply(number('4'), multiply(a, c, 'implicit'), 'implicit')
					)
				]);

				const root1Node = fraction(add(negB, discNode), twoA);
				const root2Node = fraction(subtract(negB, discNode), twoA);

				const root1Simplified = denormalize(normalize(root1Node));
				const root2Simplified = denormalize(normalize(root2Node));

				solutions.push({ value: root1Simplified, exact: true, approximate: x1 });
				solutions.push({ value: root2Simplified, exact: true, approximate: x2 });
			}
		}
		// If discriminant < 0, no additional real roots
	}

	// Record solutions
	solutions.forEach((sol, idx) => {
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1),
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: solutions.length > 1 ? 'multiple' : 'unique',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle Δ < 0: One real root using Cardano's formula.
 * u = ∛(-q/2 + √((q/2)² + (p/3)³))
 * v = ∛(-q/2 - √((q/2)² + (p/3)³))
 * t = u + v, x = t - b/(3a)
 */
function handleCubicOneReal(
	variable: string,
	p: MathNode,
	q: MathNode,
	pValue: number | null,
	qValue: number | null,
	shift: MathNode,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	recorder.recordStep('discriminant-one-real', 'Δ < 0: une seule racine reelle', p, p, 'detailed');

	// Compute discriminant inside radical: (q/2)² + (p/3)³
	const two = number('2');
	const three = number('3');

	const qOver2 = fraction(q, two);
	const pOver3 = fraction(p, three);
	const qOver2Squared = power(qOver2, two);
	const pOver3Cubed = power(pOver3, three);
	const discriminantInner = add(qOver2Squared, pOver3Cubed);
	const discriminantInnerSimplified = denormalize(normalize(discriminantInner));

	// Get numeric value for the inner discriminant
	const innerValue = computeNumericValue(discriminantInnerSimplified);

	let approximate: number | undefined;
	let solutionNode: MathNode;

	if (pValue !== null && qValue !== null && innerValue !== null) {
		// Numeric path - compute the real root
		const sqrtInner = Math.sqrt(Math.abs(innerValue));
		const negQOver2 = -qValue / 2;

		// For Δ < 0, innerValue > 0, so we can take sqrt directly
		const uArg = negQOver2 + sqrtInner;
		const vArg = negQOver2 - sqrtInner;

		// Cube roots (handle negative values)
		const u = Math.cbrt(uArg);
		const v = Math.cbrt(vArg);

		const t = u + v;
		const shiftValue = computeNumericValue(shift) ?? 0;
		approximate = t - shiftValue;

		// Try to find if it's a rational root
		const roundedApprox = Math.round(approximate);
		if (Math.abs(approximate - roundedApprox) < 1e-9) {
			solutionNode = number(roundedApprox.toString());
		} else {
			// Build symbolic form
			const sqrtDisc = func('sqrt', [discriminantInnerSimplified]);
			const negQOver2Node = opposite(fraction(q, two));

			const uNode = func('cbrt', [add(negQOver2Node, sqrtDisc)]);
			const vNode = func('cbrt', [subtract(negQOver2Node, sqrtDisc)]);
			const tNode = add(uNode, vNode);

			solutionNode = subtract(tNode, shift);
		}
	} else {
		// Pure symbolic path
		const sqrtDisc = func('sqrt', [discriminantInnerSimplified]);
		const negQOver2Node = opposite(fraction(q, two));

		const uNode = func('cbrt', [add(negQOver2Node, sqrtDisc)]);
		const vNode = func('cbrt', [subtract(negQOver2Node, sqrtDisc)]);
		const tNode = add(uNode, vNode);

		solutionNode = subtract(tNode, shift);
	}

	const solutionSimplified = denormalize(normalize(solutionNode));

	recorder.recordStep(
		'apply-cardano-formula',
		'On applique la formule de Cardano',
		solutionNode,
		solutionSimplified,
		'detailed'
	);

	recorder.recordStep(
		'isolate-variable',
		describeSolution(variable, solutionSimplified),
		equals(varNode(variable), solutionNode),
		equals(varNode(variable), solutionSimplified),
		'summarized'
	);

	return {
		variable,
		status: 'unique',
		solutions: [{ value: solutionSimplified, exact: true, approximate }],
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle Δ = 0: Multiple roots.
 * If p = q = 0: triple root x = -b/(3a)
 * Otherwise: x₁ = 3q/p, x₂ = x₃ = -3q/(2p)
 */
function handleCubicMultipleRoot(
	variable: string,
	p: MathNode,
	q: MathNode,
	pValue: number | null,
	qValue: number | null,
	shift: MathNode,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	recorder.recordStep('discriminant-triple-root', 'Δ = 0: racine(s) multiple(s)', p, p, 'detailed');

	const three = number('3');
	const two = number('2');
	const solutions: Solution[] = [];

	// Check if p ≈ 0 (which implies q ≈ 0 for Δ = 0)
	if ((pValue !== null && Math.abs(pValue) < 1e-10) || isZeroNode(p)) {
		// Triple root: t = 0, so x = -b/(3a) = -shift
		const tripleRoot = opposite(shift);
		const tripleRootSimplified = denormalize(normalize(tripleRoot));
		const approx = computeNumericValue(tripleRootSimplified);

		recorder.recordStep(
			'isolate-variable',
			`Solution triple: ${variable} = ${approx ?? '?'}`,
			equals(varNode(variable), tripleRoot),
			equals(varNode(variable), tripleRootSimplified),
			'summarized'
		);

		return {
			variable,
			status: 'unique',
			solutions: [{ value: tripleRootSimplified, exact: true, approximate: approx ?? undefined }],
			equationType: 'polynomial',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(options.verbosity)
		};
	}

	// Non-triple case: x₁ = 3q/p - shift, x₂ = -3q/(2p) - shift (double)
	// t₁ = 3q/p, t₂ = -3q/(2p)

	const threeQOverP = fraction(multiply(three, q, 'implicit'), p);
	const negThreeQOver2P = opposite(
		fraction(multiply(three, q, 'implicit'), multiply(two, p, 'implicit'))
	);

	const t1Simplified = denormalize(normalize(threeQOverP));
	const t2Simplified = denormalize(normalize(negThreeQOver2P));

	const x1 = subtract(t1Simplified, shift);
	const x2 = subtract(t2Simplified, shift);

	const x1Simplified = denormalize(normalize(x1));
	const x2Simplified = denormalize(normalize(x2));

	const approx1 = computeNumericValue(x1Simplified);
	const approx2 = computeNumericValue(x2Simplified);

	solutions.push({ value: x1Simplified, exact: true, approximate: approx1 ?? undefined });
	solutions.push({ value: x2Simplified, exact: true, approximate: approx2 ?? undefined });

	solutions.forEach((sol, idx) => {
		const label = idx === 1 ? ' (racine double)' : '';
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1) + label,
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: 'multiple',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Handle Δ > 0: Three real roots using trigonometric form (casus irreducibilis).
 * x_k = 2√(-p/3) × cos((arccos(3q/(2p) × √(-3/p)) + 2πk)/3) - b/(3a)
 * for k = 0, 1, 2
 */
function handleCubicThreeReal(
	variable: string,
	p: MathNode,
	q: MathNode,
	pValue: number | null,
	qValue: number | null,
	shift: MathNode,
	options: Required<Omit<SolveOptions, 'variable' | 'initialGuesses'>> & {
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder
): SolveResult {
	recorder.recordStep(
		'discriminant-three-real',
		'Δ > 0: trois racines reelles distinctes',
		p,
		p,
		'detailed'
	);

	recorder.recordStep(
		'apply-trigonometric-form',
		'On utilise la forme trigonometrique',
		p,
		p,
		'detailed'
	);

	const solutions: Solution[] = [];

	if (pValue !== null && qValue !== null && pValue < 0) {
		// Numeric computation for three real roots
		// x_k = 2√(-p/3) × cos((θ + 2πk)/3) - shift
		// where θ = arccos(3q/(2p) × √(-3/p))

		const sqrtNegPOver3 = Math.sqrt(-pValue / 3);
		const argument = ((3 * qValue) / (2 * pValue)) * Math.sqrt(-3 / pValue);

		// Clamp argument to [-1, 1] for arccos (numerical safety)
		const clampedArg = Math.max(-1, Math.min(1, argument));
		const theta = Math.acos(clampedArg);

		const shiftValue = computeNumericValue(shift) ?? 0;

		for (let k = 0; k < 3; k++) {
			const t = 2 * sqrtNegPOver3 * Math.cos((theta + 2 * Math.PI * k) / 3);
			const x = t - shiftValue;

			// Check if this is close to an integer
			const rounded = Math.round(x);
			let solutionNode: MathNode;

			if (Math.abs(x - rounded) < 1e-9) {
				solutionNode = number(rounded.toString());
			} else {
				// Check for simple fractions
				const fractionResult = findSimpleFraction(x);
				if (fractionResult) {
					solutionNode = fraction(
						number(fractionResult.n.toString()),
						number(fractionResult.d.toString())
					);
				} else {
					// Keep as symbolic (approximate)
					solutionNode = number(x.toFixed(10));
				}
			}

			const solutionSimplified = denormalize(normalize(solutionNode));
			solutions.push({ value: solutionSimplified, exact: true, approximate: x });
		}

		// Sort solutions by value
		solutions.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));
	} else {
		// Pure symbolic - build trigonometric form
		// This is complex, so we just record that three roots exist
		// In practice, this case is rare for symbolic input
		const three = number('3');
		const two = number('2');

		// Build the symbolic expression for one root
		const sqrtNegPOver3 = func('sqrt', [opposite(fraction(p, three))]);
		const cosArg = func('acos', [
			multiply(
				fraction(multiply(three, q, 'implicit'), multiply(two, p, 'implicit')),
				func('sqrt', [opposite(fraction(three, p))]),
				'implicit'
			)
		]);
		const t0 = multiply(
			multiply(two, sqrtNegPOver3, 'implicit'),
			func('cos', [fraction(cosArg, three)]),
			'implicit'
		);
		const x0 = subtract(t0, shift);
		const x0Simplified = denormalize(normalize(x0));

		solutions.push({ value: x0Simplified, exact: true });
		// Note: Full symbolic form for all three roots would be very complex
	}

	solutions.forEach((sol, idx) => {
		recorder.recordStep(
			'isolate-variable',
			describeSolution(variable, sol.value, idx + 1),
			equals(varNode(variable), sol.value),
			equals(varNode(variable), sol.value),
			'summarized'
		);
	});

	return {
		variable,
		status: solutions.length > 1 ? 'multiple' : 'unique',
		solutions,
		equationType: 'polynomial',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(options.verbosity)
	};
}

/**
 * Try to find a simple fraction close to the given value.
 */
function findSimpleFraction(value: number, maxDenominator = 100): { n: number; d: number } | null {
	const TOLERANCE = 1e-9;

	for (let d = 1; d <= maxDenominator; d++) {
		const n = Math.round(value * d);
		if (Math.abs(n / d - value) < TOLERANCE) {
			// Found a match - reduce the fraction
			const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
			const g = gcd(Math.abs(n), d);
			return { n: n / g, d: d / g };
		}
	}
	return null;
}
