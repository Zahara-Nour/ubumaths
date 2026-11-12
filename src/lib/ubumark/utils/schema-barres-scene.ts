/**
 * Bloc ```schema-barres — la scène
 * ================================
 *
 * Calcul pur du schéma (rectangles, accolades, textes), partagé par l'écran
 * (`SchemaBarres.svelte`) et le PDF (`schema-barres-typst.ts`) : les deux ne
 * peuvent pas diverger.
 *
 * Repère : origine au coin haut gauche, y vers le BAS (comme en SVG). Une unité
 * vaut `SCHEMA_BARRES_CM_PER_UNIT` cm au PDF ; à l'écran, le dessin est réduit à
 * la largeur de la colonne.
 *
 * - Échelle commune : la plus longue barre (parties manquantes comprises) occupe
 *   toute la largeur de dessin `SCHEMA_BARRES_DRAW_WIDTH` ; une unité de longueur
 *   a la même largeur sur toutes les barres.
 * - Les barres sont alignées à gauche, l'une sous l'autre ; les noms forment une
 *   colonne alignée à droite, à leur gauche.
 * - Accolade horizontale : sous sa barre, du début à la fin du dernier segment
 *   PLEIN. Accolade verticale (`total`) : à droite, de la première à la dernière
 *   barre (hors accolades horizontales).
 * - La largeur d'un texte est ESTIMÉE (`SCHEMA_BARRES_CHAR_WIDTH` par caractère) :
 *   l'écran et le PDF n'ont pas la même police.
 *
 * @module ubumark/utils/schema-barres-scene
 */

import type { SchemaBarresSpec } from '../types/schema-barres';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Taille réelle d'une unité de la scène au PDF, en cm (la zone des barres fait 7,9 cm) */
export const SCHEMA_BARRES_CM_PER_UNIT = 0.022;

/** Largeur de dessin de la plus longue barre, en unités */
export const SCHEMA_BARRES_DRAW_WIDTH = 360;

/** Épaisseur des traits, en unités */
export const SCHEMA_BARRES_STROKE = 1.6;

/** Corps du texte, en unités */
export const SCHEMA_BARRES_FONT_SIZE = 16;

/** Largeur estimée d'un caractère, en unités */
export const SCHEMA_BARRES_CHAR_WIDTH = 9;

/** Marge autour du dessin (le trait ne doit pas être rogné), en unités */
export const SCHEMA_BARRES_MARGIN = 4;

/** Longueur des tirets d'une partie manquante, et leur écart, en unités */
export const SCHEMA_BARRES_DASH = [5, 4] as const;

const BAR_HEIGHT = 36;
const BAR_GAP = 16;
const NAME_GAP = 12;
/** Accolade horizontale : écart sous la barre, hauteur, écart avant son texte, hauteur du texte */
const BRACE_OFFSET = 4;
const BRACE_HEIGHT = 10;
const BRACE_TEXT_GAP = 4;
const BRACE_TEXT_HEIGHT = 20;
/** Accolade verticale : écart à droite des barres, épaisseur, écart avant son texte */
const TOTAL_OFFSET = 8;
const TOTAL_BRACE_WIDTH = 10;
const TOTAL_TEXT_GAP = 6;

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaBarresPoint {
	x: number;
	y: number;
}

/** Un segment de barre */
export interface SchemaBarresRect {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Partie manquante : pointillés, sans fond */
	dashed: boolean;
}

/** Une accolade : une ligne brisée ouverte (sommets dans l'ordre) */
export interface SchemaBarresBrace {
	orientation: 'horizontal' | 'vertical';
	points: SchemaBarresPoint[];
}

/**
 * Un texte, centré verticalement sur `y`. `x` : le milieu (`middle`), la fin
 * (`end`, colonne des noms alignée à droite) ou le début (`start`).
 */
export interface SchemaBarresText {
	kind: 'label' | 'name' | 'brace' | 'total';
	text: string;
	x: number;
	y: number;
	anchor: 'start' | 'middle' | 'end';
	/** Largeur estimée de la boîte du texte (pour l'alignement au PDF) */
	width: number;
}

export interface SchemaBarresScene {
	width: number;
	height: number;
	rects: SchemaBarresRect[];
	braces: SchemaBarresBrace[];
	texts: SchemaBarresText[];
}

// ============================================================================
// FONCTIONS
// ============================================================================

const textWidth = (text: string) => text.length * SCHEMA_BARRES_CHAR_WIDTH;

/** Somme des longueurs d'une barre, parties manquantes comprises */
function barLength(segments: { length: number }[]): number {
	return segments.reduce((sum, s) => sum + s.length, 0);
}

/** Accolade horizontale sous une barre : `x1` → `x2`, sommet en haut (en `y`) */
function horizontalBrace(x1: number, x2: number, y: number): SchemaBarresBrace {
	const run = Math.min(BRACE_HEIGHT * 0.6, (x2 - x1) / 4);
	const mid = (x1 + x2) / 2;
	const bottom = y + BRACE_HEIGHT * 0.6;
	return {
		orientation: 'horizontal',
		points: [
			{ x: x1, y },
			{ x: x1 + run, y: bottom },
			{ x: mid - run, y: bottom },
			{ x: mid, y: y + BRACE_HEIGHT },
			{ x: mid + run, y: bottom },
			{ x: x2 - run, y: bottom },
			{ x: x2, y }
		]
	};
}

/** Accolade verticale à droite : de `y1` à `y2`, côté des barres en `x` */
function verticalBrace(x: number, y1: number, y2: number): SchemaBarresBrace {
	const run = Math.min(TOTAL_BRACE_WIDTH * 0.6, (y2 - y1) / 4);
	const mid = (y1 + y2) / 2;
	const side = x + TOTAL_BRACE_WIDTH * 0.6;
	return {
		orientation: 'vertical',
		points: [
			{ x, y: y1 },
			{ x: side, y: y1 + run },
			{ x: side, y: mid - run },
			{ x: x + TOTAL_BRACE_WIDTH, y: mid },
			{ x: side, y: mid + run },
			{ x: side, y: y2 - run },
			{ x, y: y2 }
		]
	};
}

/** La scène d'un schéma (spec valide) */
export function buildSchemaBarresScene(spec: SchemaBarresSpec): SchemaBarresScene {
	const { bars } = spec;
	const nameChars = Math.max(...bars.map((b) => b.name.length));
	const nameWidth = nameChars > 0 ? nameChars * SCHEMA_BARRES_CHAR_WIDTH + NAME_GAP : 0;
	const unit = SCHEMA_BARRES_DRAW_WIDTH / Math.max(...bars.map((b) => barLength(b.segments)));
	const left = SCHEMA_BARRES_MARGIN + nameWidth;
	const right = left + SCHEMA_BARRES_DRAW_WIDTH;

	const rects: SchemaBarresRect[] = [];
	const braces: SchemaBarresBrace[] = [];
	const texts: SchemaBarresText[] = [];
	// Textes sous une accolade horizontale : recentrés dans la scène une fois sa largeur connue
	const braceTexts: SchemaBarresText[] = [];

	let top = SCHEMA_BARRES_MARGIN;
	const firstTop = top;
	let lastBottom = top;
	bars.forEach((bar) => {
		const centerY = top + BAR_HEIGHT / 2;
		if (bar.name !== '') {
			texts.push({
				kind: 'name',
				text: bar.name,
				x: left - NAME_GAP,
				y: centerY,
				anchor: 'end',
				width: textWidth(bar.name)
			});
		}
		let x = left;
		let plainEnd = left;
		for (const segment of bar.segments) {
			const width = segment.length * unit;
			rects.push({ x, y: top, width, height: BAR_HEIGHT, dashed: segment.missing });
			if (segment.label !== '') {
				texts.push({
					kind: 'label',
					text: segment.label,
					x: x + width / 2,
					y: centerY,
					anchor: 'middle',
					width: Math.max(width, textWidth(segment.label))
				});
			}
			x += width;
			if (!segment.missing) plainEnd = x;
		}
		lastBottom = top + BAR_HEIGHT;
		let rowBottom = lastBottom;
		if (bar.brace !== undefined) {
			const braceTop = lastBottom + BRACE_OFFSET;
			braces.push(horizontalBrace(left, plainEnd, braceTop));
			const textY = braceTop + BRACE_HEIGHT + BRACE_TEXT_GAP + BRACE_TEXT_HEIGHT / 2;
			braceTexts.push({
				kind: 'brace',
				text: bar.brace,
				x: (left + plainEnd) / 2,
				y: textY,
				anchor: 'middle',
				width: textWidth(bar.brace)
			});
			rowBottom = braceTop + BRACE_HEIGHT + BRACE_TEXT_GAP + BRACE_TEXT_HEIGHT;
		}
		top = rowBottom + BAR_GAP;
	});

	let width = right + SCHEMA_BARRES_MARGIN;
	if (spec.total !== undefined) {
		const braceX = right + TOTAL_OFFSET;
		braces.push(verticalBrace(braceX, firstTop, lastBottom));
		const textX = braceX + TOTAL_BRACE_WIDTH + TOTAL_TEXT_GAP;
		texts.push({
			kind: 'total',
			text: spec.total,
			x: textX,
			y: (firstTop + lastBottom) / 2,
			anchor: 'start',
			width: textWidth(spec.total)
		});
		width = textX + textWidth(spec.total) + SCHEMA_BARRES_MARGIN;
	}

	// Le texte sous une accolade ne sort pas de la scène (accolade courte, texte long)
	for (const item of braceTexts) {
		const half = item.width / 2;
		const min = SCHEMA_BARRES_MARGIN + half;
		const max = width - SCHEMA_BARRES_MARGIN - half;
		texts.push({ ...item, x: min > max ? width / 2 : Math.min(Math.max(item.x, min), max) });
	}

	// `top` est déjà décalé de l'écart qui suit la dernière barre
	const height = top - BAR_GAP + SCHEMA_BARRES_MARGIN;
	return { width, height, rects, braces, texts };
}

/**
 * Nom accessible : « Schéma en barres » suivi des noms des barres (« Schéma en
 * barres : Or, Argent, Bronze »), jamais les étiquettes (ce serait la réponse).
 */
export function schemaBarresLabel(spec: SchemaBarresSpec): string {
	const names = spec.bars.map((b) => b.name).filter((name) => name !== '');
	return names.length === 0 ? 'Schéma en barres' : `Schéma en barres : ${names.join(', ')}`;
}
