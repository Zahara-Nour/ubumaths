/**
 * Bloc ```partage — la scène
 * ==========================
 *
 * Calcul pur de la figure (un polygone par part), partagé par l'écran
 * (`Partage.svelte`) et le PDF (`partage-typst.ts`) : les deux ne peuvent pas
 * diverger.
 *
 * Repère : origine au coin haut gauche, y vers le BAS (comme en SVG). Une
 * unité vaut `PARTAGE_CM_PER_UNIT` cm, à l'écran comme au PDF.
 *
 * Numérotation des parts (à partir de 1) :
 * - bande : de gauche à droite ;
 * - grille : ligne par ligne, depuis le coin haut gauche ;
 * - disque : depuis midi, dans le sens des aiguilles d'une montre ;
 * - carré coupé par ses diagonales : haut, droite, bas, gauche.
 *
 * Un secteur de disque est un polygone dont l'arc est découpé en pas de
 * `ARC_STEP_DEGREES` : Typst et SVG dessinent exactement la même chose.
 *
 * @module ubumark/utils/partage-scene
 */

import type { PartageShape, PartageSpec } from '../types/partage';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Taille réelle d'une unité de la scène, en cm (la grille 10 × 10 fait 6,5 cm) */
export const PARTAGE_CM_PER_UNIT = 0.025;

/** Épaisseur des traits, en unités */
export const PARTAGE_STROKE = 2;

/** Marge autour de la figure pour que le trait ne soit pas rogné, en unités */
export const PARTAGE_MARGIN = PARTAGE_STROKE;

/** Dimensions des figures, en unités */
const SIZE = {
	bandWidth: 260,
	bandHeight: 60,
	gridCell: 26,
	discDiameter: 200,
	squareSide: 180
} as const;

/** Pas d'angle pour dessiner l'arc d'un secteur, en degrés */
const ARC_STEP_DEGREES = 3;

// ============================================================================
// TYPES
// ============================================================================

export interface PartagePoint {
	x: number;
	y: number;
}

export interface PartagePart {
	/** Rang de la part, à partir de 1 */
	rank: number;
	/** Part coloriée (`gris:`) */
	shaded: boolean;
	/** Sommets du polygone, dans l'ordre */
	points: PartagePoint[];
}

export interface PartageScene {
	/** Dimensions de la figure, sans la marge */
	width: number;
	height: number;
	parts: PartagePart[];
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Arrondi à 3 décimales : pas de `1e-14` dans le dessin */
const clean = (v: number) => Math.round(v * 1000) / 1000;

const point = (x: number, y: number): PartagePoint => ({ x: clean(x), y: clean(y) });

function rectangle(x0: number, y0: number, x1: number, y1: number): PartagePoint[] {
	return [point(x0, y0), point(x1, y0), point(x1, y1), point(x0, y1)];
}

/** Secteur de `from` à `to` degrés (depuis midi, sens horaire), sommet au centre */
function sector(cx: number, cy: number, radius: number, from: number, to: number): PartagePoint[] {
	const at = (angle: number) => {
		const rad = (angle * Math.PI) / 180;
		return point(cx + radius * Math.sin(rad), cy - radius * Math.cos(rad));
	};
	const steps = Math.ceil((to - from) / ARC_STEP_DEGREES);
	const points = [point(cx, cy)];
	for (let i = 0; i <= steps; i++) points.push(at(from + ((to - from) * i) / steps));
	return points;
}

/** Dimensions et polygones (sans coloriage) d'une forme */
function geometry(shape: PartageShape): {
	width: number;
	height: number;
	polygons: PartagePoint[][];
} {
	switch (shape.kind) {
		case 'bande': {
			const w = SIZE.bandWidth / shape.parts;
			return {
				width: SIZE.bandWidth,
				height: SIZE.bandHeight,
				polygons: Array.from({ length: shape.parts }, (_, i) =>
					rectangle(i * w, 0, (i + 1) * w, SIZE.bandHeight)
				)
			};
		}
		case 'grille': {
			const c = SIZE.gridCell;
			return {
				width: c * shape.cols,
				height: c * shape.rows,
				polygons: Array.from({ length: shape.rows * shape.cols }, (_, i) => {
					const row = Math.floor(i / shape.cols);
					const col = i % shape.cols;
					return rectangle(col * c, row * c, (col + 1) * c, (row + 1) * c);
				})
			};
		}
		case 'disque': {
			const r = SIZE.discDiameter / 2;
			const angle = 360 / shape.parts;
			return {
				width: SIZE.discDiameter,
				height: SIZE.discDiameter,
				polygons: Array.from({ length: shape.parts }, (_, i) =>
					sector(r, r, r, i * angle, (i + 1) * angle)
				)
			};
		}
		case 'carre-diagonales': {
			const s = SIZE.squareSide;
			const m = s / 2;
			return {
				width: s,
				height: s,
				polygons: [
					[point(0, 0), point(s, 0), point(m, m)],
					[point(s, 0), point(s, s), point(m, m)],
					[point(s, s), point(0, s), point(m, m)],
					[point(0, s), point(0, 0), point(m, m)]
				]
			};
		}
	}
}

/** La scène d'un bloc `partage` */
export function buildPartageScene(spec: PartageSpec): PartageScene {
	const { width, height, polygons } = geometry(spec.shape);
	const shaded = new Set(spec.gray);
	return {
		width,
		height,
		parts: polygons.map((points, i) => ({ rank: i + 1, shaded: shaded.has(i + 1), points }))
	};
}

/**
 * Nom accessible de la figure : la forme seule, jamais le nombre de parts ni de
 * parts coloriées (ce serait la réponse de « quelle fraction est coloriée ? »),
 * comme l'horloge (décision de David, 2026-10-29).
 */
export function partageLabel(spec: PartageSpec): string {
	switch (spec.shape.kind) {
		case 'bande':
			return 'Bande partagée en parts égales';
		case 'grille':
			return 'Grille partagée en parts égales';
		case 'disque':
			return 'Disque partagé en parts égales';
		case 'carre-diagonales':
			return 'Carré partagé en parts égales par ses diagonales';
	}
}
