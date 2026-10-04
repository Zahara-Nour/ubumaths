/**
 * Atelier — mettre une dérivée au propre, sans perdre ce qui la rend lisible
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
 * @module atelier/tidy-terms
 */

import type { MathNode } from '$lib/mathAST/types';
import { tidy } from '$lib/mathAST/tidy';
import { transformAST } from '$lib/mathAST/visitor';

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

/** Chaque terme de la chaîne au sommet mis au propre, sans changer leur ordre. */
function termwise(node: MathNode): MathNode {
	if (node.type === 'addition' || node.type === 'subtraction') {
		return { ...node, left: termwise(node.left), right: tidySafe(node.right) };
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

/**
 * Le même arbre, avec un `×` explicite entre deux nombres : `3 \cdot 3x^2`
 * s'écrivait `3 3 x^2`, lu « 33x² » dans l'étape « On simplifie » (revue).
 */
export function withExplicitNumberProducts(node: MathNode): MathNode {
	const startsWithNumber = (n: MathNode): boolean =>
		n.type === 'number' ||
		(n.type === 'multiplication' && startsWithNumber(n.left)) ||
		(n.type === 'superscript' && startsWithNumber(n.base));
	return transformAST(node, {
		leaveMultiplication: (n) =>
			startsWithNumber(n.right) ? { ...n, displayStyle: 'cross' } : undefined
	});
}
