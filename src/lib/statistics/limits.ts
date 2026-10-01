/**
 * Statistiques — bornes de calcul
 *
 * Plafond commun aux séries brutes, aux tableaux d'effectifs et aux classes.
 * Les blocs ubumark et les commandes du moteur (`.stats` : 1 000) peuvent
 * fixer plus bas ; jamais plus haut.
 *
 * @module statistics/limits
 */

export const STATISTICS_LIMITS = {
	/** Nombre maximal de valeurs (ou de lignes, ou de classes) d'une série. */
	maxValues: 10_000
} as const;
