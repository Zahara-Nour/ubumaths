/**
 * Atelier — les réglages d'affichage d'une fonction
 *
 * Une seule règle pour trois portes d'entrée : la carte (`setDisplay`), la
 * relecture d'une sauvegarde et celle d'un lien. Toutes passent par
 * `curveDisplaySchema` — sinon un réglage refusé dans la carte pourrait entrer
 * par une URL.
 *
 * Phase 0 : `docs/wip/atelier-grapheur-phase0.md` §1 (S1 à S4).
 *
 * @module atelier/display
 */

import { z } from 'zod';
import { CURVE_COLORS, getNextSlot } from '$lib/grapheur/colors';
import { LINE_STYLES, LINE_WIDTHS } from '$lib/grapheur/types';
import type { CurveDisplay } from './types';

// =============================================================================
// Constantes
// =============================================================================

/** Même épaisseur qu'une courbe neuve du grapheur (`addFunction`). */
const DEFAULT_LINE_WIDTH = 2;

/**
 * Un nombre utilisable comme abscisse. zod 4 refuse déjà `Infinity` et `NaN`
 * dans `z.number()` (mesuré le 2026-10-04) — `.finite()` y est obsolète.
 */
const finite = z.number();

/** Ce qu'un réglage complet doit valoir — pour la relecture. */
export const curveDisplaySchema = z.object({
	color: z.enum(CURVE_COLORS),
	lineStyle: z.enum(LINE_STYLES),
	lineWidth: z
		.number()
		.refine((w) => (LINE_WIDTHS as readonly number[]).includes(w), 'Épaisseur inconnue.'),
	tangentAt: finite.nullable(),
	integral: z.object({ from: finite, to: finite }).nullable(),
	showOsculating: z.boolean(),
	showArcLength: z.boolean()
});

/** Ce qu'une modification peut changer : n'importe quel sous-ensemble. */
const patchSchema = curveDisplaySchema.partial().strict();

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les réglages d'une courbe qu'on trace pour la première fois.
 *
 * La couleur et le style suivent la règle du grapheur (`getNextSlot`) : le
 * premier couple encore libre parmi ceux des autres fonctions. Sans ça, deux
 * courbes tracées l'une après l'autre auraient la même apparence.
 */
export function newDisplay(others: readonly CurveDisplay[]): CurveDisplay {
	const slot = getNextSlot(others);
	return {
		color: slot.color,
		lineStyle: slot.lineStyle,
		lineWidth: DEFAULT_LINE_WIDTH,
		tangentAt: null,
		integral: null,
		showOsculating: false,
		showArcLength: false
	};
}

/**
 * Lire une modification venue d'ailleurs.
 *
 * Rend le patch validé, ou un message en français. ⚠️ Le message ne cite pas
 * le détail de zod : il parlerait de `enum` et de `refine` à un élève.
 */
export function readDisplayPatch(
	patch: unknown
): { ok: true; patch: Partial<CurveDisplay> } | { ok: false; message: string } {
	const parsed = patchSchema.safeParse(patch);
	if (!parsed.success) {
		return { ok: false, message: 'Ce réglage d’affichage n’est pas valable.' };
	}
	return { ok: true, patch: parsed.data };
}

/** Une copie faite de valeurs ordinaires, sans proxy `$state` (clonable). */
export function plainDisplay(display: CurveDisplay): CurveDisplay {
	return {
		color: display.color,
		lineStyle: display.lineStyle,
		lineWidth: display.lineWidth,
		tangentAt: display.tangentAt,
		integral:
			display.integral === null ? null : { from: display.integral.from, to: display.integral.to },
		showOsculating: display.showOsculating,
		showArcLength: display.showArcLength
	};
}
