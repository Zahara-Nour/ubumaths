/**
 * Visibilité de la page et mesures d'affichage (FCP, LCP).
 *
 * Une page ouverte ou laissée en arrière-plan ne s'affiche qu'au retour de
 * l'élève : la mesure de son premier affichage dit combien de temps l'onglet est
 * resté caché, pas combien le site a mis à répondre. Même règle que la
 * bibliothèque `web-vitals` (et que Speed Insights) : une mesure d'affichage
 * postérieure au premier passage en arrière-plan est écartée.
 */

/** Ce qu'on lit d'une entrée `visibility-state` de l'API Performance */
export type VisibilityEntry = { name: string; startTime: number };

/**
 * Instant (ms depuis l'ouverture) du premier passage en arrière-plan, `Infinity`
 * si la page n'a jamais été cachée.
 *
 * `entries` : historique `performance.getEntriesByType('visibility-state')`
 * (Chromium) ; sans lui, on ne connaît que l'état courant.
 */
export function firstHiddenTime(
	entries: readonly VisibilityEntry[] | undefined,
	currentState: DocumentVisibilityState
): number {
	if (entries && entries.length > 0) {
		const hidden = entries.find((entry) => entry.name === 'hidden');
		return hidden ? hidden.startTime : Infinity;
	}
	return currentState === 'hidden' ? 0 : Infinity;
}

/** Vrai si l'affichage mesuré a eu lieu après le passage en arrière-plan */
export function isPaintAfterHidden(paintTime: number, hiddenTime: number): boolean {
	return paintTime >= hiddenTime;
}
