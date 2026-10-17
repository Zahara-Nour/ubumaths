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
import MetadataCards from '../MetadataCards.svelte';
import NewWorksheetPage from '../../../../routes/(protected)/dashboard/teacher/contenu/worksheets/new/+page.svelte';
import type { WorksheetWithRelations } from '$lib/types/worksheets';
import { BUILT_IN_STYLE_OPTIONS } from '$lib/typst/templates/styles';

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
		// Options du type (ADR 0030) : visibles sans clic
		await expect.poll(() => document.body.textContent).toMatch(/Mélanger les \S+s/);
		expect(document.body.textContent).not.toMatch(/M[ée]langer (dans les )?sections/);
	});

	it('création d’une fiche : pas de case « Melanger dans les sections »', async () => {
		await render(NewWorksheetPage, {
			props: { data: { styles: BUILT_IN_STYLE_OPTIONS } } as never
		});
		await expect.poll(() => document.body.textContent).toMatch(/Mélanger les \S+s/);
		expect(document.body.textContent).not.toMatch(/M[ée]langer dans les sections/);
	});
});
