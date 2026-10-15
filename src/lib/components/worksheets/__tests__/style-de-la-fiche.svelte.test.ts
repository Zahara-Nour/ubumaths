/**
 * Le menu « Style » de la fiche (ADR 0028, lot 3b)
 * ================================================
 *
 * Le menu « Gabarit » devient « Style » (D9) : les styles de Chiphre, puis
 * ceux du prof. Une fiche sans style affiche « Fiche élève (par défaut) ».
 * Depuis l'ADR 0030, les points ne dépendent plus du style mais du type de la
 * fiche : voir `options-du-type.svelte.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MetadataCards from '../MetadataCards.svelte';
import NewWorksheetPage from '../../../../routes/(protected)/dashboard/teacher/contenu/worksheets/new/+page.svelte';
import { BUILT_IN_STYLE_OPTIONS } from '$lib/typst/templates/styles';
import { DEFAULT_TEMPLATE_IDS } from '$lib/typst/templates/default-templates';
import type { WorksheetWithRelations } from '$lib/types/worksheets';

const PROF_STYLE = {
	id: '6f1c2a4e-0000-4000-8000-00000000abcd',
	name: 'Mes contrôles',
	description: null
};
const STYLES = [...BUILT_IN_STYLE_OPTIONS, PROF_STYLE];

function worksheet(ids: {
	style_id?: string | null;
	template_id?: string | null;
}): WorksheetWithRelations {
	return {
		id: '550e8400-e29b-41d4-a716-446655440012',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		config: { show_points: true },
		style_id: ids.style_id ?? null,
		template_id: ids.template_id ?? null,
		grade_levels: [],
		tags: [],
		exercises: [],
		sections: []
	} as unknown as WorksheetWithRelations;
}

async function renderCards(
	ids: { style_id?: string | null; template_id?: string | null },
	onFieldChange: (field: string, value: unknown) => void = () => {}
) {
	return await render(MetadataCards, {
		props: { worksheet: worksheet(ids), styles: STYLES, onFieldChange }
	});
}

describe('le style affiché', () => {
	it('fiche sans style : « Fiche élève (par défaut) »', async () => {
		await renderCards({});
		await expect.element(page.getByText('Fiche élève (par défaut)')).toBeInTheDocument();
	});

	it('fiche d’avant le lot 3 : le style de son `template_id`', async () => {
		await renderCards({ template_id: DEFAULT_TEMPLATE_IDS.modern });
		await expect.element(page.getByRole('button', { name: 'Moderne' })).toBeInTheDocument();
	});

	it('style illisible : « Fiche élève (par défaut) », sans planter', async () => {
		await renderCards({ style_id: '6f1c2a4e-0000-4000-8000-0000000fffff' });
		await expect.element(page.getByText('Fiche élève (par défaut)')).toBeInTheDocument();
	});

	it('choisir un style écrit `style_id`', async () => {
		const onFieldChange = vi.fn();
		await renderCards({}, onFieldChange);
		await page.getByText('Fiche élève (par défaut)').click();
		await page.getByRole('button', { name: 'Choisir le style' }).click();
		await page.getByRole('option', { name: 'Mes contrôles' }).click();
		expect(onFieldChange).toHaveBeenCalledWith('style_id', PROF_STYLE.id);
	});
});

describe('la création d’une fiche', () => {
	it('« Fiche élève » présélectionné, plus d’option « Aucun »', async () => {
		await render(NewWorksheetPage, { props: { data: { styles: STYLES } } as never });
		await expect
			.element(page.getByRole('button', { name: 'Choisir le style' }))
			.toHaveTextContent('Fiche élève');
		await page.getByRole('button', { name: 'Choisir le style' }).click();
		await expect.element(page.getByRole('option', { name: 'Mes contrôles' })).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/Aucun template/i);
	});
});
