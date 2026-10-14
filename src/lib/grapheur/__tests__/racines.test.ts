/**
 * Racines numériques du grapheur (`findRoots`, chemin sans AST).
 *
 * Une valeur presque nulle n'est une racine que si la courbe y touche l'axe :
 * e^(−x) frôle 0 sans jamais s'annuler, et un seuil absolu y plaçait une
 * racine par échantillon.
 */

import { describe, it, expect } from 'vitest';
import { findRoots } from '../analysis';
import type { Viewport } from '../types';

const viewport: Viewport = { xMin: -100, xMax: 100, yMin: -100, yMax: 100 };

describe('findRoots', () => {
	it('ne signale rien pour e^(−x), qui tend vers 0 sans s’annuler', () => {
		expect(findRoots((x) => Math.exp(-x), viewport, 'f')).toEqual([]);
	});

	it('ne signale rien pour 2^x vers −∞', () => {
		expect(findRoots((x) => 2 ** x, viewport, 'f')).toEqual([]);
	});

	it('garde la racine double de x², où la courbe touche l’axe sans le traverser', () => {
		const found = findRoots((x) => x * x, { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, 'f');
		expect(found.map((r) => r.x)).toEqual([0]);
	});

	it('garde la racine de x·eˣ', () => {
		const found = findRoots((x) => x * Math.exp(x), viewport, 'f');
		expect(found.length).toBe(1);
		expect(found[0].x).toBeCloseTo(0, 8);
	});
});
