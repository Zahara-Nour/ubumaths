/**
 * Bloc ```tortue → Typst
 * ======================
 *
 * Une question « programme tortue » ne se fait pas sur papier : la fiche imprime la figure à
 * reproduire (`montrer: oui`), sur le quadrillage, puis le cadre « À faire sur Chiphre ».
 * Sans `montrer:`, le cadre seul (la figure dirait la réponse que l'énoncé cache).
 *
 * Quadrillage recadré sur la figure (un carreau de marge), départ de la tortue marqué d'un
 * point : la figure tient dans la page quelle que soit sa place sur l'écran (20 × 20 carreaux).
 * Lignes Typst natives (`#place(line(…))`), ni paquet ni image.
 *
 * Un bloc en erreur devient le cadre neutre « Programme tortue indisponible » — jamais une
 * erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/tortue-typst
 */

import { TORTUE_UNAVAILABLE, type TortueNode } from '../types/tortue';
import type { Segment } from '$lib/shared/blockly/tortue/segments';

// ============================================================================
// CONSTANTES
// ============================================================================

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

const UNAVAILABLE_TYPST = `#block(${FRAME})[${TORTUE_UNAVAILABLE}]`;

/** Le cadre de la fiche : la question se fait à l'écran */
export const TORTUE_A_FAIRE_SUR_CHIPHRE =
	'À faire sur Chiphre : programme la tortue avec les blocs, à l’écran.';

/** Côté d'un carreau sur la fiche (cm) */
const CARREAU_CM = 0.5;

/** Largeur que la figure ne dépasse pas (cm) */
const LARGEUR_MAX_CM = 14;

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/** Le quadrillage recadré, la figure et le départ de la tortue */
function figureTypst(segments: readonly Segment[]): string {
	const xs = [0, ...segments.flatMap((s) => [s.de.x, s.a.x])];
	const ys = [0, ...segments.flatMap((s) => [s.de.y, s.a.y])];
	const xMin = Math.floor(Math.min(...xs)) - 1;
	const xMax = Math.ceil(Math.max(...xs)) + 1;
	const yMin = Math.floor(Math.min(...ys)) - 1;
	const yMax = Math.ceil(Math.max(...ys)) + 1;
	const k = Math.min(CARREAU_CM, LARGEUR_MAX_CM / (xMax - xMin));
	/** Repère de la tortue (y vers le haut) → coin haut gauche de la boîte */
	const px = (x: number) => cm((x - xMin) * k);
	const py = (y: number) => cm((yMax - y) * k);
	const line = (x1: number, y1: number, x2: number, y2: number, stroke: string) =>
		`  #place(top + left, line(start: (${px(x1)}, ${py(y1)}), end: (${px(x2)}, ${py(y2)}), stroke: ${stroke}))`;

	const grille = '(paint: luma(200), thickness: 0.3pt)';
	const trait = '(paint: black, thickness: 1.2pt, cap: "round")';
	const parts: string[] = [];
	for (let x = xMin; x <= xMax; x++) parts.push(line(x, yMin, x, yMax, grille));
	for (let y = yMin; y <= yMax; y++) parts.push(line(xMin, y, xMax, y, grille));
	for (const s of segments) parts.push(line(s.de.x, s.de.y, s.a.x, s.a.y, trait));
	const r = 0.08;
	parts.push(
		`  #place(top + left, dx: ${cm((0 - xMin) * k - r)}, dy: ${cm((yMax - 0) * k - r)}, circle(radius: ${cm(r)}, fill: black))`
	);

	const width = cm((xMax - xMin) * k);
	const height = cm((yMax - yMin) * k);
	return [`#box(width: ${width}, height: ${height})[`, ...parts, ']'].join('\n');
}

/** Typst d'un bloc ```tortue : la figure à reproduire si le bloc la montre, puis le cadre */
export function generateTortueTypst(node: TortueNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const cadre = `#block(${FRAME})[${TORTUE_A_FAIRE_SUR_CHIPHRE}]`;
	const modele = spec.montrer ? spec.modele : null;
	if (!modele || modele.length === 0) return cadre;
	return ['#align(center)[#block(breakable: false)[', figureTypst(modele), ']]', '', cadre].join(
		'\n'
	);
}
