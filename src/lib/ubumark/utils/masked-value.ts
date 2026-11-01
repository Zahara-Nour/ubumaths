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

/** Ligne de la réponse d'un bloc à geste : `placer:`, `construire:`, `colorier:` */
const ANSWER_KEY_LINE = /^(?:placer|construire|colorier)\s*:(.*)$/i;

/** Donnée d'un diagramme en barres masquée : `Natation = ?` */
const MASKED_DATUM_LINE = /=\s*\?\s*$/;

/** La valeur écrite est-elle masquée ? */
export function isMaskedValue(value: string): boolean {
	return value.trim() === MASKED_VALUE;
}

/**
 * Une valeur masquée dans le texte d'un bloc à geste, sur la ligne de sa réponse
 * (`placer: A=? ; B=7`, `construire: ?`, `colorier: ?`) ou une donnée de barre
 * (`Foot = ?`). Les autres lignes ne comptent pas (`légendes: ?`, `axes: Sport ; ?`).
 * À ne demander qu'aux blocs qui la lisent : ailleurs, `?` a d'autres sens
 * (`sommets: ?` d'un patron).
 */
export function hasMaskedValue(source: string): boolean {
	return source.split('\n').some((raw) => {
		const line = raw.trim();
		const answer = ANSWER_KEY_LINE.exec(line);
		if (answer) {
			return answer[1]
				.split(';')
				.some((part) =>
					isMaskedValue(part.includes('=') ? part.slice(part.indexOf('=') + 1) : part)
				);
		}
		return MASKED_DATUM_LINE.test(line);
	});
}
