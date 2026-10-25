/**
 * Le grapheur doit pouvoir servir plusieurs ateliers à la fois.
 *
 * Chaque atelier possède son instance et la donne aux composants par le
 * contexte : deux instances ne doivent jamais se marcher dessus, et un
 * composant monté sans fournisseur doit échouer clairement.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ViewportControls from '../ViewportControls.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { grapheurContext } from '$lib/stores/grapheur-context';

describe('instance fournie par contexte', () => {
	it('agit sur l’instance fournie, pas sur une autre', async () => {
		const own = new GrapheurStore();
		const other = new GrapheurStore();
		const { container } = await render(ViewportControls, {
			context: grapheurContext(own),
			props: { svgRef: undefined, svgWidth: 0, svgHeight: 0 }
		});

		const grid = container.querySelector('button[aria-pressed]') as HTMLButtonElement | null;
		expect(grid).toBeTruthy();
		grid?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(own.showGrid).toBe(false);
		expect(other.showGrid).toBe(true);
	});

	it('deux instances n’interfèrent pas', () => {
		const a = new GrapheurStore();
		const b = new GrapheurStore();

		a.addFunction('x^2');

		expect(a.functions.length).toBe(1);
		expect(b.functions.length).toBe(0);
	});

	it('lève une erreur claire sans fournisseur', async () => {
		const monter = async () => {
			await render(ViewportControls, { props: { svgRef: undefined, svgWidth: 0, svgHeight: 0 } });
		};

		await expect(monter()).rejects.toThrow(/Aucun grapheur fourni/);
	});
});
