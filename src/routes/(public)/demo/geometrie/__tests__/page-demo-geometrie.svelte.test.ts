/**
 * Vitrine — figures de géométrie (`/demo/geometrie`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6f).
 *
 * - un visiteur voit le titre, le retour vers `/demo`, trois sections et 10 figures dessinées ;
 * - chaque script est replié sous « Voir le script » ;
 * - sur un écran étroit, la figure se réduit à la largeur disponible.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

describe('/demo/geometrie', () => {
	it('montre au visiteur le titre, le retour vers /demo, 3 sections et 10 figures', async () => {
		const screen = await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Figures de géométrie');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(
			page
				.getByRole('heading', { level: 2 })
				.elements()
				.map((h) => h.textContent)
		).toEqual(['Au collège', 'Au lycée', 'Pour le plaisir']);
		expect(page.getByRole('heading', { level: 3 }).elements()).toHaveLength(10);
		await expect
			.poll(() => screen.container.querySelectorAll('svg.geometry-canvas').length)
			.toBe(10);
	});

	it('replie chaque script sous « Voir le script »', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const details = [...screen.container.querySelectorAll('details')];
		expect(details).toHaveLength(10);
		expect(details.every((d) => !d.open)).toBe(true);
		expect(
			details.every((d) => d.querySelector('summary')?.textContent?.trim() === 'Voir le script')
		).toBe(true);
	});

	it('réduit la figure à la largeur disponible', async () => {
		await page.viewport(390, 800);
		const screen = await render(Page);

		await expect
			.poll(() => screen.container.querySelectorAll('svg.geometry-canvas').length)
			.toBe(10);
		for (const svg of screen.container.querySelectorAll('svg.geometry-canvas')) {
			expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(390);
		}
	});
});
