/**
 * Degrés généralisés en ±∞
 *
 * Une expression faite de puissances de x (exposants rationnels, racines
 * carrées ou n-ièmes), de constantes rationnelles, de sommes, produits et
 * quotients se comporte en +∞ comme son terme dominant c·x^d. Sa limite s'en
 * lit EXACTEMENT : d > 0 → signe(c)·∞ ; d = 0 → c ; d < 0 → 0.
 *
 * C'est le calcul que fait l'élève pour x/√x = x^{1 − 1/2} = √x → +∞, là où
 * L'Hôpital, après une dérivation, ne concluait qu'en évaluant 1/(1/(2√x))
 * en un point proche (« 200000 »).
 *
 * En −∞ : x = −t avec t → +∞ ; le coefficient de x vaut −1. Une puissance
 * non entière d'un coefficient négatif n'existe pas (sauf racine d'indice
 * impair) : on s'abstient.
 *
 * @module mathAST/limits/generalized-degree
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import {
	isNumber,
	isVariable,
	isFunction,
	isSuperscript,
	isMultiplication,
	isDivision,
	isOpposite,
	isDelimiter,
	isAddition,
	isSubtraction,
	isInfinity
} from '../guards';
import { number, divide, opposite, positiveInfinity, negativeInfinity } from '../factory';
import { findNodes } from '../transforms';
import { flattenSumShallow } from '../flatten';
import {
	rational,
	addRational,
	mulRational,
	divRational,
	negRational,
	powRational,
	compareRational,
	isZero,
	isInteger,
	isNegative,
	ZERO,
	ONE,
	MINUS_ONE
} from '../normal/rational';

/** Terme dominant c·x^d (c ≠ 0). */
interface LeadingTerm {
	readonly coefficient: Rational;
	readonly degree: Rational;
}

// =============================================================================
// Lecture des nombres et exposants
// =============================================================================

/** Littéral décimal « 12 » ou « 1.5 » en rationnel exact, sinon null. */
function decimalToRational(value: string): Rational | null {
	const matched = /^(\d+)(?:\.(\d+))?$/.exec(value);
	if (matched === null) return null;
	const decimals = matched[2] ?? '';
	return rational(BigInt(matched[1] + decimals), 10n ** BigInt(decimals.length));
}

/** Constante rationnelle écrite (3, 1/3, −2, (1/2)), sinon null. */
function constantRational(node: MathNode): Rational | null {
	if (isNumber(node)) return decimalToRational(node.value);
	if (isDelimiter(node)) return constantRational(node.content);
	if (isOpposite(node)) {
		const inner = constantRational(node.operand);
		return inner === null ? null : negRational(inner);
	}
	if (isDivision(node)) {
		const num = constantRational(node.numerator);
		const den = constantRational(node.denominator);
		if (num === null || den === null || isZero(den)) return null;
		return divRational(num, den);
	}
	return null;
}

/** Racine n-ième entière exacte d'un bigint positif, sinon null. */
function exactIntegerRoot(value: bigint, n: number): bigint | null {
	if (value < 0n) return null;
	const estimate = BigInt(Math.round(Number(value) ** (1 / n)));
	for (const candidate of [estimate - 1n, estimate, estimate + 1n]) {
		if (candidate >= 0n && candidate ** BigInt(n) === value) return candidate;
	}
	return null;
}

/** Racine n-ième exacte d'un rationnel (négatif seulement si n est impair). */
function rationalRoot(value: Rational, n: number): Rational | null {
	const negative = isNegative(value);
	if (negative && n % 2 === 0) return null;
	const absNum = negative ? -value.n : value.n;
	const rootNum = exactIntegerRoot(absNum, n);
	const rootDen = exactIntegerRoot(value.d, n);
	if (rootNum === null || rootDen === null) return null;
	const root = rational(rootNum, rootDen);
	return negative ? negRational(root) : root;
}

/** c^{p/q} exact, ou null (racine irrationnelle, ou paire d'un négatif). */
function rationalPower(base: Rational, exponent: Rational): Rational | null {
	if (exponent.d > 1000n || exponent.n > 1000n || exponent.n < -1000n) return null;
	const raised = powRational(base, Number(exponent.n));
	return rationalRoot(raised, Number(exponent.d));
}

// =============================================================================
// Terme dominant
// =============================================================================

/**
 * Terme dominant de `expr` quand la variable tend vers +∞ (`variableSign` = 1)
 * ou −∞ (`variableSign` = −1), ou null si l'expression sort du cadre (fonction
 * transcendante, coefficient irrationnel, termes dominants qui s'annulent).
 */
function leadingTerm(expr: MathNode, varName: string, variableSign: Rational): LeadingTerm | null {
	if (isDelimiter(expr)) return leadingTerm(expr.content, varName, variableSign);

	if (isNumber(expr)) {
		const value = decimalToRational(expr.value);
		if (value === null || isZero(value)) return null;
		return { coefficient: value, degree: ZERO };
	}

	if (isVariable(expr)) {
		return expr.name === varName ? { coefficient: variableSign, degree: ONE } : null;
	}

	if (isOpposite(expr)) {
		const inner = leadingTerm(expr.operand, varName, variableSign);
		return inner === null ? null : { ...inner, coefficient: negRational(inner.coefficient) };
	}

	if (isMultiplication(expr)) {
		const left = leadingTerm(expr.left, varName, variableSign);
		const right = leadingTerm(expr.right, varName, variableSign);
		if (left === null || right === null) return null;
		return {
			coefficient: mulRational(left.coefficient, right.coefficient),
			degree: addRational(left.degree, right.degree)
		};
	}

	if (isDivision(expr)) {
		const num = leadingTerm(expr.numerator, varName, variableSign);
		const den = leadingTerm(expr.denominator, varName, variableSign);
		if (num === null || den === null) return null;
		return {
			coefficient: divRational(num.coefficient, den.coefficient),
			degree: addRational(num.degree, negRational(den.degree))
		};
	}

	if (isSuperscript(expr)) {
		const exponent = constantRational(expr.superscript);
		if (exponent === null) return null;
		return raiseLeadingTerm(expr.base, exponent, varName, variableSign);
	}

	// Racine carrée √A, ou n-ième (indice dans `base`, jamais un défaut à 2)
	if (isFunction(expr) && expr.name === 'sqrt' && expr.args.length === 1) {
		let index = 2;
		if (expr.base !== undefined) {
			const parsed = constantRational(expr.base);
			if (parsed === null || !isInteger(parsed) || Number(parsed.n) < 2) return null;
			index = Number(parsed.n);
		}
		return raiseLeadingTerm(expr.args[0], rational(1n, BigInt(index)), varName, variableSign);
	}

	if (isAddition(expr) || isSubtraction(expr)) {
		return leadingTermOfSum(expr, varName, variableSign);
	}

	return null;
}

/** Terme dominant de A^e (e rationnel) à partir de celui de A. */
function raiseLeadingTerm(
	base: MathNode,
	exponent: Rational,
	varName: string,
	variableSign: Rational
): LeadingTerm | null {
	const inner = leadingTerm(base, varName, variableSign);
	if (inner === null) return null;
	// Puissance non entière d'une base négative : hors du domaine réel
	// (√ d'indice impair exceptée, où rationalRoot garde le signe)
	const coefficient = rationalPower(inner.coefficient, exponent);
	if (coefficient === null) return null;
	return { coefficient, degree: mulRational(inner.degree, exponent) };
}

/** Somme : degré maximal, coefficients de ce degré cumulés (null s'ils s'annulent). */
function leadingTermOfSum(
	expr: MathNode,
	varName: string,
	variableSign: Rational
): LeadingTerm | null {
	let best: LeadingTerm | null = null;
	for (const { sign, term } of flattenSumShallow(expr)) {
		const leading = leadingTerm(term, varName, variableSign);
		if (leading === null) return null;
		const signed =
			sign === '+' ? leading : { ...leading, coefficient: negRational(leading.coefficient) };
		if (best === null || compareRational(signed.degree, best.degree) > 0) {
			best = signed;
		} else if (compareRational(signed.degree, best.degree) === 0) {
			best = {
				coefficient: addRational(best.coefficient, signed.coefficient),
				degree: best.degree
			};
		}
	}
	if (best === null || isZero(best.coefficient)) return null;
	return best;
}

// =============================================================================
// API
// =============================================================================

/** L'expression contient-elle une racine ou une puissance d'exposant non entier ? */
export function involvesFractionalPower(expr: MathNode): boolean {
	return (
		findNodes(expr, (node) => {
			if (isFunction(node) && node.name === 'sqrt') return true;
			if (!isSuperscript(node)) return false;
			const exponent = constantRational(node.superscript);
			return exponent !== null && !isInteger(exponent);
		}).length > 0
	);
}

/** Rationnel exact en nœud : 2, −1, 2/3 (jamais de littéral négatif). */
function rationalToNode(value: Rational): MathNode {
	const negative = isNegative(value);
	const absNum = negative ? -value.n : value.n;
	const magnitude =
		value.d === 1n
			? number(absNum.toString())
			: divide(number(absNum.toString()), number(value.d.toString()), 'fraction');
	return negative ? opposite(magnitude) : magnitude;
}

/**
 * Limite exacte en ±∞ par le terme dominant c·x^d, ou null hors du cadre.
 *
 * @example
 * limitByGeneralizedDegree(x/√x, 'x', +∞)          // +∞
 * limitByGeneralizedDegree(x/√(x²+1), 'x', −∞)     // −1
 */
export function limitByGeneralizedDegree(
	expr: MathNode,
	varName: string,
	approach: MathNode
): MathNode | null {
	if (!isInfinity(approach)) return null;
	const variableSign = approach.sign === 'positive' ? ONE : MINUS_ONE;
	const leading = leadingTerm(expr, varName, variableSign);
	if (leading === null) return null;
	const degreeOrder = compareRational(leading.degree, ZERO);
	if (degreeOrder < 0) return number('0');
	if (degreeOrder === 0) return rationalToNode(leading.coefficient);
	return isNegative(leading.coefficient) ? negativeInfinity() : positiveInfinity();
}
