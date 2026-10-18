/**
 * PDF de l'élève : « avec réponses » ou « avec corrigé »
 * ======================================================
 *
 * La partie de fin s'appelle « Réponses » (résultats seuls) ou « Corrections »
 * (le corrigé : la correction seule en Shantell Sans et Chiphre Math). Dans les deux cas, seulement
 * les exercices dont la correction est visible.
 */
import { describe, it, expect } from 'vitest';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import { hasCorrectionFonts, withoutCorrectionFonts } from '$lib/typst/correction-fonts';
import {
	correctionFontBlocks,
	outsideCorrectionFontBlocks
} from '$lib/typst/__tests__/correction-font-blocks';
import type { StudentWorksheetView } from '$lib/types/worksheets';

function exercise(id: string, visible: boolean, answers: string | null) {
	return {
		id,
		exercise_id: `ex-${id}`,
		title: `Titre ${id}`,
		position: Number(id),
		section_id: null,
		points: null,
		is_essential: false,
		custom_instructions: null,
		statement: `ENONCE${id}`,
		correction: visible ? `CORRECTION${id}` : null,
		correction_visible: visible,
		answers: visible ? answers : null
	};
}

function worksheet(language: 'fr' | 'en' = 'fr'): StudentWorksheetView {
	return {
		id: 'w',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		instructions: null,
		show_corrections: true,
		language,
		sections: [],
		exercises: [
			exercise('1', true, 'REPONSE1'),
			exercise('2', true, null),
			exercise('3', false, null)
		]
	} as unknown as StudentWorksheetView;
}

describe('PDF élève avec réponses', () => {
	it('partie « Réponses » : réponses des exercices visibles, sans correction', () => {
		const typst = generateStudentWorksheetTypst(worksheet(), 'answers');
		// Lot 4b : la partie de fin a le bandeau du gabarit de la fiche
		expect(typst).toContain('[RÉPONSES]');
		expect(typst).not.toContain('[CORRECTION]');
		expect(typst).toContain('REPONSE1');
		expect(typst).not.toContain('CORRECTION1');
	});

	it('exercice visible sans réponses : renvoi au corrigé ; exercice masqué : rien', () => {
		const typst = generateStudentWorksheetTypst(worksheet(), 'answers');
		const part = typst.slice(typst.indexOf('[RÉPONSES]'));
		expect(part).toContain('Réponses non rédigées : voir le corrigé.');
		expect(part).toContain('Titre 2');
		expect(part).not.toContain('Titre 3');
	});

	it('anglais : « Answers »', () => {
		expect(generateStudentWorksheetTypst(worksheet('en'), 'answers')).toContain('[ANSWERS]');
	});

	it('police actuelle', () => {
		expect(hasCorrectionFonts(generateStudentWorksheetTypst(worksheet(), 'answers'))).toBe(false);
	});
});

describe('PDF élève avec corrigé', () => {
	it('partie « Corrections » en Shantell Sans et Chiphre Math, énoncés dans la police standard', () => {
		const typst = generateStudentWorksheetTypst(worksheet(), 'correction');
		const part = typst.indexOf('[CORRECTION]');
		expect(part).toBeGreaterThan(-1);
		expect(typst).toContain('CORRECTION1');
		expect(typst).not.toContain('REPONSE1');
		const rules = typst.indexOf('#set text(font: "Shantell Sans", weight: "light")');
		expect(rules).toBeGreaterThan(typst.indexOf('ENONCE2'));
		// La correction seule : bandeau et titres des exercices en police habituelle
		expect(rules).toBeGreaterThan(part);
		const blocks = correctionFontBlocks(typst);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toContain('CORRECTION1');
		expect(blocks[1]).toContain('CORRECTION2');
		const outside = outsideCorrectionFontBlocks(typst);
		expect(outside).toContain('Titre 1');
		expect(outside).toContain('[CORRECTION]');
	});

	it('option sans polices : le même PDF, police standard', () => {
		const withFonts = generateStudentWorksheetTypst(worksheet(), 'correction');
		const plain = generateStudentWorksheetTypst(worksheet(), 'correction', {
			correctionFonts: false
		});
		expect(hasCorrectionFonts(plain)).toBe(false);
		// Au saut de ligne près autour des règles retirées (sans effet sur le PDF)
		const lines = (typst: string) => typst.replace(/\n{2,}/g, '\n');
		expect(lines(withoutCorrectionFonts(withFonts))).toBe(lines(plain));
	});

	it('sans partie de fin : ni réponses, ni correction, ni polices', () => {
		const typst = generateStudentWorksheetTypst(worksheet(), 'none');
		expect(typst).not.toContain('REPONSE1');
		expect(typst).not.toContain('CORRECTION1');
		expect(hasCorrectionFonts(typst)).toBe(false);
	});
});
