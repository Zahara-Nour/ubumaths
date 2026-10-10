/**
 * Onglet « n! » du clavier virtuel MathLive
 * =========================================
 *
 * Factorielle `n!` et coefficient binomial `\binom{n}{k}`, que le moteur relit.
 *
 * Pourquoi un onglet et pas deux touches dans une couche par défaut : les couches
 * « 123 », symboles, abc et grec appartiennent à MathLive (`layouts = 'default'`)
 * et sont pleines (10 unités par rangée). Y ajouter une touche obligerait à recopier
 * leur définition entière, qui dériverait à chaque version de MathLive.
 * Onglet réservé aux cartes de Terminale (décision de David, 2026-10-05), d'après le
 * NIVEAU de la carte, jamais d'après la réponse attendue : ce serait souffler sa forme.
 *
 * Modèle : `questions/vectors/keyboard-vectors.ts`.
 *
 * @module questions/combinatorics/keyboard-combinatorics
 */

import type { VirtualKeyboardKeycap, VirtualKeyboardLayout } from 'mathlive';
import type { GradeLevel } from '$lib/questions/types';

// Constantes

/** Identifiant de l'onglet, pour le retrouver parmi les layouts du clavier */
export const COMBINATORICS_LAYOUT_ID = 'chiphre-combinatorics';

/** Niveaux de Terminale : une carte qui en porte un reçoit l'onglet */
const TERMINALE_GRADES: ReadonlySet<GradeLevel> = new Set<GradeLevel>(['T_SPE', 'T_COMP', 'T_EXP']);

/**
 * Touches : étiquette (`latex`), insertion, info-bulle (= nom accessible : MathLive
 * en fait l'`aria-label` de la touche).
 * `#@` = sélection, ou à défaut l'atome qui précède le curseur (même mécanisme que
 * la touche `x²` de MathLive) ; `#0` = curseur, `#?` = case vide.
 * ⚠️ Pas d'apostrophe droite dans les info-bulles : MathLive en met certaines entre
 * apostrophes dans son HTML.
 */
const COMBINATORICS_KEYS: readonly Partial<VirtualKeyboardKeycap>[] = [
	{ latex: 'n!', insert: '#@!', tooltip: 'Factorielle' },
	{
		latex: '\\binom{\\square}{\\square}',
		insert: '\\binom{#0}{#?}',
		tooltip: 'Coefficient binomial'
	}
];

// Functions

/** Onglet « n! » pour une carte de Terminale (au moins un de ses niveaux) */
export function hasCombinatoricsKeyboard(grades: readonly GradeLevel[]): boolean {
	return grades.some((grade) => TERMINALE_GRADES.has(grade));
}

/**
 * L'onglet « n! » : les deux touches, puis une rangée de navigation
 * (chiffres et lettres restent dans les onglets par défaut).
 */
export function buildCombinatoricsKeyboardLayout(): VirtualKeyboardLayout {
	return {
		id: COMBINATORICS_LAYOUT_ID,
		label: 'n!',
		labelClass: 'MLK__tex-math',
		tooltip: 'Factorielle et coefficient binomial',
		rows: [COMBINATORICS_KEYS.map((key) => ({ ...key })), ['[left]', '[right]', '[backspace]']]
	};
}
