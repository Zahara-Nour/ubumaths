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
	power,
	greaterThanOrEqual
} from '../../factory';
import { isMultiplication, isNumber, isOpposite, isSuperscript, isVariable } from '../../guards';
import { substitute } from '../../eval/substitute';
import { extractExactRational } from '../../common/numeric';
import type { Rational } from '../../normal/types';
import {
	ONE as RATIONAL_ONE,
	mulRational,
	negRational,
	isPositive as isRationalPositive
} from '../../normal/rational';
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
// Racine d'un discriminant paramétré (V92)
// =============================================================================

/** Un monôme en lettres : coefficient rationnel × produit de lettres à des puissances entières > 0. */
interface LetterMonomial {
	readonly coefficient: Rational;
	readonly letters: ReadonlyMap<string, number>;
}

/** Nom de la lettre qui tient la place de √R le temps de la mise en forme canonique. */
const ROOT_PLACEHOLDER = '__racine_du_discriminant__';

/** `c·aᵐ·bⁿ…` lu sur la forme canonique d'un discriminant ; `null` pour toute autre forme. */
function letterMonomial(node: MathNode): LetterMonomial | null {
	if (isOpposite(node)) {
		const inner = letterMonomial(node.operand);
		return inner && { coefficient: negRational(inner.coefficient), letters: inner.letters };
	}
	if (isMultiplication(node)) {
		const left = letterMonomial(node.left);
		const right = letterMonomial(node.right);
		if (left === null || right === null) return null;
		const letters = new Map(left.letters);
		for (const [name, exponent] of right.letters) {
			letters.set(name, (letters.get(name) ?? 0) + exponent);
		}
		return { coefficient: mulRational(left.coefficient, right.coefficient), letters };
	}
	if (isVariable(node)) return { coefficient: RATIONAL_ONE, letters: new Map([[node.name, 1]]) };
	if (isSuperscript(node) && isVariable(node.base) && isNumber(node.superscript)) {
		const exponent = Number(node.superscript.value);
		if (!Number.isInteger(exponent) || exponent < 1) return null;
		return { coefficient: RATIONAL_ONE, letters: new Map([[node.base.name, exponent]]) };
	}
	if (isNumber(node)) {
		const value = extractExactRational(node);
		return value && { coefficient: value, letters: new Map() };
	}
	return null;
}

/**
 * √Δ quand Δ = c·(produit de lettres) a au moins deux lettres de puissance
 * impaire : √(ab) n'est pas √a·√b (faux pour a, b < 0). Les carrés sortent
 * (√(4a²) = 2|a|, juste) ; les lettres de puissance impaire restent ENSEMBLE
 * sous la racine, le « radicand ». `null` hors de ce cas : la forme canonique
 * habituelle convient (une seule lettre, √a ; une somme, √(b² − 4c)).
 *
 * `equivalentCondition` : Δ ⩾ 0 ⟺ radicand ⩾ 0 quand chaque lettre de
 * puissance paire figure aussi dans le radicand (a³b ⩾ 0 ⟺ ab ⩾ 0) ; avec
 * a²bc, a = 0 suffit à Δ = 0, et la condition reste Δ ⩾ 0.
 */
function unsplitDiscriminantRoot(
	discriminant: MathNode
): { outside: MathNode; radicand: MathNode; equivalentCondition: boolean } | null {
	const monomial = letterMonomial(discriminant);
	if (monomial === null || !isRationalPositive(monomial.coefficient)) return null;
	const oddLetters = [...monomial.letters]
		.filter(([, exponent]) => exponent % 2 === 1)
		.map(([name]) => name)
		.sort();
	if (oddLetters.length < 2) return null;
	// Hors de la racine : √(c · Π v^{2⌊e/2⌋}), carrés seulement
	let squares: MathNode = rationalToNode(monomial.coefficient);
	for (const [name, exponent] of monomial.letters) {
		const even = exponent - (exponent % 2);
		if (even > 0) squares = implicitMultiply(squares, power(varNode(name), number(String(even))));
	}
	const radicand = oddLetters
		.map((name): MathNode => varNode(name))
		.reduce((product, letter) => implicitMultiply(product, letter));
	const equivalentCondition = [...monomial.letters].every(
		([name, exponent]) => exponent < 2 || oddLetters.includes(name)
	);
	return { outside: canonicalForm(sqrtNode(squares)), radicand, equivalentCondition };
}

/** Un rationnel en arbre, sans nombre négatif littéral : `−3/4` → opposite(3/4). */
function rationalToNode(value: Rational): MathNode {
	const magnitude = value.n < 0n ? -value.n : value.n;
	const body =
		value.d === 1n
			? number(magnitude.toString())
			: fraction(number(magnitude.toString()), number(value.d.toString()));
	return value.n < 0n ? opposite(body) : body;
}

/**
 * (−b ± k·√R)/(2a) en forme canonique, √R gardé entier : une lettre tient sa
 * place pendant `canonicalForm` (qui écrirait √a·√b), puis la racine revient.
 */
function rootWithUnsplitRadical(
	negB: MathNode,
	twoA: MathNode,
	outside: MathNode,
	radicand: MathNode,
	sign: 1 | -1
): MathNode {
	const placeholder = varNode(ROOT_PLACEHOLDER);
	const radicalTerm = implicitMultiply(outside, placeholder);
	const numerator = sign === 1 ? add(negB, radicalTerm) : subtract(negB, radicalTerm);
	const shaped = canonicalForm(fraction(numerator, twoA));
	return substitute(shaped, { [ROOT_PLACEHOLDER]: sqrtNode(radicand) });
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
		// √(ab) gardé entier (V92) : la condition se lit alors sur ab ⩾ 0
		const unsplit =
			discriminantValue === null && parameters.size > 0
				? unsplitDiscriminantRoot(discriminantSimplified)
				: null;
		const conditionSubject =
			unsplit !== null && unsplit.equivalentCondition ? unsplit.radicand : discriminantSimplified;
		const condition =
			discriminantValue === null && !isDiscriminantZero && parameters.size > 0
				? parameterCondition([greaterThanOrEqual(conditionSubject, number('0'))])
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
		const x1Simplified =
			unsplit === null
				? canonicalForm(x1)
				: rootWithUnsplitRadical(negB, twoA, unsplit.outside, unsplit.radicand, 1);

		// x2 = (-b - sqrt(Delta)) / (2a)
		const x2Numerator = subtract(negB, sqrtDiscriminant);
		const x2 = fraction(x2Numerator, twoA);
		const x2Simplified =
			unsplit === null
				? canonicalForm(x2)
				: rootWithUnsplitRadical(negB, twoA, unsplit.outside, unsplit.radicand, -1);

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
