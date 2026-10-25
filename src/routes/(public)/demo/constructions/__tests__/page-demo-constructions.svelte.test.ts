/**
 * Vitrine — constructions animées (`/demo/constructions`)
 * Comportements validés par David le 2026-10-25 (docs/wip/demo-debug-progress.md, phase 8).
 *
 * - un visiteur voit le titre, le retour vers `/demo` et 3 constructions, chacune avec son lecteur ;
 * - lecteur seul : ni éditeur ni bouton d'enregistrement ;
 * - chaque script est replié sous « Voir le script » ;
 * - sur un écran étroit, la toile se réduit à la largeur disponible et rien ne déborde.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

describe('/demo/constructions', () => {
	it('montre au visiteur le titre, le retour vers /demo et 3 constructions jouables', async () => {
		const screen = await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Constructions à la règle et au compas');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(
			page
				.getByRole('heading', { level: 2 })
				.elements()
				.map((h) => h.textContent)
		).toEqual([
			'Un parallélogramme par ses diagonales',
			'Partager un segment en trois',
			'Le symétrique d’un point, au compas'
		]);
		await expect
			.poll(() => screen.container.querySelectorAll('.construction-player').length)
			.toBe(3);
		expect(screen.container.querySelector('textarea, .cm-editor')).toBeNull();
		expect(page.getByRole('button', { name: /Enregistrer|Sauvegarder/ }).query()).toBeNull();
	});

	it('replie chaque script sous « Voir le script »', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const details = [...screen.container.querySelectorAll('details')];
		expect(details).toHaveLength(3);
		expect(details.every((d) => !d.open)).toBe(true);
		expect(
			details.every((d) => d.querySelector('summary')?.textContent?.trim() === 'Voir le script')
		).toBe(true);
	});

	it('réduit le lecteur à la largeur disponible', async () => {
		await page.viewport(390, 800);
		const screen = await render(Page);

		await expect
			.poll(() => screen.container.querySelectorAll('.construction-player').length)
			.toBe(3);
		for (const player of screen.container.querySelectorAll('.demo-player')) {
			const available = player.parentElement?.clientWidth ?? 0;
			const canvas = player.querySelector('.construction-canvas');
			expect(available).toBeLessThan(390);
			expect(canvas?.getBoundingClientRect().width).toBeLessThanOrEqual(available);
			expect(player.scrollWidth).toBeLessThanOrEqual(available);
		}
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
	});
});
