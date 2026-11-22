/**
 * VariationPicker — choix des variations d'une ligne de série (idées-format, idée 2)
 *
 * Chaque variation est montrée par un exemple (Q1) ; toutes cochées = pas de
 * choix ; la dernière case cochée ne se décoche pas ; rien pour un modèle à
 * une seule variation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import VariationPicker from '../VariationPicker.svelte';
import type { QuestionTemplate, QuestionVariation } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

function variation(statement: string): QuestionVariation {
	return {
		statement: templateMarkdown(statement),
		blanks: [{ expectedAnswer: '0' }]
	} as QuestionVariation;
}

function model(variations: QuestionVariation[]): QuestionTemplate {
	return { id: 'aires', title: 'Aires', status: 'draft', variations, grades: ['6'], level: 1 };
}

const AIRES = model([
	variation('Aire du disque : $\\mathcal{A} = ?$'),
	variation('Aire du triangle : $\\mathcal{A} = ?$'),
	variation('Aire du rectangle : $\\mathcal{A} = ?$')
]);

async function openPicker(selected?: number[]) {
	const onchange = vi.fn();
	const screen = await render(VariationPicker, { template: AIRES, selected, onchange });
	await screen.getByRole('button', { name: /variations/ }).click();
	return { screen, onchange };
}

describe('VariationPicker', () => {
	it('résume le choix : toutes, ou combien sur combien', async () => {
		const all = await render(VariationPicker, { template: AIRES, onchange: vi.fn() });
		await expect.element(all.getByText('Toutes les variations (3)')).toBeInTheDocument();
		await all.unmount();

		const some = await render(VariationPicker, {
			template: AIRES,
			selected: [0, 2],
			onchange: vi.fn()
		});
		await expect.element(some.getByText('2 variations sur 3')).toBeInTheDocument();
	});

	it('un modèle à une seule variation n’affiche rien', async () => {
		const screen = await render(VariationPicker, {
			template: model([variation('Seule : $x = ?$')]),
			onchange: vi.fn()
		});
		expect(screen.container.querySelector('[data-choix-variations]')).toBeNull();
	});

	it('montre un exemple de chaque variation, à côté de sa case', async () => {
		await openPicker();
		await expect.element(page.getByRole('checkbox', { name: 'Variation 1' })).toBeChecked();
		await expect
			.element(page.getByText('Aire du triangle', { exact: false }).first())
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Aire du rectangle', { exact: false }).first())
			.toBeInTheDocument();
	});

	it('décocher une variation rend le choix restant', async () => {
		const { onchange } = await openPicker();
		await page.getByRole('checkbox', { name: 'Variation 2' }).click();
		expect(onchange).toHaveBeenCalledWith([0, 2]);
	});

	it('tout recocher rend « toutes » (pas de choix)', async () => {
		const { onchange } = await openPicker([0, 2]);
		await page.getByRole('checkbox', { name: 'Variation 2' }).click();
		expect(onchange).toHaveBeenCalledWith(undefined);
	});

	it('la dernière case cochée ne se décoche pas', async () => {
		await openPicker([1]);
		await expect.element(page.getByRole('checkbox', { name: 'Variation 2' })).toBeDisabled();
		await expect.element(page.getByRole('checkbox', { name: 'Variation 1' })).not.toBeChecked();
	});
});

// Idée 4, PR 4 : case « En QCM » par variation

function withErrors(statement: string, extra: Record<string, unknown> = {}): QuestionVariation {
	return {
		statement: templateMarkdown(statement),
		blanks: [
			{
				expectedAnswer: '12',
				expectedErrors: [{ answer: '4', message: 'Tu as soustrait.' }],
				...extra
			}
		]
	} as QuestionVariation;
}

const CALCULS = model([
	withErrors('Calcule : $8 + 4 = ?$'),
	variation('Aire du triangle : $\\mathcal{A} = ?$'),
	withErrors('Calcule encore : $8 + 4 = ?$', { neverChoice: true })
]);

async function openQcm(template: QuestionTemplate, options: Record<string, unknown> = {}) {
	const onchange = vi.fn();
	const onchoicechange = vi.fn();
	const screen = await render(VariationPicker, {
		template,
		onchange,
		onchoicechange,
		...options
	});
	await screen.getByRole('button').click();
	return { screen, onchange, onchoicechange };
}

describe('VariationPicker — en QCM (idée 4)', () => {
	it('case « En QCM » seulement pour une variation à erreurs prévues sans veto', async () => {
		await openQcm(CALCULS);
		await expect
			.element(page.getByRole('checkbox', { name: 'Variation 1 en QCM' }))
			.not.toBeChecked();
		expect(page.getByRole('checkbox', { name: 'Variation 2 en QCM' }).query()).toBeNull();
		expect(page.getByRole('checkbox', { name: 'Variation 3 en QCM' }).query()).toBeNull();
	});

	it('cocher « En QCM » rend les variations en QCM', async () => {
		const { onchoicechange } = await openQcm(CALCULS);
		await page.getByRole('checkbox', { name: 'Variation 1 en QCM' }).click();
		expect(onchoicechange).toHaveBeenCalledWith([0]);
	});

	it('décocher le dernier « En QCM » rend « aucune »', async () => {
		const { onchoicechange } = await openQcm(CALCULS, { choiceSelected: [0] });
		await page.getByRole('checkbox', { name: 'Variation 1 en QCM' }).click();
		expect(onchoicechange).toHaveBeenCalledWith(undefined);
	});

	it('retirer une variation retire aussi son QCM', async () => {
		const { onchange, onchoicechange } = await openQcm(CALCULS, { choiceSelected: [0] });
		await page.getByRole('checkbox', { name: 'Variation 1', exact: true }).click();
		expect(onchoicechange).toHaveBeenCalledWith(undefined);
		expect(onchange).toHaveBeenCalledWith([1, 2]);
	});

	it('le résumé dit combien de variations sont en QCM', async () => {
		const screen = await render(VariationPicker, {
			template: CALCULS,
			choiceSelected: [0],
			onchange: vi.fn(),
			onchoicechange: vi.fn()
		});
		await expect
			.element(screen.getByText('Toutes les variations (3) · 1 en QCM'))
			.toBeInTheDocument();
	});

	it('un modèle à une seule variation, à erreurs prévues : le bouton propose le QCM', async () => {
		const { onchoicechange } = await openQcm(model([withErrors('Calcule : $8 + 4 = ?$')]));
		expect(page.getByRole('checkbox', { name: 'Variation 1', exact: true }).query()).toBeNull();
		await page.getByRole('checkbox', { name: 'Variation 1 en QCM' }).click();
		expect(onchoicechange).toHaveBeenCalledWith([0]);
	});

	it('sans `onchoicechange` (élève, lien) : aucune case « En QCM »', async () => {
		await render(VariationPicker, { template: CALCULS, onchange: vi.fn() });
		await page.getByRole('button').click();
		expect(page.getByRole('checkbox', { name: 'Variation 1 en QCM' }).query()).toBeNull();
	});

	it('erreurs prévues, mais question qui ne se pose pas en QCM au tirage : rien à régler', async () => {
		const screen = await render(VariationPicker, {
			template: model([
				withErrors('Calcule : $8 + 4 = ?$', {
					precision: { type: 'tolerance', tolerance: 0.5, mode: 'absolute' }
				})
			]),
			onchange: vi.fn(),
			onchoicechange: vi.fn()
		});
		expect(screen.container.querySelector('[data-choix-variations]')).toBeNull();
	});

	it('retirer une variation retire son QCM enregistré, même hors de l’affichage', async () => {
		// Variation 3 : QCM enregistré (lien fabriqué, modèle changé) mais sous veto, donc invisible
		const { onchoicechange } = await openQcm(CALCULS, { choiceSelected: [0, 2] });
		await page.getByRole('checkbox', { name: 'Variation 3', exact: true }).click();
		expect(onchoicechange).toHaveBeenCalledWith([0]);
	});
});
