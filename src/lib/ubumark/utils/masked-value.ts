/**
 * Valeur masquée d'un bloc à geste (chantier `fuite-enonce`)
 * ==========================================================
 *
 * En évaluation notée, le serveur envoie l'énoncé SANS la réponse : dans chaque
 * bloc à geste, la valeur que l'élève doit trouver (`placer: A=3`, `construire: 35`,
 * `colorier: 3/8`, effectif d'une barre à construire) devient `?`
 * (`maskGestureAnswers`, `$lib/questions/masked-statement`).
 *
 * Les parseurs lisent `?` comme une valeur de remplacement : l'écran garde les noms,
 * le nombre de points ou de barres, la forme ; la valeur ne sert qu'au dessin de la
 * solution, jamais montré avant la correction (faite par le serveur sur l'instance
 * complète). Écrit par un auteur dans un modèle, `?` est refusé par le générateur
 * (`buildAnswerOf`) : il n'y aurait rien à attendre.
 *
 * @module ubumark/utils/masked-value
 */

/** La valeur masquée, telle qu'écrite dans le bloc */
export const MASKED_VALUE = '?';

/** `?` seul après `:`, `=` ou `;`, suivi de `;` ou de la fin de ligne */
const MASKED_IN_SOURCE = /[:=;]\s*\?\s*(?:;|$)/m;

/** La valeur écrite est-elle masquée ? */
export function isMaskedValue(value: string): boolean {
	return value.trim() === MASKED_VALUE;
}

/**
 * Une valeur masquée dans le texte d'un bloc à geste (`placer: A=? ; B=7`,
 * `construire: ?`, `Foot = ?`). À ne demander qu'aux blocs qui la lisent :
 * ailleurs, `?` a d'autres sens (`sommets: ?` d'un patron).
 */
export function hasMaskedValue(source: string): boolean {
	return MASKED_IN_SOURCE.test(source);
}
