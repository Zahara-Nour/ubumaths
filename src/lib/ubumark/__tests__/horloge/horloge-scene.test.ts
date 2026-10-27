/**
 * Bloc ```horloge — la scène (angles, traits, chiffres), partagée écran / PDF
 */

import { describe, expect, it } from 'vitest';
import { buildHorlogeScene, HORLOGE_VIEW } from '$lib/ubumark/utils/horloge-scene';
import type { HorlogeSpec } from '$lib/ubumark/types/horloge';

const SPEC: HorlogeSpec = {
	times: [{ hours: 9, minutes: 0 }],
	captions: null,
	numbers: 'tous',
	ticks: 'minutes',
	minuteHand: true,
	dial24: false,
	sizeCm: null
};

const scene = (hours: number, minutes: number, spec: Partial<HorlogeSpec> = {}) =>
	buildHorlogeScene({ ...SPEC, ...spec }, { hours, minutes });

describe('angles des aiguilles (degrés, sens horaire depuis le 12)', () => {
	it.each([
		[9, 0, 270, 0], // comportement 1
		[9, 30, 285, 180], // comportement 2 : petite aiguille à mi-chemin
		[15, 45, 112.5, 270], // comportement 3
		[0, 0, 0, 0], // comportement 10
		[12, 0, 0, 0],
		[9, 59, 299.5, 354], // comportement 12 : pas d'arrondi
		[9, 42, 291, 252] // comportement 11
	])('%i h %i → petite %f°, grande %f°', (h, m, hourAngle, minuteAngle) => {
		const s = scene(h, m);
		expect(s.hourAngle).toBeCloseTo(hourAngle, 9);
		expect(s.minuteAngle).toBeCloseTo(minuteAngle, 9);
	});

	it('13 h à 23 h : même dessin que 1 h à 11 h', () => {
		expect(scene(15, 20)).toEqual(scene(3, 20));
	});

	it('l’extrémité de l’aiguille suit l’angle (y vers le bas, comme en SVG)', () => {
		const s = scene(3, 0);
		// petite aiguille vers la droite, grande vers le haut
		expect(s.hourHand!.x).toBeGreaterThan(0);
		expect(s.hourHand!.y).toBeCloseTo(0, 9);
		expect(s.minuteHand!.x).toBeCloseTo(0, 9);
		expect(s.minuteHand!.y).toBeLessThan(0);
		// grande aiguille plus longue que la petite
		expect(Math.hypot(s.minuteHand!.x, s.minuteHand!.y)).toBeGreaterThan(
			Math.hypot(s.hourHand!.x, s.hourHand!.y)
		);
	});

	it('minutes cachées : pas de grande aiguille (comportement 5)', () => {
		const s = scene(3, 0, { minuteHand: false });
		expect(s.minuteHand).toBeNull();
		expect(s.minuteAngle).toBeNull();
	});
});

describe('graduations', () => {
	it('minutes : 60 traits, dont 12 longs', () => {
		const s = scene(9, 0);
		expect(s.ticks).toHaveLength(60);
		expect(s.ticks.filter((t) => t.major)).toHaveLength(12);
	});

	it('heures : 12 traits ; aucune : 0', () => {
		expect(scene(9, 0, { ticks: 'heures' }).ticks).toHaveLength(12);
		expect(scene(9, 0, { ticks: 'aucune' }).ticks).toHaveLength(0);
	});

	it('tout tient dans la vue', () => {
		const s = scene(9, 0, { dial24: true });
		const inside = (x: number, y: number) =>
			Math.abs(x) <= HORLOGE_VIEW.half && Math.abs(y) <= HORLOGE_VIEW.half;
		for (const t of s.ticks) expect(inside(t.x1, t.y1) && inside(t.x2, t.y2)).toBe(true);
		for (const n of s.numbers) expect(inside(n.x, n.y)).toBe(true);
	});
});

describe('chiffres', () => {
	it('tous : 1 à 12, le 12 en haut, le 3 à droite', () => {
		const s = scene(9, 0);
		expect(s.numbers.map((n) => n.text)).toEqual(
			['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(String)
		);
		const twelve = s.numbers.find((n) => n.text === '12')!;
		expect(twelve.x).toBeCloseTo(0, 9);
		expect(twelve.y).toBeLessThan(0);
		const three = s.numbers.find((n) => n.text === '3')!;
		expect(three.x).toBeGreaterThan(0);
		expect(three.y).toBeCloseTo(0, 9);
	});

	it('quarts : 3, 6, 9, 12 ; aucun : rien (comportement 4)', () => {
		expect(scene(9, 0, { numbers: 'quarts' }).numbers.map((n) => n.text)).toEqual([
			'3',
			'6',
			'9',
			'12'
		]);
		expect(scene(9, 0, { numbers: 'aucun' }).numbers).toEqual([]);
	});

	it('cadran 24 : couronne intérieure 13 à 24, le 24 sous le 12 (comportement 6, décision 4)', () => {
		const s = scene(15, 0, { dial24: true });
		const inner = s.numbers.filter((n) => n.inner);
		expect(inner.map((n) => n.text)).toEqual(
			['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'].map(String)
		);
		const twelve = s.numbers.find((n) => n.text === '12')!;
		const twentyFour = s.numbers.find((n) => n.text === '24')!;
		expect(twentyFour.x).toBeCloseTo(0, 9);
		expect(twentyFour.y).toBeLessThan(0);
		expect(Math.abs(twentyFour.y)).toBeLessThan(Math.abs(twelve.y));
	});

	it('cadran 24 avec les quarts : 15, 18, 21, 24', () => {
		const s = scene(15, 0, { dial24: true, numbers: 'quarts' });
		expect(s.numbers.filter((n) => n.inner).map((n) => n.text)).toEqual(['15', '18', '21', '24']);
	});
});
