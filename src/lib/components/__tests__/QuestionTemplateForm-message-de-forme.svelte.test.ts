/**
 * QuestionTemplateForm — message de forme écrit par l'auteur (outils-manquants n° 75)
 * ==================================================================================
 *
 * Le formulaire réécrit la forme exigée depuis ses champs : un message absent des
 * champs serait effacé à l'enregistrement. On asserte le MODÈLE ENREGISTRÉ
 * (payload de `onSave`), aux trois endroits : variation, partagé, défauts des cases.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

const FORM = {
	pattern: 'a:integer + b:integer/c:integer',
	message: 'Le numérateur doit être plus petit que {{d}}.'
};

function baseTemplate(overrides: Partial<QuestionTemplate>): QuestionTemplate {
	return {
		id: '66666666-6666-4666-8666-666666666666',
		title: 'Message de forme',
		level: 1,
		grades: ['2'],
		status: 'draft',
		multipleAnswers: false,
		...overrides
	} as unknown as QuestionTemplate;
}

async function renderAndSave(template: QuestionTemplate): Promise<SavedTemplate> {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => void>();
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: { template, onSave, onCancel: () => {}, isSubmitting: false }
	});
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(1);
	return onSave.mock.calls[0][0];
}

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('QuestionTemplateForm — le message de forme survit à l’enregistrement', () => {
	it('variation', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [{ statement: templateMarkdown('$\\frac{7}{5}=?$'), requiredForm: FORM }]
			} as Partial<QuestionTemplate>)
		);
		expect(saved.variations[0].requiredForm).toEqual(FORM);
	});

	it('partagé et défauts des cases', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				shared: { requiredForm: FORM, blankDefaults: { requiredForm: FORM } },
				variations: [{ statement: templateMarkdown('$\\frac{7}{5}=?$') }]
			} as Partial<QuestionTemplate>)
		);
		expect(saved.shared?.requiredForm).toEqual(FORM);
		expect(saved.shared?.blankDefaults?.requiredForm).toEqual(FORM);
	});
});
