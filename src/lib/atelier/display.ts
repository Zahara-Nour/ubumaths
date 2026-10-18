/**
 * Atelier — les réglages d'affichage d'une fonction
 *
 * Une seule règle pour trois portes d'entrée : la carte (`setDisplay`), la
 * relecture d'une sauvegarde et celle d'un lien. Toutes passent par
 * `curveDisplaySchema` — sinon un réglage refusé dans la carte pourrait entrer
 * par une URL.
 *
 * Phase 0 : `docs/archive/wip/atelier-grapheur-phase0.md` §1 (S1 à S4).
 *
 * @module atelier/display
 */

import { z } from 'zod';
import { CURVE_COLORS, getNextSlot } from '$lib/grapheur/colors';
import { COORDINATE_LIMIT, LINE_STYLES, LINE_WIDTHS } from '$lib/grapheur/types';
import {
	POINT_SIZES,
	type CurveDisplay,
	type PointDisplay,
	type SequenceDisplay,
	type StrokeDisplay
} from './types';
import { DEFAULT_COBWEB_STEPS } from '$lib/grapheur/sequence';

// =============================================================================
// Constantes
// =============================================================================

/** Même épaisseur qu'une courbe neuve du grapheur (`addFunction`). */
const DEFAULT_LINE_WIDTH = 2;

/**
 * Un nombre utilisable comme abscisse. zod 4 refuse déjà `Infinity` et `NaN`
 * dans `z.number()` (mesuré le 2026-10-04) — `.finite()` y est obsolète.
 * Mêmes bornes que le grapheur (`COORDINATE_LIMIT`), pour la raison dite là-bas.
 */
const finite = z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT);

/** Ce qu'un réglage complet doit valoir — pour la relecture. */
export const curveDisplaySchema = z.object({
	color: z.enum(CURVE_COLORS),
	lineStyle: z.enum(LINE_STYLES),
	lineWidth: z.number().refine((w) => (LINE_WIDTHS as readonly number[]).includes(w)),
	tangentAt: finite.nullable(),
	integral: z.object({ from: finite, to: finite }).nullable(),
	showOsculating: z.boolean(),
	showArcLength: z.boolean(),
	showReading: z.boolean()
});

/** Ce qu'une modification peut changer : n'importe quel sous-ensemble. */
const patchSchema = curveDisplaySchema.partial().strict();

/**
 * Ce qu'on range : couleur et style toujours, le reste seulement s'il s'écarte
 * du défaut (`compactDisplay`).
 *
 * ⚠️ Mesuré le 2026-10-04 : sans compression (repli Safari < 16.4), 8 fonctions
 * aux réglages complets pesaient 2 332 caractères de lien, au-delà de
 * `MAX_URL_PAYLOAD` (1 800) ; compactés, on retombe près du poids d'avant.
 */
export const storedDisplaySchema = curveDisplaySchema
	.partial()
	.required({ color: true, lineStyle: true });

/** Un réglage tel qu'il est rangé. */
export type StoredDisplay = Pick<CurveDisplay, 'color' | 'lineStyle'> & Partial<CurveDisplay>;

/** Les valeurs d'une courbe neuve, hors couleur et style (attribués à part). */
const DEFAULTS: Omit<CurveDisplay, 'color' | 'lineStyle'> = {
	lineWidth: DEFAULT_LINE_WIDTH,
	tangentAt: null,
	integral: null,
	showOsculating: false,
	showArcLength: false,
	showReading: false
};

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
export function newDisplay(
	others: readonly Pick<CurveDisplay, 'color' | 'lineStyle'>[]
): CurveDisplay {
	const slot = getNextSlot(others);
	return { color: slot.color, lineStyle: slot.lineStyle, ...DEFAULTS };
}

/** Le réglage complet d'un réglage rangé : ce qui manque vaut le défaut. */
export function fullDisplay(stored: StoredDisplay): CurveDisplay {
	return { ...DEFAULTS, ...stored };
}

/**
 * Ce qu'on range d'un réglage : couleur, style, et les seuls champs qui
 * s'écartent du défaut. Fait de valeurs ordinaires, sans proxy (clonable).
 */
export function compactDisplay(display: CurveDisplay): StoredDisplay {
	const plain = plainDisplay(display);
	const stored: StoredDisplay = { color: plain.color, lineStyle: plain.lineStyle };
	for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
		const value = plain[key];
		const fallback = DEFAULTS[key];
		// `integral` est un objet ou `null` ; le défaut est `null`, une comparaison
		// d'identité suffit donc à dire « s'écarte du défaut »
		if (value !== fallback) Object.assign(stored, { [key]: value });
	}
	return stored;
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
	// ⚠️ zod 4 GARDE une clé présente valant `undefined` (mesuré). Étalée sur le
	// réglage, elle effaçait la valeur — `integral: undefined` faisait ensuite
	// jeter `serialize()`. `undefined` veut dire « pas de changement » : on
	// l'écarte. Pour retirer une tangente ou une aire, c'est `null`.
	const patchOut = Object.fromEntries(
		Object.entries(parsed.data).filter(([, value]) => value !== undefined)
	) as Partial<CurveDisplay>;
	return { ok: true, patch: patchOut };
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
		showArcLength: display.showArcLength,
		showReading: display.showReading
	};
}

// =============================================================================
// Suites (lot 5b)
// =============================================================================

/** Plus d'escalier que ça ne se lit plus. */
const MAX_COBWEB_STEPS = 100;

/** Ce qu'un réglage complet de suite doit valoir — pour la relecture. */
export const sequenceDisplaySchema = z.object({
	color: z.enum(CURVE_COLORS),
	lineStyle: z.enum(LINE_STYLES),
	lineWidth: z.number().refine((w) => (LINE_WIDTHS as readonly number[]).includes(w)),
	representation: z.enum(['ranks', 'cobweb']),
	cobwebSteps: z.number().int().min(1).max(MAX_COBWEB_STEPS)
});

const sequencePatchSchema = sequenceDisplaySchema.partial().strict();

/** Les réglages d'une suite qu'on trace pour la première fois : un nuage. */
export function newSequenceDisplay(
	others: readonly Pick<CurveDisplay, 'color' | 'lineStyle'>[]
): SequenceDisplay {
	const slot = getNextSlot(others);
	return {
		color: slot.color,
		lineStyle: slot.lineStyle,
		lineWidth: DEFAULT_LINE_WIDTH,
		representation: 'ranks',
		cobwebSteps: DEFAULT_COBWEB_STEPS
	};
}

/** Lire une modification venue d'ailleurs (même règle que `readDisplayPatch`). */
export function readSequenceDisplayPatch(
	patch: unknown
): { ok: true; patch: Partial<SequenceDisplay> } | { ok: false; message: string } {
	const parsed = sequencePatchSchema.safeParse(patch);
	if (!parsed.success) return { ok: false, message: 'Ce réglage de la suite n’est pas valable.' };
	const patchOut = Object.fromEntries(
		Object.entries(parsed.data).filter(([, value]) => value !== undefined)
	) as Partial<SequenceDisplay>;
	return { ok: true, patch: patchOut };
}

// =============================================================================
// Points et courbes de la figure (lot 4b de la refonte)
// =============================================================================

/** Le trait d'une courbe de la figure : couleur, style, épaisseur. */
export const strokeDisplaySchema = curveDisplaySchema.pick({
	color: true,
	lineStyle: true,
	lineWidth: true
});

/** Couleur, taille et étiquette d'un point. */
export const pointDisplaySchema = z.object({
	color: z.enum(CURVE_COLORS),
	size: z.enum(POINT_SIZES),
	showLabel: z.boolean()
});

/**
 * Ce qu'un réglage de la figure peut changer. `.strict()` : un réglage qui
 * n'est pas celui de l'objet (`size` pour une courbe) est REFUSÉ, pas ignoré —
 * l'élève saurait sinon que son geste n'a rien fait.
 */
const strokePatchSchema = strokeDisplaySchema.partial().strict();
const pointPatchSchema = pointDisplaySchema.partial().strict();

/** Le trait d'une courbe qu'on règle pour la première fois : sa couleur suit la règle du grapheur. */
export function newStrokeDisplay(
	others: readonly Pick<CurveDisplay, 'color' | 'lineStyle'>[]
): StrokeDisplay {
	const slot = getNextSlot(others);
	return { color: slot.color, lineStyle: 'solid', lineWidth: DEFAULT_LINE_WIDTH };
}

/** Un point qu'on règle pour la première fois : taille moyenne, nom affiché. */
export function newPointDisplay(
	others: readonly Pick<CurveDisplay, 'color' | 'lineStyle'>[]
): PointDisplay {
	return { color: getNextSlot(others).color, size: 'medium', showLabel: true };
}

/**
 * Lire une modification du réglage d'un point ou d'une courbe (même règle que
 * `readDisplayPatch` : `undefined` veut dire « pas de changement »).
 */
export function readFigureDisplayPatch(
	kind: 'point' | 'curve',
	patch: unknown
):
	| { ok: true; patch: Partial<PointDisplay> | Partial<StrokeDisplay> }
	| { ok: false; message: string } {
	const parsed = (kind === 'point' ? pointPatchSchema : strokePatchSchema).safeParse(patch);
	if (!parsed.success) {
		return {
			ok: false,
			message:
				kind === 'point'
					? 'Ce réglage du point n’est pas valable.'
					: 'Ce réglage de la courbe n’est pas valable.'
		};
	}
	const patchOut = Object.fromEntries(
		Object.entries(parsed.data).filter(([, value]) => value !== undefined)
	);
	return { ok: true, patch: patchOut };
}

/** Une copie faite de valeurs ordinaires (clonable), pour ranger le réglage. */
export function plainFigureDisplay(
	display: PointDisplay | StrokeDisplay
): PointDisplay | StrokeDisplay {
	return 'size' in display
		? { color: display.color, size: display.size, showLabel: display.showLabel }
		: { color: display.color, lineStyle: display.lineStyle, lineWidth: display.lineWidth };
}

/** Une copie faite de valeurs ordinaires (clonable). */
export function plainSequenceDisplay(display: SequenceDisplay): SequenceDisplay {
	return {
		color: display.color,
		lineStyle: display.lineStyle,
		lineWidth: display.lineWidth,
		representation: display.representation,
		cobwebSteps: display.cobwebSteps
	};
}
