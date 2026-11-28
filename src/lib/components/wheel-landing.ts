/**
 * Angle d'arrêt de la roue (`Wheel.svelte`), tiré au hasard loin des frontières de case.
 *
 * La case gagnante est `Math.floor((angleFinal * nbCases) / 360)` : une frontière tombe
 * tous les `360 / nbCases` degrés, nombre qui n'est pas forcément entier (7 cases →
 * 51,43°). On regarde donc la position dans la case de l'angle FINAL (angle de départ +
 * tirage), pas du seul tirage : après le premier lancer, la roue ne repart pas de 0.
 */

// Constantes
/** Écart voulu avec une frontière de case, en degrés. */
const MARGE_DEGRES = 2;

// Functions
/**
 * @param angleDepart angle actuel de la roue, en degrés (normalisé dans [0, 360[)
 * @param nbCases nombre de cases de la roue (≥ 1)
 * @param aleatoire source de hasard dans [0, 1[ (Math.random par défaut, injectable pour les tests)
 * @returns un angle dans ]0, 360] à ajouter à l'angle de départ
 */
export function tirerAngleArret(
	angleDepart: number,
	nbCases: number,
	aleatoire: () => number = Math.random
): number {
	const tailleCase = 360 / nbCases;
	// Avec beaucoup de cases, la marge ne doit pas manger la case entière.
	const marge = Math.min(MARGE_DEGRES, tailleCase / 4);
	let tirage: number;
	let dansLaCase: number;
	do {
		tirage = 360 - aleatoire() * 360; // ]0, 360]
		dansLaCase = ((angleDepart + tirage) % 360) % tailleCase;
	} while (dansLaCase < marge || dansLaCase > tailleCase - marge);
	return tirage;
}
