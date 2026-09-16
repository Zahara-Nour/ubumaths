/**
 * Le grapheur doit pouvoir servir plusieurs ateliers à la fois.
 *
 * Tant que ses composants importaient un singleton, une seconde instance était
 * impossible : ils auraient lu l'état de la première. C'est ce qui bloquait
 * l'atelier (décision figée n° 1 : l'atelier possède l'état).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProvideStore from './harness/ProvideStore.svelte';
import { GrapheurStore, grapheurStore } from '$lib/stores/grapheur.svelte';

beforeEach(() => {
	grapheurStore.fullReset();
});

describe('instance fournie par contexte', () => {
	it('agit sur l’instance fournie, pas sur le singleton', async () => {
		const own = new GrapheurStore();
		const { container } = render(ProvideStore, { store: own });

		const add = container.querySelector('button');
		expect(add).toBeTruthy();
		add?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(own.functions.length).toBe(1);
		expect(grapheurStore.functions.length).toBe(0);
	});

	// ⚠️ L'isolation en mémoire ne suffit pas : sans clé propre, une seconde
	// instance chargerait l'état rangé par `/grapheur` puis l'écraserait à sa
	// première modification. L'élève perdrait ses courbes sans un mot.
	it('range son état sous SA clé, sans contaminer celle du grapheur', async () => {
		const own = new GrapheurStore('atelier-test');
		own.addFunction('x^{42}');
		await new Promise((r) => setTimeout(r, 700)); // debounce de sauvegarde

		expect(localStorage.getItem('atelier-test')).toContain('42');
		expect(localStorage.getItem('chiphre-grapheur-state') ?? '').not.toContain('42');

		localStorage.removeItem('atelier-test');
	});

	it('ne range rien du tout quand la clé est nulle', async () => {
		const volatile = new GrapheurStore(null);
		volatile.addFunction('x^{43}');
		await new Promise((r) => setTimeout(r, 700));

		expect(volatile.functions.length).toBe(1);
		// nulle part : ni sous la clé du grapheur, ni ailleurs
		const everything = Object.keys(localStorage)
			.map((k) => localStorage.getItem(k) ?? '')
			.join('');
		expect(everything).not.toContain('43');
	});
});
