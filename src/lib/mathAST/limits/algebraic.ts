/**
 * Algebraic Manipulation for Limits
 *
 * Provides algebraic strategies for limit evaluation:
 * - Factorization and cancellation
 * - Rationalization (multiply by conjugate)
 * - Dominant term extraction at infinity
 *
 * @module mathAST/limits/algebraic
 */

import type { MathNode } from '../types';
import type { LimitDirection } from './types';
import type { LimitStepRecorder } from './step-recorder';
import {
	isDivision,
	isAddition,
	isSubtraction,
	isSuperscript,
	isNumber,
	isVariable,
	isFunction,
	isInfinity
} from '../guards';
import {
	number,
	divide,
	multiply,
	subtract,
	add,
	power,
	opposite,
	positiveInfinity,
	negativeInfinity,
	parentheses,
	variable
} from '../factory';
import { limitByGeneralizedDegree } from './generalized-degree';
import { extractExactRational, numericNode } from '../common/numeric';
import {
	divideOutCommonRoot,
	divideOutRoot,
	linearFactorText,
	rationalPolynomialNode,
	toPolynomial
} from '../factor';
import { substitute } from '../eval/substitute';
import { computeNumericValue } from '../eval/numeric-value';

// =============================================================================
// Algebraic Manipulation Result
// =============================================================================

/**
 * Result of an algebraic manipulation.
 */
export interface AlgebraicResult {
	/** Whether manipulation was successful */
	readonly success: boolean;

	/** The simplified expression */
	readonly simplified?: MathNode;

	/** Technique used */
	readonly technique?:
		| 'factorization'
		| 'rationalization'
		| 'dominant-term'
		| 'common-denominator'
		| 'abs-simplification';

	/** Description of the manipulation */
	readonly description?: string;
}

// =============================================================================
// Factorization
// =============================================================================

/**
 * Lève un `0/0` en a en sortant (x − a)^k de N et de D, k la plus petite des
 * deux multiplicités : division exacte par le noyau `factor/` (ADR 0024).
 * N et D : polynômes à coefficients rationnels ; a : rationnel exact, négatif
 * compris (un négatif est un `opposite`, invariant 1).
 *
 * Utile pour (x² − 4)/(x − 2) en 2, (x³ − 1)/(x² − 1) en 1, (x² − 9)/(x + 3) en −3.
 */
export function tryFactorization(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) return { success: false };
	const a = extractExactRational(approach);
	const num = toPolynomial(expr.numerator, varName);
	const den = toPolynomial(expr.denominator, varName);
	if (a === null || num === null || den === null) return { success: false };

	const k = Math.min(divideOutRoot(num, a).multiplicity, divideOutRoot(den, a).multiplicity);
	if (k === 0) return { success: false };

	// Facteur entier (2x − 1, pas x − 1/2) et fraction réduite ((2x + 2)/2 → x + 1) : V23
	const division = divideOutCommonRoot(num, den, a, k);
	if (division === null) return { success: false };
	const x = variable(varName);
	const numQuotient = rationalPolynomialNode(division.reducedNumerator, x);
	const denQuotient = division.reducedDenominator;
	const isOne = denQuotient.length === 1 && denQuotient[0].n === denQuotient[0].d;
	const simplified = isOne
		? numQuotient
		: divide(numQuotient, rationalPolynomialNode(denQuotient, x), 'fraction');

	// Texte sans LaTeX, comme les autres descriptions : « Factorisation par (2x − 1) »
	const factorText = linearFactorText(varName, a, k);
	recorder.recordStep(
		'factorization',
		`Factorisation par ${factorText}`,
		expr,
		simplified,
		'detailed',
		undefined,
		'Annulation du facteur commun'
	);

	return {
		success: true,
		simplified,
		technique: 'factorization',
		description: `Factored out ${factorText}`
	};
}

// =============================================================================
// Rationalization
// =============================================================================

/**
 * Try to rationalize an expression by multiplying by conjugate.
 *
 * Useful for limits like (√(x+1) - 1)/x as x → 0.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param recorder - Step recorder
 */
export function tryRationalization(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) {
		return { success: false };
	}

	// Look for √a - √b or √a - c in numerator
	const conjugateInfo = findConjugate(expr.numerator);
	if (!conjugateInfo) {
		return { success: false };
	}

	// Multiply numerator and denominator by conjugate
	const { conjugate, expanded } = conjugateInfo;

	const newNumerator = expanded; // (√a - b)(√a + b) = a - b²
	const newDenominator = multiply(expr.denominator, conjugate, 'implicit');

	const simplified = divide(newNumerator, newDenominator, 'fraction');

	recorder.recordStep(
		'rationalization',
		'Rationalisation (multiplication par le conjugué)',
		expr,
		simplified,
		'detailed',
		conjugate,
		'Multiplication du numérateur et du dénominateur par le conjugué'
	);

	return {
		success: true,
		simplified,
		technique: 'rationalization',
		description: 'Multiplied by conjugate'
	};
}

/**
 * B², B parenthésé s'il est déjà une puissance. B = x² était autrefois pris
 * tel quel (B² = x²) : x² − √(x⁴+x) devenait (x² − x⁴ − x)/(x² + √(x⁴+x))
 * → −∞, au lieu de −x/(x² + √(x⁴+x)) → 0.
 */
function square(node: MathNode): MathNode {
	return power(isSuperscript(node) ? parentheses(node) : node, number('2'));
}

/**
 * Find conjugate for rationalization.
 */
export function findConjugate(expr: MathNode): { conjugate: MathNode; expanded: MathNode } | null {
	// Look for √a - b
	if (isSubtraction(expr)) {
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			// √a - b → conjugate is √a + b
			// (√a - b)(√a + b) = a - b²
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				const conjugate = add(expr.left, expr.right);
				const expanded = subtract(sqrtArg, square(expr.right));
				return { conjugate, expanded };
			}
		}

		// b - √a → conjugate is b + √a
		if (!isSqrt(expr.left) && isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.right);
			if (sqrtArg) {
				const conjugate = add(expr.left, expr.right);
				const expanded = subtract(square(expr.left), sqrtArg);
				return { conjugate, expanded };
			}
		}
	}

	// Look for √a + b where we want √a - b
	if (isAddition(expr)) {
		if (isSqrt(expr.left) && !isSqrt(expr.right)) {
			const sqrtArg = getSqrtArg(expr.left);
			if (sqrtArg) {
				const conjugate = subtract(expr.left, expr.right);
				const expanded = subtract(sqrtArg, square(expr.right));
				return { conjugate, expanded };
			}
		}
	}

	return null;
}

/**
 * Check if expression is a square root.
 */
function isSqrt(expr: MathNode): boolean {
	return (
		(isFunction(expr) && expr.name.toLowerCase() === 'sqrt') ||
		(isSuperscript(expr) &&
			isDivision(expr.superscript) &&
			isNumber(expr.superscript.numerator) &&
			expr.superscript.numerator.value === '1' &&
			isNumber(expr.superscript.denominator) &&
			expr.superscript.denominator.value === '2')
	);
}

/**
 * Get the argument of a square root.
 */
function getSqrtArg(expr: MathNode): MathNode | null {
	if (isFunction(expr) && expr.name.toLowerCase() === 'sqrt') {
		return expr.args[0];
	}
	if (isSuperscript(expr)) {
		return expr.base;
	}
	return null;
}

// =============================================================================
// Dominant Term Extraction (for limits at infinity)
// =============================================================================

/**
 * Extract dominant term for limits at infinity.
 *
 * For polynomials/rationals, factor out highest power from numerator and denominator.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param positive - Whether approaching +∞ (true) or -∞ (false)
 * @param recorder - Step recorder
 */
export function tryDominantTerm(
	expr: MathNode,
	varName: string,
	positive: boolean,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isDivision(expr)) {
		return { success: false };
	}

	const numDegree = getPolynomialDegree(expr.numerator, varName);
	const denDegree = getPolynomialDegree(expr.denominator, varName);

	if (numDegree === null || denDegree === null) {
		return { success: false };
	}

	const numLeading = getLeadingCoefficient(expr.numerator, varName);
	const denLeading = getLeadingCoefficient(expr.denominator, varName);

	if (numLeading === null || denLeading === null) {
		return { success: false };
	}

	let limitValue: MathNode;
	let description: string;

	if (numDegree > denDegree) {
		// Numerator dominates → ±∞, comme (a/b)·x^{p−q} : en −∞, x^{p−q} n'est
		// négatif que si p − q est impair (x³/x = x² → +∞ en −∞)
		const powerNegative = !positive && (numDegree - denDegree) % 2 === 1;
		const sign = numLeading * denLeading > 0 !== powerNegative ? 'positive' : 'negative';
		limitValue = { type: 'infinity', sign };
		description = `Degré numérateur (${numDegree}) > degré dénominateur (${denDegree})`;
	} else if (numDegree < denDegree) {
		// Denominator dominates → 0
		limitValue = number('0');
		description = `Degré numérateur (${numDegree}) < degré dénominateur (${denDegree})`;
	} else {
		// Same degree → ratio of leading coefficients
		// Rapport EXACT des termes dominants (2/3, pas 0.666…) ; flottant
		// seulement si un coefficient n'est pas rationnel
		const exact = limitByGeneralizedDegree(
			expr,
			varName,
			positive ? positiveInfinity() : negativeInfinity()
		);
		limitValue =
			exact !== null && !isInfinity(exact) ? exact : numericNode(numLeading / denLeading);
		description = `Même degré, rapport des coefficients dominants: ${numLeading}/${denLeading}`;
	}

	recorder.recordStep(
		'infinity-analysis',
		"Analyse du comportement à l'infini",
		expr,
		limitValue,
		'summarized',
		undefined,
		description
	);

	return {
		success: true,
		simplified: limitValue,
		technique: 'dominant-term',
		description
	};
}

/**
 * Get the polynomial degree of an expression.
 */
function getPolynomialDegree(expr: MathNode, varName: string): number | null {
	switch (expr.type) {
		case 'number':
			return 0;

		case 'variable':
			return expr.name === varName ? 1 : 0;

		case 'addition':
		case 'subtraction': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;
			return Math.max(leftDeg, rightDeg);
		}

		case 'multiplication': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;
			return leftDeg + rightDeg;
		}

		case 'superscript': {
			if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return Number.isInteger(exp) && exp >= 0 ? exp : null;
			}
			const baseDeg = getPolynomialDegree(expr.base, varName);
			if (baseDeg === null) return null;
			if (isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return Number.isInteger(exp) && exp >= 0 ? baseDeg * exp : null;
			}
			return null;
		}

		case 'opposite':
		case 'positive':
			return getPolynomialDegree(expr.operand, varName);

		case 'delimiter':
			return getPolynomialDegree(expr.content, varName);

		default:
			return null;
	}
}

/**
 * Get the leading coefficient of a polynomial expression.
 */
function getLeadingCoefficient(expr: MathNode, varName: string): number | null {
	const degree = getPolynomialDegree(expr, varName);
	if (degree === null) return null;

	return extractLeadingCoeff(expr, varName, degree);
}

function extractLeadingCoeff(expr: MathNode, varName: string, targetDegree: number): number | null {
	switch (expr.type) {
		case 'number':
			return targetDegree === 0 ? parseFloat(expr.value) : 0;

		case 'variable':
			if (expr.name === varName) {
				return targetDegree === 1 ? 1 : 0;
			}
			return targetDegree === 0 ? 1 : 0;

		case 'addition': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			let coeff = 0;
			if (leftDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, targetDegree);
				if (lc !== null) coeff += lc;
			}
			if (rightDeg === targetDegree) {
				const rc = extractLeadingCoeff(expr.right, varName, targetDegree);
				if (rc !== null) coeff += rc;
			}
			return coeff;
		}

		case 'subtraction': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			let coeff = 0;
			if (leftDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, targetDegree);
				if (lc !== null) coeff += lc;
			}
			if (rightDeg === targetDegree) {
				const rc = extractLeadingCoeff(expr.right, varName, targetDegree);
				if (rc !== null) coeff -= rc;
			}
			return coeff;
		}

		case 'multiplication': {
			const leftDeg = getPolynomialDegree(expr.left, varName);
			const rightDeg = getPolynomialDegree(expr.right, varName);
			if (leftDeg === null || rightDeg === null) return null;

			if (leftDeg + rightDeg === targetDegree) {
				const lc = extractLeadingCoeff(expr.left, varName, leftDeg);
				const rc = extractLeadingCoeff(expr.right, varName, rightDeg);
				if (lc !== null && rc !== null) return lc * rc;
			}
			return 0;
		}

		case 'superscript': {
			if (isVariable(expr.base) && expr.base.name === varName && isNumber(expr.superscript)) {
				const exp = parseFloat(expr.superscript.value);
				return exp === targetDegree ? 1 : 0;
			}
			return null;
		}

		case 'opposite': {
			const inner = extractLeadingCoeff(expr.operand, varName, targetDegree);
			return inner !== null ? -inner : null;
		}

		case 'positive':
			return extractLeadingCoeff(expr.operand, varName, targetDegree);

		case 'delimiter':
			return extractLeadingCoeff(expr.content, varName, targetDegree);

		default:
			return null;
	}
}

// =============================================================================
// Absolute Value Simplification
// =============================================================================

/**
 * Try to simplify absolute value expressions by determining the sign of the
 * argument near the approach point.
 *
 * For one-sided limits, |f(x)| can be replaced by f(x) or -f(x) depending
 * on the sign of f(x) near the approach point.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param direction - Direction of approach (must be 'left' or 'right')
 * @param recorder - Step recorder
 */
function tryAbsSimplification(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): AlgebraicResult {
	if (!isNumber(approach) || direction === 'both') {
		return { success: false };
	}

	// Check if expression contains abs
	if (!containsAbs(expr)) {
		return { success: false };
	}

	const approachVal = parseFloat(approach.value);
	const epsilon = 1e-8;
	const testValue = direction === 'right' ? approachVal + epsilon : approachVal - epsilon;

	const simplified = replaceAbs(expr, varName, testValue);
	if (!simplified) {
		return { success: false };
	}

	recorder.recordStep(
		'abs-simplification',
		`Simplification de la valeur absolue (approche par la ${direction === 'right' ? 'droite' : 'gauche'})`,
		expr,
		simplified,
		'detailed',
		undefined,
		direction === 'right'
			? 'Pour x → ' + approach.value + "⁺, on détermine le signe de l'argument"
			: 'Pour x → ' + approach.value + "⁻, on détermine le signe de l'argument"
	);

	return {
		success: true,
		simplified,
		technique: 'abs-simplification',
		description: `Replaced |f(x)| based on sign from ${direction}`
	};
}

/**
 * Check if expression contains an abs function call.
 */
function containsAbs(expr: MathNode): boolean {
	if (isFunction(expr) && expr.name.toLowerCase() === 'abs') {
		return true;
	}
	switch (expr.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return containsAbs(expr.left) || containsAbs(expr.right);
		case 'division':
			return containsAbs(expr.numerator) || containsAbs(expr.denominator);
		case 'superscript':
			return containsAbs(expr.base) || containsAbs(expr.superscript);
		case 'opposite':
		case 'positive':
			return containsAbs(expr.operand);
		case 'function':
			return expr.args.some(containsAbs);
		case 'delimiter':
			return containsAbs(expr.content);
		default:
			return false;
	}
}

/**
 * Replace abs(f(x)) nodes with f(x) or -f(x) based on numeric evaluation.
 * Returns null if sign cannot be determined.
 */
function replaceAbs(expr: MathNode, varName: string, testValue: number): MathNode | null {
	if (isFunction(expr) && expr.name.toLowerCase() === 'abs' && expr.args.length === 1) {
		const arg = expr.args[0];
		// Evaluate f(x) at the test point
		const argValue = approximateValueAt(arg, varName, testValue);
		if (argValue === null) return null;

		if (argValue >= 0) {
			return arg; // |f(x)| = f(x) when f(x) >= 0
		} else {
			return opposite(arg); // |f(x)| = -f(x) when f(x) < 0
		}
	}

	// Recursively replace in subexpressions
	switch (expr.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication': {
			const left = replaceAbs(expr.left, varName, testValue);
			const right = replaceAbs(expr.right, varName, testValue);
			if (!left || !right) return null;
			if (left === expr.left && right === expr.right) return expr;
			return { ...expr, left, right };
		}
		case 'division': {
			const num = replaceAbs(expr.numerator, varName, testValue);
			const den = replaceAbs(expr.denominator, varName, testValue);
			if (!num || !den) return null;
			if (num === expr.numerator && den === expr.denominator) return expr;
			return { ...expr, numerator: num, denominator: den };
		}
		case 'superscript': {
			const base = replaceAbs(expr.base, varName, testValue);
			const sup = replaceAbs(expr.superscript, varName, testValue);
			if (!base || !sup) return null;
			if (base === expr.base && sup === expr.superscript) return expr;
			return { ...expr, base, superscript: sup };
		}
		case 'opposite':
		case 'positive': {
			const operand = replaceAbs(expr.operand, varName, testValue);
			if (!operand) return null;
			if (operand === expr.operand) return expr;
			return { ...expr, operand };
		}
		case 'function': {
			let changed = false;
			const newArgs = expr.args.map((arg) => {
				const replaced = replaceAbs(arg, varName, testValue);
				if (replaced !== arg) changed = true;
				return replaced;
			});
			if (newArgs.some((a) => a === null)) return null;
			if (!changed) return expr;
			return { ...expr, args: newArgs as MathNode[] };
		}
		case 'delimiter': {
			const content = replaceAbs(expr.content, varName, testValue);
			if (!content) return null;
			if (content === expr.content) return expr;
			return { ...expr, content };
		}
		default:
			return expr;
	}
}

/**
 * Evaluate an expression at a specific point using full substitution and evaluation.
 */
function approximateValueAt(expr: MathNode, varName: string, value: number): number | null {
	const valueNode: MathNode = { type: 'number', value: String(value) };
	return computeNumericValue(substitute(expr, { [varName]: valueNode }));
}

// =============================================================================
// Main Algebraic Simplification Entry Point
// =============================================================================

/**
 * Try various algebraic manipulations to simplify a limit.
 *
 * @param expr - The expression
 * @param varName - The variable
 * @param approach - The approach point
 * @param direction - Direction of approach
 * @param recorder - Step recorder
 */
export function tryAlgebraicSimplification(
	expr: MathNode,
	varName: string,
	approach: MathNode,
	direction: LimitDirection,
	recorder: LimitStepRecorder
): AlgebraicResult {
	// Factorisation d'abord, en tout point rationnel (négatif compris)
	const factResult = tryFactorization(expr, varName, approach, recorder);
	if (factResult.success) {
		return factResult;
	}

	if (isNumber(approach)) {
		// Try rationalization
		const ratResult = tryRationalization(expr, varName, approach, recorder);
		if (ratResult.success) {
			return ratResult;
		}

		// Try abs simplification (for one-sided limits with absolute values)
		const absResult = tryAbsSimplification(expr, varName, approach, direction, recorder);
		if (absResult.success && absResult.simplified) {
			// Try factorization on the simplified expression (e.g., x/x → 1)
			const postFact = tryFactorization(absResult.simplified, varName, approach, recorder);
			if (postFact.success) {
				return { ...postFact, technique: 'abs-simplification' };
			}
			// L'expression sans valeur absolue est rendue telle quelle : sa limite
			// est calculée par le moteur (evaluate.ts). L'évaluer en a ± 10⁻⁸ et
			// arrondir rendait |x|/x² en 0 « exact 100000000 » au lieu de +∞.
			return absResult;
		}
	}

	// Try dominant term extraction (for limits at infinity)
	if (isInfinity(approach)) {
		const domResult = tryDominantTerm(expr, varName, approach.sign === 'positive', recorder);
		if (domResult.success) {
			return domResult;
		}
	}

	return { success: false };
}
