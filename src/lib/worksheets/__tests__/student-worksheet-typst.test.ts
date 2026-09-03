/**
 * Tests for the student worksheet Typst generator
 *
 * Focus: the exercise header must never be separated from its statement by a
 * column or page break (Typst `block(sticky: true)`).
 */
import { describe, it, expect } from 'vitest';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import type { StudentWorksheetView } from '$lib/types/worksheets';

const createWorksheet = (overrides?: Partial<StudentWorksheetView>): StudentWorksheetView =>
	({
		id: 'worksheet-id',
		title: 'Fractions',
		description: null,
		type: 'worksheet',
		instructions: null,
		show_corrections: true,
		sections: [],
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Simplifier',
				position: 1,
				section_id: null,
				points: 3,
				is_essential: false,
				custom_instructions: null,
				statement: '- Calculer $\\frac{3}{4} + \\frac{5}{6}$.\n- Simplifier le resultat.',
				correction: 'Le resultat est 19/12.',
				correction_visible: true
			}
		],
		...overrides
	}) as unknown as StudentWorksheetView;

describe('generateStudentWorksheetTypst', () => {
	it('puts the exercise header in a sticky block, ahead of the statement', () => {
		const typst = generateStudentWorksheetTypst(createWorksheet(), false);

		// The badge lives inside a sticky block...
		expect(typst).toMatch(
			/#block\(sticky: true, below: 0\.6em\)\[\n#box\(fill: rgb\("#dc2626"\)[^\n]*\[1\]\]/
		);
		// ...and the statement is outside of it
		expect(typst).toMatch(/\]\n\n#list\(/);
	});

	it('keeps the points and instructions with the header', () => {
		const worksheet = createWorksheet();
		worksheet.exercises![0].custom_instructions = 'Detailler les etapes.';

		const typst = generateStudentWorksheetTypst(worksheet, false);
		const stickyBlock = typst.slice(typst.indexOf('#block(sticky: true'), typst.indexOf('#list('));

		expect(stickyBlock).toContain('3 points');
		expect(stickyBlock).toContain('Detailler les etapes.');
	});

	it('makes the correction header sticky too', () => {
		const typst = generateStudentWorksheetTypst(createWorksheet(), true);

		expect(typst).toContain('= Corrections');
		expect(typst).toMatch(/#block\(fill: rgb\("#f0fdf4"\)[^\n]*\[\n {2}#block\(sticky: true/);
	});
});

describe('student worksheet language', () => {
	it('keeps the French chrome by default', () => {
		const typst = generateStudentWorksheetTypst(
			createWorksheet({
				instructions: 'Faites tout',
				exercises: [
					{
						...createWorksheet().exercises[0],
						is_essential: true
					}
				]
			}),
			true
		);

		expect(typst).toContain('lang: "fr"');
		expect(typst).toContain('Fiche de travail');
		expect(typst).toContain('Exercices indispensables');
		expect(typst).toContain('= Corrections');
	});

	it('writes the chrome in English when the worksheet is', () => {
		const typst = generateStudentWorksheetTypst(
			createWorksheet({
				language: 'en',
				instructions: 'Do everything',
				exercises: [
					{
						...createWorksheet().exercises[0],
						is_essential: true
					}
				]
			}),
			true
		);

		expect(typst).toContain('lang: "en"');
		expect(typst).toContain('Worksheet');
		expect(typst).toContain('Essential exercises');
		expect(typst).toContain('= Answers');
		// No French chrome left on an English sheet.
		expect(typst).not.toContain('Fiche de travail');
		expect(typst).not.toContain('Exercices indispensables');
		expect(typst).not.toContain('= Corrections');
	});
});
