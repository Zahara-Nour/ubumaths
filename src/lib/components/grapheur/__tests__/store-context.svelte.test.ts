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

		expect(own.functions.length).toBeGreaterThan(0);
		expect(grapheurStore.functions.length).toBe(0);
	});

	it('deux instances ne se voient pas', () => {
		const a = new GrapheurStore();
		const b = new GrapheurStore();

		a.addFunction('x^2');
		expect(a.functions.length).toBe(1);
		expect(b.functions.length).toBe(0);
		expect(grapheurStore.functions.length).toBe(0);
	});
});
