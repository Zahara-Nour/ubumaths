/**
 * Le numéro d'un exercice DANS LA COPIE d'un élève (décision D6 de David, 2026-10-13)
 * ===================================================================================
 *
 * Un message envoyé à un élève (signalement traité) et la page où le prof
 * traite ce signalement nomment l'exercice comme L'ÉLÈVE le lit sur sa copie :
 * ordre mélangé compris. Même calcul que la copie (`copyExerciseOrder` puis la
 * numérotation commune), pas une règle à part.
 *
 * Et le corrigé de classe d'une affectation dont chaque élève a sa propre
 * version (valeurs OU ordre) : `hasPerStudentCopies` dit quand.
 */
import { describe, it, expect } from 'vitest';
import {
	assignmentCopyScope,
	buildWorksheetCopy,
	copyDisplayNumbers,
	hasPerStudentCopies,
	type CopyScope,
	type WorksheetForCopy
} from '../worksheet-copy';
import { documentFromTeacherCopy } from '../document/teacher-adapter';
import type { WorksheetRow } from '$lib/types/worksheets';

// ============================================================================
// FIXTURES — positions qui redémarrent dans chaque section
// ============================================================================

interface Placement {
	id: string;
	section: string | null;
	position: number;
}

const PLACEMENTS: Placement[] = [
	...['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((id, i) => ({ id, section: 'sA', position: i + 1 })),
	{ id: 'b1', section: 'sB', position: 1 },
	{ id: 'b2', section: 'sB', position: 2 },
	{ id: 'h1', section: null, position: 1 },
	{ id: 'h2', section: null, position: 2 }
];

const SECTIONS = [
	{ id: 'sB', title: 'B', instructions: null, position: 2 },
	{ id: 'sA', title: 'A', instructions: null, position: 1 }
];

const ROWS = PLACEMENTS.map((p) => ({
	id: `we-${p.id}`,
	section_id: p.section,
	position: p.position
}));

function content(id: string, withVariables: boolean) {
	return {
		id: `ex-${id}`,
		title: `Titre ${id}`,
		shared: withVariables ? { variables: [{ name: 'a', expression: '{{2..999}}' }] } : null,
		variations: [{ label: 'guided', statement_md: `${id} : {{a}}`, solution_md: `${id}` }]
	};
}

function worksheet(config: Record<string, unknown>, withVariables = false): WorksheetForCopy {
	return {
		id: 'fiche-1',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		config,
		sections: SECTIONS,
		worksheet_exercises: PLACEMENTS.map((p) => ({
			id: `we-${p.id}`,
			exercise_id: `ex-${p.id}`,
			position: p.position,
			points: null,
			section_id: p.section,
			custom_instructions: null,
			variation_index: null,
			exercise: content(p.id, withVariables)
		}))
	} as unknown as WorksheetForCopy;
}

const SHUFFLE = { shuffle_exercises: true };
const ASSIGNMENT = {
	id: 'aff-1',
	worksheet_id: 'fiche-1',
	guidance_level: 'guided',
	individualized: false
};
const INDIVIDUAL = { ...ASSIGNMENT, individualized: true };
const STUDENTS = ['eleve-1', 'eleve-2', 'eleve-3', 'eleve-4', 'eleve-5', 'eleve-6'];

/** Les numéros que le PDF de la copie imprime, par `worksheet_exercises.id` */
function printedNumbers(ws: WorksheetForCopy, scope: CopyScope): Map<string, number> {
	const doc = documentFromTeacherCopy({
		worksheet: ws as unknown as WorksheetRow,
		instance: buildWorksheetCopy(ws, scope),
		config: ws.config ?? {}
	});
	return new Map(
		doc.exercises.map((e) => [`we-${e.title?.replace('Titre ', '')}`, Number(e.number)])
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe('copyDisplayNumbers : le numéro dans la copie de l’élève', () => {
	it('fiche mélangée, affectation individualisée : le numéro imprimé sur LA copie de chaque élève', () => {
		for (const studentId of STUDENTS) {
			const scope = assignmentCopyScope(INDIVIDUAL, { studentId });
			expect(copyDisplayNumbers(ROWS, SECTIONS, scope, SHUFFLE)).toEqual(
				printedNumbers(worksheet(SHUFFLE), scope)
			);
		}
	});

	it('individualisée : deux élèves n’ont pas tous les mêmes numéros', () => {
		const numbers = STUDENTS.map((studentId) =>
			[
				...copyDisplayNumbers(
					ROWS,
					SECTIONS,
					assignmentCopyScope(INDIVIDUAL, { studentId }),
					SHUFFLE
				).entries()
			].join()
		);
		expect(new Set(numbers).size).toBeGreaterThan(1);
	});

	it('non individualisée : les numéros de la classe, les mêmes pour chaque élève', () => {
		const classNumbers = copyDisplayNumbers(
			ROWS,
			SECTIONS,
			assignmentCopyScope(ASSIGNMENT),
			SHUFFLE
		);
		for (const studentId of STUDENTS) {
			expect(
				copyDisplayNumbers(ROWS, SECTIONS, assignmentCopyScope(ASSIGNMENT, { studentId }), SHUFFLE)
			).toEqual(classNumbers);
		}
	});

	it('fiche sans mélange : numérotation continue des positions (sections, puis hors section)', () => {
		const numbers = copyDisplayNumbers(
			ROWS,
			SECTIONS,
			assignmentCopyScope(INDIVIDUAL, { studentId: 'eleve-1' }),
			{}
		);
		expect(numbers.get('we-a1')).toBe(1);
		expect(numbers.get('we-b1')).toBe(7);
		expect(numbers.get('we-h2')).toBe(10);
	});

	it('exercice inconnu : absent de la map (jamais un numéro inventé)', () => {
		expect(
			copyDisplayNumbers(ROWS, SECTIONS, assignmentCopyScope(ASSIGNMENT), SHUFFLE).has('we-zz')
		).toBe(false);
	});
});

describe('hasPerStudentCopies : chaque élève a-t-il sa propre version ?', () => {
	const individual = assignmentCopyScope(INDIVIDUAL);
	const common = assignmentCopyScope(ASSIGNMENT);

	it('individualisée et mélangée (sans variables) : oui, l’ordre change d’un élève à l’autre', () => {
		expect(hasPerStudentCopies(worksheet(SHUFFLE), individual)).toBe(true);
	});

	it('individualisée avec variables (sans mélange) : oui, les valeurs changent', () => {
		expect(hasPerStudentCopies(worksheet({}, true), individual)).toBe(true);
	});

	it('individualisée, ni variables ni mélange : non, la copie est commune', () => {
		expect(hasPerStudentCopies(worksheet({}), individual)).toBe(false);
	});

	it('non individualisée : non, même mélangée et avec variables', () => {
		expect(hasPerStudentCopies(worksheet(SHUFFLE, true), common)).toBe(false);
	});

	it('hors affectation : non', () => {
		expect(
			hasPerStudentCopies(worksheet(SHUFFLE, true), {
				assignmentId: null,
				worksheetId: 'fiche-1',
				level: 'guided',
				individualized: true
			})
		).toBe(false);
	});
});
