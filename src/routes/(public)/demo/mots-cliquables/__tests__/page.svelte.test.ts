/**
 * Page de test des mots cliquables et des indices (/demo/mots-cliquables) :
 * la question, l'indice et les phrases d'essai soulignent bien leurs mots, et
 * le niveau choisi est celui de la question réelle.
 */
import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

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
		await expect.poll(() => lexiconButtons(container)).toContain('aire');
		expect(lexiconButtons(container)).not.toContain('fonction exponentielle');
		expect(lexiconButtons(container)).not.toContain('seuil');
	});
});
