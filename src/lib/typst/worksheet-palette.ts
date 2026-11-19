/**
 * Charte des fiches PDF (enseignant et élève)
 *
 * Source unique des couleurs de numérotation : le rendu d'exercice commun aux
 * PDF du prof et de l'élève (`worksheets/document/render-exercise.ts`) les importe ici.
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

/**
 * Badge du niveau de la fiche (ADR 0041), plein orange, texte blanc, en
 * expression Typst (mode code) : en tête de la page 1 et au début du bas de
 * page. Sa taille suit celle du texte qui l'entoure. `baseline` = la marge du bas :
 * le texte du badge est sur la ligne de base du texte voisin. `label` déjà échappé.
 */
export function levelBadge(label: string): string {
	return `box(fill: ${BADGE_FILL}, radius: 3pt, inset: (x: 0.4em, y: 0.25em), baseline: 0.25em)[#text(fill: ${BADGE_TEXT}, weight: "bold")[${label}]]`;
}
