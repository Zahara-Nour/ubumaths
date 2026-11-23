/**
 * Éditeur de série (chantier `idees-format`, idée 2, PR 4) : le prof choisit
 * les variations d'une ligne, comme dans le panier ; le choix est enregistré
 * avec la ligne, « toutes » n'enregistre rien.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({
		goto: vi.fn(async () => {})
	})
);
const { submitAction } = vi.hoisted(() => ({
	submitAction: vi.fn(async (_action: string, _form: FormData) => ({ ok: true }))
}));
vi.mock('#lib/utils/form-action.ts', () => ({ submitAction }));
vi.mock('#lib/stores/toaster.svelte.ts', () => ({
	toaster: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

import Page from '../+page.svelte';
import type { DbSeries } from '#lib/types/evaluation.ts';
import type { QuestionTemplate, QuestionVariation } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// Constantes
const AIRES_ID = '11111111-1111-4111-8111-111111111111';
const SEULE_ID = '22222222-2222-4222-8222-222222222222';
const CALCUL_ID = '33333333-3333-4333-8333-333333333333';

// Functions
function variation(statement: string): QuestionVariation {
	return {
		statement: templateMarkdown(statement),
		blanks: [{ expectedAnswer: '0' }]
	} as QuestionVariation;
}

function model(id: string, title: string, variations: QuestionVariation[]): QuestionTemplate {
	return { id, title, status: 'published', variations, grades: ['6'], level: 1 };
}

const TEMPLATES = [
	model(AIRES_ID, 'Aires', [
		variation('Aire du disque : $\\mathcal{A} = ?$'),
		variation('Aire du triangle : $\\mathcal{A} = ?$'),
		variation('Aire du rectangle : $\\mathcal{A} = ?$')
	]),
	model(SEULE_ID, 'Seule', [variation('Seule : $x = ?$')]),
	model(CALCUL_ID, 'Calcul', [
		{
			statement: templateMarkdown('Calcule : $8 + 4 = ?$'),
			blanks: [
				{ expectedAnswer: '12', expectedErrors: [{ answer: '4', message: 'Tu as soustrait.' }] }
			]
		} as QuestionVariation
	])
];

function series(items: DbSeries['items']): DbSeries {
	return {
		id: 'serie',
		title: 'Aires',
		description: null,
		grade: '6',
		items,
		created_by: 'prof',
		created_at: '2026-11-21T10:00:00Z',
		updated_at: '2026-11-21T10:00:00Z'
	};
}

async function renderPage(data: DbSeries) {
	submitAction.mockClear();
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: {
			data: { series: data, templates: TEMPLATES, durationSignals: null, observedDurations: null }
		} as never
	});
}

async function savedItems(screen: Awaited<ReturnType<typeof renderPage>>) {
	await screen.getByRole('button', { name: 'Enregistrer' }).click();
	await vi.waitFor(() => expect(submitAction).toHaveBeenCalled());
	return JSON.parse(String(submitAction.mock.calls[0][1].get('items'))) as unknown;
}

describe('Éditeur de série — choix des variations', () => {
	it('montre le choix enregistré ; rien sur un modèle à une seule variation', async () => {
		const screen = await renderPage(
			series([
				{ templateId: AIRES_ID, quantity: 4, delay: 20, variations: [0, 2] },
				{ templateId: SEULE_ID, quantity: 2, delay: 20 }
			])
		);
		const rows = screen.container.querySelectorAll('li');
		expect(rows[0].querySelector('[data-choix-variations]')?.textContent).toContain(
			'2 variations sur 3'
		);
		expect(rows[1].querySelector('[data-choix-variations]')).toBeNull();
		await screen.unmount();
	});

	it('décocher une variation l’enregistre avec la ligne', async () => {
		const screen = await renderPage(series([{ templateId: AIRES_ID, quantity: 4, delay: 20 }]));
		await screen.getByRole('button', { name: /Toutes les variations/ }).click();
		await page.getByRole('checkbox', { name: 'Variation 2' }).click();
		await page.getByRole('button', { name: 'Fermer' }).last().click();
		expect(await savedItems(screen)).toEqual([
			{ templateId: AIRES_ID, quantity: 4, delay: 20, variations: [0, 2] }
		]);
		await screen.unmount();
	});

	it('tout recocher retire le choix de la ligne', async () => {
		const screen = await renderPage(
			series([{ templateId: AIRES_ID, quantity: 4, delay: 20, variations: [0, 2] }])
		);
		await screen.getByRole('button', { name: /2 variations sur 3/ }).click();
		await page.getByRole('checkbox', { name: 'Variation 2' }).click();
		await page.getByRole('button', { name: 'Fermer' }).last().click();
		expect(await savedItems(screen)).toEqual([{ templateId: AIRES_ID, quantity: 4, delay: 20 }]);
		await screen.unmount();
	});

	it('idée 4 : cocher « En QCM » l’enregistre avec la ligne', async () => {
		const screen = await renderPage(series([{ templateId: CALCUL_ID, quantity: 3, delay: 20 }]));
		await screen.getByRole('button', { name: 'Réponse en saisie' }).click();
		await page.getByRole('checkbox', { name: 'Variation 1 en QCM' }).click();
		await page.getByRole('button', { name: 'Fermer' }).last().click();
		expect(await savedItems(screen)).toEqual([
			{ templateId: CALCUL_ID, quantity: 3, delay: 20, choiceVariations: [0] }
		]);
		await screen.unmount();
	});
});
