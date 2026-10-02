/**
 * AnswerEditor — QCM : préréglage « Vrai / Faux » (V7) et « plusieurs réponses »
 * ==============================================================================
 *
 * Spécification validée par David (chantier 2) :
 * - V7 : le bouton « Vrai / Faux » remplace les choix par « Vrai », « Faux »
 *   (confirmation si des choix sont déjà écrits), désactive « plusieurs
 *   réponses », règle « ne pas mélanger » (Q106) ; aucune bonne réponse n'est
 *   cochée : l'auteur coche la bonne.
 * - V1 (éditeur) : le nombre de bonnes réponses incohérent est signalé en
 *   français, au plus près des choix.
 * - La case « plusieurs réponses » remonte au formulaire (`bind:multipleAnswers`).
 */

import { page, userEvent } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AnswerEditorHarness from './AnswerEditorHarness.svelte';

interface HarnessState {
	contents: string[];
	correct: boolean[];
	multipleAnswers: boolean;
	shuffleChoices: boolean;
}

function readState(): HarnessState {
	const text = page.getByTestId('state').element().textContent ?? '{}';
	return JSON.parse(text) as HarnessState;
}

const trueFalseButton = () => page.getByRole('button', { name: 'Vrai / Faux' });

describe('AnswerEditor — bouton « Vrai / Faux » (V7)', () => {
	it('choix vides : remplacés sans confirmation ; plusieurs réponses coupé, pas de mélange', async () => {
		await render(AnswerEditorHarness, {
			props: {
				initialChoices: [
					{ content: '', isCorrect: true },
					{ content: '', isCorrect: false },
					{ content: '', isCorrect: false }
				],
				initialMultipleAnswers: true
			}
		});

		await trueFalseButton().click();

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		expect(readState()).toEqual({
			contents: ['Vrai', 'Faux'],
			correct: [false, false],
			multipleAnswers: false,
			shuffleChoices: false
		});
	});

	it('choix déjà écrits : confirmation, puis remplacement', async () => {
		await render(AnswerEditorHarness, {
			props: {
				initialChoices: [
					{ content: 'Paris', isCorrect: true },
					{ content: 'Lyon', isCorrect: false }
				]
			}
		});

		await trueFalseButton().click();
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveTextContent('Paris');
		await dialog.getByRole('button', { name: 'Remplacer' }).click();

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		expect(readState()).toMatchObject({
			contents: ['Vrai', 'Faux'],
			correct: [false, false],
			shuffleChoices: false
		});
	});

	it('confirmation annulée : rien ne change', async () => {
		await render(AnswerEditorHarness, {
			props: {
				initialChoices: [
					{ content: 'Paris', isCorrect: true },
					{ content: 'Lyon', isCorrect: false }
				]
			}
		});

		await trueFalseButton().click();
		await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();

		expect(readState()).toEqual({
			contents: ['Paris', 'Lyon'],
			correct: [true, false],
			multipleAnswers: false,
			shuffleChoices: true
		});
	});

	it('après le préréglage, l’auteur coche la bonne réponse : QCM ordinaire', async () => {
		await render(AnswerEditorHarness, {
			props: { initialChoices: [{ content: '' }, { content: '' }] }
		});
		await trueFalseButton().click();
		await page.getByRole('radio', { name: 'Choix B : bonne réponse' }).click();
		expect(readState().correct).toEqual([false, true]);
	});
});

describe('AnswerEditor — « plusieurs réponses » et nombre de bonnes réponses (V1)', () => {
	it('la case « plusieurs réponses » remonte au formulaire', async () => {
		await render(AnswerEditorHarness, {
			props: { initialChoices: [{ content: 'A', isCorrect: true }, { content: 'B' }] }
		});
		await page.getByRole('checkbox', { name: 'Autoriser plusieurs réponses correctes' }).click();
		expect(readState().multipleAnswers).toBe(true);
	});

	it('plusieurs réponses : deux bonnes réponses cochées, aucun avertissement', async () => {
		await render(AnswerEditorHarness, {
			props: {
				initialChoices: [
					{ content: 'A', isCorrect: true },
					{ content: 'B', isCorrect: true }
				],
				initialMultipleAnswers: true
			}
		});
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});

	it('aucune bonne réponse cochée : avertissement en français', async () => {
		await render(AnswerEditorHarness, {
			props: { initialChoices: [{ content: 'Vrai' }, { content: 'Faux' }] }
		});
		await expect.element(page.getByRole('alert')).toHaveTextContent('Coche la bonne réponse.');
		await userEvent.click(page.getByRole('radio', { name: 'Choix A : bonne réponse' }));
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});
});
