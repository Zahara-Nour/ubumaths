/**
 * Indice en popover (`{{hint:id}}`) : fiche ouverte, toucher un champ à côté
 * (réponse de l'élève) doit y laisser le curseur. Par défaut, bits-ui rend le
 * focus au bouton de l'indice à la fermeture : le curseur disparaissait du champ.
 * Même défaut que la fiche des mots cliquables (revue d'accessibilité, 2026-10-09).
 */
import { describe, it, expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';
import type { ExerciseHint } from '$lib/exercises/types';

const HINTS: ExerciseHint[] = [
	{
		id: 'h1',
		type: 'ubumark',
		title: 'Rappel',
		content: 'L’aire d’un rectangle est $L \\times \\ell$.'
	}
];

describe('indice en popover', () => {
	it('un clic dans un champ à côté y laisse le curseur', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire. {{hint:h1}}', hints: HINTS });
		const field = document.body.appendChild(document.createElement('input'));
		// Loin de l'indice : la fiche ne le recouvre pas
		field.style.cssText = 'position: fixed; bottom: 8px; right: 8px;';
		try {
			await page.getByRole('button', { name: /Afficher l'indice/ }).click();
			await expect.element(page.getByText('Rappel').last()).toBeInTheDocument();
			await userEvent.click(field);
			await expect.poll(() => document.activeElement).toBe(field);
		} finally {
			field.remove();
		}
	});

	it('Échap rend le focus au bouton de l’indice', async () => {
		await render(MarkdownRenderer, { content: 'Calcule l’aire. {{hint:h1}}', hints: HINTS });
		const button = page.getByRole('button', { name: /Afficher l'indice/ });
		await button.click();
		await expect.element(page.getByText('Rappel').last()).toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => document.activeElement).toBe(button.element());
	});
});
