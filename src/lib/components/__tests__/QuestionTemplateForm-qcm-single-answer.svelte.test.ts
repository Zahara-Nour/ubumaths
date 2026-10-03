/**
 * QuestionTemplateForm — QCM : une seule bonne réponse sur TOUT le modèle
 * ======================================================================
 *
 * « Plusieurs réponses » est un réglage du modèle, pas d'une variation :
 * - (a) le décocher (ou appliquer « Vrai / Faux ») dans l'éditeur d'une variation
 *   normalise aussi les AUTRES variations (on garde leur première bonne réponse) ;
 *   sinon l'enregistrement était refusé pour une variation que l'auteur ne voit pas.
 *   Vérifié dans l'UI de la variation 2 ET dans le modèle enregistré (les choix
 *   restent ceux des variations : aucun choix partagé vide n'est inventé).
 * - (b) un enregistrement silencieux (depuis l'éditeur de tests) refusé pour un
 *   nombre de bonnes réponses incohérent le DIT (toast), au lieu de ne rien faire.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { toaster } from '$lib/stores/toaster.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

function choices(correct: boolean[]) {
	return correct.map((isCorrect, i) => ({
		content: templateMarkdown(`Choix ${i + 1}`),
		isCorrect
	}));
}

function qcmTemplate(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: '33333333-3333-4333-8333-333333333333',
		title: 'QCM à deux variations',
		theme: 'Suites',
		domain: 'Définition',
		level: 1,
		grades: ['1re'],
		status: 'draft',
		multipleAnswers: true,
		variations: [
			{ statement: templateMarkdown('Question 1'), choices: choices([true, true, false]) },
			{ statement: templateMarkdown('Question 2'), choices: choices([false, true, true]) }
		],
		...overrides
	} as unknown as QuestionTemplate;
}

async function renderForm(template: QuestionTemplate) {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => void>();
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: { template, onSave, onCancel: () => {}, isSubmitting: false }
	});
	return onSave;
}

/** Enregistre le brouillon et rend le modèle envoyé à `onSave` */
async function saveDraft(onSave: ReturnType<typeof vi.fn>): Promise<SavedTemplate> {
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(1);
	return onSave.mock.calls[0][0] as SavedTemplate;
}

/** Variation 2 attendue : B seule bonne réponse, choix conservés */
function expectSecondVariationSingleB(saved: SavedTemplate) {
	expect(saved.shared?.choices).toBeUndefined();
	expect(saved.multipleAnswers).toBe(false);
	expect(saved.variations[1].correctChoiceIndex).toBe('1');
	expect(saved.variations[1].choices?.map((c) => c.isCorrect)).toEqual([false, true, false]);
}

/** Bonne réponse affichée (bouton radio) dans l'éditeur de la variation visible */
function radio(letter: string) {
	return page.getByRole('radio', { name: `Choix ${letter} : bonne réponse` });
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('QuestionTemplateForm — QCM, une seule bonne réponse', () => {
	it('(a) décocher « plusieurs réponses » normalise aussi l’autre variation', async () => {
		const onSave = await renderForm(qcmTemplate());

		// Éditeur de la variation 1 (affichée) ; la case de l'éditeur partagé est masquée
		await page.getByRole('checkbox', { name: 'Autoriser plusieurs réponses correctes' }).click();
		await page.getByRole('button', { name: 'Variation 2', exact: true }).click();

		// Variation 2 : B et C étaient bonnes → on garde la première (B)
		await expect.element(radio('B')).toBeChecked();
		await expect.element(radio('C')).not.toBeChecked();
		expectSecondVariationSingleB(await saveDraft(onSave));
	});

	it('(a) « Vrai / Faux » dans une variation normalise aussi l’autre', async () => {
		const onSave = await renderForm(qcmTemplate());

		await page.getByRole('button', { name: 'Vrai / Faux' }).click();
		// Choix déjà écrits : confirmation
		await page.getByRole('button', { name: 'Remplacer' }).click();
		await page.getByRole('button', { name: 'Variation 2', exact: true }).click();

		await expect.element(radio('B')).toBeChecked();
		await expect.element(radio('C')).not.toBeChecked();
		expectSecondVariationSingleB(await saveDraft(onSave));
	});

	it('(b) sauvegarde silencieuse refusée (nombre de bonnes réponses) : un toast le dit', async () => {
		const errorSpy = vi.spyOn(toaster, 'error');
		// Choix partagés : deux bonnes réponses sans « plusieurs réponses »
		const onSave = await renderForm(
			qcmTemplate({
				multipleAnswers: false,
				shared: { choices: choices([true, true, false]) },
				variations: [{ statement: templateMarkdown('Question 1') }],
				testSpecs: [
					{
						description: 'Spec à supprimer',
						variationIndex: 0,
						variables: {},
						selectedChoices: [0],
						expected: { status: 'correct' }
					}
				]
			} as Partial<QuestionTemplate>)
		);

		await page.getByRole('button', { name: /^Tests/ }).click();
		// Supprimer un test déclenche un enregistrement silencieux
		await page.getByRole('button', { name: 'Supprimer le test' }).click();

		expect(onSave).not.toHaveBeenCalled();
		await expect.poll(() => errorSpy.mock.calls.length).toBe(1);
		expect(String(errorSpy.mock.calls[0][0])).toMatch(/plusieurs réponses/);
	});
});
