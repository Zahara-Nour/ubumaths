/**
 * Aperçu d'affectation : l'élève présélectionné vient de l'adresse (D6)
 * ====================================================================
 *
 * `?studentId=` n'est retenu que s'il désigne un élève de l'affectation (la
 * liste que le prof voit déjà) ; sinon l'aperçu s'ouvre en vue prof.
 */
import { describe, expect, it } from 'vitest';
import { load } from '../+page.server';

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440501';

async function initialStudent(search: string) {
	const result = (await load({
		params: { id: '550e8400-e29b-41d4-a716-446655440011', assignmentId: ASSIGNMENT_ID },
		url: new URL(`http://localhost/preview${search}`),
		locals: { safeGetSession: async () => ({ user: { id: 'prof' } }) },
		fetch: async () =>
			new Response(
				JSON.stringify({
					students: [{ id: STUDENT_ID, first_name: 'Léa', last_name: 'Martin', class_name: null }]
				})
			)
	} as never)) as { initialStudentId: string | null; discardedStudent: boolean };
	return result;
}

describe('aperçu d’affectation : élève lu dans l’adresse', () => {
	it('élève de l’affectation : présélectionné', async () => {
		expect(await initialStudent(`?studentId=${STUDENT_ID}`)).toMatchObject({
			initialStudentId: STUDENT_ID,
			discardedStudent: false
		});
	});

	it('élève hors de l’affectation, identifiant invalide ou absent : vue prof', async () => {
		// Un élève demandé puis écarté : dit à l'écran, jamais remplacé en silence
		const discarded = { initialStudentId: null, discardedStudent: true };
		expect(await initialStudent('?studentId=550e8400-e29b-41d4-a716-446655440999')).toEqual(
			expect.objectContaining(discarded)
		);
		expect(await initialStudent('?studentId=pas-un-uuid')).toEqual(
			expect.objectContaining(discarded)
		);
		expect(await initialStudent('')).toMatchObject({
			initialStudentId: null,
			discardedStudent: false
		});
	});
});
