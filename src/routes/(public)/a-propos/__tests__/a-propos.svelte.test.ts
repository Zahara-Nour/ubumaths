/**
 * /a-propos — « Chiphre, c'est quoi ? » : le manifeste public destiné aux
 * parents (docs/Chiphres/lore-pataphysique.md, section I), repris tel quel,
 * sans l'exergue de Tristan Bernard (écartée par David, 2026-10-06), remplacée
 * par une citation d'Oscar Wilde.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import APropos from '../+page.svelte';

let mains: HTMLElement[] = [];

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

describe('page « Chiphre, c’est quoi ? »', () => {
	it('porte le titre de la page', async () => {
		await render(APropos, { target: mainElement() });
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent(/Chiphre, c[’']est quoi ?/);
	});

	it.each([
		'Le voyage Chiphre',
		'Est-ce vraiment sérieux ?',
		/Ce que Chiphre n[’']est pas/,
		'Ce que Chiphre propose'
	] as (string | RegExp)[])('affiche la section « %s »', async (titre) => {
		await render(APropos, { target: mainElement() });
		await expect.element(page.getByRole('heading', { level: 2, name: titre })).toBeVisible();
	});

	it('reprend le texte du manifeste et sa signature', async () => {
		await render(APropos, { target: mainElement() });
		await expect
			.element(page.getByText(/Apprendre les mathématiques peut faire peur\./))
			.toBeVisible();
		await expect.element(page.getByText('Un site avec de la publicité.')).toBeVisible();
		await expect.element(page.getByText('Bienvenue sur Chiphre.')).toBeVisible();
		await expect
			.element(
				page.getByText(
					/Chiphre est créé par un enseignant agrégé de Mathématiques et ingénieur en\s+Informatique,\s+passionné de littérature et d[’']illusionnisme\./
				)
			)
			.toBeVisible();
	});

	it('n’affiche pas l’exergue de Tristan Bernard', async () => {
		const screen = await render(APropos, { target: mainElement() });
		expect(screen.container.textContent).not.toMatch(/Tristan Bernard/);
		expect(screen.container.textContent).not.toMatch(/ne pas réfléchir/);
	});

	it('affiche l’exergue d’Oscar Wilde et son attribution', async () => {
		await render(APropos, { target: mainElement() });
		const figure = page.getByRole('figure');
		await expect
			.element(figure.getByText('« L’expérience est le nom que chacun donne à ses erreurs. »'))
			.toBeVisible();
		const legende = figure.getByText(/Oscar Wilde/);
		await expect
			.element(legende)
			.toHaveTextContent('— Oscar Wilde, L’Éventail de Lady Windermere (1892)');
		await expect
			.element(figure.getByText('L’Éventail de Lady Windermere', { exact: true }))
			.toHaveStyle({ fontStyle: 'italic' });
	});
});
