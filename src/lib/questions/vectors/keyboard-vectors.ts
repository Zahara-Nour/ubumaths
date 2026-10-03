/**
 * Onglet « Vecteur » du clavier virtuel MathLive
 * ==============================================
 *
 * Touches d'écriture d'un vecteur dans une case `answerKind: 'vecteur'` :
 * colonne à 2 ou 3 coordonnées, coordonnées en ligne `(a ; b)`, point-virgule.
 * Chaque touche insère un LaTeX que la correction relit (`vector-answer.ts`,
 * test `keyboard-vectors.test.ts`).
 *
 * Modèle : `questions/intervals/keyboard-intervals.ts`.
 *
 * @module questions/vectors/keyboard-vectors
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';

// Constantes

/** Identifiant de l'onglet, pour le retrouver parmi les layouts du clavier */
export const VECTORS_LAYOUT_ID = 'chiphre-vectors';

/** Touches : étiquette (`latex`), insertion (`insert`, `#0` = curseur, `#?` = case vide), info-bulle */
const VECTOR_KEYS: readonly Partial<VirtualKeyboardKeycap>[] = [
	{
		latex: '\\begin{pmatrix}\\square\\\\\\square\\end{pmatrix}',
		insert: '\\begin{pmatrix}#0\\\\#?\\end{pmatrix}',
		tooltip: 'Vecteur du plan, en colonne'
	},
	{
		latex: '\\begin{pmatrix}\\square\\\\\\square\\\\\\square\\end{pmatrix}',
		insert: '\\begin{pmatrix}#0\\\\#?\\\\#?\\end{pmatrix}',
		tooltip: 'Vecteur de l’espace, en colonne'
	},
	{
		latex: '(\\square;\\square)',
		insert: '\\left(#0;#?\\right)',
		tooltip: 'Coordonnées en ligne'
	},
	{ latex: ';', insert: ';', tooltip: 'Séparateur des coordonnées' }
];

// Functions

/**
 * L'onglet « Vecteur » : les touches de vecteur, puis une rangée de navigation
 * (chiffres, fractions et racines restent dans les onglets par défaut).
 */
export function buildVectorsKeyboardLayout(): VirtualKeyboardLayout {
	return {
		id: VECTORS_LAYOUT_ID,
		label: 'Vecteur',
		tooltip: 'Écrire un vecteur',
		rows: [VECTOR_KEYS.map((key) => ({ ...key })), ['[left]', '[right]', '[backspace]']]
	};
}
