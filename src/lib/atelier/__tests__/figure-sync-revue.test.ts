/**
 * Retours de revue de la PR 2 (géométrie v2, lot 1) sur la carte : un point
 * isolé se dit « point » (nature) et garde son constat. Les retours sur le
 * dessin sont dans `figure-sync.test.ts` (« retours de revue »).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { curveNatureOf, SINGLE_POINT_CURVE } from '../curve-nature';

describe('la carte d’une courbe réduite à un point', () => {
	it('x² + y² = 0 : nature « point », constat « Un seul point vérifie cette équation. »', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = 0' }, 'text');

		expect(curveNatureOf(atelier, 'C')).toEqual({ label: 'point', note: SINGLE_POINT_CURVE });
		expect(SINGLE_POINT_CURVE).toBe('Un seul point vérifie cette équation.');
	});
});
