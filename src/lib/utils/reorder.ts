/**
 * Replace un élément dans une liste ordonnée.
 *
 * Extrait de la page Programme pour être testable : le décalage d'index après
 * le retrait est la partie qui se trompe silencieusement — retirer l'élément
 * décale la cible d'un cran quand on descend, pas quand on monte.
 */

/**
 * Renvoie l'ordre des ids avec `fromId` replacé juste avant ou juste après
 * `toId`, ou `null` si le déplacement n'a pas de sens (id inconnu, ou élément
 * déposé sur lui-même).
 *
 * @param ids    ordre courant
 * @param fromId l'élément déplacé
 * @param toId   l'élément survolé au dépôt
 * @param place  côté de `toId` où insérer — celui que la barre annonçait
 */
export function reorderIds(
	ids: readonly string[],
	fromId: string,
	toId: string,
	place: 'before' | 'after'
): string[] | null {
	if (fromId === toId) return null;
	const next = [...ids];
	const from = next.indexOf(fromId);
	const to = next.indexOf(toId);
	if (from < 0 || to < 0) return null;

	next.splice(from, 1);
	// Recalculé APRÈS le retrait : `to` a pu se décaler d'un cran.
	const target = next.indexOf(toId);
	next.splice(place === 'after' ? target + 1 : target, 0, fromId);
	return next;
}
