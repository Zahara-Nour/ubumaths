/**
 * QuestionTemplateForm — coup de pouce d'une variation (idée 5, `idees-format`)
 * ============================================================================
 *
 * Q1 → C (David, 2026-11-22) : un indice écrit, ou la case « la première étape de
 * la correction sert de coup de pouce ». Le formulaire construit chaque variation
 * champ par champ : sans lui, l'indice serait PERDU à l'enregistrement.
 *
 * On asserte le MODÈLE ENREGISTRÉ (payload de `onSave`), pas l'écran.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate, QuestionVariation } from '#lib/questions/types.ts';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

const HINT = templateMarkdown('Pense à la table de {{a}}.');
const CORRECTION = {
	steps: [templateMarkdown('On décompose.'), templateMarkdown('Donc {{solution}}.')]
};

function baseTemplate(variations: QuestionVariation[]): QuestionTemplate {
	return {
		id: '66666666-6666-4666-8666-666666666666',
		type: 'fill_in_blanks',
		title: 'Coup de pouce',
		level: 1,
		grades: ['6'],
		status: 'draft',
		variations
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

const FIRST_STEP = 'La première étape de la correction sert de coup de pouce';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('QuestionTemplateForm — coup de pouce', () => {
	it('un indice écrit est gardé à l’enregistrement', async () => {
		const saved = await renderAndSave(
			baseTemplate([{ statement: templateMarkdown('$3 \\times 4 = ?$'), hint: HINT }])
		);
		expect(saved.variations[0].hint).toBe(HINT);
		expect(saved.variations[0].hintFromFirstStep).toBeUndefined();
	});

	it('la case « première étape » est gardée à l’enregistrement', async () => {
		const saved = await renderAndSave(
			baseTemplate([
				{
					statement: templateMarkdown('$3 \\times 4 = ?$'),
					correction: CORRECTION,
					hintFromFirstStep: true
				}
			])
		);
		expect(saved.variations[0].hintFromFirstStep).toBe(true);
		expect(saved.variations[0].hint).toBeUndefined();
	});

	it('cocher « première étape » remplace l’indice écrit (jamais les deux)', async () => {
		const saved = await renderAndSave(
			baseTemplate([
				{ statement: templateMarkdown('$3 \\times 4 = ?$'), correction: CORRECTION, hint: HINT }
			]),
			async () => {
				await page.getByRole('checkbox', { name: FIRST_STEP }).click();
			}
		);
		expect(saved.variations[0].hintFromFirstStep).toBe(true);
		expect(saved.variations[0].hint).toBeUndefined();
	});

	it('sans coup de pouce : aucun champ écrit', async () => {
		const saved = await renderAndSave(
			baseTemplate([{ statement: templateMarkdown('$3 \\times 4 = ?$') }])
		);
		expect(saved.variations[0]).not.toHaveProperty('hint');
		expect(saved.variations[0]).not.toHaveProperty('hintFromFirstStep');
	});

	it('cocher « première étape » marque le modèle comme modifié', async () => {
		const template = {
			...baseTemplate([
				{ statement: templateMarkdown('$3 \\times 4 = ?$'), correction: CORRECTION }
			]),
			status: 'published'
		} as QuestionTemplate;
		const main = document.body.appendChild(document.createElement('main'));
		await render(QuestionTemplateForm, {
			target: main,
			props: { template, onSave: () => {}, onCancel: () => {}, isSubmitting: false }
		});
		// Retour en brouillon : la page reste ouverte, rien n'est plus « non sauvegardé »
		await page.getByRole('button', { name: 'Repasser en brouillon' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Repasser en brouillon' }).click();
		await expect.element(page.getByText('Modifications non sauvegardées')).not.toBeInTheDocument();

		await page.getByRole('checkbox', { name: FIRST_STEP }).click();
		await expect.element(page.getByText('Modifications non sauvegardées')).toBeInTheDocument();
	});

	it('dupliquer une variation copie son coup de pouce', async () => {
		const saved = await renderAndSave(
			baseTemplate([
				{ statement: templateMarkdown('$3 \\times 4 = ?$'), hint: HINT },
				{ statement: templateMarkdown('$5 \\times 6 = ?$') }
			]),
			async () => {
				await page.getByRole('button', { name: /^Variation 2/ }).click();
				await page.getByRole('button', { name: 'Dupliquer depuis une autre variation' }).click();
				await page.getByRole('button', { name: 'Dupliquer', exact: true }).click();
			}
		);
		expect(saved.variations[1].hint).toBe(HINT);
	});
});
