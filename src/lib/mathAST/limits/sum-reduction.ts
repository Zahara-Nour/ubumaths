/**
 * Réécritures d'une somme ∞ − ∞ que le terme dominant ne lève pas
 *
 * Quand les termes dominants s'annulent (x²/(x+1) − x : deux termes « en x »),
 * le moteur s'abstenait. L'élève, lui, réécrit la somme :
 *
 * - **quantité conjuguée** pour √A − B : (A − B²)/(√A + B), le numérateur
 *   développé (√(x²+1) − x = 1/(√(x²+1) + x)) ;
 * - **même dénominateur et développement** : la forme normale du module
 *   `normal/` (x² − x³/(x+1) = x²/(x+1), (x+1)² − x² = 2x + 1).
 *
 * Ces réécritures sont des ÉGALITÉS (sur le domaine) : la limite de la forme
 * réécrite est celle de la somme. On ne fait que les proposer ; l'appelant
 * évalue leur limite.
 *
 * @module mathAST/limits/sum-reduction
 */

import type { MathNode } from '../types';
import type { LimitRule } from './types';
import { isFunction, isAddition, isSubtraction } from '../guards';
import { divide } from '../factory';
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

/**
 * Réécritures candidates d'une somme, dans l'ordre où les essayer : le
 * conjugué d'abord (la forme normale de √(x²+1) − x n'est qu'un réordonnement),
 * puis la réduction au même dénominateur.
 */
export function rewriteIndeterminateSum(expr: MathNode): SumRewrite[] {
	if (!isAddition(expr) && !isSubtraction(expr)) return [];
	const rewrites: SumRewrite[] = [];
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
