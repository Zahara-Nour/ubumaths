/**
 * QuestionTemplateForm — la correction garde ce que le formulaire n'affiche pas
 * ============================================================================
 *
 * Le formulaire n'édite que le texte des étapes (`steps`). Enregistré en mode
 * formulaire, il réécrivait la correction en `{ steps }` : `feedback` (7 modèles
 * publiés en prod) et `generatedSteps` (correction automatique, écrite en mode
 * JSON) étaient effacés (lot 5e de simplify-carte, Q33).
 *
 * On asserte le MODÈLE ENREGISTRÉ (payload de `onSave`), pas l'écran.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionCorrection, QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

const FULL_CORRECTION = {
	steps: [templateMarkdown('On dérive terme à terme.')],
	feedback: { correct: 'Bravo !' },
	generatedSteps: { kind: 'differentiate', expression: 'x^2' }
} as unknown as QuestionCorrection;

function baseTemplate(overrides: Partial<QuestionTemplate>): QuestionTemplate {
	return {
		id: '55555555-5555-4555-8555-555555555555',
		title: 'Correction gardée',
		theme: 'Fonctions',
		domain: 'Dérivation',
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

describe('QuestionTemplateForm — correction gardée à l’enregistrement', () => {
	it('une variation garde son feedback et sa correction automatique', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [{ statement: templateMarkdown('Dériver $x^2$.'), correction: FULL_CORRECTION }]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.variations[0].correction).toEqual(FULL_CORRECTION);
	});

	it('la correction partagée garde son feedback et sa correction automatique', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				shared: { correction: FULL_CORRECTION },
				variations: [{ statement: templateMarkdown('Dériver $x^2$.') }]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.shared?.correction).toEqual(FULL_CORRECTION);
	});

	it('une correction sans étapes reste sans étapes (le feedback n’est pas recopié en étape)', async () => {
		const correction = {
			feedback: { correct: 'Bravo !' },
			generatedSteps: { kind: 'differentiate', expression: 'x^2' }
		} as unknown as QuestionCorrection;
		const saved = await renderAndSave(
			baseTemplate({
				variations: [{ statement: templateMarkdown('Dériver $x^2$.'), correction }]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.variations[0].correction).toEqual(correction);
	});

	it('dupliquer une variation copie toute sa correction', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [
					{ statement: templateMarkdown('Dériver $x^2$.'), correction: FULL_CORRECTION },
					{
						statement: templateMarkdown('Dériver $x^3$.'),
						correction: { steps: [templateMarkdown('Autre correction.')] }
					}
				]
			} as Partial<QuestionTemplate>),
			async () => {
				await page.getByRole('button', { name: /^Variation 2/ }).click();
				await page.getByRole('button', { name: 'Dupliquer depuis une autre variation' }).click();
				await page.getByRole('button', { name: 'Dupliquer', exact: true }).click();
			}
		);

		expect(saved.variations[1].correction).toEqual(FULL_CORRECTION);
	});

	it('une variation sans correction reste sans correction', async () => {
		const saved = await renderAndSave(
			baseTemplate({
				variations: [{ statement: templateMarkdown('Dériver $x^2$.') }]
			} as Partial<QuestionTemplate>)
		);

		expect(saved.variations[0].correction).toBeUndefined();
	});
});
