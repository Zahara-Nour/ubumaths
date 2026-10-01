/**
 * Statistiques — comparer un cumul à un seuil
 *
 * Une seule règle pour les séries à effectifs et les séries en classes : la
 * revue du lot 1 a trouvé les deux modules en désaccord (médiane 2,5 d'un
 * côté, classe médiane décalée de l'autre) sur les mêmes pourcentages.
 *
 * Des effectifs entiers tombent juste ; des pourcentages saisis non :
 * 33,8 + 15,8 + 0,4 vaut 49,99999999999999 en flottant, pas 50.
 *
 * @module statistics/cumulative
 */

// =============================================================================
// Constantes
// =============================================================================

/** Tolérance RELATIVE à l'effectif total. */
const CUMULATIVE_TOLERANCE = 1e-12;

// =============================================================================
// Fonctions
// =============================================================================

/** Le cumul atteint-il le seuil (aux arrondis flottants près) ? */
export function reaches(cumulative: number, target: number, total: number): boolean {
	return cumulative >= target - CUMULATIVE_TOLERANCE * total;
}

/** Le cumul vaut-il exactement le seuil (aux arrondis flottants près) ? */
export function isExactly(cumulative: number, target: number, total: number): boolean {
	return Math.abs(cumulative - target) <= CUMULATIVE_TOLERANCE * total;
}
