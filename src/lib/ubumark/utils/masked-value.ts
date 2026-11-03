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

/** Ligne de la réponse d'un bloc à geste : `placer:`, `tracer:`, `construire:`, `colorier:` */
const ANSWER_KEY_LINE = /^(?:placer|tracer|construire|colorier)\s*:(.*)$/i;

/**
 * Donnée masquée : une barre (`Natation = ?`) ou une boîte à moustaches
 * (`Notes = ? ; ? ; ? ; ? ; ?`)
 */
const MASKED_DATUM_LINE = /=\s*\?(?:\s*;\s*\?)*\s*;?\s*$/;

/** Valeur d'un vecteur à tracer : `vecteur u = (3 ; -2) depuis A` */
const VECTOR_VALUE = /^\s*vecteur\b/i;

/** `?` à la place des coordonnées d'un vecteur (`vecteur ?`, `vecteur u = ? depuis A`) */
const MASKED_VECTOR_COORDS = /(?:^|[\s=])\?(?:\s|$)/;

/** La valeur est-elle celle d'un vecteur à tracer (`tracer: vecteur …`) ? */
export function isVectorValue(value: string): boolean {
	return VECTOR_VALUE.test(value);
}

/** Les coordonnées d'un vecteur à tracer sont-elles masquées ? */
export function isMaskedVectorValue(value: string): boolean {
	return isVectorValue(value) && !value.includes('(') && MASKED_VECTOR_COORDS.test(value);
}

/**
 * Masquer un vecteur à tracer : seules ses coordonnées deviennent `?` ; le mot
 * `vecteur`, son nom et l'origine imposée restent (l'écran en a besoin)
 */
export function maskVectorValue(value: string): string {
	return value.trim().replace(/\([^)]*\)/, MASKED_VALUE);
}

/** La valeur écrite est-elle masquée ? */
export function isMaskedValue(value: string): boolean {
	return value.trim() === MASKED_VALUE;
}

/**
 * Une valeur masquée dans le texte d'un bloc à geste, sur la ligne de sa réponse
 * (`placer: A=? ; B=7`, `construire: ?`, `colorier: ?`) ou une donnée de barre
 * (`Foot = ?`) ou de boîte à moustaches (`Notes = ? ; ? ; ? ; ? ; ?`). Les autres lignes ne comptent pas (`légendes: ?`, `axes: Sport ; ?`).
 * À ne demander qu'aux blocs qui la lisent : ailleurs, `?` a d'autres sens
 * (`sommets: ?` d'un patron).
 */
export function hasMaskedValue(source: string): boolean {
	return source.split('\n').some((raw) => {
		const line = raw.trim();
		const answer = ANSWER_KEY_LINE.exec(line);
		if (answer) {
			if (isVectorValue(answer[1])) return isMaskedVectorValue(answer[1]);
			return answer[1]
				.split(';')
				.some((part) =>
					isMaskedValue(part.includes('=') ? part.slice(part.indexOf('=') + 1) : part)
				);
		}
		return MASKED_DATUM_LINE.test(line);
	});
}
