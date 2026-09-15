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
	it("place l'asymptote à l'abscisse exacte du pôle", () => {
		// L'étiquette affichée à l'élève est un `toPrecision(4)` : une montée de
		// colline qui s'arrête du mauvais côté du pôle donne « x = 2,719 ».
		const pole = 2.718281828;
		const found = findVerticalAsymptotes(
			(x) => (x === pole ? null : 1 / (x - pole)),
			viewport,
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(pole, 6);
	});

	it('trouve ln(x) quelle que soit la hauteur de la fenêtre', () => {
		const ln = (x: number): number | null => (x <= 0 ? null : Math.log(x));
		for (const half of [10, 40, 100]) {
			const found = findVerticalAsymptotes(ln, { xMin: -5, xMax: 5, yMin: -half, yMax: half }, 'f');
			expect(found.length, `hauteur ${2 * half}`).toBe(1);
		}
	});

	it('trouve un bord de domaine divergent', () => {
		const g = (x: number): number | null => (x <= 0.3 ? null : 1 / Math.sqrt(x - 0.3));
		const found = findVerticalAsymptotes(g, { xMin: -2, xMax: 5, yMin: -10, yMax: 10 }, 'f');

		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(0.3, 6);
	});
	it('examine les candidats sur toute la fenêtre, pas seulement à gauche', () => {
		// Des trous de domaine denses à gauche ne doivent pas épuiser le budget
		// d'examen et masquer un pôle situé à droite.
		const noisyThenPole = (x: number): number | null => {
			if (x < 5) return Math.sin(1000 * x) < 0 ? null : 1;
			return x === 8 ? null : 1 / (x - 8);
		};
		const found = findVerticalAsymptotes(
			noisyThenPole,
			{ xMin: 0, xMax: 10, yMin: -10, yMax: 10 },
			'f'
		);

		expect(found.some((a) => Math.abs(a.x - 8) < 1e-3)).toBe(true);
	});
});
