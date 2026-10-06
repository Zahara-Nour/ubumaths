/**
 * Réécritures d'une somme ∞ − ∞ que le terme dominant ne lève pas
 *
 * Quand les termes dominants s'annulent (x²/(x+1) − x : deux termes « en x »),
 * le moteur s'abstenait. L'élève, lui, réécrit la somme :
 *
 * - **quantité conjuguée** pour √A − B : (A − B²)/(√A + B), le numérateur
 *   développé (√(x²+1) − x = 1/(√(x²+1) + x)) ;
 * - **même dénominateur et développement** : la forme normale du module
 *   `normal/` (x² − x³/(x+1) = x²/(x+1), (x+1)² − x² = 2x + 1) ;
 * - **regroupement des logarithmes** : a·ln u − b·ln v = ln(u^a / v^b),
 *   a et b rationnels (ln(x²+1) − 2 ln x = ln((x²+1)/x²)).
 *
 * Ces réécritures sont des ÉGALITÉS (sur le domaine) : la limite de la forme
 * réécrite est celle de la somme. On ne fait que les proposer ; l'appelant
 * évalue leur limite.
 *
 * @module mathAST/limits/sum-reduction
 */

import type { MathNode } from '../types';
import type { LimitRule } from './types';
import type { Rational } from '../normal/types';
import {
	isFunction,
	isAddition,
	isSubtraction,
	isDelimiter,
	isOpposite,
	isVariable,
	isNumber
} from '../guards';
import { divide, multiply, ln, number, power, parentheses } from '../factory';
import { flattenSumShallow } from '../flatten';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode, isProductSequenceBinding } from '../pattern/types';
import { exactConstantRational } from './generalized-degree';
import { normalize, denormalize } from '../normal';
import { nodesEqual } from '../pattern/match';
import { findNodes } from '../transforms';
import { findConjugate } from './algebraic';

/** Une réécriture et sa justification (étape pédagogique). */
export interface SumRewrite {
	readonly rewritten: MathNode;
	readonly description: string;
	readonly technique: Extract<LimitRule, 'rationalization' | 'algebraic-simplification'>;
}

/** Forme normale développée, réduite au même dénominateur, ou null si inchangée. */
function reduceToSingleFraction(expr: MathNode): MathNode | null {
	try {
		const reduced = denormalize(normalize(expr));
		return nodesEqual(reduced, expr) ? null : reduced;
	} catch {
		return null;
	}
}

/**
 * Une racine d'indice explicite (∛) n'a pas de conjugué en √A + B :
 * `findConjugate` ne lit que des racines carrées.
 */
function hasIndexedRoot(expr: MathNode): boolean {
	return (
		findNodes(expr, (n) => isFunction(n) && n.name === 'sqrt' && n.base !== undefined).length > 0
	);
}

/** √A − B réécrit (A − B²)/(√A + B), numérateur développé ; sinon null. */
function multiplyByConjugate(expr: MathNode): MathNode | null {
	if (!isSubtraction(expr) && !isAddition(expr)) return null;
	if (hasIndexedRoot(expr)) return null;
	const conjugateInfo = findConjugate(expr);
	if (conjugateInfo === null) return null;
	const numerator = reduceToSingleFraction(conjugateInfo.expanded) ?? conjugateInfo.expanded;
	return divide(numerator, conjugateInfo.conjugate, 'fraction');
}

/** Retire les signes `−` et parenthèses de tête : `−(−A)` → { sign: 1, node: A }. */
function peelSign(node: MathNode): { sign: 1 | -1; node: MathNode } {
	if (isDelimiter(node)) return peelSign(node.content);
	if (isOpposite(node)) {
		const inner = peelSign(node.operand);
		return { sign: inner.sign === 1 ? -1 : 1, node: inner.node };
	}
	return { sign: 1, node };
}

/** Terme `c·ln(u)`, c constant rationnel non nul (signe compris), sinon null. */
function logarithmTerm(
	term: MathNode,
	sign: 1 | -1,
	varName: string
): { argument: MathNode; coefficient: Rational } | null {
	const pattern = P.prod(P.func('ln', [P._('u')]), P.___('coeff', P.isFreeOf(varName)));
	const bindings = tryMatch(pattern, term);
	if (!bindings) return null;
	const argument = getBindingNode(bindings, 'u');
	if (argument === null) return null;
	const coeffBinding = bindings.get('coeff');
	const factors =
		coeffBinding !== undefined && isProductSequenceBinding(coeffBinding)
			? coeffBinding.factors
			: [];
	let coefficient: Rational = { n: 1n, d: 1n };
	if (factors.length > 0) {
		const product = factors.reduce((acc, f) => multiply(acc, f, 'dot'));
		const value = exactConstantRational(product);
		if (value === null || value.n === 0n) return null;
		coefficient = value;
	}
	return {
		argument,
		coefficient: sign === 1 ? coefficient : { n: -coefficient.n, d: coefficient.d }
	};
}

/** u^|c| (u seul si |c| = 1), u parenthésé s'il n'est pas atomique. */
function raiseTo(argument: MathNode, coefficient: Rational): MathNode {
	const n = coefficient.n < 0n ? -coefficient.n : coefficient.n;
	if (n === 1n && coefficient.d === 1n) return argument;
	const base =
		isVariable(argument) || isNumber(argument) || isDelimiter(argument) || isFunction(argument)
			? argument
			: parentheses(argument);
	const exponent =
		coefficient.d === 1n
			? number(n.toString())
			: divide(number(n.toString()), number(coefficient.d.toString()), 'fraction');
	return power(base, exponent);
}

/**
 * Somme de logarithmes a·ln u − b·ln v (a, b rationnels) réécrite
 * ln(u^a / v^b) ; null si un terme n'est pas un logarithme, ou si les termes
 * n'ont pas des signes opposés (pas de forme ∞ − ∞ à lever).
 *
 * Égalité valable là où u, v > 0 : c'est le domaine de la somme de départ.
 */
function combineLogarithms(expr: MathNode, varName: string): MathNode | null {
	const numerator: MathNode[] = [];
	const denominator: MathNode[] = [];
	for (const { sign, term } of flattenSumShallow(expr)) {
		const peeled = peelSign(term);
		const termSign = (sign === '+' ? peeled.sign : -peeled.sign) as 1 | -1;
		const log = logarithmTerm(peeled.node, termSign, varName);
		if (log === null) return null;
		const factor = raiseTo(log.argument, log.coefficient);
		if (log.coefficient.n > 0n) numerator.push(factor);
		else denominator.push(factor);
	}
	if (numerator.length === 0 || denominator.length === 0) return null;
	const product = (factors: MathNode[]): MathNode =>
		factors.reduce((acc, f) => multiply(acc, f, 'dot'));
	return ln(divide(product(numerator), product(denominator), 'fraction'));
}

/**
 * Réécritures candidates d'une somme, dans l'ordre où les essayer : les
 * logarithmes regroupés, puis le conjugué (la forme normale de √(x²+1) − x
 * n'est qu'un réordonnement), puis la réduction au même dénominateur.
 */
export function rewriteIndeterminateSum(expr: MathNode, varName: string): SumRewrite[] {
	if (!isAddition(expr) && !isSubtraction(expr)) return [];
	const rewrites: SumRewrite[] = [];
	const logarithm = combineLogarithms(expr, varName);
	if (logarithm !== null) {
		rewrites.push({
			rewritten: logarithm,
			description: 'Forme ∞ − ∞ : a ln u − b ln v = ln(uᵃ / vᵇ)',
			technique: 'algebraic-simplification'
		});
	}
	const conjugate = multiplyByConjugate(expr);
	if (conjugate !== null) {
		rewrites.push({
			rewritten: conjugate,
			description: 'Forme ∞ − ∞ : multiplication par la quantité conjuguée',
			technique: 'rationalization'
		});
	}
	const reduced = reduceToSingleFraction(expr);
	if (reduced !== null) {
		rewrites.push({
			rewritten: reduced,
			description: 'Forme ∞ − ∞ : réduction au même dénominateur et développement',
			technique: 'algebraic-simplification'
		});
	}
	return rewrites;
}
