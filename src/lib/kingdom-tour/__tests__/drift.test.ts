/**
 * La dérive de la roue autour de Père Ubu : elle reste dans sa zone, ne mord pas sur le
 * dessin, et ne fait le tour complet que s'il y a la place au-dessus et au-dessous.
 */
import { describe, expect, it } from 'vitest';
import { driftAt, driftGeometry, type DriftMeasures } from '../drift';

// Constantes

/** Mesures relevées sur l'accueil (Père Ubu : boîte de 240 px, dessin 0,59 fois plus étroit) */
const DESKTOP: DriftMeasures = {
	boxWidth: 240,
	boxHeight: 240,
	bodyRatio: 449.341 / 757.362,
	roomLeft: 480,
	roomRight: 480,
	roomAbove: 172,
	roomBelow: 170,
	button: 56
};
/** Téléphone de 320 px : peu de place au-dessus de la tête */
const PHONE: DriftMeasures = {
	...DESKTOP,
	boxWidth: 231,
	boxHeight: 231,
	roomLeft: 45,
	roomRight: 44,
	roomAbove: 36,
	roomBelow: 59
};
/** Une minute et demie, échantillonnée au dixième de seconde */
const TIMES = Array.from({ length: 900 }, (_, i) => i / 10);

// Functions

/** Le bouton (carré de `button` px centré en x, y) déborde-t-il la zone libre ? */
function outside(m: DriftMeasures, x: number, y: number): boolean {
	const half = m.button / 2;
	return (
		x - half < -m.boxWidth / 2 - m.roomLeft ||
		x + half > m.boxWidth / 2 + m.roomRight ||
		y - half < -m.boxHeight / 2 - m.roomAbove ||
		y + half > m.boxHeight / 2 + m.roomBelow
	);
}

describe('driftGeometry', () => {
	it('fait le tour complet quand il y a la place au-dessus et au-dessous', () => {
		expect(driftGeometry(DESKTOP).fullTurn).toBe(true);
	});

	it('se contente du flanc droit sur un petit téléphone', () => {
		expect(driftGeometry(PHONE).fullTurn).toBe(false);
	});
});

describe('driftAt', () => {
	it('commence sur le flanc droit de Père Ubu', () => {
		const start = driftAt(0, driftGeometry(DESKTOP));
		expect(start.x).toBeGreaterThan(0);
		expect(Math.abs(start.y)).toBeLessThan(10);
	});

	it.each([
		['ordinateur', DESKTOP],
		['téléphone', PHONE]
	])('%s : ne sort jamais de la zone libre', (_, measures) => {
		const geometry = driftGeometry(measures);
		const out = TIMES.filter((t) => {
			const { x, y } = driftAt(t, geometry);
			return outside(measures, x, y);
		});
		expect(out).toEqual([]);
	});

	it('téléphone : longe le flanc sans mordre sur le dessin', () => {
		const geometry = driftGeometry(PHONE);
		const bodyEdge = (PHONE.boxWidth * PHONE.bodyRatio) / 2;
		const bites = TIMES.filter((t) => driftAt(t, geometry).x - PHONE.button / 2 < bodyEdge);
		expect(bites).toEqual([]);
	});

	it('ordinateur : passe au-dessus de la tête et sous les pieds, sans traverser le dessin', () => {
		const geometry = driftGeometry(DESKTOP);
		const ys = TIMES.map((t) => driftAt(t, geometry).y);
		expect(Math.min(...ys)).toBeLessThan(-DESKTOP.boxHeight / 2);
		expect(Math.max(...ys)).toBeGreaterThan(DESKTOP.boxHeight / 2);
	});

	it('se déplace lentement : jamais plus de 50 px par seconde (mesuré : 41)', () => {
		const geometry = driftGeometry(DESKTOP);
		const fast = TIMES.slice(1).filter((t) => {
			const a = driftAt(t - 0.1, geometry);
			const b = driftAt(t, geometry);
			return Math.hypot(b.x - a.x, b.y - a.y) / 0.1 > 50;
		});
		expect(fast).toEqual([]);
	});
});
