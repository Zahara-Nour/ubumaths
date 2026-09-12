/**
 * `profiles.class_ids` ne concerne que les élèves (nécessite une base locale)
 * ==========================================================================
 *
 * La colonne est dénormalisée depuis `class_members`, qui ne porte que des
 * adhésions d'ÉLÈVES. Pour un professeur elle ne veut rien dire : c'est
 * pourquoi le rattrapage de 20260912200000 a dû exclure explicitement les
 * non-élèves, sous peine d'écrire dans des lignes que sa source ne décrit pas.
 *
 * La migration 20260912220000 efface le résidu qui subsistait — un unique
 * professeur pointant une classe désactivée. Ce test rejoue son SQL sur un cas
 * fabriqué, la production n'en contenant plus qu'un exemplaire, effacé.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

const service = createServiceRoleClient();

/** Le SQL de la migration, à l'identique. */
const NETTOYAGE = `
	update public.profiles
	set class_ids = array[]::uuid[]
	where role <> 'student'
		and coalesce(array_length(class_ids, 1), 0) > 0
`;

async function classIdsOf(profileId: string): Promise<string[]> {
	const { data, error } = await service
		.from('profiles')
		.select('class_ids')
		.eq('id', profileId)
		.single();
	expect(error).toBeNull();
	return (data as { class_ids: string[] | null }).class_ids ?? [];
}

describe('portée de profiles.class_ids', () => {
	let classId: string;
	let teacherId: string;
	let adminId: string;
	let studentId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		// Le professeur AVANT la classe : le trigger qui crée le salon de classe
		// lui donne un `created_by`, que `conversations_check` exige non nul.
		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;

		classId = (await TestData.class().withName('2nde portee ZZ').create()).id;
		const admin = await TestData.profile().withRole('admin').create();
		adminId = admin.id;
		const student = await TestData.profile().withRole('student').create();
		studentId = student.id;

		// L'élève tient sa classe d'une vraie adhésion : c'est le cas légitime.
		const { error: adhesionError } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: studentId, status: 'active' });
		expect(adhesionError).toBeNull();

		// Le professeur et l'administrateur, eux, portent un résidu que rien ne
		// justifie — la forme exacte trouvée en production.
		const { error: residuError } = await service
			.from('profiles')
			.update({ class_ids: [classId] })
			.in('id', [teacherId, adminId]);
		expect(residuError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le nettoyage vide le résidu d’un professeur', async () => {
		expect(await classIdsOf(teacherId)).toEqual([classId]);
		const pg = await getPostgresClient();
		await pg.query(NETTOYAGE);
		expect(await classIdsOf(teacherId)).toEqual([]);
	});

	it('et celui d’un administrateur', async () => {
		// Le prédicat vise `role <> 'student'`, pas seulement les professeurs :
		// le vérifier évite de croire le nettoyage plus étroit qu'il n'est.
		expect(await classIdsOf(adminId)).toEqual([]);
	});

	it('mais laisse intact celui d’un élève, qui vient d’une vraie adhésion', async () => {
		// C'est le témoin : un nettoyage sans la clause de rôle effacerait la
		// classe de tous les élèves, et personne ne recevrait plus rien.
		expect(await classIdsOf(studentId)).toEqual([classId]);
	});

	it('rejouer le nettoyage ne change plus rien', async () => {
		const pg = await getPostgresClient();
		const second = await pg.query(NETTOYAGE);
		expect(second.rowCount).toBe(0);
	});
});
