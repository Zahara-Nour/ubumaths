/**
 * Kanban tag colour tokens
 * ========================
 *
 * Maps each value of the `kanban_tag_color` enum to a pair of Tailwind class
 * strings — one for the inline chip (small, used on the card) and one for
 * the larger "swatch" used in the management dialog.
 *
 * Each entry includes both light- and dark-mode variants. Colours are kept
 * conservative (-100 bg / -800 text in light, -950/60 bg / -200 text in
 * dark) so the chips stay legible without dominating the card body.
 */

import type { KanbanTagColor } from '$lib/types/database-helpers';

export interface TagColorTokens {
	/** Compact chip on a card body. */
	chip: string;
	/** Larger filled swatch used in the management dialog and tag picker. */
	swatch: string;
	/** French label used in aria-label / fallback text. */
	label: string;
}

export const TAG_COLORS: ReadonlyArray<KanbanTagColor> = [
	'green',
	'yellow',
	'orange',
	'red',
	'purple',
	'blue',
	'sky',
	'gray'
] as const;

export const TAG_COLOR_TOKENS: Record<KanbanTagColor, TagColorTokens> = {
	green: {
		chip: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
		swatch: 'bg-green-500 text-white',
		label: 'vert'
	},
	yellow: {
		chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-200',
		swatch: 'bg-yellow-400 text-yellow-950',
		label: 'jaune'
	},
	orange: {
		chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
		swatch: 'bg-orange-500 text-white',
		label: 'orange'
	},
	red: {
		chip: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
		swatch: 'bg-red-500 text-white',
		label: 'rouge'
	},
	purple: {
		chip: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200',
		swatch: 'bg-purple-500 text-white',
		label: 'violet'
	},
	blue: {
		chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
		swatch: 'bg-blue-500 text-white',
		label: 'bleu'
	},
	sky: {
		chip: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
		swatch: 'bg-sky-500 text-white',
		label: 'ciel'
	},
	gray: {
		chip: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
		swatch: 'bg-gray-400 text-gray-900',
		label: 'gris'
	}
};
