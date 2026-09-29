/**
 * Garde d'écriture d'un lot : tout ou rien
 * ========================================
 *
 * Un lot relu et validé par David l'est EN ENTIER : publier les seuls modèles
 * « prêts » écrirait un lot partiel que personne n'a validé tel quel (et un
 * modèle écarté en silence passerait inaperçu). `--publier` refuse donc le lot
 * dès qu'une entrée n'est pas prête.
 */

/** Raison du refus, ou `null` si le lot entier est prêt */
export function publishRefusal(readyCount: number, entryCount: number): string | null {
	if (entryCount === 0) return 'lot vide : rien à publier';
	if (readyCount !== entryCount) {
		return `${entryCount - readyCount} modèle(s) sur ${entryCount} non prêt(s) : lot refusé en entier, rien n'est écrit`;
	}
	return null;
}
