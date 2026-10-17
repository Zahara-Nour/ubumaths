/**
 * Une comparaison dont un membre dépasse le plafond de calcul (lot « défauts des grandes
 * fractions », 2026-10-12). Le moteur calcule chaque membre exactement : `1.0001^{30000} > 20`
 * prenait 16,7 s, `(1+1/20000)^{20000} > 2` 8,8 s, `(1+1/100000)^{100000}×(1+1/100000)^{-100000} < 1`
 * plus de 300 s — le plafond des expressions (`isTooLongToCompute`) ne voyait jamais une relation.
 *
 * Un membre au-delà du plafond :
 * - un produit ou quotient de puissances prend sa valeur exacte, calculée sur ses facteurs
 *   (`productValue`) — la comparaison reste exacte ;
 * - sinon, la relation se tranche sur des ENCADREMENTS rigoureux des deux membres
 *   (`interval.ts` : 256 bits, arrondis vers l'extérieur à chaque opération, la valeur exacte
 *   toujours dedans) : disjoints, le sens est sûr ; sinon, refus. Ce qui ne s'encadre pas (π,
 *   une racine, une fonction, une variable) est refusé.
 *
 * ⚠️ Deux essais refusés par la revue, qui donnaient des sens FAUX : comparer les valeurs
 * arrondies du bouton ≈ (entre 10⁹ et 10¹⁵, un entier exact et une valeur approchée ne sont pas
 * sur la même grille : `(1+1/20000)^{20000} + 10^9 > 10^9 + 1` → `false`), puis les lire comme des
 * intervalles à marge relative (un membre lu par le flottant puis presque annulé par une
 * soustraction : `(1+1/20000)^{20000}×10^{16} − 27182138745278831 < 0` → `false`).
 *
 * Seules `= ≠ < > ≤ ≥` sont tranchées ; une autre relation reste au moteur, comme avant.
 *
 * @module mathAST/cli/bounded-comparison
 */

import type { MathNode, RelationType } from '../types';
import { isLogical, isLogicalNot, isRelation } from '../guards';
import { boolean, logical, relation } from '../factory';
import { rationalToNode } from '../common/numeric';
import { getVariables } from '../eval/substitute';
import { compareEnclosures, enclosure } from './interval';
import { isTooLongToCompute, productValue } from './exact-size';

// =============================================================================
// Constantes
// =============================================================================

const ORDER_RELATIONS: ReadonlySet<RelationType> = new Set(['=', '!=', '<', '>', '<=', '>=']);

const NO_VALUE =
	'Comparaison trop grande : un membre ne se calcule pas sans figer la page, ni ne s’encadre (π, racine, fonction…)';

const TOO_CLOSE =
	'Membres trop proches pour être départagés : trop longs à calculer exactement, et leurs encadrements se recouvrent';

const WITH_VARIABLE =
	'Comparaison non tentée : un membre est trop grand pour être calculé, et une variable empêche de l’encadrer';

// =============================================================================
// Fonctions
// =============================================================================

function holds(relation: RelationType, order: number): boolean {
	switch (relation) {
		case '=':
			return order === 0;
		case '!=':
			return order !== 0;
		case '<':
			return order < 0;
		case '>':
			return order > 0;
		case '<=':
			return order <= 0;
		default:
			return order >= 0;
	}
}

/** Un membre sous le plafond, ou sa valeur exacte par ses facteurs ; `null` s'il n'en a pas. */
function computableSide(side: MathNode): MathNode | null {
	if (!isTooLongToCompute(side)) return side;
	const value = productValue(side);
	return value === null ? null : rationalToNode(value);
}

/**
 * La comparaison réécrite pour que rien n'y dépasse le plafond de calcul : membres remplacés
 * par leur valeur exacte, ou relation tranchée (`true`/`false`) ; `null` si rien n'y dépasse.
 *
 * @throws si un membre trop grand ne s'encadre pas, ou si les encadrements se recouvrent
 */
export function boundedComparison(node: MathNode): MathNode | null {
	if (isLogical(node)) {
		const left = boundedComparison(node.left);
		const right = boundedComparison(node.right);
		return left === null && right === null
			? null
			: { ...node, left: left ?? node.left, right: right ?? node.right };
	}
	if (isLogicalNot(node)) {
		const operand = boundedComparison(node.operand);
		return operand === null ? null : { ...node, operand };
	}
	if (!isRelation(node)) return null;
	// Une chaîne `a < b < c` : chaque maillon passe par le plafond (`a < b` et `b < c`)
	if (isRelation(node.left)) {
		return boundedComparison(
			logical('and', node.left, relation(node.relation, node.left.right, node.right))
		);
	}
	if (!ORDER_RELATIONS.has(node.relation)) return null;
	if (!isTooLongToCompute(node.left) && !isTooLongToCompute(node.right)) return null;

	const left = computableSide(node.left);
	const right = computableSide(node.right);
	if (left !== null && right !== null) return { ...node, left, right };

	const a = enclosure(left ?? node.left);
	const b = enclosure(right ?? node.right);
	if (a === null || b === null) {
		const free = getVariables(node.left).size > 0 || getVariables(node.right).size > 0;
		throw new Error(free ? WITH_VARIABLE : NO_VALUE);
	}
	const order = compareEnclosures(a, b);
	if (order === null) throw new Error(TOO_CLOSE);
	return boolean(holds(node.relation, order));
}
