/**
 * Écrire un bloc d'exemple sans échapper les ``` dans les gabarits de chaîne.
 *
 * @module block-catalog/fence
 */

/** `fence('horloge', 'heure: 9 h', 'taille: 3cm')` → bloc complet, clôtures comprises */
export function fence(language: string, ...lines: string[]): string {
	return ['```' + language, ...lines, '```'].join('\n');
}
