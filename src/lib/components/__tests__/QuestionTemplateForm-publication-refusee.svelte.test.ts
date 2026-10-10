/**
 * QuestionTemplateForm — publication refusée par le serveur
 * =========================================================
 *
 * « Publier » passe le statut à `published` pour construire le modèle. Si le
 * serveur refuse (contrôle de publication : spec rouge, tirage en échec…),
 * `onSave` rend `false` et le statut doit revenir à `draft` : sinon
 * « Enregistrer brouillon » renverrait `published` et serait refusé à son tour.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

function draftTemplate(): QuestionTemplate {
	return {
		id: '33333333-3333-4333-8333-333333333333',
		title: 'Trouver le double',
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 4,
		grades: ['CE1'],
		status: 'draft',
		shared: { variables: [{ name: 'a', expression: '1..9' }] },
		variations: [
			{
				statement: templateMarkdown('Le double de ${{a}}$ est $?$.'),
				blanks: [{ expectedAnswer: '{{eval:2*a}}' }]
			}
		]
	} as unknown as QuestionTemplate;
}

async function renderForm(saved: boolean) {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => Promise<boolean>>(
		async () => saved
	);
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: { template: draftTemplate(), onSave, onCancel: () => {}, isSubmitting: false }
	});
	return onSave;
}

async function publishThenSaveDraft(onSave: ReturnType<typeof vi.fn>) {
	await page.getByRole('button', { name: 'Publier', exact: true }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(1);
	expect((onSave.mock.calls[0][0] as SavedTemplate).status).toBe('published');
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(2);
	return onSave.mock.calls[1][0] as SavedTemplate;
}

describe('QuestionTemplateForm : publication refusée', () => {
	it('refus du serveur → le statut revient à draft pour l’enregistrement suivant', async () => {
		const onSave = await renderForm(false);
		const next = await publishThenSaveDraft(onSave);
		expect(next.status).toBe('draft');
	});

	it('publication acceptée → le statut reste published', async () => {
		const onSave = await renderForm(true);
		const next = await publishThenSaveDraft(onSave);
		expect(next.status).toBe('published');
	});
});
