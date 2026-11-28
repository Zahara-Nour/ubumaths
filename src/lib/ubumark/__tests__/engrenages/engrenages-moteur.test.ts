/**
 * Moteur du bloc ```engrenages : retour des repères, sens de rotation, engrènement
 * (outil n° 52, `docs/wip/outil-engrenages-progress.md`).
 */

import { describe, expect, it } from 'vitest';
import {
	gearsReturn,
	gearsScene,
	wheelRotation,
	toothCenterAngles
} from '#lib/ubumark/utils/engrenages-moteur.ts';

const wheels = (...teeth: number[]) => teeth.map((t, i) => ({ teeth: t, label: 'ABC'[i] }));

/** Angle ramené dans [0, 2π[ */
const mod2pi = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

describe('retour des repères', () => {
	it('12 et 18 dents : 36 dents passées, A fait 3 tours, B 2 tours', () => {
		expect(gearsReturn(wheels(12, 18))).toEqual({ teethPassed: 36, turns: [3, 2] });
	});

	it('trois roues : le plus petit multiple commun des trois', () => {
		expect(gearsReturn(wheels(12, 18, 8))).toEqual({ teethPassed: 72, turns: [6, 4, 9] });
	});

	it('nombres premiers entre eux : le produit', () => {
		expect(gearsReturn(wheels(7, 10))).toEqual({ teethPassed: 70, turns: [10, 7] });
	});

	it('même nombre de dents : un tour chacune', () => {
		expect(gearsReturn(wheels(15, 15))).toEqual({ teethPassed: 15, turns: [1, 1] });
	});
});

describe('rotation', () => {
	it('deux roues voisines tournent en sens contraire, la 3e comme la 1re', () => {
		const w = wheels(12, 18, 8);
		const a = wheelRotation(w, 0, 1);
		const b = wheelRotation(w, 1, 1);
		const c = wheelRotation(w, 2, 1);
		expect(a).toBeGreaterThan(0);
		expect(b).toBeLessThan(0);
		expect(c).toBeGreaterThan(0);
	});

	it('les dents passent à la même vitesse : angle × dents identique', () => {
		const w = wheels(12, 18, 8);
		const turnOfA = 2 * Math.PI;
		expect(Math.abs(wheelRotation(w, 1, turnOfA)) * 18).toBeCloseTo(turnOfA * 12);
		expect(wheelRotation(w, 2, turnOfA) * 8).toBeCloseTo(turnOfA * 12);
	});

	it('au retour, chaque roue a fait un nombre entier de tours', () => {
		const w = wheels(12, 18, 8);
		const { turns } = gearsReturn(w);
		const end = 2 * Math.PI * turns[0];
		turns.forEach((n, i) => {
			expect(Math.abs(wheelRotation(w, i, end)) / (2 * Math.PI)).toBeCloseTo(n);
		});
	});
});

describe('scène', () => {
	it('rayon proportionnel aux dents, roues côte à côte sur une même ligne', () => {
		const scene = gearsScene(wheels(12, 18, 8));
		const [a, b, c] = scene.wheels;
		expect(b.pitchRadius / a.pitchRadius).toBeCloseTo(18 / 12);
		expect(b.cx - a.cx).toBeCloseTo(a.pitchRadius + b.pitchRadius);
		expect(c.cx - b.cx).toBeCloseTo(b.pitchRadius + c.pitchRadius);
		expect(new Set(scene.wheels.map((w) => w.cy)).size).toBe(1);
		// tout tient dans la boîte de la scène
		for (const w of scene.wheels) {
			expect(w.cx - w.outerRadius).toBeGreaterThan(0);
			expect(w.cx + w.outerRadius).toBeLessThan(scene.width);
			expect(w.cy + w.outerRadius).toBeLessThan(scene.height);
		}
	});

	it('autant de dents dessinées que demandé', () => {
		const scene = gearsScene(wheels(12, 7));
		expect(toothCenterAngles(scene.wheels[0])).toHaveLength(12);
		expect(toothCenterAngles(scene.wheels[1])).toHaveLength(7);
		// une dent = 4 sommets du contour
		expect(scene.wheels[1].path.match(/L/g)?.length).toBe(4 * 7 - 1);
	});

	it('engrènement : en face d’une dent, un creux, pour toute parité des dents', () => {
		for (const teeth of [
			[12, 18, 8],
			[7, 10, 9],
			[13, 13, 6]
		]) {
			const scene = gearsScene(wheels(...teeth));
			for (let i = 1; i < scene.wheels.length; i++) {
				const left = scene.wheels[i - 1];
				const right = scene.wheels[i];
				// la dent de gauche la plus proche du contact (angle 0) et celle de droite (angle π)
				const offset = (w: typeof left, contact: number) => {
					const pitch = (2 * Math.PI) / w.teeth;
					const d = toothCenterAngles(w).map((a) => mod2pi(a - contact + pitch / 2) - pitch / 2);
					return d.reduce((best, x) => (Math.abs(x) < Math.abs(best) ? x : best));
				};
				// en longueur sur le cercle primitif : les deux dents sont à une demi-dent l'une de l'autre
				const leftArc = offset(left, 0) * left.pitchRadius;
				const rightArc = -offset(right, Math.PI) * right.pitchRadius;
				const pitchArc = (2 * Math.PI * left.pitchRadius) / left.teeth;
				const gap = mod2pi(((rightArc - leftArc) / pitchArc) * 2 * Math.PI) / (2 * Math.PI);
				expect(gap, `roues ${teeth.join(', ')}, contact ${i}`).toBeCloseTo(0.5);
			}
		}
	});

	it('repères : A vers B, B et C vers leur voisine de gauche', () => {
		const scene = gearsScene(wheels(12, 18, 8));
		const [a, b, c] = scene.wheels;
		expect(a.mark.x).toBeGreaterThan(a.cx);
		expect(b.mark.x).toBeLessThan(b.cx);
		expect(c.mark.x).toBeLessThan(c.cx);
		for (const w of scene.wheels) expect(w.mark.y).toBeCloseTo(w.cy);
	});
});
