import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GraphSVG from '../GraphSVG.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';

/**
 * Ordre des couches du graphe.
 *
 * Défaut signalé par David sur `1/x` : « je ne vois pas les asymptotes x = 0
 * et y = 0 ». Elles étaient bien détectées et bien placées — mais dessinées
 * SOUS les axes, et pour 1/x elles SONT les axes. Un pointillé à 50 %
 * d'opacité sous un trait plein ne se voit pas. C'est pourtant l'exemple
 * d'asymptotes le plus courant d'un cours de lycée.
 */
describe('GraphSVG — ordre des couches', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setInteracting(false);
	});

	it('dessine les asymptotes au-dessus des axes et sous les courbes', async () => {
		grapheurStore.addFunction('1/x');
		grapheurStore.setViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

		const { container } = await render(GraphSVG, {});
		await new Promise((resolve) => setTimeout(resolve, 0));

		const svg = container.querySelector('svg');
		expect(svg).not.toBeNull();

		const groups = [...svg!.querySelectorAll('g')];
		const indexOf = (selector: string) => groups.findIndex((g) => g.matches(selector));

		const axes = indexOf('g.axes');
		const asymptotes = indexOf('g.asymptote-lines');
		const curves = indexOf('g.function-curves');

		expect(axes).toBeGreaterThanOrEqual(0);
		expect(asymptotes).toBeGreaterThan(axes);
		expect(curves).toBeGreaterThan(asymptotes);
	});

	it('trace bien les deux asymptotes de 1/x', async () => {
		grapheurStore.addFunction('1/x');
		grapheurStore.setViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

		const { container } = await render(GraphSVG, {});
		await new Promise((resolve) => setTimeout(resolve, 0));

		const paths = [...container.querySelectorAll('g.asymptote-lines path')];
		expect(paths.length).toBe(2);
		expect(paths.every((p) => (p.getAttribute('d') ?? '').length > 0)).toBe(true);
	});
});
