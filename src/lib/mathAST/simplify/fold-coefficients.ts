/**
 * Regrouper les coefficients d'un produit, sans rien développer.
 *
 * `2 × 3 × (x+1)²` devient `6 (x+1)²`.
 *
 * ⚠️ **Pourquoi ça manquait.** Le seul chemin qui regroupait les coefficients
 * était la passe de normalisation de `simplify`, qui **développe** en même
 * temps : `2*3*(x+1)^2` y devient `6x² + 12x + 6`. La stratégie à point fixe
 * juge cette forme plus chère et rejette tout le résultat — coefficients
 * compris. Sans facteur parenthésé (`2*3*x`, `3*sin(x)*2`), rien n'était
 * développé, donc le regroupement passait : c'est ce qui rendait le défaut si
 * discret.
 *
 * ⚠️ **Pourquoi ce n'est pas une règle de réécriture.** Un motif `a × b` ne
 * voit que des facteurs ADJACENTS dans l'arbre : `3 × (x+1)² × 2` se lit
 * `(3 × (x+1)²) × 2`, et les deux nombres ne se rencontrent jamais. Il faut
 * aplatir le produit pour les réunir.
 *
 * ⚠️ **La forme factorisée doit survivre** : c'est elle qui permet d'étudier le
 * signe d'une dérivée. Cette passe ne touche donc qu'aux facteurs numériques.
 *
 * @module mathAST/simplify/fold-coefficients
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { number, divide, opposite, multiply } from '../factory';
import { extractRational } from '../common/numeric';
import { flattenProductShallow } from '../flatten';
import type { StyledFactor } from '../flatten';
import { mapNode } from '../transforms';

/** Le nœud qui écrit un rationnel : un entier, ou un quotient d'entiers. */
function rationalNode(value: Rational): MathNode {
	const negative = value.n < 0n !== value.d < 0n;
	const n = value.n < 0n ? -value.n : value.n;
	const d = value.d < 0n ? -value.d : value.d;

	// Un quotient d'entiers reste un quotient : on ne fabrique pas de décimal.
	const magnitude =
		d === 1n
			? number(n.toString())
			: divide(number(n.toString()), number(d.toString()), 'fraction');

	return negative ? opposite(magnitude) : magnitude;
}

/**
 * Le produit, ses facteurs numériques réunis en un seul, placé devant.
 *
 * Rend le nœud inchangé quand il n'y a pas deux nombres à réunir — pour que la
 * passe soit sans effet sur ce qui n'en a pas besoin.
 */
function foldProduct(node: MathNode): MathNode {
	if (node.type !== 'multiplication') return node;

	const factors = flattenProductShallow(node);
	if (factors.length <= 1) return node;

	const numeric: Rational[] = [];
	// ⚠️ `FlatProduct` est en LECTURE SEULE : on ne peut pas y empiler. Relevé
	// par le typecheck, que les 33 000 tests ne voient pas.
	const rest: StyledFactor[] = [];
	for (const factor of factors) {
		const rational = extractRational(factor.factor);
		if (rational === null) rest.push(factor);
		else numeric.push(rational);
	}

	// Un seul coefficient — ou aucun — n'a rien à regrouper.
	if (numeric.length <= 1) return node;

	const product = numeric.reduce<Rational>((a, b) => ({ n: a.n * b.n, d: a.d * b.d }), {
		n: 1n,
		d: 1n
	});

	// ⚠️ Le coefficient passe DEVANT : c'est l'écriture du tableau, et celle que
	// `sortTermsAndFactorsAST` établit désormais aussi.
	const coefficient = rationalNode(product);
	if (rest.length === 0) return coefficient;

	return rest.reduce(
		(left, factor) => multiply(left, factor.factor, factor.style),
		coefficient as MathNode
	);
}

/**
 * Regrouper les coefficients de tous les produits d'une expression.
 *
 * Strictement réductrice : elle ne peut que diminuer le nombre de nœuds, et ne
 * change jamais la valeur. Appliquée en fin de `simplify`, hors de la
 * comparaison de coûts, qui ne la rejetterait que par la faute de la passe de
 * normalisation.
 */
export function foldCoefficients(node: MathNode): MathNode {
	return mapNode(node, foldProduct);
}
