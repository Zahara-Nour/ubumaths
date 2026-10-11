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
export const KNOWN_WRONG: Readonly<Record<string, string>> = {};
