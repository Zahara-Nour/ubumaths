/**
 * Lignes d'une case « résolution » : lecture et écriture de la valeur de la case
 * =============================================================================
 *
 * Les lignes de l'élève voyagent dans UNE valeur de case, séparées par `\\`
 * (LaTeX). Fichier sans mathAST : l'écran, le schéma et le juge le partagent.
 *
 * @module questions/resolution/resolution-lines
 */

// Constantes

/** Séparateur des lignes dans la valeur de la case */
const LINE_SEPARATOR = '\\\\';

/** Au-delà, la réponse n'est pas lue (garde, comme la complexité d'une case) */
export const RESOLUTION_MAX_LINES = 20;

// Functions

/** Valeur de la case : les lignes non vides, séparées par `\\` */
export function formatResolutionAnswer(lines: readonly string[]): string {
	return lines
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(LINE_SEPARATOR);
}

/** Lignes écrites, lues dans la valeur de la case (lignes vides retirées) */
export function parseResolutionAnswer(answer: string): string[] {
	return answer
		.split(LINE_SEPARATOR)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}
