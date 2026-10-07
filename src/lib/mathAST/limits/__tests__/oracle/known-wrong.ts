/**
 * Limites FAUSSES connues, relevées par l'oracle numérique le 2026-10-06 sur
 * main (après #903, #906, #907). Elles ne sont PAS corrigées ici : la liste
 * fige l'état pour que la CI reste verte ET que toute régression soit rouge.
 *
 * Le test échoue :
 * - si une entrée HORS de cette liste devient fausse (régression) ;
 * - si une entrée de cette liste devient juste → la retirer d'ici.
 *
 * Clé : identifiant d'entrée du corpus ; valeur : ce que rendait le moteur.
 */
export const KNOWN_WRONG: Readonly<Record<string, string>> = {
	// Statut « exact » avec une valeur ±∞ (attendu : statut « infinite ») —
	// dans les deux modes (saisie `\lim` et fonction seule)
	'ratinf-05': 'exact +∞ pour (x³+1)/(x²−4) en +∞',
	'ratinf-07': 'exact −∞ pour (1−x²)/(x+1) en +∞',
	'pole-01': 'exact +∞ pour 1/x en 0⁺',
	'pole-02': 'exact −∞ pour 1/x en 0⁻',
	'sqrt-23': 'exact +∞ pour √x/x en 0⁺',
	'exp-05': 'exact +∞ pour eˣ/x en +∞',
	'exp-06': 'exact +∞ pour eˣ/x² en +∞',
	'exp-17': 'exact +∞ pour e²ˣ/(eˣ+1) en +∞',
	'ln-02': 'exact −∞ pour ln x en 0⁺',
	'ln-04': 'exact +∞ pour x/ln x en +∞',
	'ln-29': 'exact +∞ pour x²/ln x en +∞',
	'edge-09': 'exact +∞ pour √(x−1)/(x−1) en 1⁺'
};
