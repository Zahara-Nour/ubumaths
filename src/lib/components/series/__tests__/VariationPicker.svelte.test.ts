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
