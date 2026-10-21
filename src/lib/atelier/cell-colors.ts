/**
 * Les couleurs de la mise en forme des cases (Q-MF-3) : les 6 couleurs nommées
 * du thème (`--color-fig-<nom>`, `src/app.css`), lisibles en clair comme en sombre.
 *
 * Telles quelles, elles tiennent un contraste de 4,5 sur une carte, mais pas sur
 * un fond teinté ni dans la zone sélectionnée (rouge sur jaune, en sombre : 3,3).
 * D'où deux réglages, vérifiés par `__tests__/cell-colors.test.ts` sur toutes les
 * paires, sélection comprise :
 * - un fond est une teinte légère de la couleur (`FILL_SHARE`), posée en sombre
 *   sur un gris plus profond que la carte (`DARK_FILL_BASE`) ;
 * - un texte coloré tire un peu vers la couleur du texte (`TEXT_SHARE`).
 *
 * @module atelier/cell-colors
 */

import type { ThemeColor } from './cell-format';

// =============================================================================
// Constantes
// =============================================================================

/** La part de la couleur dans un fond, en %. */
export const FILL_SHARE = 14;

/** En sombre, le gris sous la teinte d'un fond : plus profond que la carte. */
export const DARK_FILL_BASE = '#1f1f1f';

/** La part de la couleur dans un texte coloré, en %, le reste vers `--color-foreground`. */
export const TEXT_SHARE = { light: 80, dark: 55 } as const;

/** La teinte de la zone sélectionnée, en % (`td.zone` de `DataView.svelte`). */
export const SELECTION_SHARE = 14;

export const COLOR_LABELS: Readonly<Record<ThemeColor, string>> = {
	rouge: 'Rouge',
	orange: 'Orange',
	jaune: 'Jaune',
	vert: 'Vert',
	bleu: 'Bleu',
	violet: 'Violet'
};

// =============================================================================
// Functions
// =============================================================================

/** Le CSS d'un texte coloré. */
export function textColorCss(color: ThemeColor): string {
	const fig = `var(--color-fig-${color})`;
	const toward = (share: number) => `color-mix(in srgb, ${fig} ${share}%, var(--color-foreground))`;
	return `light-dark(${toward(TEXT_SHARE.light)}, ${toward(TEXT_SHARE.dark)})`;
}

/** Le CSS d'un fond coloré. */
export function fillColorCss(color: ThemeColor): string {
	return `color-mix(in srgb, var(--color-fig-${color}) ${FILL_SHARE}%, light-dark(var(--color-card), ${DARK_FILL_BASE}))`;
}
