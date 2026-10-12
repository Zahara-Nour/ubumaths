/**
 * Une comparaison dont un membre dépasse le plafond de calcul (lot « défauts des grandes
 * fractions », 2026-10-12). Le moteur calcule chaque membre exactement : `1.0001^{30000} > 20`
 * prenait 16,7 s, `(1+1/20000)^{20000} > 2` 8,8 s, `(1+1/100000)^{100000}×(1+1/100000)^{-100000} < 1`
 * plus de 300 s — le plafond des expressions (`isTooLongToCompute`) ne voyait jamais une relation.
 *
 * Un membre au-delà du plafond :
 * - un produit ou quotient de puissances prend sa valeur exacte, calculée sur ses facteurs
 *   (`productValue`) — la comparaison reste exacte ;
 * - sinon, la relation se tranche sur les VALEURS ARRONDIES des deux membres (la règle du bouton
 *   ≈) : l'arrondi garde l'ordre (une valeur plus petite ne s'arrondit jamais plus haut, passages
 *   de notation compris, leurs bornes étant sur les deux grilles), donc deux arrondis différents
 *   donnent le bon sens. Deux arrondis égaux ne départagent pas : refus, même pour `=`.
 *
 * Seules `= ≠ < > ≤ ≥` sont tranchées ; une autre relation reste au moteur, comme avant.
 *
 * @module mathAST/cli/bounded-comparison
 */

import type { MathNode, RelationType } from '../types';
import { isLogical, isLogicalNot, isRelation } from '../guards';
import { boolean } from '../factory';
import { rationalToNode } from '../common/numeric';
import { approximateDigitsOf, type ApproximateDigits } from './approximation';
import { isTooLongToCompute, productValue } from './exact-size';

// =============================================================================
// Constantes
// =============================================================================

const ORDER_RELATIONS: ReadonlySet<RelationType> = new Set(['=', '!=', '<', '>', '<=', '>=']);

const NO_VALUE =
	'Comparaison trop grande : un membre ne se calcule pas sans figer la page, ni ne se lit en valeur approchée';

const TOO_CLOSE =
	'Membres trop proches pour être départagés : trop longs à calculer exactement, et leurs valeurs approchées sont égales';

// =============================================================================
// Fonctions
// =============================================================================

/** La valeur exacte d'une valeur arrondie : `-2.7182` → -27182/10⁴, `9.9900`×10³ → 9990. */
function digitsValue({ digits, exponent }: ApproximateDigits): { n: bigint; d: bigint } {
	const [whole, decimals = ''] = digits.replace('-', '').split('.');
	let n = BigInt(whole + decimals) * (digits.startsWith('-') ? -1n : 1n);
	let d = 10n ** BigInt(decimals.length);
	if (exponent !== null && exponent >= 0) n *= 10n ** BigInt(exponent);
	if (exponent !== null && exponent < 0) d *= 10n ** BigInt(-exponent);
	return { n, d };
}

/** −1, 0 ou 1 : le sens de a par rapport à b. */
function compareDigits(a: ApproximateDigits, b: ApproximateDigits): number {
	const x = digitsValue(a);
	const y = digitsValue(b);
	const difference = x.n * y.d - y.n * x.d;
	return difference === 0n ? 0 : difference < 0n ? -1 : 1;
}

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
 * @throws si un membre trop grand n'a pas de valeur approchée, ou si les arrondis sont égaux
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
	// Une chaîne (`1 < x < 3`) reste au moteur, comme avant
	if (!isRelation(node) || isRelation(node.left) || !ORDER_RELATIONS.has(node.relation)) {
		return null;
	}
	if (!isTooLongToCompute(node.left) && !isTooLongToCompute(node.right)) return null;

	const left = computableSide(node.left);
	const right = computableSide(node.right);
	if (left !== null && right !== null) return { ...node, left, right };

	const a = approximateDigitsOf(left ?? node.left);
	const b = approximateDigitsOf(right ?? node.right);
	if (a === null || b === null) throw new Error(NO_VALUE);
	const order = compareDigits(a, b);
	if (order === 0) throw new Error(TOO_CLOSE);
	return boolean(holds(node.relation, order));
}
