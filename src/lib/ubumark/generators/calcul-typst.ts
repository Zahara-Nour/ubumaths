/**
 * Bloc ```calcul → Typst
 * ======================
 *
 * Une question « programme de calcul » ne se fait pas sur papier : la fiche imprime le cadre
 * « À faire sur Chiphre » sous la consigne (l'énoncé, au-dessus). Ni le programme de référence
 * ni le programme de départ : la fiche ne dit pas la réponse, et des blocs ne s'impriment pas.
 *
 * Un bloc en erreur devient le cadre neutre « Programme de calcul indisponible » — jamais une
 * erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/calcul-typst
 */

import { CALCUL_UNAVAILABLE, type CalculNode } from '../types/calcul';

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

/** Le cadre de la fiche : la question se fait à l'écran */
export const CALCUL_A_FAIRE_SUR_CHIPHRE =
	'À faire sur Chiphre : assemble le programme de calcul avec les blocs, à l’écran.';

/** Typst d'un bloc ```calcul : le cadre « À faire sur Chiphre » */
export function generateCalculTypst(node: CalculNode): string {
	const texte =
		node.errors.length > 0 || node.spec === null ? CALCUL_UNAVAILABLE : CALCUL_A_FAIRE_SUR_CHIPHRE;
	return `#block(${FRAME})[${texte}]`;
}
