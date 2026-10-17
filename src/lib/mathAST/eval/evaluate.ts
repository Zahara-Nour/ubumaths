/**
 * MathAST Numeric Evaluation
 *
 * Functions for evaluating mathematical expressions to numeric values.
 * Supports both exact (Rational) and decimal (number) evaluation modes.
 */

import type { MathNode, FunctionNode } from '../types';
import type { EvalOptions, EvalResult } from './types';
import type { Rational } from '../normal/types';
import type { PrecisionType } from '$lib/questions/types';
import { DEFAULT_EVAL_OPTIONS } from './types';
import { getVariables } from './substitute';
import {
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isMathConstant,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPercentage,
	isPositive,
	isFunction,
	isDelimiter,
	isSuperscript,
	isSubscript,
	isRelation,
	isHole,
	isUnit,
	isComposition,
	isSegmentLength,
	isFigureName,
	isDerivativeFunction,
	isInverseFunction,
	isComplex,
	isBoolean,
	isLogical,
	isLogicalNot
} from '../guards';
import { substituteFunction } from './function-bindings';
import { formatPointNames } from '../common/point-names';
import { pointNamesEvaluationRefusal, unknownSegmentMessage } from '../common/segment-names';
import {
	rational,
	fromInteger,
	addReduced,
	subReduced,
	mulReduced,
	divReduced,
	negRational,
	powRational,
	rationalToNumber,
	isZero as isZeroRational,
	isInteger as isIntegerRational,
	floatToRational,
	gcd as gcdBigInt
} from '../normal/rational';
import { integerNthRoot } from '../normal/radical';
import { number, divide, opposite, boolean as booleanNode } from '../factory';
import { numericNode, rationalToNode } from '../common/numeric';
import { normalize } from '../normal/normalize';
import { denormalize } from '../normal/denormalize';
import { normalizeExtended } from '../normal/normalize-extended';
import { denormalizeExtended } from '../normal/denormalize';
import { findNodes, getChildren, mapNode } from '../transforms';
import { areEquivalentCore } from '../equivalence-core';
import { getActiveAbortChecker } from '../common/abort';
import { rewriteFunctionPower } from '../common/function-power';
import { compareNumericNodes } from './compare-numeric';
import { oddDenominatorExponent, realNthRoot } from './real-root';

/** Indice maximal d'une racine entière exacte. */
const MAX_EXACT_ROOT_INDEX = 1000n;

/**
 * Un pôle de tan, sec (cos nul), csc, cot (sin nul) est refusé. Le flottant de
 * π/2 n'annule pas exactement cos : `Math.tan(Math.PI / 2)` vaut 1,6331 × 10¹⁶, que
 * le bouton ≈ affichait comme la valeur de tan(π/2) (revue, 2026-10-12). Le seuil
 * suit l'erreur du flottant de l'argument, qui croît avec lui.
 */
function refuseTrigPole(name: string, denominator: number, argument: number): void {
	if (Math.abs(denominator) < 1e-14 * Math.max(1, Math.abs(argument))) {
		throw new Error(`${name} n’est pas définie en cette valeur (division par zéro)`);
	}
}

/**
 * Exposant entier maximal d'une puissance calculée exactement. ⚠️ Pas plus haut
 * tant que le pgcd est celui d'Euclide (décision de David, 2026-10-12) : à 10 000,
 * la base d'un e ou d'un π (fraction de 16 chiffres tirée de son flottant) donnait
 * des fractions de centaines de milliers de bits, réduites ensuite par pgcd —
 * `.variations e^{-2x^2}` passait de 23 ms à 5,7 s, `e^{-5000}+1` à 71 s (revue).
 * Au-delà, par le flottant ; la console lit l'arrondi sur le résultat exact, si
 * bien que `1.5^{2000}` y vaut quand même ≈ 1,5224 × 10³⁵².
 */
const MAX_EXACT_INTEGER_EXPONENT = 1000;

/**
 * Le budget de taille de la lecture de l'arrondi (`evaluateNodeToRational`), au-delà de
 * l'exposant 1000 et de la borne des factorielles (lot « lenteur des grandes fractions »,
 * phase 0 validée par David le 2026-10-12). Une écriture gardée (`1.5^{2000}`, `1000!`) y trouve
 * sa valeur approchée, exacte puis arrondie. Le plus petit des deux termes reste sous
 * 30 000 bits : c'est leur pgcd (Euclide, quadratique) qui coûte — e et π, fractions de
 * 16 chiffres, gardent donc la limite de l'exposant 1000. Le plus grand reste sous
 * 500 000 bits (2^{100000}, 10000! y tiennent ; une puissance native, sans pgcd).
 */
const BUDGET_SMALLER_TERM_BITS = 30_000;
const BUDGET_LARGER_TERM_BITS = 500_000;

/**
 * Vrai pendant `evaluateNodeToRational` seulement : le calcul décimal général (`evaluate`,
 * `evaluateNodeToApproximatedNumber`, une quarantaine d'appelants) garde ses bornes — sa
 * factorielle rend un entier exact en `number`, et une puissance hors du flottant y est refusée.
 */
let withinSizeBudget = false;

/** log₂ d'un entier positif, même au-delà des flottants. */
function log2Of(x: bigint): number {
	if (x <= 1n) return 0;
	return x < 2n ** 53n ? Math.log2(Number(x)) : x.toString(2).length;
}

/** log₂(n!), par la formule de Stirling. */
function log2Factorial(n: number): number {
	if (n < 2) return 0;
	return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN2;
}

/** base^k se calcule exactement : exposant ≤ 1000, ou, dans le budget, une taille raisonnable. */
function exactPowerAllowed(base: Rational, k: number): boolean {
	if (Math.abs(k) <= MAX_EXACT_INTEGER_EXPONENT) return true;
	if (!withinSizeBudget) return false;
	const numerator = log2Of(base.n < 0n ? -base.n : base.n) * Math.abs(k);
	const denominator = log2Of(base.d) * Math.abs(k);
	return (
		Math.min(numerator, denominator) <= BUDGET_SMALLER_TERM_BITS &&
		Math.max(numerator, denominator) <= BUDGET_LARGER_TERM_BITS
	);
}

/** Une factorielle (`log₂` de son résultat) que le budget autorise. */
function budgetedLog2(log2: number, name: string): void {
	if (log2 > BUDGET_LARGER_TERM_BITS) throw new Error(`${name}: result too large to stay exact`);
}

/** Le refus d'une puissance qui sort du flottant (0 ou ±Infinity pour une base non nulle). */
const OUT_OF_SCALE =
	'Valeur hors d’échelle : cette puissance sort des nombres que le calcul approché représente';

/**
 * base^{exp} pour un exposant non entier : racine exacte si la base est un
 * entier ≥ 0 dont la racine ᵠ-ième tombe juste, sinon flottant. Une base
 * négative est refusée (convention x^a = e^{a ln x}).
 */
function nonNegativeRationalPower(base: Rational, exp: Rational): Rational {
	// x^{p/q} = (x^{1/q})^p = (q-th root of x)^p
	// ⚠️ q borné : un exposant irrationnel (`ln 1000 / ln 2`) arrive ici en
	// rationnel tiré d'un flottant, q ≈ 2⁵² — `integerNthRoot` bouclait alors
	// 2⁵² fois (2026-10-09, tableau de signes de `2^n > 1000`)
	if (isIntegerRational(base) && base.n >= 0n && exp.d !== 1n && exp.d <= MAX_EXACT_ROOT_INDEX) {
		const exactRoot = integerNthRoot(base.n, exp.d);
		if (exactRoot !== null) {
			const pNum = Number(exp.n);
			if (Number.isSafeInteger(pNum) && Math.abs(pNum) <= MAX_EXACT_INTEGER_EXPONENT) {
				return powRational(fromInteger(exactRoot), pNum);
			}
		}
	}

	const baseNum = rationalToNumber(base);
	const expNum = rationalToNumber(exp);
	if (baseNum < 0 && !Number.isInteger(expNum)) {
		throw new Error('Cannot compute non-integer power of negative number');
	}
	// 0 à une puissance négative : une division par zéro, pas une valeur hors d'échelle
	if (baseNum === 0 && expNum < 0) throw new Error('Division by zero');
	const result = Math.pow(baseNum, expNum);
	// Une base non nulle ne donne ni 0 ni l'infini : c'est le flottant qui en sort.
	// Jamais « = 0 » ni « Cannot convert Infinity to Rational »
	if (!Number.isFinite(result) || (result === 0 && baseNum !== 0)) {
		throw new Error(OUT_OF_SCALE);
	}
	return floatToRational(result);
}

// =============================================================================
// Core Evaluation
// =============================================================================

/**
 * Maximum recursion depth for expression evaluation.
 * Prevents stack overflow from deeply nested expressions.
 */
const MAX_EVAL_DEPTH = 100;

// =============================================================================
// Precision Helpers
// =============================================================================

/**
 * Rounds a Rational to a specified number of decimal places.
 * This preserves exact arithmetic until the final conversion to Number.
 *
 * Algorithm:
 * 1. Multiply by 10^digits to shift decimal point
 * 2. Round to nearest integer (half away from zero)
 * 3. Divide by 10^digits
 *
 * @param r - The Rational to round
 * @param digits - Number of decimal places
 * @returns The rounded value as a number
 */
function roundRationalToDecimalPlaces(r: Rational, digits: number): number {
	// scale = 10^digits as BigInt
	const scale = 10n ** BigInt(digits);

	// Multiply rational by scale: (n * scale) / d
	const scaledNum = r.n * scale;

	// Perform integer division with rounding (half away from zero)
	// quotient = floor((scaledNum + d/2) / d) for positive
	// For negative, we need to handle sign properly
	const isNegative = scaledNum < 0n;
	const absScaledNum = isNegative ? -scaledNum : scaledNum;

	// Round half away from zero
	let roundedInt: bigint;
	const remainder = absScaledNum % r.d;
	const quotient = absScaledNum / r.d;

	if (remainder * 2n >= r.d) {
		// Round up (away from zero)
		roundedInt = quotient + 1n;
	} else {
		roundedInt = quotient;
	}

	if (isNegative) {
		roundedInt = -roundedInt;
	}

	// Convert to number and divide by scale
	return Number(roundedInt) / Number(scale);
}

/**
 * Rounds a Rational to a specified number of significant figures.
 * Uses the float approximation for determining magnitude, then rounds the Rational.
 */
function roundRationalToSignificantFigures(r: Rational, digits: number): number {
	// Get approximate value for magnitude calculation
	const approx = rationalToNumber(r);
	if (approx === 0) return 0;

	const magnitude = Math.floor(Math.log10(Math.abs(approx)));
	const decimalPlaces = digits - magnitude - 1;

	if (decimalPlaces >= 0) {
		return roundRationalToDecimalPlaces(r, decimalPlaces);
	} else {
		// For large numbers, round to magnitude
		const scale = 10n ** BigInt(-decimalPlaces);
		const scaledNum = r.n;
		const scaledDenom = r.d * scale;

		// Round (n / (d * scale)) to nearest integer, then multiply by scale
		const isNegative = scaledNum < 0n;
		const absNum = isNegative ? -scaledNum : scaledNum;

		let roundedInt: bigint;
		const remainder = absNum % scaledDenom;
		const quotient = absNum / scaledDenom;

		if (remainder * 2n >= scaledDenom) {
			roundedInt = quotient + 1n;
		} else {
			roundedInt = quotient;
		}

		if (isNegative) {
			roundedInt = -roundedInt;
		}

		return Number(roundedInt) * Number(scale);
	}
}

/**
 * Applies precision to a Rational and returns the result as a number.
 * This preserves exact arithmetic until the final step.
 */
function applyPrecisionToRational(r: Rational, precision?: PrecisionType): number {
	if (!precision || precision.type === 'none') {
		return rationalToNumber(r);
	}

	switch (precision.type) {
		case 'decimal':
			return roundRationalToDecimalPlaces(r, precision.digits);
		case 'significant':
			return roundRationalToSignificantFigures(r, precision.digits);
		case 'magnitude':
			// Magnitude rounding works on integers, use float conversion
			return roundToMagnitude(rationalToNumber(r), precision.digits);
		case 'tolerance':
			// Tolerance doesn't affect the value, only comparison
			return rationalToNumber(r);
	}
}

/**
 * Rounds a number to a specified order of magnitude.
 * This is for integer-scale rounding (nearest 10, 100, etc.)
 */
function roundToMagnitude(num: number, magnitude: number): number {
	const scale = Math.pow(10, magnitude);
	return Math.round(num / scale) * scale;
}

// =============================================================================
// Rational Evaluation (New Architecture)
// =============================================================================

/**
 * Parses a number string to a Rational.
 * Handles integers, decimals, and scientific notation.
 */
function parseNumberToRational(value: string): Rational {
	// Handle scientific notation
	if (value.includes('e') || value.includes('E')) {
		const num = parseFloat(value);
		return floatToRational(num);
	}

	// Handle decimals
	if (value.includes('.')) {
		const [intPart, decPart] = value.split('.');
		const sign = value.startsWith('-') ? -1n : 1n;
		const absIntPart = intPart.replace('-', '') || '0';
		const numerator = sign * BigInt(absIntPart + decPart);
		const denominator = 10n ** BigInt(decPart.length);
		return rational(numerator, denominator);
	}

	// Integer
	return fromInteger(BigInt(value));
}

/**
 * Evaluates a function node to a Rational by computing via Math.*
 * and converting the result back to Rational.
 *
 * @param name - Function name (e.g., 'sqrt', 'sin', 'cos')
 * @param args - Function arguments
 * @param depth - Recursion depth for stack overflow protection
 * @param base - Optional root index for nth roots (e.g., base=3 for cube root)
 */
/**
 * Plus grand entier rendu par `factorial` / `binom` : au-delà, la valeur numérique (un
 * `number` JavaScript) n'est plus un entier exact et la réponse attendue serait fausse.
 */
const MAX_EXACT_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

/** Argument entier naturel de `factorial` / `binom` (premier argument) */
function naturalArgument(value: Rational, name: string): bigint {
	if (!isIntegerRational(value)) throw new Error(`${name} requires integer arguments`);
	if (value.n < 0n) throw new Error(`${name} requires a non-negative argument`);
	return value.n;
}

/** Garde-fou : résultat entier exactement représentable */
function exactIntegerResult(value: bigint, name: string): bigint {
	if (value > MAX_EXACT_INTEGER) throw new Error(`${name}: result too large to stay exact`);
	return value;
}

/**
 * n! en entiers exacts (18! est le dernier qui reste exact). `bounded = false` :
 * sans la borne 2⁵³ (BigInt), à réserver à un appelant qui borne lui-même n.
 */
export function exactFactorial(n: bigint, bounded = true): bigint {
	let result = 1n;
	for (let i = 2n; i <= n; i++) {
		result *= i;
		if (bounded) exactIntegerResult(result, 'factorial');
	}
	return result;
}

/** Coefficient binomial (n parmi k) ; 0 hors de 0 ⩽ k ⩽ n, comme au tableau */
export function exactBinomial(n: bigint, k: bigint, bounded = true): bigint {
	if (k < 0n || k > n) return 0n;
	const smaller = k < n - k ? k : n - k;
	let result = 1n;
	// Produit des quotients successifs : chaque étape reste un coefficient binomial entier
	for (let i = 1n; i <= smaller; i++) {
		result = (result * (n - smaller + i)) / i;
		if (bounded) exactIntegerResult(result, 'binom');
	}
	return result;
}

function evaluateFunctionToRational(
	name: string,
	args: readonly MathNode[],
	depth: number,
	base?: MathNode
): Rational {
	// `root(a, n)` : la racine n-ième du solveur et de `denormalize` — la même
	// que `\sqrt[n]{a}`, dont le parseur range l'indice dans `base`
	if (name === 'root' && args.length === 2 && base === undefined) {
		return evaluateFunctionToRational('sqrt', [args[0]], depth, args[1]);
	}
	// Evaluate arguments to Rationals first (for exact computation where possible)
	const rationalArgs = args.map((arg) => evaluateToRational(arg, depth + 1));

	// Evaluate arguments to numbers (for transcendental functions)
	const numArgs = rationalArgs.map((r) => rationalToNumber(r));

	let result: number;

	switch (name.toLowerCase()) {
		case 'sin':
			if (numArgs.length !== 1) throw new Error('sin requires exactly 1 argument');
			result = Math.sin(numArgs[0]);
			break;
		case 'cos':
			if (numArgs.length !== 1) throw new Error('cos requires exactly 1 argument');
			result = Math.cos(numArgs[0]);
			break;
		case 'tan':
			if (numArgs.length !== 1) throw new Error('tan requires exactly 1 argument');
			refuseTrigPole('tan', Math.cos(numArgs[0]), numArgs[0]);
			result = Math.tan(numArgs[0]);
			break;
		// Réciproques : leur définition (sec = 1/cos…). Le parseur maison les lit
		// depuis toujours, mais l'évaluation répondait « Unknown function: sec »
		case 'sec':
		case 'csc':
		case 'cot':
		case 'sech':
		case 'csch':
		case 'coth': {
			if (numArgs.length !== 1) throw new Error(`${name} requires exactly 1 argument`);
			const t = numArgs[0];
			if (name.toLowerCase() === 'sec') refuseTrigPole('sec', Math.cos(t), t);
			if (name.toLowerCase() === 'csc' || name.toLowerCase() === 'cot') {
				refuseTrigPole(name.toLowerCase(), Math.sin(t), t);
			}
			const reciprocal: Record<string, number> = {
				sec: 1 / Math.cos(t),
				csc: 1 / Math.sin(t),
				cot: Math.cos(t) / Math.sin(t),
				sech: 1 / Math.cosh(t),
				csch: 1 / Math.sinh(t),
				coth: Math.cosh(t) / Math.sinh(t)
			};
			result = reciprocal[name.toLowerCase()];
			break;
		}
		case 'arcsin':
			if (numArgs.length !== 1) throw new Error('arcsin requires exactly 1 argument');
			if (numArgs[0] < -1 || numArgs[0] > 1) throw new Error('arcsin argument must be in [-1, 1]');
			result = Math.asin(numArgs[0]);
			break;
		case 'arccos':
			if (numArgs.length !== 1) throw new Error('arccos requires exactly 1 argument');
			if (numArgs[0] < -1 || numArgs[0] > 1) throw new Error('arccos argument must be in [-1, 1]');
			result = Math.acos(numArgs[0]);
			break;
		case 'arctan':
			if (numArgs.length !== 1) throw new Error('arctan requires exactly 1 argument');
			result = Math.atan(numArgs[0]);
			break;
		case 'arcsinh':
			if (numArgs.length !== 1) throw new Error('arcsinh requires exactly 1 argument');
			result = Math.asinh(numArgs[0]);
			break;
		case 'arccosh':
			if (numArgs.length !== 1) throw new Error('arccosh requires exactly 1 argument');
			if (numArgs[0] < 1) throw new Error('arccosh argument must be >= 1');
			result = Math.acosh(numArgs[0]);
			break;
		case 'arctanh':
			if (numArgs.length !== 1) throw new Error('arctanh requires exactly 1 argument');
			if (numArgs[0] <= -1 || numArgs[0] >= 1)
				throw new Error('arctanh argument must be in (-1, 1)');
			result = Math.atanh(numArgs[0]);
			break;
		case 'exp':
			if (numArgs.length !== 1) throw new Error('exp requires exactly 1 argument');
			result = Math.exp(numArgs[0]);
			break;
		case 'ln':
		case 'log':
		case 'log10': {
			if (numArgs.length !== 1) throw new Error(`${name} requires exactly 1 argument`);
			if (numArgs[0] <= 0) throw new Error(`${name} argument must be positive`);
			// Base explicite (`\log_{b}(a)`) : log_b(a) = ln(a)/ln(b). Ignorer la
			// base lisait `\log_{x}(2)` comme `\log(2)`, donc « positif », et
			// `|\log_{x}(2)|` perdait sa valeur absolue (faux positif). Une base
			// variable lève ici (variable libre), comme l'argument.
			if (base) {
				const baseValue = rationalToNumber(evaluateToRational(base, depth + 1));
				if (!(baseValue > 0) || baseValue === 1) {
					throw new Error('log base must be positive and different from 1');
				}
				result = Math.log(numArgs[0]) / Math.log(baseValue);
				break;
			}
			// Sans base : `\ln` naturel, `\log` décimal (convention du dépôt)
			result = name.toLowerCase() === 'ln' ? Math.log(numArgs[0]) : Math.log10(numArgs[0]);
			break;
		}
		case 'sqrt': {
			if (numArgs.length !== 1) throw new Error('sqrt requires exactly 1 argument');

			// Handle nth root: sqrt with base property means n-th root
			// e.g., \sqrt[3]{8} has base=3, args=[8]
			const index = base ? evaluateToRational(base, depth + 1) : fromInteger(2);
			const radicand = rationalArgs[0];
			// Indice impair (entier) : racine définie sur ℝ, ⁿ√a = −ⁿ√|a| pour a < 0
			// (décision du 2026-10-07). Indice pair ou non entier : a ≥ 0 exigé.
			const oddIndex = isIntegerRational(index) && index.n % 2n !== 0n;
			if (numArgs[0] < 0 && !oddIndex) throw new Error('sqrt argument must be non-negative');
			const negative = radicand.n < 0n;

			// Only try exact computation for integer radicand and index
			if (isIntegerRational(index) && isIntegerRational(radicand)) {
				const indexBigInt = index.n;
				const radicandBigInt = negative ? -radicand.n : radicand.n;

				// Try exact integer nth root
				const exactRoot = integerNthRoot(radicandBigInt, indexBigInt);
				if (exactRoot !== null) {
					return fromInteger(negative ? -exactRoot : exactRoot);
				}
			}

			// Fall back to floating point
			const indexNum = base ? rationalToNumber(index) : 2;
			const root = realNthRoot(numArgs[0], indexNum);
			if (root === null) throw new Error('sqrt argument must be non-negative');
			result = root;
			break;
		}
		case 'cbrt':
			if (numArgs.length !== 1) throw new Error('cbrt requires exactly 1 argument');
			// Try exact integer cube root first
			if (isIntegerRational(rationalArgs[0])) {
				const radicandBigInt = rationalArgs[0].n;
				const exactRoot = integerNthRoot(
					radicandBigInt < 0n ? -radicandBigInt : radicandBigInt,
					3n
				);
				if (exactRoot !== null) {
					return fromInteger(radicandBigInt < 0n ? -exactRoot : exactRoot);
				}
			}
			result = Math.cbrt(numArgs[0]);
			break;
		case 'abs': {
			if (numArgs.length !== 1) throw new Error('abs requires exactly 1 argument');
			// Exact computation for abs
			const absArg = rationalArgs[0];
			return absArg.n < 0n ? { n: -absArg.n, d: absArg.d } : absArg;
		}
		case 'sign': {
			// Signe exact (−1, 0 ou 1), lu sur le rationnel : jamais d'écart flottant autour de 0
			if (numArgs.length !== 1) throw new Error('sign requires exactly 1 argument');
			const signArg = rationalArgs[0];
			return fromInteger(signArg.n > 0n ? 1n : signArg.n < 0n ? -1n : 0n);
		}
		case 'floor':
			if (numArgs.length !== 1) throw new Error('floor requires exactly 1 argument');
			result = Math.floor(numArgs[0]);
			break;
		case 'ceil':
			if (numArgs.length !== 1) throw new Error('ceil requires exactly 1 argument');
			result = Math.ceil(numArgs[0]);
			break;
		case 'round':
			if (numArgs.length !== 1) throw new Error('round requires exactly 1 argument');
			result = Math.round(numArgs[0]);
			break;
		case 'min':
			if (numArgs.length < 1) throw new Error('min requires at least 1 argument');
			result = Math.min(...numArgs);
			break;
		case 'max':
			if (numArgs.length < 1) throw new Error('max requires at least 1 argument');
			result = Math.max(...numArgs);
			break;
		case 'sinh':
			if (numArgs.length !== 1) throw new Error('sinh requires exactly 1 argument');
			result = Math.sinh(numArgs[0]);
			break;
		case 'cosh':
			if (numArgs.length !== 1) throw new Error('cosh requires exactly 1 argument');
			result = Math.cosh(numArgs[0]);
			break;
		case 'tanh':
			if (numArgs.length !== 1) throw new Error('tanh requires exactly 1 argument');
			result = Math.tanh(numArgs[0]);
			break;
		case 'factorial': {
			if (numArgs.length !== 1) throw new Error('factorial requires exactly 1 argument');
			const factorialN = naturalArgument(rationalArgs[0], 'factorial');
			if (withinSizeBudget) {
				budgetedLog2(log2Factorial(Number(factorialN)), 'factorial');
				return fromInteger(exactFactorial(factorialN, false));
			}
			return fromInteger(exactFactorial(factorialN));
		}
		case 'binom': {
			if (numArgs.length !== 2) throw new Error('binom requires exactly 2 arguments');
			const binomN = naturalArgument(rationalArgs[0], 'binom');
			const binomK = rationalArgs[1];
			if (!isIntegerRational(binomK)) throw new Error('binom requires integer arguments');
			if (withinSizeBudget) {
				const n = Number(binomN);
				const k = Math.min(Math.max(Number(binomK.n), 0), n);
				budgetedLog2(log2Factorial(n) - log2Factorial(k) - log2Factorial(n - k), 'binom');
				return fromInteger(exactBinomial(binomN, binomK.n, false));
			}
			return fromInteger(exactBinomial(binomN, binomK.n));
		}
		case 'gcd': {
			if (numArgs.length !== 2) throw new Error('gcd requires exactly 2 arguments');
			const gcdA = rationalArgs[0],
				gcdB = rationalArgs[1];
			if (!isIntegerRational(gcdA) || !isIntegerRational(gcdB))
				throw new Error('gcd requires integer arguments');
			// gcdBigInt handles negative values by taking absolute values internally
			return fromInteger(gcdBigInt(gcdA.n, gcdB.n));
		}
		case 'mod': {
			if (numArgs.length !== 2) throw new Error('mod requires exactly 2 arguments');
			const modA = rationalArgs[0],
				modB = rationalArgs[1];
			if (!isIntegerRational(modA) || !isIntegerRational(modB))
				throw new Error('mod requires integer arguments');
			if (modB.n === 0n) throw new Error('mod by zero');
			// Use mathematical modulo (non-negative result when modulus is positive)
			const remainder = modA.n % modB.n;
			const modResult = modB.n > 0n && remainder < 0n ? remainder + modB.n : remainder;
			return fromInteger(modResult);
		}
		default:
			throw new Error(`Unknown function: ${name}`);
	}

	// Convert result back to Rational
	return floatToRational(result);
}

/**
 * Evaluates a MathNode recursively to a Rational.
 *
 * ALL internal arithmetic is done in BigInt via Rational operations.
 * Transcendental functions (sin, cos, exp, etc.) use Math.* and then
 * convert the result back to Rational via floatToRational.
 *
 * Contrat : le résultat est exact seulement si aucun flottant n'y est entré
 * (π, e, fonction transcendante, puissance non entière : environ 16 chiffres
 * significatifs). Ses termes peuvent dépasser 10³⁰⁸ pour une valeur ordinaire
 * ((1001/1000)¹⁰⁰⁰ : 3001 chiffres, π²⁰ : 310) — le convertir par
 * `rationalToNumber`, jamais par `Number(n) / Number(d)`.
 *
 * @param node - The MathNode to evaluate
 * @param depth - Current recursion depth (for stack overflow protection)
 * @returns The computed value as a Rational
 * @throws Error for unevaluable nodes or mathematical errors
 */
function evaluateToRational(node: MathNode, depth: number = 0): Rational {
	if (depth > MAX_EVAL_DEPTH) {
		throw new Error(`Expression too deeply nested (max depth: ${MAX_EVAL_DEPTH})`);
	}

	// NumberNode
	if (isNumber(node)) {
		return parseNumberToRational(node.value);
	}

	// VariableNode - throw (Euler's `e` is a MathConstantNode, handled below)
	if (isVariable(node)) {
		throw new Error(`Cannot evaluate expression with unsubstituted variable: ${node.name}`);
	}

	// GreekLetterNode - Greek letters are variables, not constants
	// Note: π is NOT a GreekLetter - it's a MathConstant
	if (isGreek(node)) {
		throw new Error(`Cannot evaluate expression with unsubstituted Greek letter: ${node.letter}`);
	}

	// MathConstantNode - handle mathematical constants (euler, pi)
	if (isMathConstant(node)) {
		switch (node.constant) {
			case 'euler':
				return floatToRational(Math.E);
			case 'pi':
				return floatToRational(Math.PI);
		}
	}

	// SymbolNode - handle known constants
	if (isSymbol(node)) {
		switch (node.symbol) {
			case 'infinity':
				throw new Error('Cannot represent infinity as Rational');
			default:
				throw new Error(`Cannot evaluate symbol: ${node.symbol}`);
		}
	}

	// HoleNode - cannot be evaluated
	if (isHole(node)) {
		throw new Error('Cannot evaluate expression with holes');
	}

	// Les quatre opérations sur des fractions réduites (Henrici) : chaque valeur d'ici sort de
	// `rational()`, `fromInteger`, `floatToRational` ou `powRational`. Une somme de cinq
	// fractions de 9 000 chiffres prenait 4,1 s (le pgcd sur le résultat entier, 2026-10-12)

	// AdditionNode
	if (isAddition(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return addReduced(left, right);
	}

	// SubtractionNode
	if (isSubtraction(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return subReduced(left, right);
	}

	// MultiplicationNode
	if (isMultiplication(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return mulReduced(left, right);
	}

	// DivisionNode
	if (isDivision(node)) {
		const num = evaluateToRational(node.numerator, depth + 1);
		const den = evaluateToRational(node.denominator, depth + 1);
		if (isZeroRational(den)) {
			throw new Error('Division by zero');
		}
		return divReduced(num, den);
	}

	// OppositeNode (negation)
	if (isOpposite(node)) {
		const operand = evaluateToRational(node.operand, depth + 1);
		return negRational(operand);
	}

	// PositiveNode
	if (isPositive(node)) {
		return evaluateToRational(node.operand, depth + 1);
	}

	// PercentageNode : `20 %` = 20/100, exact
	if (isPercentage(node)) {
		return divReduced(evaluateToRational(node.operand, depth + 1), { n: 100n, d: 1n });
	}

	// SuperscriptNode (power)
	if (isSuperscript(node)) {
		const base = evaluateToRational(node.base, depth + 1);
		const exp = evaluateToRational(node.superscript, depth + 1);

		// For integer exponent, use exact Rational power
		if (isIntegerRational(exp)) {
			const expNum = Number(exp.n);
			if (Number.isSafeInteger(expNum) && exactPowerAllowed(base, expNum)) {
				return powRational(base, expNum);
			}
		}

		// Exposant p/q irréductible, q impair (décision du 2026-10-08) : la
		// puissance d'un négatif vaut (ᵠ√x)^p = ±|x|^{p/q}, comme ∛x
		if (base.n < 0n && oddDenominatorExponent(node.superscript) !== null) {
			const magnitude = nonNegativeRationalPower(negRational(base), exp);
			return exp.n % 2n !== 0n ? negRational(magnitude) : magnitude;
		}

		return nonNegativeRationalPower(base, exp);
	}

	// FunctionNode (includes sqrt, cbrt, nthroot)
	if (isFunction(node)) {
		// `sin^2(x)` : exposant porté par `power` → on évalue `sin(x)^2` ;
		// `\cos^{-1}(x)` est la réciproque → on évalue `arccos(x)`.
		const asPower = rewriteFunctionPower(node);
		if (asPower) return evaluateToRational(asPower, depth + 1);

		const funcName = node.name;
		const funcArgs = node.args; // Capture before narrowing
		const funcBase = node.base; // For nth roots: sqrt[n]{x} has base=n

		// Check for derivative or inverse functions
		if (isDerivativeFunction(node)) {
			throw new Error(`Cannot evaluate derivative function '${funcName}'(x) without a definition.`);
		}
		if (isInverseFunction(node)) {
			throw new Error(
				`Cannot evaluate inverse function '${funcName}^{-1}(x)' without a definition.`
			);
		}

		return evaluateFunctionToRational(funcName, funcArgs, depth, funcBase);
	}

	// DelimiterNode (parentheses)
	if (isDelimiter(node)) {
		return evaluateToRational(node.content, depth + 1);
	}

	// SubscriptNode - cannot evaluate numerically
	if (isSubscript(node)) {
		throw new Error('Cannot evaluate subscript expressions numerically');
	}

	// RelationNode - cannot evaluate to a single value
	if (isRelation(node)) {
		throw new Error('Une comparaison n’a pas de valeur numérique');
	}

	// UnitNode - evaluate the expression part (ignore the unit)
	if (isUnit(node)) {
		return evaluateToRational(node.expression, depth + 1);
	}

	// ComplexNode - not supported in pure Rational mode
	if (isComplex(node)) {
		throw new Error('Complex numbers not supported in evaluateToRational');
	}

	// CompositionNode - cannot evaluate directly
	if (isComposition(node)) {
		throw new Error('Cannot evaluate composition expression directly.');
	}

	// Boolean/Logical nodes - not numeric
	if (isBoolean(node) || isLogical(node) || isLogicalNot(node)) {
		throw new Error('Une comparaison ou une expression logique n’a pas de valeur numérique');
	}

	// Longueur `AB`, nom de figure `ABC` : un message lisible par un élève, s'il remonte
	if (isSegmentLength(node)) {
		throw new Error(unknownSegmentMessage(node));
	}
	if (isFigureName(node)) {
		throw new Error(
			`${formatPointNames(node.points)} est le nom d’une figure, pas un nombre : on ne peut pas le calculer.`
		);
	}

	// Unknown node type
	throw new Error(`Cannot evaluate node type: ${(node as MathNode).type}`);
}

/**
 * Evaluates a MathNode to an approximated number.
 *
 * ALL internal calculations use Rational (BigInt) arithmetic to avoid
 * floating-point precision errors. The result is converted to a number
 * only at the very end, with optional precision formatting.
 *
 * Transcendental functions (sin, cos, exp, ln, etc.) are evaluated
 * via Math.* and then converted back to Rational for continued calculations.
 *
 * @param node - MathNode to evaluate (must be numeric, no free variables)
 * @param precision - Optional precision specification for the result
 * @returns The computed number at the requested precision
 */
export function evaluateNodeToApproximatedNumber(
	node: MathNode,
	precision?: PrecisionType
): number {
	const rationalResult = evaluateToRational(node, 0);
	// Apply precision directly to the Rational to preserve exact arithmetic
	return applyPrecisionToRational(rationalResult, precision);
}

/**
 * La valeur d'une expression numérique en RATIONNEL, sans passer par un
 * flottant — pour décider qu'une écriture décimale est exacte (1/4 = 0,25)
 * sans tolérance. Une fonction transcendante y entre par son flottant : sa
 * valeur rationnelle n'a alors jamais un dénominateur court.
 *
 * @throws comme `evaluateNodeToApproximatedNumber`, si le nœud n'est pas numérique
 */
export function evaluateNodeToRational(node: MathNode): Rational {
	const previous = withinSizeBudget;
	withinSizeBudget = true;
	try {
		return evaluateToRational(node, 0);
	} finally {
		withinSizeBudget = previous;
	}
}

// =============================================================================
// Validation for Evaluable Expressions
// =============================================================================

/**
 * Set of known functions that can be evaluated.
 */
const KNOWN_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'sec',
	'csc',
	'cot',
	'sech',
	'csch',
	'coth',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'arcsinh',
	'arccosh',
	'arctanh',
	'exp',
	'ln',
	'log',
	'log10',
	'log2',
	'sqrt',
	'cbrt',
	'root',
	'abs',
	'sign',
	'floor',
	'ceil',
	'round',
	'min',
	'max',
	'sum',
	'mean',
	'median',
	'variance',
	'stdev',
	'gcd',
	'mod',
	'factorial',
	'binom'
]);

/**
 * Additional functions supported in exact mode only (via normalization).
 * These handle complex numbers symbolically.
 */
const EXACT_MODE_FUNCTIONS = new Set([
	'conj',
	're',
	'im',
	'cabs',
	'arg',
	'cis',
	'frompolar',
	'rootofunity',
	'nthroot',
	'principalroot'
]);

/**
 * Validates that an expression can be evaluated.
 * Throws an error if the expression contains:
 * - Unknown functions
 * - Relation expressions (=, <, >, etc.)
 * - Other non-evaluable constructs
 *
 * @param node - The MathNode to validate
 * @param exactMode - If true, also allows EXACT_MODE_FUNCTIONS (complex functions)
 * @throws Error if the expression cannot be evaluated
 */
function validateEvaluable(node: MathNode, exactMode: boolean = false): void {
	if (isFunction(node)) {
		// Use type assertion to prevent TypeScript control flow narrowing issues
		// with isDerivativeFunction/isInverseFunction type guards on already-narrowed FunctionNode
		const fn = node as FunctionNode;
		const funcName = fn.name.toLowerCase();
		// Check for derivative or inverse functions
		if (fn.derivativeOrder !== undefined && fn.derivativeOrder > 0) {
			throw new Error(
				`Cannot evaluate derivative function '${fn.name}'(x) without a definition. ` +
					'Derivative functions remain symbolic and require differentiation rules.'
			);
		}
		if (fn.isInverse === true) {
			throw new Error(
				`Cannot evaluate inverse function '${fn.name}^{-1}(x)' without a definition. ` +
					'Inverse functions remain symbolic.'
			);
		}
		// Check if function is known (include exact-mode functions if in exact mode)
		const isKnown =
			KNOWN_FUNCTIONS.has(funcName) || (exactMode && EXACT_MODE_FUNCTIONS.has(funcName));
		if (!isKnown) {
			throw new Error(
				`Unknown function: ${fn.name}. ` +
					'If this is a generic function (like f, g, h), provide its definition in EvalOptions.functions'
			);
		}
		// Validate arguments recursively
		for (const arg of fn.args) {
			validateEvaluable(arg, exactMode);
		}
		return;
	}

	if (isRelation(node)) {
		throw new Error('Une comparaison n’a pas de valeur numérique');
	}

	if (isBoolean(node) || isLogical(node) || isLogicalNot(node)) {
		throw new Error('Une comparaison ou une expression logique n’a pas de valeur numérique');
	}

	if (isSubscript(node)) {
		throw new Error('Cannot evaluate subscript expressions numerically');
	}

	if (isComposition(node)) {
		throw new Error(
			'Cannot evaluate composition expression directly. ' +
				'Compositions must be applied to arguments first (e.g., (f o g)(x) not f o g)'
		);
	}

	// Recursively validate children
	if (isAddition(node) || isSubtraction(node) || isMultiplication(node)) {
		validateEvaluable(node.left, exactMode);
		validateEvaluable(node.right, exactMode);
	} else if (isDivision(node)) {
		validateEvaluable(node.numerator, exactMode);
		validateEvaluable(node.denominator, exactMode);
	} else if (isOpposite(node) || isPositive(node) || isPercentage(node)) {
		validateEvaluable(node.operand, exactMode);
	} else if (isSuperscript(node)) {
		validateEvaluable(node.base, exactMode);
		validateEvaluable(node.superscript, exactMode);
	} else if (isDelimiter(node)) {
		validateEvaluable(node.content, exactMode);
	} else if (isUnit(node)) {
		validateEvaluable(node.expression, exactMode);
	} else if (isComplex(node)) {
		validateEvaluable(node.real, exactMode);
		validateEvaluable(node.imaginary, exactMode);
	}
	// NumberNode, VariableNode, GreekLetterNode, SymbolNode, HoleNode, MathConstantNode are leaf nodes
}

// =============================================================================
// Post-processing for Exact Mode
// =============================================================================

/** Fonctions à résultat entier, calculées dès que leurs arguments se calculent */
const INTEGER_RESULT_FUNCTIONS = new Set(['gcd', 'mod', 'sign', 'factorial', 'binom']);

/**
 * Réduit `min`, `max`, `gcd`, `mod`, `sign`, `factorial` et `binom` quand leurs arguments
 * se calculent.
 *
 * Sans cela, le mode exact rendait `\min(12, 18)` au lieu de 12. `min`/`max`
 * gardent l'argument choisi sous sa forme exacte (`\dfrac{2}{9}`, `\sqrt{3}`) ;
 * `gcd`/`mod` exigent des entiers, sinon la fonction reste telle quelle.
 * Parcours ascendant : une fonction imbriquée est réduite avant son parent.
 */
function reduceMultiArgFunctions(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isFunction(n)) return n;
		const funcName = n.name.toLowerCase();

		if (INTEGER_RESULT_FUNCTIONS.has(funcName)) {
			try {
				const result = evaluateToRational(n);
				if (result.d !== 1n) return n;
				return result.n < 0n
					? opposite(number((-result.n).toString()))
					: number(result.n.toString());
			} catch {
				return n;
			}
		}

		if ((funcName === 'min' || funcName === 'max') && n.args.length > 0) {
			try {
				const values = n.args.map((arg) => rationalToNumber(evaluateToRational(arg)));
				const chosen = funcName === 'min' ? Math.min(...values) : Math.max(...values);
				return n.args[values.indexOf(chosen)];
			} catch {
				return n;
			}
		}

		return n;
	});
}

/**
 * Un exposant fait de nombres et d'opérations rationnelles seulement
 * (`2 \times 1`, `1^2`, `-0`, `\frac{3}{2}+1`) : son calcul est exact.
 */
function isRationalArithmetic(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			return true;
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return isRationalArithmetic(node.left) && isRationalArithmetic(node.right);
		case 'division':
			return isRationalArithmetic(node.numerator) && isRationalArithmetic(node.denominator);
		case 'opposite':
		case 'positive':
			return isRationalArithmetic(node.operand);
		case 'delimiter':
			return isRationalArithmetic(node.content);
		case 'superscript':
			return isRationalArithmetic(node.base) && isRationalArithmetic(node.superscript);
		default:
			return false;
	}
}

/**
 * Calcule un exposant rationnel écrit comme un calcul : `e^{2 \times 1}` → `e^{2}`,
 * `e^{1^2}` → `e`, `2^{1+1}` → `4`. `normalize` ne lit qu'un exposant LITTÉRAL :
 * le reste devenait une puissance opaque, et la valeur d'une intégrale définie
 * s'affichait `-\dfrac{1}{2}e^{2 \times 0}+\dfrac{1}{2}e^{2 \times 1}` (revue du
 * 2026-10-11). Un exposant déjà littéral, ou non rationnel (`\ln 2`, `\pi`),
 * n'est pas touché.
 */
function reduceComputedExponents(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type !== 'superscript' || n.superscript.type === 'number') return n;
		if (!isRationalArithmetic(n.superscript)) return n;
		try {
			return { ...n, superscript: rationalToNode(evaluateToRational(n.superscript)) };
		} catch {
			return n;
		}
	});
}

/**
 * Evaluates rounding functions (floor, ceil, round) in an AST when their
 * arguments can be computed to a numeric value.
 *
 * In exact mode, normalize/denormalize don't evaluate these functions.
 * However, floor(37/10) should return 3, not remain as floor(37/10).
 *
 * @param node - The MathNode to process
 * @returns The processed node with evaluated rounding functions
 */
function evaluateRoundingFunctions(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isFunction(n)) {
			return n;
		}

		const funcName = n.name.toLowerCase();
		if (!['floor', 'ceil', 'round', 'abs'].includes(funcName)) {
			return n;
		}

		if (n.args.length !== 1) {
			return n;
		}

		// First, recursively process the argument
		const processedArg = evaluateRoundingFunctions(n.args[0]);

		// Try to evaluate the argument to a Rational
		try {
			const argRational = evaluateToRational(processedArg, 0);
			const argNum = rationalToNumber(argRational);

			let result: number;
			switch (funcName) {
				case 'floor':
					result = Math.floor(argNum);
					break;
				case 'ceil':
					result = Math.ceil(argNum);
					break;
				case 'round':
					result = Math.round(argNum);
					break;
				case 'abs':
					result = Math.abs(argNum);
					break;
				default:
					return n;
			}

			// For abs, preserve exact rational form
			if (funcName === 'abs') {
				// Get absolute value of the rational
				const absRational =
					argRational.n < 0n ? { n: -argRational.n, d: argRational.d } : argRational;
				if (absRational.d === 1n) {
					return number(absRational.n.toString());
				}
				return divide(
					number(absRational.n.toString()),
					number(absRational.d.toString()),
					'fraction'
				);
			}

			// Return integer result
			return numericNode(result);
		} catch {
			// If evaluation fails (e.g., contains variables), keep symbolic
			return n;
		}
	});
}

// =============================================================================
// Boolean Evaluation
// =============================================================================

/**
 * Checks if a node is a boolean expression (boolean, relation, logical, logical-not).
 */
function isBooleanExpression(node: MathNode): boolean {
	// `(2 > 1)`, `\lnot (2 > 1)` : des parenthèses autour d'une comparaison
	if (isDelimiter(node)) return isBooleanExpression(node.content);
	return isBoolean(node) || isRelation(node) || isLogical(node) || isLogicalNot(node);
}

/** Les relations que le calcul tranche ; les autres (≈, ∈, ⊂…) ne sont pas évaluables. */
const DECIDABLE_RELATIONS: ReadonlySet<string> = new Set([
	'=',
	'≡',
	'!=',
	'≢',
	'<',
	'>',
	'<=',
	'>='
]);

/** Un « non » appliqué à autre chose qu'une comparaison (`!5 > 1` : (¬5) > 1). */
function hasNumericNot(node: MathNode): boolean {
	if (isLogicalNot(node) && !isBooleanExpression(node.operand)) return true;
	return getChildren(node).some(hasNumericNot);
}

/** Pourquoi une expression booléenne ne s'évalue pas — la vraie cause, en français. */
function booleanRefusal(node: MathNode): string {
	const relation = undecidableRelation(node);
	if (relation !== undefined) {
		return `Relation « ${relation} » non évaluable : seules = ≠ < > ≤ ≥ se tranchent`;
	}
	if (hasNumericNot(node)) {
		// `!5 > 1` se lit (non 5) > 1
		return findNodes(node, isRelation).length > 0
			? '« non » s’applique ici à un nombre : mets la comparaison entre parenthèses, non(2 > 1)'
			: '« non » s’applique à une comparaison, pas à un nombre';
	}
	const variables = [...getVariables(node)];
	return variables.length > 0
		? `Comparaison non évaluable : ${variables.join(', ')} sans valeur`
		: 'Comparaison non évaluable';
}

/** La première relation que le calcul ne tranche pas, ou `undefined`. */
function undecidableRelation(node: MathNode): string | undefined {
	if (isDelimiter(node)) return undecidableRelation(node.content);
	if (isRelation(node)) {
		if (!DECIDABLE_RELATIONS.has(node.relation)) return node.relation;
		return undecidableRelation(node.left);
	}
	if (isLogical(node)) return undecidableRelation(node.left) ?? undecidableRelation(node.right);
	if (isLogicalNot(node)) return undecidableRelation(node.operand);
	return undefined;
}

/**
 * Evaluates a MathNode as a boolean expression.
 *
 * Handles:
 * - BooleanNode: returns the value directly
 * - RelationNode: evaluates both sides and compares
 *   - `=` / `!=`: uses areEquivalent() for semantic comparison
 *   - `<` / `>` / `<=` / `>=`: uses compareNumericNodes()
 * - LogicalNode: evaluates both operands as booleans
 * - LogicalNotNode: evaluates operand as boolean and negates
 *
 * @param node - The MathNode to evaluate as boolean
 * @returns The boolean result, or undefined if the expression is not evaluable
 */
function evaluateToBoolean(node: MathNode): boolean | undefined {
	if (isBoolean(node)) {
		return node.value;
	}

	if (isDelimiter(node)) return evaluateToBoolean(node.content);

	if (isRelation(node)) {
		const rel = node.relation;

		// Une chaîne `a < b < c` (arbre `(a < b) < c`) : vraie si chaque maillon l'est —
		// `a < b`, puis `b < c`. Répondait « Cannot evaluate boolean expression » (2026-10-12)
		if (isRelation(node.left)) {
			const first = evaluateToBoolean(node.left);
			if (first === false) return false;
			const second = evaluateToBoolean({ ...node, left: node.left.right });
			if (second === false) return false;
			return first === undefined || second === undefined ? undefined : true;
		}

		// Equality and inequality use semantic equivalence
		if (rel === '=' || rel === '≡' || rel === '!=' || rel === '≢') {
			const equal = areEquivalentCore(node.left, node.right);

			// `areEquivalent` rend `false` aussi bien quand il a PROUVÉ la
			// différence que quand il a ABANDONNÉ, et il ne distingue pas les
			// deux. Or cet appel n'a pas de budget à lui : il peut hériter d'un
			// signal d'interruption installé par un `simplify(x, { timeoutMs })`
			// englobant. Nier un `false` d'abandon fabriquerait un « ces deux
			// expressions diffèrent » affirmatif et faux. On rend « non
			// évaluable », ce que cette fonction sait déjà exprimer.
			if (!equal && getActiveAbortChecker()?.()) return undefined;

			return rel === '=' || rel === '≡' ? equal : !equal;
		}

		// Ordering relations use numeric comparison
		const cmp = compareNumericNodes(node.left, node.right);
		if (cmp === undefined) return undefined;

		switch (rel) {
			case '<':
				return cmp === -1;
			case '>':
				return cmp === 1;
			case '<=':
				return cmp === 0 || cmp === -1;
			case '>=':
				return cmp === 0 || cmp === 1;
			default:
				// Other relation types (≈, ∈, etc.) are not evaluable as booleans
				return undefined;
		}
	}

	if (isLogical(node)) {
		const left = evaluateToBoolean(node.left);

		// Short-circuit: false && anything = false, true || anything = true
		if (node.operator === 'and' && left === false) return false;
		if (node.operator === 'or' && left === true) return true;

		if (left === undefined) return undefined;
		const right = evaluateToBoolean(node.right);
		if (right === undefined) return undefined;

		if (node.operator === 'and') return left && right;
		if (node.operator === 'or') return left || right;
		return undefined;
	}

	if (isLogicalNot(node)) {
		const operand = evaluateToBoolean(node.operand);
		if (operand === undefined) return undefined;
		return !operand;
	}

	return undefined;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluates a mathematical expression.
 *
 * **Mode exact** (default):
 * - Returns the simplified MathNode via normalize/denormalize
 * - The value is a MathNode representing the exact simplified form
 * - Example: sqrt(2) returns sqrt(2), cos(pi/6) returns sqrt(3)/2
 *
 * **Mode decimal**:
 * - Returns a numeric approximation
 * - ALL internal calculations use Rational (BigInt) arithmetic to avoid
 *   floating-point precision errors
 * - Transcendental functions use Math.* then convert back to Rational
 * - Final conversion to number happens only at the end
 * - Example: sqrt(2) returns 1.4142135623730951
 *
 * The expression must not contain free variables. Use the `substitute`
 * function first if your expression contains variables.
 *
 * @param node - The MathAST node to evaluate
 * @param options - Evaluation options
 * @returns An EvalResult containing the value, a node representation, and exactness flag
 *
 * @throws Error if:
 * - Expression contains free variables (except pi, e)
 * - Division by zero occurs
 * - Unknown function is called
 * - Mathematical error (e.g., sqrt of negative in real mode)
 *
 * @example
 * // Exact mode: returns simplified MathNode
 * const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'exact' });
 * // result.value = MathNode for sqrt(2)
 * // result.exact = true
 *
 * @example
 * // Exact mode: simplifies known values
 * const result = evaluate(parseLatex('\\cos(\\frac{\\pi}{6})'), { mode: 'exact' });
 * // result.value = MathNode for sqrt(3)/2
 * // result.exact = true
 *
 * @example
 * // Decimal mode: avoids float precision errors
 * const result = evaluate(parseLatex('0.1 + 0.2'), { mode: 'decimal' });
 * // result.value = 0.3 (exact, not 0.30000000000000004!)
 *
 * @example
 * // Decimal mode with precision
 * const result = evaluate(parseLatex('\\sqrt{2}'), {
 *   mode: 'decimal',
 *   precision: { type: 'decimal', digits: 2 }
 * });
 * // result.value = 1.41
 *
 * @example
 * // With function bindings: f(3) where f(x) = x^2
 * const result = evaluate(
 *   parseLatex('f(3)', { genericFunctions: { names: ['f'] } }),
 *   { functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } } }
 * );
 * // result.value = MathNode for 9
 */
export function evaluate(node: MathNode, options?: EvalOptions): EvalResult {
	const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };

	// 1. Substitute generic functions if bindings are provided
	let processedNode = node;
	if (opts.functions && Object.keys(opts.functions).length > 0) {
		processedNode = substituteFunction(node, opts.functions);
	}

	// 1b. Boolean evaluation: detect boolean root expressions
	if (isBooleanExpression(processedNode)) {
		const boolResult = evaluateToBoolean(processedNode);
		if (boolResult === undefined) {
			// En français : la console de Calcul montre ce message à l'élève (2026-10-12)
			return { status: 'unevaluable', reason: booleanRefusal(processedNode) };
		}
		return {
			status: 'value',
			value: boolResult,
			node: booleanNode(boolResult),
			exact: true
		};
	}

	// 1c. Nom de figure (refusé, Q-A) ou longueur sans valeur : un message en français,
	// avant la liste générique des variables libres
	const pointNamesRefusal = pointNamesEvaluationRefusal(processedNode);
	if (pointNamesRefusal !== null) {
		return { status: 'unevaluable', reason: pointNamesRefusal };
	}

	// 2. Check for free variables (exclude known constants)
	const variables = getVariables(processedNode);
	const freeVars = [...variables].filter((v) => v !== 'pi');

	if (freeVars.length > 0) {
		return {
			status: 'unevaluable',
			reason: `Cannot evaluate: free variables: ${freeVars.join(', ')}`
		};
	}

	// 3. Mode exact: validate and use normalize/denormalize for exact symbolic simplification
	if (opts.mode === 'exact') {
		try {
			validateEvaluable(processedNode, true); // Allow complex functions in exact mode
		} catch (e) {
			return {
				status: 'unevaluable',
				reason: e instanceof Error ? e.message : String(e)
			};
		}

		try {
			// Use normalizeExtended for limit calculations to handle ∞, 0±, and indeterminate forms
			if (opts.limit) {
				const result = normalizeExtended(processedNode);

				if (result.type === 'indeterminate') {
					return {
						status: 'indeterminate',
						form: result.form
					};
				}

				const simplifiedNode = denormalizeExtended(result);
				return {
					status: 'value',
					value: simplifiedNode,
					node: simplifiedNode,
					exact: true
				};
			}

			// Standard exact mode: use regular normalize/denormalize
			// min, max, gcd, mod : normalize ne les calcule pas → réduits d'abord
			const normalForm = normalize(reduceComputedExponents(reduceMultiArgFunctions(processedNode)));
			let simplifiedNode = denormalize(normalForm);

			// Post-process to evaluate rounding functions (floor, ceil, round, abs)
			// that normalize/denormalize don't handle
			simplifiedNode = evaluateRoundingFunctions(simplifiedNode);

			return {
				status: 'value',
				value: simplifiedNode,
				node: simplifiedNode,
				exact: true
			};
		} catch (e) {
			// Handle errors from normalize (e.g., division by zero)
			const message = e instanceof Error ? e.message : String(e);
			// Convert normalize error messages to user-friendly format
			if (message.includes('division by zero')) {
				return {
					status: 'unevaluable',
					reason: 'Division by zero'
				};
			}
			return {
				status: 'unevaluable',
				reason: message
			};
		}
	}

	// 4. Mode decimal: validate and evaluate numerically with Rational arithmetic
	try {
		validateEvaluable(processedNode);
	} catch (e) {
		return {
			status: 'unevaluable',
			reason: e instanceof Error ? e.message : String(e)
		};
	}

	try {
		// Use evaluateNodeToApproximatedNumber which internally:
		// 1. Evaluates to Rational using BigInt arithmetic
		// 2. Applies precision formatting
		// 3. Converts to number only at the end
		const numericValue = evaluateNodeToApproximatedNumber(processedNode, opts.precision);

		// Create a MathNode for the numeric result
		const resultNode = Number.isInteger(numericValue)
			? numericNode(numericValue)
			: numericNode(numericValue.toPrecision(15));

		return {
			status: 'value',
			value: numericValue,
			node: resultNode,
			exact: false
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			status: 'unevaluable',
			reason: message
		};
	}
}
