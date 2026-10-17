/**
 * Le numéro d'un exercice dans la copie d'un élève, côté serveur (D6)
 * ===================================================================
 *
 * Les signalements nomment l'exercice comme L'ÉLÈVE le lit : ordre mélangé
 * compris, avec la portée de l'affectation (classe, ou élève si elle est
 * individualisée). Une fiche ou une affectation illisible ne donne AUCUN
 * numéro plutôt qu'un numéro faux.
 */
import { describe, it, expect } from 'vitest';
import { tableMock } from './table-mock';
import { fetchCopyNumbering } from '../display-number';
import { assignmentCopyScope, copyDisplayNumbers } from '$lib/worksheets/worksheet-copy';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const OTHER_ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440020';
const STUDENTS = [1, 2, 3, 4, 5, 6].map((n) => `550e8400-e29b-41d4-a716-44665544050${n}`);

const ROWS = [1, 2, 3, 4, 5, 6].map((n) => ({
	id: `550e8400-e29b-41d4-a716-4466554401${n}0`,
	section_id: null,
	position: n
}));

const ASSIGNMENT = {
	id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
	guidance_level: 'guided',
	individualized: true
};

function mock(overrides: Record<string, object> = {}) {
	return tableMock({
		worksheets: { data: { config: { shuffle_exercises: true } }, error: null },
		worksheet_exercises: { data: ROWS, error: null },
		worksheet_sections: { data: [], error: null },
		worksheet_assignments: { data: [ASSIGNMENT], error: null },
		...overrides
	});
}

describe('fetchCopyNumbering', () => {
	it('le numéro de CHAQUE élève, celui de sa copie mélangée', async () => {
		const numbering = await fetchCopyNumbering(mock().client, WORKSHEET_ID, [ASSIGNMENT_ID]);
		for (const studentId of STUDENTS) {
			const expected = copyDisplayNumbers(
				ROWS,
				[],
				assignmentCopyScope(ASSIGNMENT, { studentId }),
				{ shuffle_exercises: true }
			);
			for (const row of ROWS) {
				expect(numbering.numberOf(ASSIGNMENT_ID, studentId, row.id)).toBe(expected.get(row.id));
			}
		}
		// Le mélange est individualisé : au moins deux élèves diffèrent sur un exercice
		const firsts = STUDENTS.map((s) => numbering.numberOf(ASSIGNMENT_ID, s, ROWS[0].id));
		expect(new Set(firsts).size).toBeGreaterThan(1);
	});

	it('fiche sans mélange : numéro des positions', async () => {
		const numbering = await fetchCopyNumbering(
			mock({ worksheets: { data: { config: {} }, error: null } }).client,
			WORKSHEET_ID,
			[ASSIGNMENT_ID]
		);
		expect(numbering.numberOf(ASSIGNMENT_ID, STUDENTS[0], ROWS[3].id)).toBe(4);
	});

	it('affectation d’une autre fiche (absente de la lecture) : aucun numéro', async () => {
		const numbering = await fetchCopyNumbering(mock().client, WORKSHEET_ID, [OTHER_ASSIGNMENT_ID]);
		expect(numbering.numberOf(OTHER_ASSIGNMENT_ID, STUDENTS[0], ROWS[0].id)).toBeNull();
	});

	it('exercice inconnu : aucun numéro', async () => {
		const numbering = await fetchCopyNumbering(mock().client, WORKSHEET_ID, [ASSIGNMENT_ID]);
		expect(
			numbering.numberOf(ASSIGNMENT_ID, STUDENTS[0], '550e8400-e29b-41d4-a716-446655449999')
		).toBeNull();
	});

	it.each(['worksheets', 'worksheet_exercises', 'worksheet_sections', 'worksheet_assignments'])(
		'%s illisible : aucun numéro plutôt qu’un numéro faux',
		async (table) => {
			const numbering = await fetchCopyNumbering(
				mock({ [table]: { data: null, error: { message: 'panne' } } }).client,
				WORKSHEET_ID,
				[ASSIGNMENT_ID]
			);
			expect(numbering.numberOf(ASSIGNMENT_ID, STUDENTS[0], ROWS[0].id)).toBeNull();
		}
	);
});
