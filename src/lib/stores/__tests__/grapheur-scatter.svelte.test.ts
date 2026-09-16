/**
 * Poser et mettre à jour un nuage de points dans le grapheur.
 *
 * C'est l'atelier qui détient les listes ; le grapheur les reflète, un seul
 * sens — la même option B qu'au lot 2 pour les courbes.
 */

import { describe, it, expect } from 'vitest';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isScatter } from '$lib/grapheur/types';

/** Un grapheur qui ne range rien : les tests ne doivent pas écrire de stockage. */
const graph = () => new GrapheurStore(null);

describe('poser un nuage', () => {
	it('l’ajoute aux traçables', () => {
		const g = graph();

		const id = g.addScatter([1, 2, 3], [2, 4, 6], 'L / M');

		expect(id).toBeTruthy();
		expect(g.functions.length).toBe(1);
		expect(isScatter(g.functions[0])).toBe(true);
	});

	it('garde ses deux séries', () => {
		const g = graph();
		g.addScatter([1, 2, 3], [2, 4, 6], 'L / M');

		const nuage = g.functions[0];

		expect(isScatter(nuage) && nuage.xs).toEqual([1, 2, 3]);
		expect(isScatter(nuage) && nuage.ys).toEqual([2, 4, 6]);
	});

	it('prend une couleur, comme une courbe', () => {
		const g = graph();
		g.addScatter([1], [2], 'L / M');

		expect(g.functions[0].color).toBeTruthy();
	});

	it('donne deux couleurs à deux nuages', () => {
		const g = graph();
		g.addScatter([1], [2], 'L / M');
		g.addScatter([3], [4], 'N / P');

		expect(g.functions[0].color).not.toBe(g.functions[1].color);
	});

	it('reçoit un identifiant différent à chaque fois', () => {
		const g = graph();

		expect(g.addScatter([1], [2], 'a')).not.toBe(g.addScatter([3], [4], 'b'));
	});
});

describe('mettre un nuage à jour', () => {
	it('suit les listes quand elles changent', () => {
		const g = graph();
		const id = g.addScatter([1, 2], [2, 4], 'L / M');

		g.updateScatter(id, { xs: [1, 2, 3], ys: [2, 4, 6] });

		const nuage = g.functions[0];
		expect(isScatter(nuage) && nuage.xs).toEqual([1, 2, 3]);
	});

	it('se masque sans disparaître', () => {
		const g = graph();
		const id = g.addScatter([1], [2], 'L / M');

		g.updateScatter(id, { visible: false });

		// ⚠️ Même règle qu'au lot 2 : détruire puis recréer donnerait une nouvelle
		// couleur à chaque frappe de l'élève.
		expect(g.functions.length).toBe(1);
		expect(g.functions[0].visible).toBe(false);
	});

	it('ignore un identifiant inconnu au lieu de casser', () => {
		const g = graph();

		expect(() => g.updateScatter('inconnu', { xs: [1] })).not.toThrow();
	});

	it('se retire', () => {
		const g = graph();
		const id = g.addScatter([1], [2], 'L / M');

		g.removeFunction(id);

		expect(g.functions.length).toBe(0);
	});
});

describe('ce que le nuage ne doit pas casser', () => {
	it('cohabite avec une courbe', () => {
		const g = graph();
		g.addFunction('x^2');
		g.addScatter([1, 2], [2, 4], 'L / M');

		expect(g.functions.length).toBe(2);
		expect(g.visibleFunctions.length).toBe(2);
	});

	// §4 N2 : `/grapheur` seul ne montre jamais de nuage
	it('n’apparaît pas tout seul', () => {
		const g = graph();

		expect(g.functions.filter(isScatter)).toEqual([]);
	});
});
