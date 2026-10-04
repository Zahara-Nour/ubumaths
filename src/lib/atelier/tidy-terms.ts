/**
 * Atelier — mettre une dérivée au propre, terme à terme
 *
 * `differentiate` écrit a·n·xⁿ⁻¹ sans calculer le produit : la carte f′ de
 * `3x^3` montrait `3*3x^2` (retour de David, 2026-10-04). `tidy` le règle,
 * mais il RÉORDONNE aussi une somme : la règle du produit donne
 * `2x·sin x + x²·cos x` (u′v + uv′), et `tidy` en faisait `x²·cos x + …` —
 * l'ordre qui dit d'où vient chaque terme était perdu (test `derivation-chemins`).
 *
 * D'où ce passage : chaque TERME est mis au propre, l'ordre des termes reste.
 *
 * @module atelier/tidy-terms
 */

import type { MathNode } from '$lib/mathAST/types';
import { tidy } from '$lib/mathAST/tidy';

/** Chaque terme d'une somme mis au propre, dans l'ordre d'origine. */
export function tidyTerms(node: MathNode): MathNode {
	if (node.type === 'addition' || node.type === 'subtraction') {
		return { ...node, left: tidyTerms(node.left), right: tidyTerms(node.right) };
	}
	return tidy(node);
}
