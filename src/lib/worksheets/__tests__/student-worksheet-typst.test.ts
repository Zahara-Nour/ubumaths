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

// Lot 4b : le PDF de l'élève prend le gabarit du style de la fiche (« Fiche
// élève » par défaut, numéros sur carré ambre) ; l'en-tête reste collé à
// l'énoncé, la consigne avec lui.
describe('generateStudentWorksheetTypst', () => {
	const STICKY = '#block(width: 100%, inset: 0pt, sticky: true, below: 0.3em)[';
	const BADGE =
		'box(fill: rgb("#e8590c"), radius: 3pt, inset: (x: 6pt, y: 3pt))[#text(fill: white, weight: "bold")[1]]';

	it('puts the exercise header in a sticky block, ahead of the statement', () => {
		const typst = generateStudentWorksheetTypst(createWorksheet(), 'none');
		const sticky = typst.indexOf(STICKY);
		const badge = typst.indexOf(BADGE);
		const statement = typst.indexOf('#ubu-item(');

		expect(sticky).toBeGreaterThan(-1);
		// Le carré du numéro dans le bloc collant, l'énoncé après lui
		expect(badge).toBeGreaterThan(sticky);
		expect(statement).toBeGreaterThan(badge);
		expect(typst.slice(sticky, statement)).toContain('\n]\n#block(width: 100%');
	});

	it('keeps the instructions with the header (and the points, for a style that prints them)', () => {
		const worksheet = createWorksheet({ style_id: '00000000-0000-4000-8000-000000000001' });
		worksheet.exercises![0].custom_instructions = 'Detailler les etapes.';
		worksheet.show_points = true;

		const typst = generateStudentWorksheetTypst(worksheet, 'none');
		const header = typst.slice(typst.indexOf('#block(width: 100%, inset: 0pt, sticky: true'));
		const stickyBlock = header.slice(0, header.indexOf('\n]\n'));

		expect(stickyBlock).toContain('3 pts');
		expect(stickyBlock).toContain('Detailler les etapes.');
	});

	it('makes the correction header sticky too', () => {
		const typst = generateStudentWorksheetTypst(createWorksheet(), 'correction');
		const corrections = typst.slice(typst.indexOf('#pagebreak()'));

		expect(corrections).toContain('[CORRECTION]');
		expect(corrections).toContain(STICKY);
	});

	it('numérote exercices et corrigés sur la charte ambre de la fiche enseignant, plus en rouge', () => {
		const typst = generateStudentWorksheetTypst(createWorksheet(), 'correction');

		// Une fois dans l'énoncé, une fois dans le corrigé
		expect(typst.split(BADGE)).toHaveLength(3);
		expect(typst).not.toContain('#dc2626');
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
			'correction'
		);

		expect(typst).toContain('lang: "fr"');
		expect(typst).toContain('Exercices indispensables');
		expect(typst).toContain('[CORRECTION]');
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
			'correction'
		);

		expect(typst).toContain('lang: "en"');
		expect(typst).toContain('Essential exercises');
		// « Answers » nomme la partie des résultats seuls
		expect(typst).toContain('[SOLUTIONS]');
		// No French chrome left on an English sheet.
		expect(typst).not.toContain('Exercices indispensables');
		expect(typst).not.toContain('[CORRECTION]');
	});
});

// Fonctions déclarées par l'exercice : le PDF élève doit les recevoir, énoncé ET corrigé.
describe('generateStudentWorksheetTypst — fonctions déclarées', () => {
	const worksheetWithC = (genericFunctions: string[] | null | undefined) => {
		const worksheet = createWorksheet();
		worksheet.exercises![0].statement = "Calculer ~C'(x)~.";
		worksheet.exercises![0].correction = "On trouve ~C'(x)=2x~.";
		worksheet.exercises![0].generic_functions = genericFunctions;
		return worksheet;
	};

	it('énoncé et corrigé sans erreur quand C est déclaré', () => {
		const typst = generateStudentWorksheetTypst(worksheetWithC(['C']), 'correction');
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toContain('On trouve');
	});

	it('sans déclaration, l’erreur apparaît (témoin)', () => {
		const typst = generateStudentWorksheetTypst(worksheetWithC(undefined), 'correction');
		expect(typst).toContain('Unexpected token');
	});
});

// Sens de deux majuscules collées (lot 6 des longueurs, Q-J), transmis par la vue élève
describe('generateStudentWorksheetTypst — sens de AB (capital_pairs)', () => {
	const worksheetWithPrimes = (capitalPairs: 'length' | 'product' | undefined) => {
		const worksheet = createWorksheet();
		worksheet.exercises![0].title = "Le segment ~A'B'~";
		worksheet.exercises![0].statement = "Calculer ~A'B'~.";
		worksheet.exercises![0].correction = "On trouve ~A'B'=5~.";
		if (capitalPairs) worksheet.exercises![0].capital_pairs = capitalPairs;
		return worksheet;
	};

	it('longueur : titre, énoncé et corrigé sans erreur', () => {
		const typst = generateStudentWorksheetTypst(worksheetWithPrimes('length'), 'correction');
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toContain('On trouve');
	});

	it('absent ou produit : écriture d’avant, identique (témoin)', () => {
		const before = generateStudentWorksheetTypst(worksheetWithPrimes(undefined), 'correction');
		expect(before).toContain('Unexpected token');
		expect(generateStudentWorksheetTypst(worksheetWithPrimes('product'), 'correction')).toBe(
			before
		);
	});
});
