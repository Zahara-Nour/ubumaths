/**
 * AnswerEditor — veto « jamais en QCM » (chantier idees-format, idée 4, PR 2)
 * ============================================================================
 *
 * Phase 0 (David, 2026-11-21, Q1 → C) : une case à erreurs prévues peut se
 * répondre en QCM quand le prof le coche sur une ligne de série ; l'auteur peut
 * l'interdire sur la case. Le réglage n'a de sens qu'avec des erreurs prévues.
 */

import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AnswerEditorChoiceHarness from './AnswerEditorChoiceHarness.svelte';

// Veto de chaque case, tel que le banc l'expose
function readVeto(): (boolean | null)[] {
	const text = page.getByTestId('veto').element().textContent ?? '[]';
	return JSON.parse(text) as (boolean | null)[];
}

const WITH_ERROR = {
	initialStatement: 'Calcule $a+b$.',
	initialBlanks: [
		{ expectedAnswer: '{{eval:a+b}}', expectedErrors: [{ answer: '{{eval:a-b}}', message: 'M' }] }
	]
};

describe('AnswerEditor — jamais en QCM', () => {
	it('case sans erreur prévue : pas de réglage', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: 'Calcule $a+b$.', initialAnswers: ['{{eval:a+b}}'] }
		});
		expect(page.getByRole('checkbox', { name: 'Jamais en QCM' }).elements()).toHaveLength(0);
	});

	it('cocher pose le veto, décocher retire la clé', async () => {
		await render(AnswerEditorChoiceHarness, { props: WITH_ERROR });
		const box = page.getByRole('checkbox', { name: 'Jamais en QCM' });
		await box.click();
		expect(readVeto()).toEqual([true]);
		await box.click();
		expect(readVeto()).toEqual([null]);
	});

	it('modèle ouvert avec le veto : coché ; dernière erreur retirée → veto retiré', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				...WITH_ERROR,
				initialBlanks: [{ ...WITH_ERROR.initialBlanks[0], neverChoice: true }]
			}
		});
		await expect
			.element(page.getByRole('checkbox', { name: 'Jamais en QCM' }))
			.toHaveAttribute('aria-checked', 'true');
		await page.getByRole('button', { name: "Retirer l'erreur prévue 1" }).click();
		expect(readVeto()).toEqual([null]);
	});
});
