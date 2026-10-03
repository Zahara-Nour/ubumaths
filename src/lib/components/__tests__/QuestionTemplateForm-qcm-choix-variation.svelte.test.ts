/**
 * QuestionTemplateForm — QCM à choix PAR VARIATION (sans choix partagés)
 * =====================================================================
 *
 * L'éditeur « Réponse partagée » est monté même replié (bits-ui rend le contenu
 * masqué). Il ne doit pas inventer de choix partagés vides à l'ouverture : ils
 * primeraient à l'enregistrement et les choix de chaque variation seraient perdus
 * (26 QCM en prod ont ce profil).
 *
 * On asserte le MODÈLE ENREGISTRÉ (payload de `onSave`), pas l'écran.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

function choices(labels: string[], correct: boolean[]) {
	return labels.map((label, i) => ({ content: templateMarkdown(label), isCorrect: correct[i] }));
}

function baseTemplate(overrides: Partial<QuestionTemplate>): QuestionTemplate {
	return {
		id: '44444444-4444-4444-8444-444444444444',
		title: 'QCM à choix par variation',
		theme: 'Suites',
		domain: 'Définition',
		level: 1,
		grades: ['1re'],
		status: 'draft',
		multipleAnswers: false,
		...overrides
	} as unknown as QuestionTemplate;
}

async function renderAndSave(
	template: QuestionTemplate,
	beforeSave?: () => Promise<void>
): Promise<SavedTemplate> {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => void>();
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: { template, onSave, onCancel: () => {}, isSubmitting: false }
	});
	await beforeSave?.();
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(1);
	return onSave.mock.calls[0][0];
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('QuestionTemplateForm — QCM, choix par variation', () => {
	it('ouvrir puis enregistrer garde les choix de chaque variation, sans choix partagés', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [
					{
						statement: templateMarkdown('Question 1'),
						choices: choices(['A1', 'B1'], [true, false])
					},
					{
						statement: templateMarkdown('Question 2'),
						choices: choices(['A2', 'B2', 'C2'], [false, false, true])
					}
				]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.shared?.choices).toBeUndefined();
		expect(saved.shared?.correctChoiceIndex).toBeUndefined();
		expect(saved.variations.map((v) => v.choices?.map((c) => String(c.content)))).toEqual([
			['A1', 'B1'],
			['A2', 'B2', 'C2']
		]);
		expect(saved.variations.map((v) => v.correctChoiceIndex)).toEqual(['0', '2']);
	});

	it('des choix partagés aux libellés vides (ajoutés à la main) n’écrasent pas ceux des variations', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [
					{
						statement: templateMarkdown('Question 1'),
						choices: choices(['A1', 'B1'], [true, false])
					}
				]
			} as Partial<QuestionTemplate>),
			async () => {
				await page.getByRole('button', { name: 'Champs partagés' }).click();
				await page.getByRole('button', { name: 'Réponse partagée' }).click();
				// Le premier « Ajouter un choix » est celui de l'éditeur partagé
				await page.getByRole('button', { name: 'Ajouter un choix' }).first().click();
			}
		);

		expect(saved.shared?.choices).toBeUndefined();
		expect(saved.variations[0].choices?.map((c) => String(c.content))).toEqual(['A1', 'B1']);
		expect(saved.variations[0].correctChoiceIndex).toBe('0');
	});

	it('non-régression : un QCM à choix partagés garde ses choix partagés', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				shared: { choices: choices(['Oui', 'Non'], [false, true]) },
				variations: [
					{ statement: templateMarkdown('Question 1'), correctChoiceIndex: '1' },
					{ statement: templateMarkdown('Question 2'), correctChoiceIndex: '0' }
				]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.shared?.choices?.map((c) => String(c.content))).toEqual(['Oui', 'Non']);
		expect(saved.shared?.correctChoiceIndex).toBe('1');
		expect(saved.variations.map((v) => v.choices)).toEqual([undefined, undefined]);
		expect(saved.variations.map((v) => v.correctChoiceIndex)).toEqual(['1', '0']);
	});
});
