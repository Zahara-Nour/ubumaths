/**
 * Charte des fiches PDF (enseignant et élève)
 *
 * Source unique des couleurs de numérotation : la fiche enseignant
 * (`generators/worksheet-generator.ts`) et le PDF élève
 * (`worksheets/student-worksheet-typst.ts`) les importent ici pour ne plus diverger.
 *
 * @module typst/worksheet-palette
 */

// Carré numéro : ambre tirant sur le rouge, assez soutenu pour un chiffre blanc.
export const BADGE_FILL = 'rgb("#e8590c")';
export const BADGE_TEXT = 'white';
// Titres de section : l'ambre du site (`--color-primary` clair).
export const SECTION_COLOR = 'rgb("#fc8f1b")';

/**
 * Numéro d'exercice blanc sur carré ambre, en expression Typst (mode code) :
 * préfixer par `#` pour l'insérer dans du contenu balisé.
 */
export function exerciseBadge(number: string | number): string {
	return `box(fill: ${BADGE_FILL}, radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: ${BADGE_TEXT}, weight: "bold")[${number}]]`;
}
