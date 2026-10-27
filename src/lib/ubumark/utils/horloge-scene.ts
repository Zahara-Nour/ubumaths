/**
 * Bloc ```horloge — la scène
 * ==========================
 *
 * Calcul pur d'un cadran (angles des aiguilles, traits, chiffres), partagé par
 * l'écran (`Horloge.svelte`) et le PDF (`horloge-typst.ts`) : les deux ne
 * peuvent pas diverger.
 *
 * Repère : centre (0, 0), y vers le BAS (comme en SVG), cadran de rayon
 * `HORLOGE_VIEW.radius` dans une vue carrée de demi-côté `HORLOGE_VIEW.half`.
 * Angles en degrés, sens horaire depuis le 12.
 *
 * La petite aiguille avance avec les minutes (9 h 30 : à mi-chemin entre le 9
 * et le 10), comme une vraie horloge — c'est ce que l'élève apprend à lire.
 *
 * @module ubumark/utils/horloge-scene
 */

import type { HorlogeSpec, HorlogeTime } from '../types/horloge';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Dimensions de la vue, en unités de la scène */
export const HORLOGE_VIEW = {
	half: 100,
	radius: 96,
	/** Épaisseur du bord du cadran */
	rim: 3
} as const;

/** Proportions du dessin, en fraction du rayon */
const RATIO = {
	majorTick: 0.1,
	minorTick: 0.05,
	/** Chiffres 1-12 : plus près du bord quand il n'y a pas de traits */
	numbers: 0.76,
	numbersNoTicks: 0.84,
	/** Couronne 13-24 */
	innerNumbers: 0.56,
	hourHand: 0.5,
	minuteHand: 0.82
} as const;

/** Taille des chiffres, en unités de la scène */
export const HORLOGE_FONT = { numbers: 17, innerNumbers: 10 } as const;

/** Épaisseurs, en unités de la scène */
export const HORLOGE_STROKE = {
	majorTick: 3,
	minorTick: 1.2,
	hourHand: 7,
	minuteHand: 3.5,
	center: 5
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface HorlogePoint {
	x: number;
	y: number;
}

export interface HorlogeTick {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Trait d'une heure (plus long) */
	major: boolean;
}

export interface HorlogeNumber extends HorlogePoint {
	text: string;
	/** Couronne intérieure 13-24 */
	inner: boolean;
}

export interface HorlogeScene {
	/** null : cadran sans aiguilles (horloge à placer) */
	hourAngle: number | null;
	/** null : grande aiguille cachée, ou cadran sans aiguilles */
	minuteAngle: number | null;
	/** Extrémité de la petite aiguille (elle part du centre) ; null : cadran sans aiguilles */
	hourHand: HorlogePoint | null;
	minuteHand: HorlogePoint | null;
	ticks: HorlogeTick[];
	numbers: HorlogeNumber[];
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Point à `distance` du centre, dans la direction `angle` (degrés depuis le 12) */
function polar(angle: number, distance: number): HorlogePoint {
	const rad = (angle * Math.PI) / 180;
	// Arrondi : sin(π) ≈ 1e-14 dessinerait « -0.00000000000001 »
	const clean = (v: number) => Math.round(v * 1e9) / 1e9;
	return { x: clean(Math.sin(rad) * distance), y: clean(-Math.cos(rad) * distance) };
}

function buildTicks(spec: HorlogeSpec): HorlogeTick[] {
	if (spec.ticks === 'aucune') return [];
	const r = HORLOGE_VIEW.radius;
	const step = spec.ticks === 'minutes' ? 1 : 5;
	const ticks: HorlogeTick[] = [];
	for (let minute = 0; minute < 60; minute += step) {
		const major = minute % 5 === 0;
		const length = (major ? RATIO.majorTick : RATIO.minorTick) * r;
		const outer = polar(minute * 6, r);
		const inner = polar(minute * 6, r - length);
		ticks.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major });
	}
	return ticks;
}

function buildNumbers(spec: HorlogeSpec): HorlogeNumber[] {
	if (spec.numbers === 'aucun') return [];
	const hours = spec.numbers === 'quarts' ? [3, 6, 9, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
	const r = HORLOGE_VIEW.radius;
	const distance = (spec.ticks === 'aucune' ? RATIO.numbersNoTicks : RATIO.numbers) * r;
	const numbers: HorlogeNumber[] = hours.map((h) => ({
		...polar(h * 30, distance),
		text: String(h),
		inner: false
	}));
	if (spec.dial24) {
		for (const h of hours) {
			numbers.push({ ...polar(h * 30, RATIO.innerNumbers * r), text: String(h + 12), inner: true });
		}
	}
	return numbers;
}

/** Extrémité d'une aiguille dirigée vers `angle` (degrés depuis le 12) */
export function handTip(hand: 'hour' | 'minute', angle: number): HorlogePoint {
	const ratio = hand === 'hour' ? RATIO.hourHand : RATIO.minuteHand;
	return polar(angle, ratio * HORLOGE_VIEW.radius);
}

/** La scène d'UN cadran du bloc ; `time` null : le cadran sans aiguilles (horloge à placer) */
export function buildHorlogeScene(spec: HorlogeSpec, time: HorlogeTime | null): HorlogeScene {
	const hourAngle = time === null ? null : ((time.hours % 12) + time.minutes / 60) * 30;
	const minuteAngle = time !== null && spec.minuteHand ? time.minutes * 6 : null;
	return {
		hourAngle,
		minuteAngle,
		hourHand: hourAngle === null ? null : handTip('hour', hourAngle),
		minuteHand: minuteAngle === null ? null : handTip('minute', minuteAngle),
		ticks: buildTicks(spec),
		numbers: buildNumbers(spec)
	};
}
