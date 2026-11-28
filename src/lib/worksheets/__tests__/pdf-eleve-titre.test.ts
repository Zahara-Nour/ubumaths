/**
 * Le PDF de l'élève imprime le niveau, la catégorie et les notions (ADR 0041)
 * ===========================================================================
 *
 * Même en-tête et même bas de page que le PDF du prof : badge du niveau, titre
 * composé (notions en grand, catégorie en petit dessous) ou titre libre. Avant
 * cette PR, la vue de l'élève ne transmettait pas le niveau au PDF.
 */
import { describe, expect, it } from 'vitest';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import type { StudentWorksheetView } from '#lib/types/worksheets.ts';

function view(overrides: Partial<StudentWorksheetView> = {}): StudentWorksheetView {
	return {
		assignment_id: 'a-1',
		worksheet_id: 'w-1',
		title: 'Suites · Entraînement technique',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: false,
		class_name: null,
		read_only: false,
		sections: [],
		exercises: [],
		...overrides
	} as StudentWorksheetView;
}

describe('PDF de l’élève : niveau, catégorie, notions', () => {
	it('titre composé : badge du niveau, notion en grand, catégorie dessous', () => {
		const typst = generateStudentWorksheetTypst(
			view({
				grades: ['1_SPE'],
				category: 'technical_practice',
				custom_title: false,
				classifications: [{ node_id: 'n1', name: 'Suites', position: 0 }]
			}),
			'none'
		);
		expect(typst).toContain('[1ère Spé]');
		expect(typst).toContain('[Suites]');
		expect(typst).toContain('[entraînement technique]');
		expect(typst).toContain('Suites · Entraînement technique');
	});

	it('vue sans ces champs (ancienne réponse) : le titre tel quel, sans badge', () => {
		const typst = generateStudentWorksheetTypst(view({ title: 'Fractions' }), 'none');
		expect(typst).toContain('[Fractions]');
		expect(typst).not.toContain('Spé');
	});
});
