/**
 * Bloc ```schema-barres → Typst
 * =============================
 *
 * Rectangles, traits des accolades et textes en Typst natif (`rect`, `line`,
 * `text`), depuis la MÊME scène que l'écran (`buildSchemaBarresScene`) : mêmes
 * positions, même échelle. Ni paquet, ni image.
 *
 * Noir sur blanc : traits noirs, segments sans fond, pointillés pour la partie
 * manquante.
 *
 * Un bloc en erreur devient le cadre neutre « Schéma en barres indisponible » —
 * jamais une erreur de compilation (une seule erreur Typst fait échouer toute
 * la fiche).
 *
 * @module ubumark/generators/schema-barres-typst
 */

import {
	SCHEMA_BARRES_CM_PER_UNIT,
	SCHEMA_BARRES_FONT_SIZE,
	SCHEMA_BARRES_STROKE,
	buildSchemaBarresScene,
	type SchemaBarresText
} from '../utils/schema-barres-scene';
import { SCHEMA_BARRES_UNAVAILABLE, type SchemaBarresNode } from '../types/schema-barres';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${SCHEMA_BARRES_UNAVAILABLE}]`;

const PT_PER_CM = 28.3465;

/** Hauteur de la boîte d'un texte, en corps de texte */
const TEXT_BOX_RATIO = 1.5;

/** Marge de la largeur de boîte sur la largeur estimée d'un texte */
const TEXT_BOX_SLACK = 1.5;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (units: number) => `${Number((units * SCHEMA_BARRES_CM_PER_UNIT).toFixed(4))}cm`;

/** Un texte : boîte alignée (milieu, fin ou début) et centrée verticalement sur `y` */
function textTypst(item: SchemaBarresText): string {
	const height = SCHEMA_BARRES_FONT_SIZE * TEXT_BOX_RATIO;
	// Boîte plus large que l'estimation : la police du PDF peut être plus large, le texte ne doit jamais passer à la ligne
	const width = item.width * TEXT_BOX_SLACK;
	const from =
		item.anchor === 'middle' ? item.x - width / 2 : item.anchor === 'end' ? item.x - width : item.x;
	const align =
		item.anchor === 'middle'
			? 'center + horizon'
			: item.anchor === 'end'
				? 'right + horizon'
				: 'left + horizon';
	const size = `${Number((SCHEMA_BARRES_FONT_SIZE * SCHEMA_BARRES_CM_PER_UNIT * PT_PER_CM).toFixed(2))}pt`;
	return `  #place(top + left, dx: ${cm(from)}, dy: ${cm(item.y - height / 2)}, box(width: ${cm(width)}, height: ${cm(height)}, align(${align}, text(size: ${size}, hyphenate: false, ${typstString(item.text)}))))`;
}

/** Typst d'un bloc ```schema-barres */
export function generateSchemaBarresTypst(node: SchemaBarresNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const scene = buildSchemaBarresScene(spec);
	const thickness = cm(SCHEMA_BARRES_STROKE);
	const solid = `(paint: black, thickness: ${thickness}, join: "round", cap: "round")`;
	const dashed = `(paint: black, thickness: ${thickness}, dash: "dashed")`;

	const rects = scene.rects.map(
		(r) =>
			`  #place(top + left, dx: ${cm(r.x)}, dy: ${cm(r.y)}, rect(width: ${cm(r.width)}, height: ${cm(r.height)}, fill: white, stroke: ${r.dashed ? dashed : solid}))`
	);
	const lines = scene.braces.flatMap((brace) =>
		brace.points.slice(1).map((end, i) => {
			const start = brace.points[i];
			return `  #place(top + left, line(start: (${cm(start.x)}, ${cm(start.y)}), end: (${cm(end.x)}, ${cm(end.y)}), stroke: ${solid}))`;
		})
	);
	const texts = scene.texts.map(textTypst);

	return [
		'#align(center)[#block(breakable: false)[',
		`#box(width: ${cm(scene.width)}, height: ${cm(scene.height)})[`,
		...rects,
		...lines,
		...texts,
		']',
		']]'
	].join('\n');
}
