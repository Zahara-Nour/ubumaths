/**
 * Lignes d'une case « droite paramétrique » : lecture et écriture de la valeur de la case
 * =====================================================================================
 *
 * Les trois lignes de l'élève (`x = …`, `y = …`, `z = …`) voyagent dans UNE valeur de
 * case : `x=1+2t\\y=2\\z=-1+3t`. Le nom de la coordonnée garde la place d'une ligne
 * vide (`x=1+2t\\y=\\z=-1+3t`). L'attendue de l'auteur s'écrit de même, entourée ou non
 * de `\begin{cases}…\end{cases}`. Fichier sans mathAST : l'écran, le schéma et le juge
 * le partagent.
 *
 * @module questions/parametric/parametric-lines
 */

// Constantes

/** Séparateur des lignes dans la valeur de la case */
const LINE_SEPARATOR = '\\\\';

/** Noms des coordonnées, dans l'ordre des lignes (espace seulement, outil 64) */
export const PARAMETRIC_COORDINATES = ['x', 'y', 'z'] as const;

/** Environnement `cases` autour des lignes (attendue de l'auteur) */
const CASES_REGEX = /^\\begin\{cases\}([\s\S]*)\\end\{cases\}$/;

/** Nom de coordonnée en tête de ligne (`x=`, `x =`) */
const NAME_PREFIX_REGEX = /^[xyz]\s*=/;

// Functions

/** Valeur de la case : une ligne par coordonnée, `x=…\\y=…\\z=…` */
export function formatParametricAnswer(lines: readonly string[]): string {
	return lines
		.map((line, k) => `${PARAMETRIC_COORDINATES[k] ?? ''}=${line.trim()}`)
		.join(LINE_SEPARATOR);
}

/**
 * Expressions écrites, une par ligne (vides comprises), lues dans la valeur de la case
 * ou dans l'attendue de l'auteur ; `[]` pour un texte vide
 */
export function parseParametricAnswer(text: string): string[] {
	let body = text.trim();
	const cases = CASES_REGEX.exec(body);
	if (cases) body = cases[1].trim();
	if (!body) return [];
	return body
		.split(LINE_SEPARATOR)
		.map((line) => line.trim().replace(NAME_PREFIX_REGEX, '').trim());
}
