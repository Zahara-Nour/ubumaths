/**
 * Bloc ```partage → Typst
 * =======================
 *
 * Chaque part est un `polygon` Typst natif, depuis la MÊME scène que l'écran
 * (`buildPartageScene`) : mêmes sommets, même numérotation. Ni paquet, ni image.
 *
 * Plusieurs figures (`unites:`) : des boîtes en ligne, séparées par
 * `UNIT_GAP_CM`, qui passent à la ligne quand la page est trop étroite.
 *
 * Noir sur blanc : les parts coloriées sont GRISÉES (une photocopie reste
 * lisible), les autres restent blanches.
 *
 * Un bloc en erreur devient le cadre neutre « Partage indisponible » — jamais
 * une erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/partage-typst
 */

import {
	PARTAGE_CM_PER_UNIT,
	PARTAGE_MARGIN,
	PARTAGE_STROKE,
	buildPartageScenes
} from '../utils/partage-scene';
import { PARTAGE_UNAVAILABLE, type PartageNode } from '../types/partage';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${PARTAGE_UNAVAILABLE}]`;

/** Gris d'une part coloriée (0 noir, 255 blanc) */
const SHADE_LUMA = 175;

/** Écart entre deux figures d'un même bloc, en cm */
const UNIT_GAP_CM = 0.6;

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (units: number) => `${Number((units * PARTAGE_CM_PER_UNIT).toFixed(4))}cm`;

/**
 * Typst d'un bloc ```partage. Figure à colorier (`colorier:`) : vide, l'enfant
 * colorie au crayon ; `solved` (corrigé) : les premières parts coloriées.
 */
export function generatePartageTypst(
	node: PartageNode,
	options: { solved?: boolean } = {}
): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	// Corrigé : les premières parts coloriées, les unités pleines d'abord
	const scenes = buildPartageScenes(
		options.solved && spec.colorier
			? { ...spec, gray: Array.from({ length: spec.colorier.parts }, (_, i) => i + 1) }
			: spec
	);
	const stroke = `(paint: black, thickness: ${cm(PARTAGE_STROKE)}, join: "round")`;
	const boxes = scenes.map((scene) => {
		const polygons = scene.parts.map((part) => {
			const points = part.points
				.map((p) => `(${cm(p.x + PARTAGE_MARGIN)}, ${cm(p.y + PARTAGE_MARGIN)})`)
				.join(', ');
			const fill = part.shaded ? `luma(${SHADE_LUMA})` : 'white';
			return `  #place(top + left, polygon(fill: ${fill}, stroke: ${stroke}, ${points}))`;
		});
		const width = cm(scene.width + 2 * PARTAGE_MARGIN);
		const height = cm(scene.height + 2 * PARTAGE_MARGIN);
		return [`#box(width: ${width}, height: ${height})[`, ...polygons, ']'].join('\n');
	});

	return [
		'#align(center)[#block(breakable: false)[',
		boxes.join(`#h(${UNIT_GAP_CM}cm)\n`),
		']]'
	].join('\n');
}
