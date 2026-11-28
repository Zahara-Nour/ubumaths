/**
 * Bloc ```engrenages → Typst
 * ==========================
 *
 * La figure à l'arrêt (phase 0 : pas d'animation dans le PDF), dessinée par le
 * même moteur que l'écran (`gearsScene`) et posée en image vectorielle à la
 * largeur demandée : `#image(bytes("<svg…>"), format: "svg")`, comme ```qr.
 *
 * Un bloc en erreur devient le cadre neutre « Engrenages indisponibles » —
 * jamais une erreur de compilation (une seule erreur Typst fait échouer toute
 * la fiche).
 *
 * @module ubumark/generators/engrenages-typst
 */

import { ENGRENAGES_UNAVAILABLE, type EngrenagesNode } from '../types/engrenages';
import { gearsScene, gearsSvg } from '../utils/engrenages-moteur';
import { typstString } from './qr-typst';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Moitié de la hauteur d'une ligne de légende (10 pt) */
const LABEL_HALF_HEIGHT_CM = 0.2;

/** Largeur minimale de la boîte d'une légende : une petite roue ne la coupe pas */
const LABEL_MIN_WIDTH_CM = 3;

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${ENGRENAGES_UNAVAILABLE}]`;

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/** Typst d'un bloc ```engrenages */
export function generateEngrenagesTypst(node: EngrenagesNode): string {
	if (node.errors.length > 0 || node.wheels === null) return UNAVAILABLE_TYPST;
	const scene = gearsScene(node.wheels, node.sizeCm);
	const scale = node.sizeCm / scene.width;
	const image = `image(bytes(${typstString(gearsSvg(scene))}), format: "svg", width: ${cm(node.sizeCm)})`;
	// Légende centrée sous sa roue : une boîte de la largeur de la roue, posée à sa place
	const labels = scene.wheels.map((w) => {
		const boxWidth = Math.max(2 * w.outerRadius * scale, LABEL_MIN_WIDTH_CM);
		const boxWidthIn = Math.min(boxWidth, node.sizeCm);
		// Boîte gardée dans la largeur de la figure : `#place` ne rogne pas
		const dx = Math.min(
			Math.max(w.labelAt.x * scale - boxWidthIn / 2, 0),
			node.sizeCm - boxWidthIn
		);
		const dy = w.labelAt.y * scale - LABEL_HALF_HEIGHT_CM;
		return `  #place(top + left, dx: ${cm(dx)}, dy: ${cm(dy)}, box(width: ${cm(boxWidthIn)}, align(center, text(size: 10pt, ${typstString(w.label)}))))`;
	});
	return [
		`#align(center)[#block(breakable: false, width: ${cm(node.sizeCm)}, height: ${cm(scene.height * scale)})[`,
		`  #${image}`,
		...labels,
		']]'
	].join('\n');
}
