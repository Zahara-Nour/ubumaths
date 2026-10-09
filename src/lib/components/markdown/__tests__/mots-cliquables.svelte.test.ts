/**
 * Mots cliquables (lot 2 du lexique, spécification validée par David le
 * 2026-10-09) : rendu dans un énoncé et fiche ouverte au clic. Le dictionnaire
 * est chargé à la demande : les mots se soulignent après son arrivée (attente).
 */
import { describe, it, expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';
import LexiconProviderHarness from './LexiconProviderHarness.svelte';

function lexiconButtons(container: HTMLElement): string[] {
	return [...container.querySelectorAll('button.lexicon-term')].map((b) => b.textContent ?? '');
}

describe('mots cliquables dans un énoncé', () => {
	it('1. les mots du dictionnaire deviennent des boutons, au niveau donné', async () => {
		const { container } = await render(MarkdownRenderer, {
			content: 'Calcule l’aire du rectangle.',
			lexiconGrade: '6'
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'aire', 'rectangle']);
	});

	it('sans niveau, ou avec null, aucun mot n’est souligné', async () => {
		// Dictionnaire chargé d'abord : l'absence prouve le refus, pas un chargement en retard
		const avec = await render(MarkdownRenderer, { content: 'Calcule l’aire.', lexiconGrade: '6' });
		await expect.poll(() => lexiconButtons(avec.container)).toEqual(['Calcule', 'aire']);
		const sans = await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.' });
		expect(lexiconButtons(sans.container)).toEqual([]);
		const coupe = await render(MarkdownRenderer, {
			content: 'Calcule l’aire du rectangle.',
			lexiconGrade: null
		});
		expect(lexiconButtons(coupe.container)).toEqual([]);
	});

	it('le niveau posé par le cadre de la question est hérité', async () => {
		const { container } = await render(LexiconProviderHarness, {
			content: 'Calcule l’aire.',
			grade: '6'
		});
		await expect.poll(() => lexiconButtons(container)).toEqual(['Calcule', 'aire']);
	});

	it('le texte affiché ne change pas, espaces autour des formules compris', async () => {
		const content = 'La fonction $f$ est une fonction affine, $g$ aussi.';
		const avec = await render(MarkdownRenderer, { content, lexiconGrade: '3' });
		const sans = await render(MarkdownRenderer, { content });
		await expect
			.poll(() => lexiconButtons(avec.container))
			.toEqual(['fonction', 'fonction affine']);
		expect(avec.container.textContent).toBe(sans.container.textContent);
	});

	it('9 et 11. un clic ouvre la fiche : définition au niveau de l’élève et lien vers le glossaire', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.', lexiconGrade: '6' });
		await page.getByRole('button', { name: 'aire', exact: true }).click();
		await expect.element(page.getByText(/surface/i).first()).toBeInTheDocument();
		const link = page.getByRole('link', { name: 'Voir dans le glossaire' });
		await expect
			.element(link)
			.toHaveAttribute('href', expect.stringContaining('/glossaire?q=aire'));
	});

	it('10. un homonyme montre tous ses sens visibles', async () => {
		await render(MarkdownRenderer, { content: 'Le carré de 5.', lexiconGrade: '5' });
		await page.getByRole('button', { name: 'carré', exact: true }).click();
		await expect.element(page.getByText('(géométrie)')).toBeInTheDocument();
		await expect.element(page.getByText('(puissance)')).toBeInTheDocument();
	});

	it('9. un renvoi montre « Voir : X » et la définition de X', async () => {
		await render(MarkdownRenderer, { content: 'Résous l’équation.', lexiconGrade: '5' });
		await page.getByRole('button', { name: 'Résous', exact: true }).click();
		await expect.element(page.getByText('Voir : solution')).toBeInTheDocument();
	});

	it('11. Échap ferme la fiche ; ses définitions ne soulignent pas leurs propres mots', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.', lexiconGrade: '6' });
		await page.getByRole('button', { name: 'rectangle', exact: true }).click();
		const link = page.getByRole('link', { name: 'Voir dans le glossaire' });
		await expect.element(link).toBeInTheDocument();
		// La fiche ne contient aucun mot cliquable : seul l'énoncé en a
		expect(document.querySelectorAll('button.lexicon-term')).toHaveLength(3);
		await userEvent.keyboard('{Escape}');
		await expect.element(link).not.toBeInTheDocument();
	});

	// Revue d'accessibilité du 2026-10-09 : fiche ouverte, toucher le champ de
	// réponse rendait le focus au mot (piège de bits-ui) ; l'élève ne pouvait pas taper
	it('un clic dans un champ à côté y laisse le curseur', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.', lexiconGrade: '6' });
		const field = document.body.appendChild(document.createElement('input'));
		// Loin du mot : la fiche ne le recouvre pas, comme un champ de réponse sous l'énoncé
		field.style.cssText = 'position: fixed; bottom: 8px; right: 8px;';
		try {
			await page.getByRole('button', { name: 'aire', exact: true }).click();
			await expect.element(page.getByRole('dialog', { name: 'aire' })).toBeInTheDocument();
			await userEvent.click(field);
			await expect.poll(() => document.activeElement).toBe(field);
		} finally {
			field.remove();
		}
	});

	it('la fiche s’annonce comme une boîte de dialogue au nom du mot, focus sur elle', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.', lexiconGrade: '6' });
		await page.getByRole('button', { name: 'aire', exact: true }).click();
		const dialog = page.getByRole('dialog', { name: 'aire' });
		await expect.element(dialog).toHaveAccessibleDescription(/surface/i);
		await expect.poll(() => document.activeElement).toBe(dialog.element());
	});

	it('Échap rend le focus au mot', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire du rectangle.', lexiconGrade: '6' });
		const word = page.getByRole('button', { name: 'aire', exact: true });
		await word.click();
		await expect.element(page.getByRole('dialog', { name: 'aire' })).toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => document.activeElement).toBe(word.element());
	});
});
