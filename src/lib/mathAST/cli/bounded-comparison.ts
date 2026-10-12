/**
 * Une comparaison dont un membre dépasse le plafond de calcul (lot « défauts des grandes
 * fractions », 2026-10-12). Le moteur calcule chaque membre exactement : `1.0001^{30000} > 20`
 * prenait 16,7 s, `(1+1/20000)^{20000} > 2` 8,8 s, `(1+1/100000)^{100000}×(1+1/100000)^{-100000} < 1`
 * plus de 300 s — le plafond des expressions (`isTooLongToCompute`) ne voyait jamais une relation.
 *
 * Un membre au-delà du plafond :
 * - un produit ou quotient de puissances prend sa valeur exacte, calculée sur ses facteurs
 *   (`productValue`) — la comparaison reste exacte ;
 * - sinon, la relation se tranche sur les valeurs arrondies des deux membres (la règle du bouton
 *   ≈), lues comme des INTERVALLES : une valeur arrondie couvre un demi-pas de part et d'autre,
 *   plus une marge relative de 10⁻¹² pour un membre lu par le flottant ; seule la valeur d'un
 *   membre calculé exactement est un point. Intervalles disjoints : le sens est sûr ; sinon,
 *   refus. ⚠️ Comparer les arrondis eux-mêmes rendait des sens FAUX : entre 10⁹ et 10¹⁵, un
 *   entier exact s'écrit en entier, une valeur approchée à 5 chiffres significatifs —
 *   `(1+1/20000)^{20000} + 10^9 > 10^9 + 1` répondait `false` (revue).
 *
 * Seules `= ≠ < > ≤ ≥` sont tranchées ; une autre relation reste au moteur, comme avant.
 *
 * @module mathAST/cli/bounded-comparison
 */

import type { MathNode, RelationType } from '../types';
import { isLogical, isLogicalNot, isRelation } from '../guards';
import { boolean } from '../factory';
import { rationalToNode } from '../common/numeric';
import { getVariables } from '../eval/substitute';
import { approximateDigitsOf, type ApproximateDigits } from './approximation';
import { isTooLongToCompute, productValue } from './exact-size';

// =============================================================================
// Constantes
// =============================================================================

const ORDER_RELATIONS: ReadonlySet<RelationType> = new Set(['=', '!=', '<', '>', '<=', '>=']);

const NO_VALUE =
	'Comparaison trop grande : un membre ne se calcule pas sans figer la page, ni ne se lit en valeur approchée';

const TOO_CLOSE =
	'Membres trop proches pour être départagés : trop longs à calculer exactement, et leurs valeurs approchées se recouvrent';

const WITH_VARIABLE =
	'Comparaison non tentée : un membre est trop grand pour être calculé, et une variable empêche d’en lire une valeur approchée';

/** La marge d'un membre lu par le flottant : 10⁻¹² de sa valeur (le flottant en garde ~10⁻¹⁶). */
const FLOAT_MARGIN = 10n ** 12n;

// =============================================================================
// Fonctions
// =============================================================================

/** Une fraction (dénominateur positif). */
interface Fraction {
	readonly n: bigint;
	readonly d: bigint;
}

/** La valeur exacte d'une valeur arrondie : `-2.7182` → -27182/10⁴, `9.9900`×10³ → 9990. */
function digitsValue({ digits, exponent }: ApproximateDigits): Fraction {
	const [whole, decimals = ''] = digits.replace('-', '').split('.');
	let n = BigInt(whole + decimals) * (digits.startsWith('-') ? -1n : 1n);
	let d = 10n ** BigInt(decimals.length);
	if (exponent !== null && exponent >= 0) n *= 10n ** BigInt(exponent);
	if (exponent !== null && exponent < 0) d *= 10n ** BigInt(-exponent);
	return { n, d };
}

/** La demi-largeur de l'intervalle d'une valeur arrondie : un demi-pas, plus la marge du flottant. */
function halfWidth({ digits, exponent }: ApproximateDigits, center: Fraction): Fraction {
	// Le pas : une unité de la dernière décimale écrite, × 10^exposant
	const places = BigInt((digits.split('.')[1] ?? '').length) - BigInt(exponent ?? 0);
	const step = places >= 0n ? { n: 1n, d: 10n ** places } : { n: 10n ** -places, d: 1n };
	const size = center.n < 0n ? -center.n : center.n;
	// step/2 + |c|/10¹²
	const d = 2n * step.d * center.d * FLOAT_MARGIN;
	return { n: step.n * center.d * FLOAT_MARGIN + 2n * step.d * size, d };
}

/** a < b, a > b : sur des fractions. */
function less(a: Fraction, b: Fraction): boolean {
	return a.n * b.d < b.n * a.d;
}

function shifted(c: Fraction, w: Fraction, sign: 1n | -1n): Fraction {
	return { n: c.n * w.d + sign * w.n * c.d, d: c.d * w.d };
}

/** L'intervalle sûr d'un membre : un point s'il est calculé exactement. */
function interval(value: ApproximateDigits, computedExactly: boolean): [Fraction, Fraction] {
	const center = digitsValue(value);
	if (computedExactly && value.exact) return [center, center];
	const w = halfWidth(value, center);
	return [shifted(center, w, -1n), shifted(center, w, 1n)];
}

/** −1, 0 ou 1 : le sens de a par rapport à b ; `null` si les intervalles se recouvrent. */
function compareIntervals(a: [Fraction, Fraction], b: [Fraction, Fraction]): number | null {
	if (less(a[1], b[0])) return -1;
	if (less(b[1], a[0])) return 1;
	const points = !less(a[0], a[1]) && !less(b[0], b[1]);
	return points && !less(a[0], b[0]) && !less(b[0], a[0]) ? 0 : null;
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
	if (a === null || b === null) {
		const free = getVariables(node.left).size > 0 || getVariables(node.right).size > 0;
		throw new Error(free ? WITH_VARIABLE : NO_VALUE);
	}
	const order = compareIntervals(interval(a, left !== null), interval(b, right !== null));
	if (order === null) throw new Error(TOO_CLOSE);
	return boolean(holds(node.relation, order));
}
