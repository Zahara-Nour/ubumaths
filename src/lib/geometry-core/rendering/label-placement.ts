/**
 * Placement des noms de points (`etiquette=`) et des textes (`ancre=`)
 * ===================================================================
 *
 * Une seule table pour l'écran (SVG) et le PDF (Typst / cetz) : une direction
 * `(ux, uy)` (x vers la droite, y vers le HAUT, composantes −1, 0 ou 1) dit de
 * quel côté du point de référence le texte s'écrit.
 *
 * - Nom de point : direction = `labelPosition` (défaut en haut à droite),
 *   texte décalé d'un petit écart pour ne pas toucher le point.
 * - Texte ancré : `ancre="bas-gauche"` pose le coin bas-gauche du texte sur la
 *   position, le texte s'écrit donc vers le haut et la droite : direction =
 *   opposée de l'ancre, sans écart. `centre` (défaut) = direction (0, 0).
 *
 * Boîte d'un texte : de la ligne de base à la hauteur des capitales — c'est la
 * boîte de Typst par défaut (`top-edge: "cap-height"`, `bottom-edge:
 * "baseline"`), reproduite à l'écran avec une ligne de base alphabétique.
 *
 * @module geometry-core/rendering/label-placement
 */

import type { LabelPosition, TextAnchor } from '../types/elements';

// ============================================================================
// TYPES
// ============================================================================

export type Unit = -1 | 0 | 1;

export interface Direction {
	ux: Unit;
	uy: Unit;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DIRECTIONS: Record<LabelPosition, Direction> = {
	top: { ux: 0, uy: 1 },
	bottom: { ux: 0, uy: -1 },
	left: { ux: -1, uy: 0 },
	right: { ux: 1, uy: 0 },
	'top-left': { ux: -1, uy: 1 },
	'top-right': { ux: 1, uy: 1 },
	'bottom-left': { ux: -1, uy: -1 },
	'bottom-right': { ux: 1, uy: -1 }
};

/** Position du nom d'un point quand l'auteur n'en donne pas */
export const DEFAULT_LABEL_POSITION: LabelPosition = 'top-right';

/** Hauteur des capitales, en fraction de la taille de police (police sans empattement courante) */
export const CAP_HEIGHT_EM = 0.7;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Direction d'écriture du nom d'un point */
export function labelDirection(position: LabelPosition | undefined): Direction {
	return DIRECTIONS[position ?? DEFAULT_LABEL_POSITION];
}

/** Direction d'écriture d'un texte ancré : opposée de son ancre */
export function textAnchorDirection(anchor: TextAnchor | undefined): Direction {
	if (!anchor || anchor === 'center') return { ux: 0, uy: 0 };
	const d = DIRECTIONS[anchor];
	return { ux: -d.ux as Unit, uy: -d.uy as Unit };
}

/**
 * Écart (dans l'unité de l'appelant) entre le point et la boîte de son nom :
 * `gap` à l'horizontale et à la verticale, `diagonalGapY` à la verticale en
 * diagonale (le coin d'une lettre est plus loin du point que son côté).
 */
export function labelOffset(
	dir: Direction,
	gap: number,
	diagonalGapY: number
): { dx: number; dy: number } {
	return { dx: dir.ux * gap, dy: dir.uy * (dir.ux !== 0 ? diagonalGapY : gap) };
}

/**
 * Ancre cetz (`content(…, anchor: …)`) : côté de la boîte du texte posé sur la
 * position, opposé à la direction d'écriture. `null` = centre (défaut de cetz).
 */
export function cetzAnchor(dir: Direction): string | null {
	const v = dir.uy > 0 ? 'south' : dir.uy < 0 ? 'north' : '';
	const h = dir.ux > 0 ? 'west' : dir.ux < 0 ? 'east' : '';
	if (v && h) return `${v}-${h}`;
	return v || h || null;
}

/**
 * Placement SVG d'un texte écrit dans la direction `dir` depuis `(x, y)`
 * (coordonnées SVG, y vers le BAS), avec une ligne de base alphabétique.
 */
export function svgTextPlacement(
	x: number,
	y: number,
	dir: Direction,
	fontSizePx: number
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
	const cap = CAP_HEIGHT_EM * fontSizePx;
	const anchor = dir.ux > 0 ? 'start' : dir.ux < 0 ? 'end' : 'middle';
	const baseline = dir.uy > 0 ? y : dir.uy < 0 ? y + cap : y + cap / 2;
	return { x, y: baseline, anchor };
}
