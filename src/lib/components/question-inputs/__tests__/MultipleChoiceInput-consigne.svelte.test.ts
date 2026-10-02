/**
 * MultipleChoiceInput — consigne d'un QCM à plusieurs réponses (V2, chantier 2)
 *
 * « Coche toutes les bonnes réponses. » (Q107 b) s'affiche au-dessus des choix,
 * donc juste sous l'énoncé, partout où le composant sert : entraînement
 * (QuestionCard), flash-cards et en classe (FlashCard, même non interactive),
 * et après correction. Une réponse unique n'en a pas.
 */

import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MultipleChoiceInput from '../MultipleChoiceInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';

const CONSIGNE = 'Coche toutes les bonnes réponses.';
const choices = ['2', '3', '4'].map((content, originalIndex) => ({
	content: content as ResolvedMarkdown,
	originalIndex
}));

describe('MultipleChoiceInput — consigne « plusieurs réponses »', () => {
	it('plusieurs réponses : la consigne est affichée, avant les choix', async () => {
		const { container } = await render(MultipleChoiceInput, {
			props: { choices, multipleAnswers: true }
		});
		const consigne = page.getByText(CONSIGNE);
		await expect.element(consigne).toBeVisible();
		// Avant le premier choix dans le document : sous l'énoncé, au-dessus des choix
		const firstChoice = container.querySelector('button');
		const node = consigne.element();
		expect(
			node.compareDocumentPosition(firstChoice!) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('carte non interactive (en classe) ou corrigée : la consigne reste', async () => {
		await render(MultipleChoiceInput, {
			props: { choices, multipleAnswers: true, disabled: true, showValidation: true }
		});
		await expect.element(page.getByText(CONSIGNE)).toBeVisible();
	});

	it('réponse unique : pas de consigne « plusieurs réponses »', async () => {
		await render(MultipleChoiceInput, { props: { choices, multipleAnswers: false } });
		await expect.element(page.getByText(CONSIGNE)).not.toBeInTheDocument();
		await expect.element(page.getByText('Choisis une réponse.')).toBeVisible();
	});
});
