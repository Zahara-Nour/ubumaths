/**
 * Le pied de page n'apparaît que sur la page d'accueil (décision de David,
 * 2026-10-04) : sur les outils (atelier, grapheur…), il prenait la place de
 * l'outil.
 */

import { describe, it, expect } from 'vitest';
import { showsFooter } from '../footer';

describe('pied de page', () => {
	it('apparaît sur la page d’accueil', () => {
		expect(showsFooter('/')).toBe(true);
	});

	it.each(['/atelier', '/grapheur', '/games', '/legal/cgu', '/dashboard', '/whiteboard'])(
		'n’apparaît pas sur %s',
		(path) => {
			expect(showsFooter(path)).toBe(false);
		}
	);
});
