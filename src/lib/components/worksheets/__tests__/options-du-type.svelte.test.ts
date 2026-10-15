/**
 * Les options de la fiche suivent son type (ADR 0030, lot 1)
 * ==========================================================
 *
 * Le panneau « Options d'affichage » disparaît : sur la page de la fiche
 * (MetadataCards) comme à la création, seules les options du type choisi
 * apparaissent, plus « Mélanger les exercices ».
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MetadataCards from '../MetadataCards.svelte';
import NewWorksheetPage from '../../../../routes/(protected)/dashboard/teacher/contenu/worksheets/new/+page.svelte';
import { BUILT_IN_STYLE_OPTIONS } from '$lib/typst/templates/styles';
import type { WorksheetConfig, WorksheetType, WorksheetWithRelations } from '$lib/types/worksheets';

function worksheet(type: WorksheetType, config: WorksheetConfig = {}): WorksheetWithRelations {
	return {
		id: '550e8400-e29b-41d4-a716-446655440013',
		title: 'Fiche',
		description: null,
		type,
		config,
		style_id: null,
		template_id: null,
		grade_levels: [],
		tags: [],
		exercises: [],
		sections: []
	} as unknown as WorksheetWithRelations;
}

async function cardsText(
	type: WorksheetType,
	onFieldChange: (field: string, value: unknown) => void = () => {}
): Promise<string> {
	await render(MetadataCards, { props: { worksheet: worksheet(type), onFieldChange } });
	await expect.poll(() => document.body.textContent).toMatch(/Mélanger les/);
	return document.body.textContent ?? '';
}

describe('page de la fiche : les options du type seulement', () => {
	it("fiche d'exercices : « Nom de l'élève » et le mélange, rien d'autre", async () => {
		const text = await cardsText('worksheet');
		expect(text).toContain("Nom de l'élève");
		for (const absent of ['Points par', 'Calculatrice', 'Réponses sur le sujet', 'Date de rendu']) {
			expect(text).not.toContain(absent);
		}
		// Plus aucune ancienne option d'affichage
		for (const gone of ["Options d'affichage", 'Numerotation', 'Format', 'Correction imprimée']) {
			expect(text).not.toContain(gone);
		}
	});

	it('évaluation écrite : points, calculatrice, réponses sur le sujet', async () => {
		const text = await cardsText('assessment');
		for (const present of ['Points par', 'Calculatrice', 'Réponses sur le sujet']) {
			expect(text).toContain(present);
		}
		expect(text).not.toContain('Date de rendu');
		expect(text).not.toContain("Nom de l'élève");
	});

	it('devoir maison : la date de rendu seulement', async () => {
		const text = await cardsText('homework');
		expect(text).toContain('Date de rendu');
		for (const absent of ['Points par', 'Calculatrice', 'Réponses sur le sujet']) {
			expect(text).not.toContain(absent);
		}
	});

	it('examen blanc : calculatrice, réponses sur le sujet ; points toujours imprimés', async () => {
		const text = await cardsText('exam');
		expect(text).toContain('Calculatrice');
		expect(text).toContain('Réponses sur le sujet');
		expect(text).toContain('toujours imprimés');
		expect(text).not.toContain('Date de rendu');
	});

	it("cocher « Nom de l'élève » écrit `show_student_name` dans la config", async () => {
		const onFieldChange = vi.fn();
		await cardsText('worksheet', onFieldChange);
		await page.getByText("Nom de l'élève").click();
		expect(onFieldChange).toHaveBeenCalledWith(
			'config',
			expect.objectContaining({ show_student_name: true })
		);
	});
});

describe('création d’une fiche', () => {
	it("type par défaut (fiche d'exercices) : « Nom de l'élève », sans les options des autres types", async () => {
		await render(NewWorksheetPage, {
			props: { data: { styles: BUILT_IN_STYLE_OPTIONS } } as never
		});
		await expect.poll(() => document.body.textContent).toContain("Nom de l'élève");
		const text = document.body.textContent ?? '';
		expect(text).not.toContain('Calculatrice');
		expect(text).not.toContain("Options d'affichage");
		expect(text).toMatch(/Mélanger les \S+s/);
	});
});
