/**
 * Vitrine — les blocs ubumark (`/demo/blocs`)
 * Comportements validés par David le 2026-10-25 (docs/wip/catalogue-blocs-progress.md, phase 0).
 *
 * - un visiteur voit le titre, le retour vers `/demo`, trois niveaux et neuf blocs dessinés ;
 * - le texte de chaque bloc est replié sous « Voir ce qu'écrit le prof » ;
 * - aucun cadre d'erreur d'écriture (vitrine publique).
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

describe('/demo/blocs', () => {
	it('montre au visiteur le titre, le retour vers /demo, 3 niveaux et 9 blocs', async () => {
		const screen = await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Les blocs du prof');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		expect(
			page
				.getByRole('heading', { level: 2 })
				.elements()
				.map((h) => h.textContent)
		).toEqual(['À l’école primaire', 'Au collège', 'Au lycée']);
		expect(page.getByRole('heading', { level: 3 }).elements()).toHaveLength(9);
		// Chaque carte dessine son bloc (svg, tableau ou potence selon le bloc)
		await expect
			.poll(() =>
				[...screen.container.querySelectorAll('[data-block-render]')].filter(
					(zone) => zone.querySelector('svg, table, .operation-grille') !== null
				)
			)
			.toHaveLength(9);
	});

	it('replie le texte de chaque bloc sous « Voir ce qu’écrit le prof »', async () => {
		const screen = await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		const details = [...screen.container.querySelectorAll('details')];
		expect(details).toHaveLength(9);
		expect(details.every((d) => !d.open)).toBe(true);
		expect(
			details.every(
				(d) => d.querySelector('summary')?.textContent?.trim() === 'Voir ce qu’écrit le prof'
			)
		).toBe(true);
		expect(details[0].querySelector('pre')?.textContent).toContain('```horloge');
	});

	it('n’affiche aucun message d’erreur d’écriture', async () => {
		await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(page.getByText(/non comprise|introuvable|erreur/i).query()).toBeNull();
	});
});
