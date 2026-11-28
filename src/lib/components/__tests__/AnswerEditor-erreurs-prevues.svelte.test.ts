/**
 * AnswerEditor — erreurs prévues d'une case (chantier idees-format, idée 3, PR 6)
 * ================================================================================
 *
 * Phase 0 validée par David (2026-11-21, `docs/wip/idees-format-progress.md` § Idée 3) :
 * sous chaque case, « Ajouter une erreur prévue » ; trois champs : réponse fausse,
 * message à l'élève, nom court facultatif (Q2 A). Une case choix n'en a pas (Q3 A).
 */

import { page, userEvent } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ExpectedError } from '#lib/questions/types.ts';
import AnswerEditorChoiceHarness from './AnswerEditorChoiceHarness.svelte';

// Erreurs prévues de chaque case, telles que le banc les expose
function readErrors(): (ExpectedError[] | null)[] {
	const text = page.getByTestId('erreurs').element().textContent ?? '[]';
	return JSON.parse(text) as (ExpectedError[] | null)[];
}

// Constantes
const OUI_NON = '```choix\nmelanger: non\n- Oui\n- Non\n```';

// Tests
describe('AnswerEditor — erreurs prévues', () => {
	it('ajouter une erreur prévue : réponse et message écrits, pas de nom court', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: 'Calcule $a+b$.', initialAnswers: ['{{eval:a+b}}'] }
		});
		await page.getByRole('button', { name: 'Ajouter une erreur prévue' }).click();
		await userEvent.fill(page.getByLabelText("Si l'élève répond"), '{{eval:a-b}}');
		await userEvent.fill(
			page.getByLabelText('Lui écrire'),
			"Tu as soustrait au lieu d'additionner."
		);

		expect(readErrors()).toEqual([
			[{ answer: '{{eval:a-b}}', message: "Tu as soustrait au lieu d'additionner." }]
		]);
	});

	it('nom court écrit puis effacé : la clé disparaît', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: 'Calcule $a+b$.',
				initialBlanks: [
					{
						expectedAnswer: '{{eval:a+b}}',
						expectedErrors: [{ answer: '{{eval:a-b}}', message: 'M' }]
					}
				]
			}
		});
		const name = page.getByLabelText('Nom court (pour vous, facultatif)');
		await userEvent.fill(name, 'Soustraction');
		expect(readErrors()[0]).toEqual([
			{ answer: '{{eval:a-b}}', message: 'M', label: 'Soustraction' }
		]);
		await userEvent.fill(name, '');
		expect(readErrors()[0]).toEqual([{ answer: '{{eval:a-b}}', message: 'M' }]);
	});

	it('modèle ouvert : champs remplis ; retirer la dernière erreur → plus d’erreurs prévues', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: 'Calcule $a+b$.',
				initialBlanks: [
					{
						expectedAnswer: '{{eval:a+b}}',
						expectedErrors: [{ answer: '{{eval:a-b}}', message: 'Signe.', label: 'Signe' }]
					}
				]
			}
		});
		await expect.element(page.getByLabelText("Si l'élève répond")).toHaveValue('{{eval:a-b}}');
		await expect.element(page.getByLabelText('Lui écrire')).toHaveValue('Signe.');
		await expect
			.element(page.getByLabelText('Nom court (pour vous, facultatif)'))
			.toHaveValue('Signe');

		await page.getByRole('button', { name: "Retirer l'erreur prévue 1" }).click();
		expect(readErrors()).toEqual([null]);
		await expect.element(page.getByTestId('erreur-prevue')).not.toBeInTheDocument();
	});

	it('deux cases : chaque erreur reste sur sa case', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: '', initialAnswers: ['1', '2'] }
		});
		await page.getByTestId('erreurs-prevues-2').getByRole('button').click();
		await userEvent.fill(page.getByLabelText("Si l'élève répond"), '3');
		expect(readErrors()).toEqual([null, [{ answer: '3', message: '' }]]);
	});

	it('case choix : pas d’erreur prévue', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: `Vrai ?\n\n${OUI_NON}`, initialAnswers: ['1'] }
		});
		await expect.element(page.getByText('Case 1 : choix')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Ajouter une erreur prévue' }))
			.not.toBeInTheDocument();
	});
	it('case devenue choix avec des erreurs prévues : dit, et se retire', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: `Vrai ?\n\n${OUI_NON}`,
				initialBlanks: [{ expectedAnswer: '1', expectedErrors: [{ answer: '0', message: 'M' }] }]
			}
		});
		const stray = page.getByTestId('erreurs-prevues-orphelines');
		await expect.element(stray).toHaveTextContent('le modèle ne se générera pas');
		await stray.getByRole('button', { name: 'Retirer' }).click();
		await expect.element(stray).not.toBeInTheDocument();
		expect(readErrors()).toEqual([null]);
	});

	it('ligne incomplète : signalée sur la ligne, plus une fois remplie', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: '', initialAnswers: ['1'] }
		});
		await page.getByRole('button', { name: 'Ajouter une erreur prévue' }).click();
		const hint = page.getByText('Réponse et message à remplir');
		await expect.element(hint).toBeVisible();
		await userEvent.fill(page.getByLabelText("Si l'élève répond"), '2');
		await userEvent.fill(page.getByLabelText('Lui écrire'), 'M');
		await expect.element(hint).not.toBeInTheDocument();
	});
});
