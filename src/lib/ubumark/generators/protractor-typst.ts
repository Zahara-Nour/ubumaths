/**
 * Rapporteur posé → lignes cetz (énoncé PDF d'une figure à compléter)
 * ===================================================================
 *
 * Le dessin de l'écran (`constructions-v2/instruments/components/Protractor.svelte`,
 * d'après le Rapporteur d'InstrumenPoche, Yves Biton, Sésamath, AGPL-3.0-or-later)
 * redessiné en unités du repère : corps en demi-couronne et barre, graduations
 * extérieures (0 à 180, tous les degrés) et intérieures (180 à 0, de 10 en 10),
 * mire, arc de séparation. Mêmes proportions que l'écran, rapportées au rayon de
 * la pose (`PROTRACTOR_RADIUS` = rayon de référence du dessin).
 *
 * Repère local : `u` porte la graduation 0, `v` (u tourné de +90°) pointe vers le
 * corps. Sens 1 : 0 sur la base, corps du côté trigonométrique ; sens −1 : un
 * demi-tour, comme l'écran (`protractorOnScreen`).
 *
 * Comme l'écran : corps bleu pâle à 50 % d'opacité, dessiné AU-DESSUS des objets
 * de la figure (`overlay`) ; les côtés de l'angle se voient au travers, et aucun
 * ne cache le nombre à lire.
 *
 * @module ubumark/generators/protractor-typst
 */

import { PROTRACTOR_RADIUS } from '$lib/constructions-v2/constants';
import type { Protractor } from '$lib/questions/construction/drawing';

/** Mesures du dessin de l'écran, en unités de référence (pixels / 40) */
const REF = {
	bar: 13 / 40,
	inner: 89 / 40,
	separation: 116 / 40,
	sight: 7 / 40,
	majorTick: 20 / 40,
	halfTick: 10 / 40,
	minorTick: 5 / 40,
	innerTick: 10 / 40,
	outerLabelOffset: 22 / 40,
	innerLabelOffset: 14 / 40,
	separationOffset: 26 / 40,
	outerFont: 10 / 40,
	innerFont: 9 / 40,
	brandFont: 9.3 / 40,
	centerMark: 2 / 40
} as const;

/** Points par demi-cercle (arcs en lignes brisées : cetz 0.3.0 sans arc orienté simple) */
const ARC_STEPS = 90;

const BODY_FILL = 'rgb("#c6cbe8").transparentize(50%)';
const BODY_STROKE = '0.4pt + rgb("#999999")';
const SIGHT_STROKE = '0.4pt + rgb("#666666")';
const TICK_STROKE = '0.25pt + black';

function num(n: number): string {
	const s = (Math.round(n * 1000) / 1000).toString();
	return s === '-0' ? '0' : s;
}

/**
 * Lignes cetz du rapporteur posé, en unités du repère ; `unitCm` : longueur
 * d'une unité sur la page (tailles des nombres, qui sont en cm)
 */
export function protractorTypst(protractor: Protractor, unitCm: number): string[] {
	const { center, base, sens, radius } = protractor;
	const length = Math.hypot(base.x - center.x, base.y - center.y);
	if (!(length > 0) || !(radius > 0)) return [];
	const k = radius / PROTRACTOR_RADIUS;
	const s = sens === 1 ? 1 : -1;
	const u = { x: (s * (base.x - center.x)) / length, y: (s * (base.y - center.y)) / length };
	const v = { x: -u.y, y: u.x };
	const uDeg = (Math.atan2(u.y, u.x) * 180) / Math.PI;

	/** Point du repère local : rayon r (référence), angle θ (degrés) depuis u */
	const polar = (r: number, deg: number): string => {
		const t = (deg * Math.PI) / 180;
		const rr = r * k;
		return `(${num(center.x + rr * (Math.cos(t) * u.x + Math.sin(t) * v.x))}, ${num(
			center.y + rr * (Math.cos(t) * u.y + Math.sin(t) * v.y)
		)})`;
	};
	/** Point du repère local en coordonnées (a le long de u, b le long de v), référence */
	const local = (a: number, b: number): string =>
		`(${num(center.x + k * (a * u.x + b * v.x))}, ${num(center.y + k * (a * u.y + b * v.y))})`;
	const arc = (r: number, from: number, to: number): string[] =>
		Array.from({ length: ARC_STEPS + 1 }, (_, i) => polar(r, from + ((to - from) * i) / ARC_STEPS));
	const fontCm = (ref: number) => `${num(ref * k * unitCm)}cm`;

	const R = PROTRACTOR_RADIUS;
	const out: string[] = ['  // rapporteur posé'];

	// Corps : demi-couronne (évidée au centre) et barre du bas
	const ring = [...arc(R, 0, 180), ...arc(REF.inner, 180, 0)];
	out.push(`  line(${ring.join(', ')}, close: true, fill: ${BODY_FILL}, stroke: ${BODY_STROKE})`);
	out.push(
		`  line(${local(R, 0)}, ${local(-R, 0)}, ${local(-R, -REF.bar)}, ${local(R, -REF.bar)}, close: true, fill: ${BODY_FILL}, stroke: ${BODY_STROKE})`
	);

	// Mire et repère du centre
	out.push(`  line(${arc(REF.sight, 0, 180).join(', ')}, stroke: ${SIGHT_STROKE})`);
	out.push(`  line(${local(0, 0)}, ${local(0, REF.sight)}, stroke: ${SIGHT_STROKE})`);
	out.push(`  circle(${local(0, 0)}, radius: ${num(REF.centerMark * k)}, stroke: ${TICK_STROKE})`);

	// Arc de séparation des deux graduations
	const dep = R - REF.separationOffset - REF.outerFont;
	out.push(
		`  line(${local(dep, 0)}, ${arc(REF.separation, 0, 180).join(', ')}, ${local(-dep, 0)}, stroke: ${SIGHT_STROKE})`
	);

	// Graduations extérieures : tous les degrés, nombres de 10 en 10 (0 sur u)
	for (let i = 0; i <= 180; i++) {
		const tick = i % 10 === 0 ? REF.majorTick : i % 5 === 0 ? REF.halfTick : REF.minorTick;
		out.push(`  line(${polar(R, i)}, ${polar(R - tick, i)}, stroke: ${TICK_STROKE})`);
	}
	const outerRadius = R - REF.outerLabelOffset - REF.outerFont;
	for (let i = 0; i <= 180; i += 10) {
		out.push(
			`  content(${polar(outerRadius, i)}, anchor: "south", angle: ${num(uDeg + i - 90)}deg, text(size: ${fontCm(REF.outerFont)})[${i}]) // rapporteur-ext ${i}`
		);
	}

	// Graduations intérieures : de 10 en 10, nombres 180 à 0
	const innerRadius = REF.inner + REF.innerLabelOffset;
	for (let i = 0; i <= 180; i += 10) {
		out.push(
			`  line(${polar(REF.inner, i)}, ${polar(REF.inner + REF.innerTick, i)}, stroke: ${TICK_STROKE})`
		);
		out.push(
			`  content(${polar(innerRadius, i)}, anchor: "south", angle: ${num(uDeg + i - 90)}deg, text(size: ${fontCm(REF.innerFont)})[${180 - i}]) // rapporteur-int ${180 - i}`
		);
	}

	// Signature du dessin d'origine, dans la barre
	out.push(
		`  content(${local(0, -(REF.bar - 2 / 40))}, anchor: "south", angle: ${num(uDeg)}deg, text(size: ${fontCm(REF.brandFont)}, weight: "bold", fill: maroon)[Sesamath])`
	);
	return out;
}
