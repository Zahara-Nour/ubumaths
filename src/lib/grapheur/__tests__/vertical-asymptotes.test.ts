/**
 * Détection des asymptotes verticales.
 *
 * Une absence de valeur n'est PAS une asymptote : hors du domaine, il n'y a
 * rien à signaler, et un bord de domaine à limite finie (√x en 0) non plus.
 * Sans ce garde, ln(x) faisait dessiner une asymptote par échantillon sur
 * tout le demi-plan x < 0.
 */

import { describe, it, expect } from 'vitest';
import { findVerticalAsymptotes } from '../analysis';
import type { Viewport } from '../types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe('findVerticalAsymptotes', () => {
	it("ne signale qu'une asymptote pour ln(x), en x = 0", () => {
		const ln = (x: number): number | null => (x <= 0 ? null : Math.log(x));
		const found = findVerticalAsymptotes(ln, viewport, 'f');

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(0, 3);
	});

	it('ne signale rien pour √x : le bord du domaine a une limite finie', () => {
		const root = (x: number): number | null => (x < 0 ? null : Math.sqrt(x));
		expect(findVerticalAsymptotes(root, viewport, 'f')).toEqual([]);
	});

	it('ne signale rien quand la fonction est vide sur toute la fenêtre', () => {
		const nowhere = (): number | null => null;
		expect(findVerticalAsymptotes(nowhere, viewport, 'f')).toEqual([]);
	});

	it('trouve les deux pôles de 1/(x(x+1))', () => {
		const rational = (x: number): number | null => {
			const d = x * (x + 1);
			return d === 0 ? null : 1 / d;
		};
		const found = findVerticalAsymptotes(rational, viewport, 'f')
			.map((a) => a.x)
			.sort((a, b) => a - b);

		expect(found.length).toBe(2);
		expect(found[0]).toBeCloseTo(-1, 3);
		expect(found[1]).toBeCloseTo(0, 3);
	});

	it('trouve les quatre pôles de tan(x) sur [-5 ; 5]', () => {
		const found = findVerticalAsymptotes(
			(x) => Math.tan(x),
			{ xMin: -5, xMax: 5, yMin: -10, yMax: 10 },
			'f'
		);
		expect(found.length).toBe(4);
	});

	it('ne signale rien pour une fonction continue', () => {
		expect(findVerticalAsymptotes((x) => x * x, viewport, 'f')).toEqual([]);
	});
});
