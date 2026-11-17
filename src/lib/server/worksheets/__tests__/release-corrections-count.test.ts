/**
 * Décompte « Publié pour N élève(s) » à la libération des corrections
 * ===================================================================
 *
 * Le décompte comptait les lignes de `worksheet_instances`, table jamais
 * remplie (la copie est recalculée, ADR 0023) : il valait toujours 0. Il
 * compte désormais les élèves de l'affectation (classes actives + élèves
 * désignés), sans lire `worksheet_instances`.
 */

import { describe, it, expect } from 'vitest';
import { releaseCorrections } from '../correction-release';
import { tableMock } from './table-mock';

const PROF = '00000000-0000-4000-8000-000000000001';
const AFFECTATION = '00000000-0000-4000-8000-0000000000a1';

function decor(eleves: { classe: string[]; designes: string[] }) {
	return tableMock({
		worksheet_assignments: {
			data: {
				id: AFFECTATION,
				created_by: PROF,
				worksheet_id: 'fiche-1',
				correction_release_mode: 'manual'
			},
			error: null
		},
		profiles: { data: { role: 'teacher' }, error: null },
		worksheet_assignment_classes: { data: [{ class_id: 'classe-1' }], error: null },
		class_members: { data: eleves.classe.map((id) => ({ student_id: id })), error: null },
		worksheet_assignment_students: {
			data: eleves.designes.map((id) => ({ student_id: id })),
			error: null
		}
	});
}

describe('releaseCorrections — décompte des élèves', () => {
	it('compte les élèves de l’affectation, un élève présent deux fois compté une fois', async () => {
		const mock = decor({ classe: ['e1', 'e2', 'e3'], designes: ['e3', 'e4'] });
		const result = await releaseCorrections(mock.client, AFFECTATION, PROF);
		expect(result.success).toBe(true);
		expect(result.affectedStudents).toBe(4);
	});

	it('ne lit plus `worksheet_instances`', async () => {
		const mock = decor({ classe: ['e1'], designes: [] });
		await releaseCorrections(mock.client, AFFECTATION, PROF);
		expect(mock.tablesRead).not.toContain('worksheet_instances');
	});

	it('affectation sans élève : 0', async () => {
		const mock = decor({ classe: [], designes: [] });
		const result = await releaseCorrections(mock.client, AFFECTATION, PROF);
		expect(result.affectedStudents).toBe(0);
	});
});
