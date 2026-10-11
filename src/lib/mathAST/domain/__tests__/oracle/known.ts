/**
 * État figé de l'oracle du domaine (2026-10-08, branche fix/domaine-faux).
 *
 * Le test échoue dans les DEUX sens :
 * - une entrée hors liste devient fausse / refusée → régression ;
 * - une entrée de la liste devient juste / répond → la retirer d'ici.
 *
 * Clé : identifiant du corpus ; valeur : ce que rend le moteur.
 */

/** Domaines FAUX connus (vide visé). */
export const KNOWN_WRONG: Readonly<Record<string, string>> = {};

/** Refus connus (contrainte non résolue : le moteur le dit au lieu de mentir). */
export const KNOWN_REFUSED: Readonly<Record<string, string>> = {
	// 1 − ln x ≠ 0 : borne e (non rationnelle) pas encore inversée
	'comp-16': 'refus',
	// paramètres : le domaine dépend de a, m (non représentable sans cas)
	'param-1': 'refus',
	'param-2': 'refus',
	'param-3': 'refus',
	// √(sin x) : réunion périodique d'intervalles, pas de rendu
	'trig-12': 'refus',
	// sin x ≠ 1/2 : deux familles périodiques
	'trig-13': 'refus',
	// tan x + 1/x : exclusion périodique ET un point, pas de rendu
	'trig-15': 'refus'
};
