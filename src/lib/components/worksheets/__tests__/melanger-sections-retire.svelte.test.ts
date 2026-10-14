/**
 * Case « Mélanger dans les sections » retirée (décision D6 de David, 2026-10-13)
 * =============================================================================
 *
 * `shuffle_within_sections` n'était lue par aucun chemin : « mélanger les
 * exercices » mélange déjà à l'intérieur de chaque section (et toute la fiche
 * quand elle n'a pas de section). La case disparaît de la fiche et du
 * formulaire de création ; « Mélanger les exercices » reste. La donnée reste
 * en base, plus lue.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MetadataCards from '../MetadataCards.svelte';
import NewWorksheetPage from '../../../../routes/(protected)/dashboard/teacher/contenu/worksheets/new/+page.svelte';
import type { WorksheetWithRelations } from '$lib/types/worksheets';

const WORKSHEET = {
	id: '550e8400-e29b-41d4-a716-446655440011',
	title: 'Fiche',
	description: null,
	type: 'worksheet',
	// Une fiche qui avait coché l'ancienne case : on ne la lit plus
	config: { shuffle_exercises: false, shuffle_within_sections: true },
	grade_levels: [],
	tags: [],
	exercises: [],
	sections: []
} as unknown as WorksheetWithRelations;

describe('« Mélanger dans les sections » : plus dans l’interface', () => {
	it('fiche : ni résumé « Sections », ni case, « Mélanger les exercices » reste', async () => {
		await render(MetadataCards, {
			props: { worksheet: WORKSHEET, onFieldChange: () => {} }
		});
		// Résumé : l'ancienne case ne produit plus de « Melange: Sections »
		expect(document.body.textContent).not.toMatch(/Melange:\s*Sections/);
		// Édition des options
		await page.getByText('En-tete').click();
		await expect.poll(() => document.body.textContent).toMatch(/Melanger \S+s/);
		expect(document.body.textContent).not.toContain('Melanger sections');
	});

	it('création d’une fiche : pas de case « Melanger dans les sections »', async () => {
		await render(NewWorksheetPage, { props: { data: { templates: [] } } as never });
		await page.getByText('Options d’affichage'.replace('’', "'")).click();
		await expect.poll(() => document.body.textContent).toContain('Options de melange');
		expect(document.body.textContent).toMatch(/Melanger les \S+s/);
		expect(document.body.textContent).not.toContain('Melanger dans les sections');
	});
});
