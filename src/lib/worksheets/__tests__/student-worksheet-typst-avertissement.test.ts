/**
 * PDF de l'aperçu « vue prof » d'une affectation individualisée (D6)
 * =================================================================
 *
 * La vue prof s'appuie sur la copie d'un élève : son PDF imprime en tête,
 * dans la langue de la fiche, « Chaque élève a sa propre version : consulte
 * ta correction personnelle. ». Sans l'option (copie d'un élève, affectation
 * commune) : rien ne change.
 */
import { describe, expect, it } from 'vitest';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import type { StudentWorksheetView } from '$lib/types/worksheets';

const FR = 'Chaque élève a sa propre version : consulte ta correction personnelle.';
const EN = 'Each student has their own version: check your personal correction.';

function view(language: 'fr' | 'en' = 'fr'): StudentWorksheetView {
	return {
		title: 'Dérivées',
		description: null,
		type: 'worksheet',
		language,
		instructions: null,
		show_corrections: true,
		sections: [],
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Calculer une dérivée',
				position: 1,
				section_id: null,
				points: null,
				is_essential: false,
				custom_instructions: null,
				statement: 'ENONCEUNIQUE',
				correction: 'CORRECTIONUNIQUE',
				correction_visible: true
			}
		]
	} as unknown as StudentWorksheetView;
}

describe('PDF de la vue prof : avertissement de copie individuelle', () => {
	it.each(['none', 'answers', 'correction'] as const)(
		'fin « %s » : imprimé en tête, avant le premier exercice',
		(ending) => {
			const typst = generateStudentWorksheetTypst(view(), ending, { individualCopyNotice: true });
			expect(typst).toContain(FR);
			expect(typst.indexOf(FR)).toBeLessThan(typst.indexOf('ENONCEUNIQUE'));
			expect(typst).toContain('Calculer une dérivée');
		}
	);

	it('fiche en anglais : en anglais', () => {
		const typst = generateStudentWorksheetTypst(view('en'), 'correction', {
			individualCopyNotice: true
		});
		expect(typst).toContain(EN);
		expect(typst).not.toContain(FR);
	});

	it('sans l’option : aucun avertissement', () => {
		expect(generateStudentWorksheetTypst(view(), 'correction')).not.toContain(FR);
	});
});
