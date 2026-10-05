/**
 * Onglet « Matrice » du clavier virtuel MathLive
 * ==============================================
 *
 * Touches d'écriture d'une matrice dans une case `answerKind: 'matrice'` :
 * gabarits 2 × 2 et 3 × 3, colonne et ligne de 2 coefficients, puis ajout d'une
 * ligne ou d'une colonne (matrice d'adjacence d'un graphe à 4 sommets ou plus).
 * Chaque gabarit insère un LaTeX que la correction relit (`matrix-answer.ts`,
 * test `keyboard-matrices.test.ts`). Onglet montré SEULEMENT pour une case
 * « matrice » : il ne souffle pas la forme de la réponse ailleurs.
 *
 * Modèle : `questions/vectors/keyboard-vectors.ts`.
 *
 * @module questions/matrices/keyboard-matrices
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';

// Constantes

/** Identifiant de l'onglet, pour le retrouver parmi les layouts du clavier */
export const MATRICES_LAYOUT_ID = 'chiphre-matrices';

const SQUARE = '\\square';

/** Gabarit `rows × columns` : étiquette (cases grises) et insertion (`#0` = curseur, `#?` = case vide) */
function templateKey(
	rows: number,
	columns: number,
	tooltip: string
): Partial<VirtualKeyboardKeycap> {
	const grid = (first: string, other: string) =>
		Array.from({ length: rows }, (_, i) =>
			Array.from({ length: columns }, (_, j) => (i === 0 && j === 0 ? first : other)).join('&')
		).join('\\\\');
	return {
		latex: `\\begin{pmatrix}${grid(SQUARE, SQUARE)}\\end{pmatrix}`,
		insert: `\\begin{pmatrix}${grid('#0', '#?')}\\end{pmatrix}`,
		tooltip
	};
}

/** Touches : gabarits, puis agrandissement de la matrice où se trouve le curseur */
const MATRIX_KEYS: readonly Partial<VirtualKeyboardKeycap>[] = [
	templateKey(2, 2, 'Matrice 2 × 2'),
	templateKey(3, 3, 'Matrice 3 × 3'),
	templateKey(2, 1, 'Matrice colonne (2 lignes)'),
	templateKey(1, 2, 'Matrice ligne (2 colonnes)'),
	{
		label: '+ ligne',
		command: ['performWithFeedback', 'addRowAfter'],
		tooltip: 'Ajouter une ligne sous le curseur'
	},
	{
		label: '+ colonne',
		command: ['performWithFeedback', 'addColumnAfter'],
		tooltip: 'Ajouter une colonne après le curseur'
	}
];

// Functions

/**
 * L'onglet « Matrice » : les touches de matrice, puis une rangée de navigation
 * (chiffres, fractions et racines restent dans les onglets par défaut).
 */
export function buildMatricesKeyboardLayout(): VirtualKeyboardLayout {
	return {
		id: MATRICES_LAYOUT_ID,
		label: 'Matrice',
		tooltip: 'Écrire une matrice',
		rows: [MATRIX_KEYS.map((key) => ({ ...key })), ['[left]', '[right]', '[backspace]']]
	};
}
