/**
 * Bloc ```engrenages — scène et mouvement (calcul pur, partagé écran / PDF)
 * ========================================================================
 *
 * - **Même module pour toutes les roues** (sinon elles ne s'engrèneraient
 *   pas) : rayon primitif = dents / 2, une dent = π sur le cercle primitif.
 * - Roues en ligne, de gauche à droite, tangentes sur leur cercle primitif.
 * - **Phases** : la roue A a une dent pointée vers B (angle 0) ; chaque roue
 *   suivante est tournée pour qu'un creux tombe en face de la dent de sa
 *   voisine, quelle que soit la parité des dents.
 * - **Repères** : A vers B, les autres vers leur voisine de gauche.
 * - **Mouvement** : A tourne d'un angle θ (sens des aiguilles d'une montre à
 *   l'écran, y vers le bas) ; la roue i tourne de ± θ × dents(A) / dents(i),
 *   en sens contraire de ses voisines.
 * - **Retour** : tous les repères sont revenus à leur place quand le nombre de
 *   dents passées est le plus petit multiple commun des dents ; la roue i a
 *   alors fait ce nombre / dents(i) tours.
 *
 * Angles en radians dans le repère de l'écran (y vers le bas).
 *
 * @module ubumark/utils/engrenages-moteur
 */

import { ENGRENAGES_SIZE_CM, type EngrenagesWheel } from '../types/engrenages';

// ============================================================================
// TYPES
// ============================================================================

export interface GearsReturn {
	/** Dents passées au point de contact au premier retour de tous les repères */
	teethPassed: number;
	/** Tours de chaque roue à ce moment */
	turns: number[];
}

export interface GearShape {
	teeth: number;
	label: string;
	cx: number;
	cy: number;
	pitchRadius: number;
	outerRadius: number;
	rootRadius: number;
	hubRadius: number;
	/** Angle de la dent n° 0 */
	phase: number;
	/** Contour de la roue (coordonnées de la scène), à l'arrêt */
	path: string;
	/** Repère, à l'arrêt */
	mark: { x: number; y: number; r: number };
	/** Légende, sous la roue */
	labelAt: { x: number; y: number };
}

export interface GearsScene {
	width: number;
	height: number;
	/** Taille du texte des légendes, dans les unités de la scène */
	fontSize: number;
	wheels: GearShape[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Saillie et creux d'une dent (module 1) */
const ADDENDUM = 1;
const DEDENDUM = 1.25;

/** Marge autour des roues */
const PADDING = 1.5;

/** Légendes : 0,4 cm à l'impression comme à l'écran */
const LABEL_CM = 0.4;

// ============================================================================
// ARITHMÉTIQUE
// ============================================================================

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Premier retour de tous les repères à leur place */
export function gearsReturn(wheels: readonly Pick<EngrenagesWheel, 'teeth'>[]): GearsReturn {
	const teethPassed = wheels.reduce((acc, w) => lcm(acc, w.teeth), 1);
	return { teethPassed, turns: wheels.map((w) => teethPassed / w.teeth) };
}

/** Rotation de la roue `index` quand A a tourné de `angleOfA` (radians, signée) */
export function wheelRotation(
	wheels: readonly Pick<EngrenagesWheel, 'teeth'>[],
	index: number,
	angleOfA: number
): number {
	const sign = index % 2 === 0 ? 1 : -1;
	return (sign * angleOfA * wheels[0].teeth) / wheels[index].teeth;
}

// ============================================================================
// SCÈNE
// ============================================================================

/** Angles des centres des dents d'une roue, à l'arrêt */
export function toothCenterAngles(wheel: Pick<GearShape, 'teeth' | 'phase'>): number[] {
	return Array.from(
		{ length: wheel.teeth },
		(_, k) => wheel.phase + (2 * Math.PI * k) / wheel.teeth
	);
}

const round = (value: number) => Number(value.toFixed(3));

/** Contour d'une roue : 4 sommets par dent (pied, tête, tête, pied) */
function gearPath(wheel: Omit<GearShape, 'path' | 'mark' | 'labelAt'>): string {
	const halfTooth = Math.PI / (2 * wheel.teeth);
	const point = (radius: number, angle: number) =>
		`${round(wheel.cx + radius * Math.cos(angle))} ${round(wheel.cy + radius * Math.sin(angle))}`;
	const vertices = toothCenterAngles(wheel).flatMap((angle) => [
		point(wheel.rootRadius, angle - 1.25 * halfTooth),
		point(wheel.outerRadius, angle - 0.45 * halfTooth),
		point(wheel.outerRadius, angle + 0.45 * halfTooth),
		point(wheel.rootRadius, angle + 1.25 * halfTooth)
	]);
	return `M${vertices.join(' L')} Z`;
}

/**
 * Scène des roues, en unités du module (une dent = π sur le cercle primitif).
 * `sizeCm` (largeur imprimée) fixe seulement la taille des légendes.
 */
export function gearsScene(
	wheels: readonly EngrenagesWheel[],
	sizeCm: number = ENGRENAGES_SIZE_CM.default
): GearsScene {
	const maxOuter = Math.max(...wheels.map((w) => w.teeth / 2 + ADDENDUM));
	const cy = PADDING + maxOuter;

	// Centres et phases, de gauche à droite
	const placed: { teeth: number; label: string; cx: number; phase: number }[] = [];
	for (const [i, w] of wheels.entries()) {
		const r = w.teeth / 2;
		if (i === 0) {
			placed.push({ teeth: w.teeth, label: w.label, cx: PADDING + r + ADDENDUM, phase: 0 });
			continue;
		}
		const left = placed[i - 1];
		// Contact à l'angle 0 de la gauche, à l'angle π de celle-ci : une demi-dent de décalage
		const phase = Math.PI - (left.teeth * left.phase + Math.PI) / w.teeth;
		placed.push({ teeth: w.teeth, label: w.label, cx: left.cx + left.teeth / 2 + r, phase });
	}

	const last = placed[placed.length - 1];
	const width = last.cx + last.teeth / 2 + ADDENDUM + PADDING;
	const fontSize = (LABEL_CM * width) / sizeCm;
	const labelY = cy + maxOuter + fontSize * 1.1;

	const shapes = placed.map((p, i): GearShape => {
		const pitchRadius = p.teeth / 2;
		const base = {
			teeth: p.teeth,
			label: p.label,
			cx: p.cx,
			cy,
			pitchRadius,
			outerRadius: pitchRadius + ADDENDUM,
			rootRadius: pitchRadius - DEDENDUM,
			hubRadius: 0.15 * pitchRadius,
			phase: p.phase
		};
		const markR = Math.max(0.45, Math.min(0.9, 0.12 * pitchRadius));
		const markDistance =
			base.rootRadius - Math.max(1.8 * markR, 0.25 * (base.rootRadius - base.hubRadius));
		const markAngle = i === 0 ? 0 : Math.PI;
		return {
			...base,
			path: gearPath(base),
			mark: { x: p.cx + markDistance * Math.cos(markAngle), y: cy, r: markR },
			labelAt: { x: p.cx, y: labelY }
		};
	});

	return { width, height: labelY + fontSize * 0.7, fontSize, wheels: shapes };
}

// ============================================================================
// DESSIN SVG (PDF)
// ============================================================================

/** Couleurs du PDF (l'écran suit les jetons du thème) */
export const GEARS_PRINT_COLORS = {
	wheel: '#e5e7eb',
	stroke: '#374151',
	mark: '#c2410c'
} as const;

/**
 * SVG autonome des roues à l'arrêt (PDF). Sans les légendes : le PDF les pose
 * en texte Typst (`labelAt`), le moteur SVG de Typst n'ayant pas nos polices.
 */
export function gearsSvg(scene: GearsScene): string {
	const c = GEARS_PRINT_COLORS;
	const stroke = round(scene.width / 400);
	const parts = scene.wheels.map((w) =>
		[
			`<path d="${w.path}" fill="${c.wheel}" stroke="${c.stroke}" stroke-width="${stroke}" stroke-linejoin="round"/>`,
			`<circle cx="${round(w.cx)}" cy="${round(w.cy)}" r="${round(w.hubRadius)}" fill="#ffffff" stroke="${c.stroke}" stroke-width="${stroke}"/>`,
			`<circle cx="${round(w.mark.x)}" cy="${round(w.mark.y)}" r="${round(w.mark.r)}" fill="${c.mark}"/>`
		].join('')
	);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(scene.width)} ${round(scene.height)}">${parts.join('')}</svg>`;
}
