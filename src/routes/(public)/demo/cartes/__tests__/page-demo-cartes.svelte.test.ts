/**
 * Vitrine — les cartes VIP (`/demo/cartes`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6c).
 *
 * - un visiteur voit le titre, le retour vers `/demo` et 4 cartes, une par rareté ;
 * - chaque carte montre son nom, sa rareté, son privilège et son image servie par `static/` ;
 * - la légendaire vient en premier.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

describe('/demo/cartes', () => {
	it('montre au visiteur le titre, le retour vers /demo et les 4 cartes', async () => {
		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Les cartes VIP');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		const titres = page.getByRole('heading', { level: 2 }).elements();
		expect(titres.map((t) => t.textContent?.trim())).toEqual([
			'Coup Double',
			'Super Bonus',
			'Game of throne',
			'Batman and Robin'
		]);
	});

	it('donne une rareté différente et son privilège à chaque carte', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const texte = screen.container.textContent ?? '';
		for (const rarete of ['Légendaire', 'Épique', 'Rare', 'Commune']) {
			expect(texte).toContain(rarete);
		}
		expect(texte).toContain('+2 sur un devoir au choix');
		expect(texte).toContain('Prends le fauteuil du prof');
	});

	it('affiche les images servies par le site, jamais par le stockage', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const sources = [...screen.container.querySelectorAll('img')].map((img) =>
			img.getAttribute('src')
		);
		expect(sources).toHaveLength(4);
		for (const src of sources) expect(src).toMatch(/^\/images\/demo-cartes\/[a-z-]+\.webp$/);
	});
});
