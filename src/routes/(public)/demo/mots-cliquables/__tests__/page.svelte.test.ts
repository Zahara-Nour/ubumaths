/**
 * Page de test des mots cliquables et des indices (/demo/mots-cliquables) :
 * la question, l'indice et les phrases d'essai soulignent bien leurs mots, et
 * le niveau choisi est celui de la question réelle.
 */
import { describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, les entrées du fichier
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { default: entries } = await import('$lib/data/math-dictionary-fr');
	return { fetchDictionary: async () => entries };
});

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

describe('page de test des mots cliquables', () => {
	it('souligne les mots de la question, de l’indice et des phrases d’essai', async () => {
		const { container } = await render(Page);
		await expect.poll(() => lexiconButtons(container)).toContain('aire');
		// L'énoncé de l'indice et les phrases d'essai
		await expect.poll(() => lexiconButtons(container)).toContain('périmètre');
		await expect.poll(() => lexiconButtons(container)).toContain('événement');
		await expect
			.element(page.getByRole('button', { name: /Afficher l'indice/ }))
			.toBeInTheDocument();
	});

	it('niveau 6e : ni « fonction exponentielle » ni « seuil »', async () => {
		const { container } = await render(Page);
		// Les phrases d'essai sont repérées : l'absence qui suit prouve quelque chose
		await expect.poll(() => lexiconButtons(container)).toContain('événement');
		expect(lexiconButtons(container)).not.toContain('fonction exponentielle');
		expect(lexiconButtons(container)).not.toContain('seuil');
	});

	// La question est de 6e : seul le niveau choisi dans la page (contexte posé par
	// la page) peut lui faire montrer le sens « puissance » de « carré », vu en 5e
	it('le niveau choisi s’applique à la question réelle', async () => {
		await render(Page);
		const question = page.getByText(/Calcule l’aire d’un carré/).first();
		await expect.element(question).toBeInTheDocument();
		const carre = page.getByRole('button', { name: 'carré', exact: true }).first();
		await carre.click();
		await expect.element(page.getByText('(géométrie)').last()).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('(puissance)');
		await userEvent.keyboard('{Escape}');

		await page.getByRole('button', { name: 'Niveau de lecture' }).click();
		await page.getByRole('option', { name: '5ème' }).click();
		await carre.click();
		await expect.element(page.getByText('(puissance)').last()).toBeInTheDocument();
	});
});
