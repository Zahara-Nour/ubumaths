import { describe, expect, it } from 'vitest';
import { tirerAngleArret } from '../wheel-landing.ts';

/** Distance de l'angle final à la frontière de case la plus proche, en degrés. */
function distanceFrontiere(angleFinal: number, nbCases: number): number {
	const tailleCase = 360 / nbCases;
	const dansLaCase = (angleFinal % 360) % tailleCase;
	return Math.min(dansLaCase, tailleCase - dansLaCase);
}

/** Hasard rejoué : rend les valeurs dans l'ordre, puis 0,5. */
function hasardRejoue(valeurs: number[]): () => number {
	let i = 0;
	return () => valeurs[i++] ?? 0.5;
}

describe('tirerAngleArret (écart L53)', () => {
	it('7 cases : refuse un arrêt sur la frontière 51,43° et tire à nouveau', () => {
		// 360 - 0,857143 × 360 ≈ 51,43° : pile sur la 1re frontière (360 / 7).
		const tirage = tirerAngleArret(0, 7, hasardRejoue([1 - 1 / 7, 0.5]));
		expect(tirage).toBe(180);
	});

	it("tient compte de l'angle de départ, pas du seul tirage", () => {
		// Départ 10°, tirage 80° → final 90°, frontière de 4 cases : refusé.
		const tirage = tirerAngleArret(10, 4, hasardRejoue([1 - 80 / 360, 0.5]));
		expect(tirage).toBe(180);
	});

	it.each([1, 2, 3, 5, 7, 8, 11, 13, 29, 37])('%i cases : toujours loin des frontières', (n) => {
		const marge = Math.min(2, 360 / n / 4);
		for (let depart = 0; depart < 360; depart += 17) {
			const tirage = tirerAngleArret(depart, n);
			expect(tirage).toBeGreaterThan(0);
			expect(tirage).toBeLessThanOrEqual(360);
			expect(distanceFrontiere(depart + tirage, n)).toBeGreaterThanOrEqual(marge);
		}
	});
});
