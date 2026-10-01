/**
 * Onglet « Intervalles » du clavier virtuel MathLive
 * ==================================================
 *
 * Touches d'écriture d'un ensemble de réels (case `answerKind: 'intervalles'`) :
 * crochets, point-virgule, infinis, réunion, ensemble vide, ℝ, « privé de ».
 * Chaque touche insère un LaTeX que la correction relit
 * (`interval-answer.ts`, test `keyboard-intervals.test.ts`).
 *
 * Modèle : `questions/units/keyboard-units.ts`.
 *
 * @module questions/intervals/keyboard-intervals
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';

// Constantes

/** Identifiant de l'onglet, pour le retrouver parmi les layouts du clavier */
export const INTERVALS_LAYOUT_ID = 'chiphre-intervals';

/** Touches : étiquette (`latex`), insertion (`insert`, `#0` = curseur), info-bulle */
const INTERVAL_KEYS: readonly Partial<VirtualKeyboardKeycap>[] = [
	{ latex: ']', insert: ']', tooltip: 'Crochet' },
	{ latex: '[', insert: '[', tooltip: 'Crochet' },
	{ latex: ';', insert: ';', tooltip: 'Séparateur des bornes' },
	{ latex: '+\\infty', insert: '+\\infty', tooltip: 'Plus l’infini' },
	{ latex: '-\\infty', insert: '-\\infty', tooltip: 'Moins l’infini' },
	{ latex: '\\cup', insert: '\\cup', tooltip: 'Réunion' },
	{ latex: '\\emptyset', insert: '\\emptyset', tooltip: 'Ensemble vide' },
	{ latex: '\\mathbb{R}', insert: '\\mathbb{R}', tooltip: 'Ensemble des réels' },
	{ latex: '\\setminus\\{\\}', insert: '\\setminus\\{#0\\}', tooltip: 'Privé de' }
];

/** Nombre de touches par rangée */
const KEYS_PER_ROW = 5;

// Functions

/**
 * L'onglet « Intervalles » : les touches d'ensemble, puis une rangée de
 * navigation (chiffres et fractions restent dans les onglets par défaut).
 */
export function buildIntervalsKeyboardLayout(): VirtualKeyboardLayout {
	const rows: (string | Partial<VirtualKeyboardKeycap>)[][] = [];
	for (let i = 0; i < INTERVAL_KEYS.length; i += KEYS_PER_ROW) {
		rows.push(INTERVAL_KEYS.slice(i, i + KEYS_PER_ROW).map((key) => ({ ...key })));
	}
	rows.push(['[left]', '[right]', '[backspace]']);

	return {
		id: INTERVALS_LAYOUT_ID,
		label: 'Intervalles',
		tooltip: 'Écrire un ensemble de réels',
		rows
	};
}
