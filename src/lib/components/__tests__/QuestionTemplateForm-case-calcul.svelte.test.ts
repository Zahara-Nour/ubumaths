/**
 * QuestionTemplateForm — cases « primitive » et « solution-ed »
 * =============================================================
 *
 * Les réglages des cases (`shared.blankDefaults` : nature et champs) survivent à
 * l'enregistrement : le formulaire les lit et les réécrit tels quels.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionTemplateForm from '../QuestionTemplateForm.svelte';
import { templateMarkdown } from '$lib/ubumark';
import type { BlankDefaults, QuestionTemplate } from '$lib/questions/types';

type SavedTemplate = Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

function calculusTemplate(blankDefaults: BlankDefaults): QuestionTemplate {
	return {
		id: '44444444-4444-4444-8444-444444444444',
		title: 'Primitive',
		theme: 'Analyse',
		domain: 'Primitives',
		level: 1,
		grades: ['T_SPE'],
		status: 'draft',
		shared: { blankDefaults },
		variations: [
			{
				statement: templateMarkdown('Une primitive : $F(x)=?$'),
				blanks: [{ expectedAnswer: 'x^3' }]
			}
		]
	} as unknown as QuestionTemplate;
}

async function saveRoundTrip(blankDefaults: BlankDefaults): Promise<SavedTemplate> {
	const onSave = vi.fn<(t: SavedTemplate, options?: { silent?: boolean }) => void>();
	const main = document.body.appendChild(document.createElement('main'));
	await render(QuestionTemplateForm, {
		target: main,
		props: {
			template: calculusTemplate(blankDefaults),
			onSave,
			onCancel: () => {},
			isSubmitting: false
		}
	});
	await page.getByRole('button', { name: 'Enregistrer brouillon' }).click();
	await expect.poll(() => onSave.mock.calls.length).toBe(1);
	return onSave.mock.calls[0][0];
}

describe('QuestionTemplateForm — cases de calcul', () => {
	it('primitive : nature et champs conservés', async () => {
		const blankDefaults: BlankDefaults = {
			answerKind: 'primitive',
			integrand: '3x^2',
			interval: ']0;+\\infty['
		};
		const saved = await saveRoundTrip(blankDefaults);
		expect(saved.shared?.blankDefaults).toEqual(blankDefaults);
	});

	it('solution-ed : mode générale et équation conservés', async () => {
		const blankDefaults: BlankDefaults = {
			answerKind: 'solution-ed',
			solutionMode: 'generale',
			equation: "y'=2y-6"
		};
		const saved = await saveRoundTrip(blankDefaults);
		expect(saved.shared?.blankDefaults).toEqual(blankDefaults);
	});

	it('intervalles : bornes ouvrables conservées', async () => {
		const blankDefaults: BlankDefaults = { answerKind: 'intervalles', openableBounds: true };
		const saved = await saveRoundTrip(blankDefaults);
		expect(saved.shared?.blankDefaults).toEqual(blankDefaults);
	});
});
