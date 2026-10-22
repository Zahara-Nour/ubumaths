/**
 * Pedagogical Simplify — la mise en forme d'un développement, partagée.
 *
 * Sortie d'`expand-explained.ts` pour servir aussi à `auto` (`reduce-steps.ts`,
 * chantier simplify-carte § 33) : `expand-explained` appelle le pipeline, et le
 * pipeline ne peut pas l'importer en retour.
 *
 * @module mathAST/pedagogical-simplify/expand-format
 */

import type { MathNode } from '../types';
import { multiply, number, opposite } from '../factory';
import { flattenProductShallow } from '../flatten';
import { findNodes, mapNode } from '../transforms';
import { decimalString } from '../tidy/decimal';

// =============================================================================
// Fonctions — lecture
// =============================================================================

/**
 * Les parenthèses de GROUPEMENT qui enveloppent tout retirées (`[0;1]` est un
 * intervalle). Partagée avec l'atelier (`atelier/expand.ts`), où la substitution
 * des noms écrit `f` en `((x+1)^2)`.
 */
export function unwrapGrouping(node: MathNode): MathNode {
	if (node.type !== 'delimiter') return node;
	if (node.semantic !== undefined && node.semantic !== 'grouping') return node;
	return unwrapGrouping(node.content);
}

/**
 * L'arbre sans ses parenthèses de groupement, pour comparer deux écritures du
 * même calcul : `1/(x+1)` tapé en ligne et `\dfrac{1}{x+1}` rendu par le
 * module ne diffèrent que par là (et par le style du quotient, que l'empreinte
 * ignore déjà).
 */
export function withoutGrouping(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'delimiter' && (n.semantic === undefined || n.semantic === 'grouping')
			? n.content
			: n
	);
}

/**
 * `-(x+1)` s'écrit `-1(x+1)` pour le pipeline, qui ne développait pas
 * l'opposé d'une somme (0 étape : « rien à développer » — revue de la PR 1).
 */
export function withExplicitMinusOne(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (n.type !== 'opposite' || n.operand.type !== 'delimiter') return n;
		const inside = unwrapGrouping(n.operand);
		if (inside.type !== 'addition' && inside.type !== 'subtraction') return n;
		return multiply(opposite(number('1')), n.operand, 'implicit');
	});
}

/**
 * Une écriture que le pipeline n'a pas su finir : deux nombres dans un même
 * produit (`2 x 1`), une puissance de nombres (`1^2`). Mesuré : une somme dans
 * un exposant (`e^{(x+1)^2}`) est développée sans être réduite.
 */
export function hasUnfinishedArithmetic(node: MathNode): boolean {
	return (
		findNodes(node, (n) => {
			if (n.type === 'superscript') {
				return n.base.type === 'number' && n.superscript.type === 'number';
			}
			if (n.type !== 'multiplication') return false;
			return flattenProductShallow(n).filter(({ factor }) => factor.type === 'number').length >= 2;
		}).length > 0
	);
}

// =============================================================================
// Fonctions — décimaux
// =============================================================================

/** Un entier écrit, éventuellement précédé d'un signe : sa valeur, sinon `null`. */
function integerOf(node: MathNode): bigint | null {
	if (node.type === 'opposite') {
		const value = integerOf(node.operand);
		return value === null ? null : -value;
	}
	if (node.type !== 'number' || !/^-?\d+$/.test(node.value)) return null;
	return BigInt(node.value);
}

/**
 * En décimal, une fraction de deux entiers à écriture décimale finie s'écrit
 * en décimal (`1/4` → `0.25`). Les autres restent des fractions : arrondir
 * `1/9` ferait d'une égalité une approximation.
 */
export function decimalFraction(node: MathNode): MathNode {
	if (node.type !== 'division') return node;
	const numerator = integerOf(node.numerator);
	const denominator = integerOf(node.denominator);
	if (numerator === null || denominator === null || denominator === 0n) return node;
	const negative = numerator < 0n !== denominator < 0n;
	const absolute = (n: bigint) => (n < 0n ? -n : n);
	const text = decimalString({ n: absolute(numerator), d: absolute(denominator) });
	if (text === null) return node;
	return negative ? opposite(number(text)) : number(text);
}
