/**
 * Un échantillon presque nul est-il une racine ?
 *
 * Les balayages numériques trouvent les racines par changement de signe, plus
 * celles où un échantillon tombe pile sur 0 — c'est le seul moyen de voir une
 * racine double comme celle de x², qui ne change pas de signe. Mais « presque
 * nul » ne suffit pas : e^(−x) vaut 7·10⁻¹³ en x = 28 sans jamais s'annuler,
 * et un seuil absolu y plaçait une racine par échantillon jusqu'au bord de la
 * fenêtre.
 *
 * On exige donc que |f| soit un minimum local : la courbe s'approche de l'axe
 * puis s'en éloigne. Une exponentielle, elle, continue de descendre.
 *
 * @module mathAST/analysis/near-zero
 */

/**
 * @param f - La fonction ; une valeur hors du domaine est `NaN`
 * @param x - L'échantillon examiné
 * @param step - Le pas du balayage : les voisins sont à ± `step`
 * @param tolerance - En deçà, |f(x)| est tenue pour nulle
 */
export function touchesZero(
	f: (x: number) => number,
	x: number,
	step: number,
	tolerance: number
): boolean {
	const magnitude = Math.abs(f(x));
	if (!(magnitude < tolerance)) return false;

	// `NaN > magnitude` est faux : un voisin hors du domaine ne compte pas.
	return Math.abs(f(x - step)) > magnitude && Math.abs(f(x + step)) > magnitude;
}
