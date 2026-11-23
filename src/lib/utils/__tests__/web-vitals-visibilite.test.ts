/**
 * Mesures d'affichage (FCP, LCP) d'une page cachée : à écarter.
 *
 * Une page ouverte dans un onglet en arrière-plan ne s'affiche qu'au moment où
 * l'élève y revient : son premier affichage tombe des heures plus tard
 * (« LCP 221 489 280 ms » relevé en prod le 2026-11-08). Ce n'est pas une
 * lenteur du site ; la même règle que la bibliothèque `web-vitals` : une
 * mesure d'affichage postérieure au premier passage en arrière-plan ne compte pas.
 */
import { describe, expect, it } from 'vitest';
import { firstHiddenTime, isPaintAfterHidden } from '../web-vitals-visibilite';

describe('firstHiddenTime — instant du premier passage en arrière-plan', () => {
	it('page ouverte en arrière-plan : 0', () => {
		expect(firstHiddenTime([{ name: 'hidden', startTime: 0 }], 'visible')).toBe(0);
	});

	it('page cachée après son ouverture : instant du premier passage', () => {
		const entries = [
			{ name: 'visible', startTime: 0 },
			{ name: 'hidden', startTime: 5000 },
			{ name: 'visible', startTime: 9000 },
			{ name: 'hidden', startTime: 12000 }
		];
		expect(firstHiddenTime(entries, 'visible')).toBe(5000);
	});

	it('page restée visible : jamais', () => {
		expect(firstHiddenTime([{ name: 'visible', startTime: 0 }], 'visible')).toBe(Infinity);
	});

	it('navigateur sans historique de visibilité : état courant', () => {
		expect(firstHiddenTime(undefined, 'hidden')).toBe(0);
		expect(firstHiddenTime(undefined, 'visible')).toBe(Infinity);
	});
});

describe('isPaintAfterHidden — mesure d’affichage à écarter', () => {
	it('affichage après le passage en arrière-plan : écarté', () => {
		expect(isPaintAfterHidden(221_489_280, 0)).toBe(true);
		expect(isPaintAfterHidden(7000, 5000)).toBe(true);
	});

	it('affichage avant tout passage en arrière-plan : gardé', () => {
		expect(isPaintAfterHidden(7232, Infinity)).toBe(false);
		expect(isPaintAfterHidden(3000, 5000)).toBe(false);
	});
});
