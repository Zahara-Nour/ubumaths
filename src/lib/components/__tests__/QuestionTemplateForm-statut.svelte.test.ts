/**
 * QuestionTemplateForm — boutons selon le statut, publication jugée par le serveur
 * ================================================================================
 *
 * Chantier `admin-modeles`, PR 1 (`outils-manquants.md` n° 22, points a, b, e) :
 * - modèle publié : « Enregistrer » (reste publié) et « Repasser en brouillon »
 *   (même confirmation que la liste) à la place de « Enregistrer brouillon » et
 *   « Publier » ;
 * - « Publier » ne refuse plus « réponse manquante » une version dont les réponses
 *   sont écrites dans le texte (`?4`, `?flèche`) : le serveur juge, et ses raisons
 *   (`serverErrors`) s'affichent dans l'encadré « Erreurs à corriger ».
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

/** Tableau de variations dont une valeur et deux flèches sont à compléter : aucun `blanks` */
const TABLEAU_A_COMPLETER = [
	'Complète le tableau de variations de $f$.',
	'',
	'```variation',
	'variable: x',
	'domain: -inf, -2, 2, +inf',
	'',
	'variation: f(x)',
	'  -inf: -inf, bottom',
	'  -2: ?4, top',
	'  2: -4, bottom',
	'  +inf: +inf, top',
	'  -inf,-2: ?flèche',
	'  -2,2: ?flèche',
	'```'
].join('\n');

function templateWith(status: 'draft' | 'published', statement: string): QuestionTemplate {
	return {
		id: '44444444-4444-4444-8444-444444444444',
		title: 'Compléter un tableau de variations',
		level: 5,
		grades: ['1_SPE'],
		status,
		variations: [{ statement: templateMarkdown(statement) }]
	} as unknown as QuestionTemplate;
}

async function renderForm(template: QuestionTemplate, serverErrors?: string[]) {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => Promise<boolean>>(
		async () => true
	);
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: { template, onSave, onCancel: () => {}, isSubmitting: false, serverErrors }
	});
	return onSave;
}

function savedAt(onSave: ReturnType<typeof vi.fn>, index: number): SavedTemplate {
	return onSave.mock.calls[index][0] as SavedTemplate;
}

describe('QuestionTemplateForm : brouillon à réponses dans le texte', () => {
	it('« Publier » envoie le modèle au serveur, sans « réponse manquante »', async () => {
		const onSave = await renderForm(templateWith('draft', TABLEAU_A_COMPLETER));
		await page.getByRole('button', { name: 'Publier', exact: true }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
		expect(savedAt(onSave, 0).status).toBe('published');
		await expect.element(page.getByText(/réponse manquante/)).not.toBeInTheDocument();
	});

	it('version sans aucune réponse : le client laisse juger le serveur', async () => {
		const onSave = await renderForm(templateWith('draft', 'Combien font $2+2$ ?'));
		await page.getByRole('button', { name: 'Publier', exact: true }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
	});
});

describe('QuestionTemplateForm : raisons du serveur', () => {
	it('`serverErrors` s’affichent dans « Erreurs à corriger »', async () => {
		await renderForm(templateWith('draft', TABLEAU_A_COMPLETER), [
			'Variation 1 : aucune réponse attendue'
		]);
		await expect.element(page.getByText('Erreurs à corriger :')).toBeInTheDocument();
		await expect
			.element(page.getByText('Variation 1 : aucune réponse attendue', { exact: false }))
			.toBeInTheDocument();
	});
});

describe('QuestionTemplateForm : modèle publié', () => {
	it('boutons « Enregistrer » et « Repasser en brouillon », plus « Publier » ni « Enregistrer brouillon »', async () => {
		await renderForm(templateWith('published', TABLEAU_A_COMPLETER));
		await expect
			.element(page.getByRole('button', { name: 'Enregistrer', exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Repasser en brouillon' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Publier', exact: true }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Enregistrer brouillon' }))
			.not.toBeInTheDocument();
	});

	it('« Enregistrer » le garde publié', async () => {
		const onSave = await renderForm(templateWith('published', TABLEAU_A_COMPLETER));
		await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
		expect(savedAt(onSave, 0).status).toBe('published');
	});

	it('« Repasser en brouillon » demande confirmation, envoie draft et affiche « Brouillon »', async () => {
		const onSave = await renderForm(templateWith('published', TABLEAU_A_COMPLETER));
		await page.getByRole('button', { name: 'Repasser en brouillon' }).click();
		const dialog = page.getByRole('dialog');
		await expect
			.element(dialog.getByText('Ce modèle ne sera plus proposé aux élèves.', { exact: false }))
			.toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
		await dialog.getByRole('button', { name: 'Repasser en brouillon' }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
		expect(savedAt(onSave, 0).status).toBe('draft');
		await expect.element(page.getByText('Brouillon', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Publier', exact: true }))
			.toBeInTheDocument();
		// Enregistré : rien ne reste « non sauvegardé »
		await expect.element(page.getByText('Modifications non sauvegardées')).not.toBeInTheDocument();
	});

	it('retour en brouillon refusé par le serveur → le modèle reste affiché publié', async () => {
		const onSave = vi.fn(async () => false);
		const main = document.body.appendChild(document.createElement('main'));
		await render(QuestionTemplateForm, {
			target: main,
			props: {
				template: templateWith('published', TABLEAU_A_COMPLETER),
				onSave,
				onCancel: () => {},
				isSubmitting: false
			}
		});
		await page.getByRole('button', { name: 'Repasser en brouillon' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Repasser en brouillon' }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
		await expect.element(page.getByText('Publié', { exact: true })).toBeInTheDocument();
	});

	it('mode JSON : après le retour en brouillon, revenir au formulaire garde « Brouillon »', async () => {
		const onSave = await renderForm(templateWith('published', TABLEAU_A_COMPLETER));
		await page.getByRole('button', { name: 'JSON', exact: true }).click();
		await expect
			.element(page.getByRole('button', { name: 'Formulaire', exact: true }))
			.toBeInTheDocument();
		await page.getByRole('button', { name: 'Repasser en brouillon' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Repasser en brouillon' }).click();
		await expect.poll(() => onSave.mock.calls.length).toBe(1);
		expect(savedAt(onSave, 0).status).toBe('draft');
		await page.getByRole('button', { name: 'Formulaire', exact: true }).click();
		await expect.element(page.getByText('Brouillon', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Publier', exact: true }))
			.toBeInTheDocument();
	});
});
