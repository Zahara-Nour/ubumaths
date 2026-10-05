/**
 * `tidyTerms()` — mettre une dérivée au propre, sans perdre ce qui la rend lisible
 *
 * `differentiate` écrit a·n·xⁿ⁻¹ sans calculer le produit : la carte f′ de
 * `3x^3` montrait `3*3x^2` (retour de David, 2026-10-04). `tidy` le règle,
 * mais il RÉORDONNE une somme : la règle du produit donne `2x·sin x + x²·cos x`
 * (u′v + uv′), et `tidy` en faisait `x²·cos x + …`.
 *
 * La règle, en deux temps (revue des retours) :
 * - chaque TERME de la somme est mis au propre, l'ordre des termes reste ;
 * - sauf si la mise au propre COMPLÈTE regroupe des termes (`9x² + 6x²` →
 *   `15x²`, `(x−2) + (x+1)` → `2x − 1`) : regrouper l'emporte sur l'ordre.
 * Dans un quotient, on descend dans le numérateur (u′v − uv′ reste).
 *
 * Écrit d'abord pour l'atelier (`src/lib/atelier/tidy-terms.ts`, qui le
 * ré-exporte), il vit ici pour servir aussi la commande `.diff` du moteur :
 * `mathAST` n'importe pas l'atelier.
 *
 * @module mathAST/tidy/terms
 */

import type { MathNode } from '../types';
import { add, subtract } from '../factory';
import { isOpposite } from '../guards';
import { tidy } from './index';

/** `tidy` peut relancer une exception imprévue : on garde alors la forme brute. */
function tidySafe(node: MathNode): MathNode {
	try {
		return tidy(node);
	} catch {
		return node;
	}
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

/** Les termes de la chaîne de somme au sommet (`a + b − c` : 3 termes). */
function countTerms(node: MathNode): number {
	return node.type === 'addition' || node.type === 'subtraction' ? countTerms(node.left) + 1 : 1;
}

/**
 * Chaque terme de la chaîne au sommet mis au propre, sans changer leur ordre.
 *
 * Un terme mis au propre ISOLÉMENT peut ressortir négatif (`−sin x`) : sous
 * une addition, il restait `cos x + (−sin x)`. Même règle que `buildSum` dans
 * `tidy` : un terme négatif s'écrit en soustrayant sa valeur absolue
 * (`a + (−b)` → `a − b`, `a − (−b)` → `a + b`).
 */
function termwise(node: MathNode): MathNode {
	if (node.type === 'addition' || node.type === 'subtraction') {
		const left = termwise(node.left);
		const right = tidySafe(node.right);
		if (isOpposite(right)) {
			return node.type === 'addition' ? subtract(left, right.operand) : add(left, right.operand);
		}
		return { ...node, left, right };
	}
	return tidySafe(node);
}

/** Une dérivée mise au propre, en gardant l'ordre de la règle quand rien ne se regroupe. */
export function tidyTerms(node: MathNode): MathNode {
	if (node.type === 'division') {
		// Le numérateur garde son ordre (u′v − uv′) ; mais si la mise au propre
		// complète est plus COURTE (`{8x^3}/4` → `2x^3`), elle l'emporte
		const ordered: MathNode = {
			...node,
			numerator: tidyTerms(node.numerator),
			denominator: tidySafe(node.denominator)
		};
		const full = tidySafe(node);
		return nodeCount(full) < nodeCount(ordered) ? full : ordered;
	}
	if (!isSum(node)) return tidySafe(node);
	const ordered = termwise(node);
	const full = tidySafe(node);
	return countTerms(full) < countTerms(ordered) ? full : ordered;
}

/** Le nombre de nœuds d'un arbre : « plus simple » veut dire « moins de nœuds ». */
export function nodeCount(node: unknown): number {
	if (node === null || typeof node !== 'object') return 0;
	let count = 'type' in node ? 1 : 0;
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) for (const item of value) count += nodeCount(item);
		else if (value !== null && typeof value === 'object') count += nodeCount(value);
	}
	return count;
}
