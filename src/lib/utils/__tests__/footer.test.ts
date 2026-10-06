/**
 * Le bouton « Infos et confidentialité » n'apparaît que sur la page d'accueil.
 * Il remplace l'ancien pied de page (décision de David, 2026-10-06), qui
 * n'apparaissait déjà que là (2026-10-04) : sur les outils (atelier,
 * grapheur…), il prenait la place de l'outil.
 */

import { describe, it, expect } from 'vitest';
import { showsInfoButton } from '../footer';

describe('bouton « Infos et confidentialité »', () => {
	it('apparaît sur la page d’accueil', () => {
		expect(showsInfoButton('/')).toBe(true);
	});

	it.each([
		'/atelier',
		'/grapheur',
		'/games',
		'/legal/cgu',
		'/dashboard',
		'/whiteboard',
		'/a-propos'
	])('n’apparaît pas sur %s', (path) => {
		expect(showsInfoButton(path)).toBe(false);
	});
});
