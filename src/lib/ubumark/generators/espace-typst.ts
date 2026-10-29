/**
 * Bloc ```cubes → Typst
 * =====================
 *
 * Chaque face (ou carré de vue) est un `polygon` Typst natif, depuis la MÊME
 * scène que l'écran (`buildEspaceScene`) : mêmes sommets, même ordre de
 * dessin. Ni paquet, ni image. L'arête d'un cube mesure 1 cm.
 *
 * Noir sur blanc : trois gris imprimables (dessus le plus clair, côté le plus
 * foncé), contours noirs.
 *
 * Un bloc en erreur devient le cadre neutre « Solide indisponible » — jamais
 * une erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/espace-typst
 */

import {
	ESPACE_CM_PER_UNIT,
	ESPACE_MARGIN,
	ESPACE_STROKE,
	buildEspaceScene,
	type EspaceFaceKind
} from '../utils/espace-scene';
import { ESPACE_UNAVAILABLE, type EspaceNode } from '../types/espace';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${ESPACE_UNAVAILABLE}]`;

/** Gris de chaque genre de face (0 noir, 255 blanc) : dessus clair, côté foncé */
export const ESPACE_LUMA: Record<EspaceFaceKind, number> = {
	dessus: 245,
	devant: 215,
	cote: 170,
	case: 255
};

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (units: number) => `${Number((units * ESPACE_CM_PER_UNIT).toFixed(4))}cm`;

/** Typst d'un bloc d'espace */
export function generateEspaceTypst(node: EspaceNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const scene = buildEspaceScene(spec);
	const stroke = `(paint: black, thickness: ${cm(ESPACE_STROKE)}, join: "round")`;
	const polygons = scene.polygons.map((polygon) => {
		const points = polygon.points
			.map((p) => `(${cm(p.x + ESPACE_MARGIN)}, ${cm(p.y + ESPACE_MARGIN)})`)
			.join(', ');
		return `  #place(top + left, polygon(fill: luma(${ESPACE_LUMA[polygon.kind]}), stroke: ${stroke}, ${points}))`;
	});
	const width = cm(scene.width + 2 * ESPACE_MARGIN);
	const height = cm(scene.height + 2 * ESPACE_MARGIN);
	return [
		'#align(center)[#block(breakable: false)[',
		`#box(width: ${width}, height: ${height})[`,
		...polygons,
		']',
		']]'
	].join('\n');
}
