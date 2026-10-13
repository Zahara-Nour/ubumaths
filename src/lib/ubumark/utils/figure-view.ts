/**
 * Fenêtre d'une figure ↔ vue de la toile interactive
 * ===================================================
 *
 * Une figure interactive (figure stockée, ADR 0027 ; plus tard un bloc
 * ```figure interactif) s'affiche dans `GeometryCanvas`, qui raisonne en centre
 * + pixels par unité + taille en px. Ce module convertit la fenêtre de l'en-tête
 * (`fenetre: xmin ; xmax ; ymin ; ymax`) en vue de toile, et la vue courante
 * (après zoom ou déplacement) en fenêtre.
 *
 * Mêmes mesures que le rendu statique (`figureToSvg`, `FigureBlockView`) :
 * largeur de la fenêtre selon la taille, hauteur déduite (repère ISOTROPE),
 * marge de `FIGURE_AXES_MARGIN_PX` tout autour quand les axes sont affichés.
 *
 * Pur et léger : aucun import de geometry-core.
 *
 * @module ubumark/utils/figure-view
 */

import {
	FIGURE_AXES_MARGIN_PX,
	FIGURE_PIXEL_WIDTH,
	type FigureSize,
	type FigureWindow
} from '../types/figure';

// ============================================================================
// TYPES
// ============================================================================

export interface FigureCanvasView {
	center: { x: number; y: number };
	pixelsPerUnit: number;
	/** Taille de la toile en px, marge comprise */
	width: number;
	height: number;
	/** Marge autour de la fenêtre, en px (axes affichés), 0 sinon */
	margin: number;
}

export interface FigureViewOptions {
	/** Axes affichés : marge pour les flèches et graduations */
	axes: boolean;
	/** Largeur disponible en px (conteneur, écran de téléphone) ; absente = largeur de la taille */
	maxWidth?: number;
}

/** Vue courante de la toile, en coordonnées mathématiques (marge comprise) */
export interface CanvasViewport {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Échelle de la toile sans fenêtre (vue historique des figures stockées) */
export const FIGURE_DEFAULT_PIXELS_PER_UNIT = 40;

/** Largeur minimale de la fenêtre en px, même sur un écran très étroit */
const MIN_INNER_WIDTH_PX = 120;

/** Chiffres significatifs gardés sur l'étendue quand la vue devient une fenêtre */
const WINDOW_SIGNIFICANT_DIGITS = 3;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Largeur de la fenêtre en px : celle de la taille, réduite au conteneur s'il est plus étroit. */
function innerWidth(size: FigureSize, margin: number, maxWidth: number | undefined): number {
	const natural = FIGURE_PIXEL_WIDTH[size];
	if (maxWidth === undefined || !Number.isFinite(maxWidth) || maxWidth <= 0) return natural;
	return Math.max(MIN_INNER_WIDTH_PX, Math.min(natural, Math.floor(maxWidth - 2 * margin)));
}

/**
 * Vue de toile qui montre exactement `window` (null : vue par défaut, origine
 * au centre, 40 px par unité à la largeur de la taille, toile carrée).
 */
export function figureViewFromWindow(
	window: FigureWindow | null,
	size: FigureSize,
	options: FigureViewOptions
): FigureCanvasView {
	const margin = options.axes ? FIGURE_AXES_MARGIN_PX : 0;
	const inner = innerWidth(size, margin, options.maxWidth);
	if (window === null) {
		return {
			center: { x: 0, y: 0 },
			pixelsPerUnit: (FIGURE_DEFAULT_PIXELS_PER_UNIT * inner) / FIGURE_PIXEL_WIDTH[size],
			width: inner + 2 * margin,
			height: inner + 2 * margin,
			margin
		};
	}
	const spanX = window.xMax - window.xMin;
	const spanY = window.yMax - window.yMin;
	// Hauteur arrondie comme `figureToSvg` : même cadre que le rendu statique
	const innerHeight = Math.round((inner * spanY) / spanX);
	return {
		center: { x: (window.xMin + window.xMax) / 2, y: (window.yMin + window.yMax) / 2 },
		pixelsPerUnit: inner / spanX,
		width: inner + 2 * margin,
		height: innerHeight + 2 * margin,
		margin
	};
}

/** Arrondir à `decimals` décimales, sans `-0` */
function roundTo(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	const rounded = Math.round(value * factor) / factor;
	return rounded === 0 ? 0 : rounded;
}

/**
 * Fenêtre que montre la vue courante (la marge des axes retirée), arrondie à
 * 3 chiffres significatifs de l'étendue en x : une vue de 12 unités donne des
 * dixièmes, une vue de 1,2 unité des centièmes.
 */
export function windowFromCanvasView(
	viewport: CanvasViewport,
	pixelsPerUnit: number,
	margin: number
): FigureWindow {
	const inset = margin / pixelsPerUnit;
	const xMin = viewport.xMin + inset;
	const xMax = viewport.xMax - inset;
	const yMin = viewport.yMin + inset;
	const yMax = viewport.yMax - inset;
	const span = xMax - xMin;
	const decimals = Math.max(
		0,
		Math.min(8, WINDOW_SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(span)))
	);
	return {
		xMin: roundTo(xMin, decimals),
		xMax: roundTo(xMax, decimals),
		yMin: roundTo(yMin, decimals),
		yMax: roundTo(yMax, decimals)
	};
}

/** `xmin ; xmax ; ymin ; ymax`, la valeur de la clé `fenetre:` */
export function formatFigureWindow(w: FigureWindow): string {
	return [w.xMin, w.xMax, w.yMin, w.yMax].map((v) => String(v)).join(' ; ');
}
