/**
 * Élèves actifs pour les mesures (base locale requise)
 * ====================================================
 *
 * `active_student_ids()` rend les élèves membres `active` d'au moins une
 * classe : la base de toute mesure sur les élèves (CONTEXT.md, « Élève
 * actif »). Les comptes des années passées — adhésions archivées au passage
 * d'année —, les élèves hors-classe et les élèves de test (`profiles.is_test`)
 * n'y figurent pas.
 *
 * Accès : réservée à `service_role` (mesures, scripts serveur). Un élève, un
 * professeur ou un visiteur anonyme est refusé (`42501`) : la fonction ne
 * sert jamais au navigateur.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Client service-role : pose le décor et appelle la fonction. */
const service = createServiceRoleClient();

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** La fonction n'est pas encore dans les types générés (`db:types` après le merge). */
function callActiveStudentIds(client: SupabaseClient<Database>) {
	return client.rpc('active_student_ids' as never);
}

async function activeIds(): Promise<string[]> {
	const { data, error } = await callActiveStudentIds(service);
	if (error) throw new Error(`active_student_ids : ${error.message}`);
	const rows = (data ?? []) as unknown as { student_id: string }[];
	return rows.map((r) => r.student_id);
}

describe('active_student_ids — les élèves actifs, pour les mesures', () => {
	let twoClassesStudentId: string;
	let archivedStudentId: string;
	let outsideStudentId: string;
	let testStudentId: string;
	let teacherId: string;
	let student: SupabaseClient<Database>;
	let teacher: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacherId = teacherProfile.id;
		teacher = await clientFor(teacherProfile.email);

		const classA = await TestData.class().withName('4e A mesure YY').create();
		const classB = await TestData.class().withName('4e B mesure YY').create();

		const join = async (classId: string, studentId: string, status: string) => {
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: studentId, status });
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
		};

		const twoClasses = await TestData.profile().withRole('student').create();
		twoClassesStudentId = twoClasses.id;
		await join(classA.id, twoClasses.id, 'active');
		await join(classB.id, twoClasses.id, 'active');
		student = await clientFor(twoClasses.email);

		const archived = await TestData.profile().withRole('student').create();
		archivedStudentId = archived.id;
		await join(classA.id, archived.id, 'archived');

		outsideStudentId = (await TestData.profile().withRole('student').create()).id;

		// Élève de test (CONTEXT.md) : ses résultats ne se mêlent jamais aux vrais,
		// même s'il est mis dans une classe.
		const testStudent = await TestData.profile().withRole('student').create();
		testStudentId = testStudent.id;
		const { error: testFlagError } = await service
			.from('profiles')
			.update({ is_test: true })
			.eq('id', testStudent.id)
			.select('id')
			.single();
		expect(testFlagError, 'le décor n’a pas pu être posé').toBeNull();
		await join(classA.id, testStudent.id, 'active');
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un élève actif dans deux classes figure une seule fois', async () => {
		const ids = await activeIds();
		expect(ids.filter((id) => id === twoClassesStudentId)).toHaveLength(1);
	});

	it('un élève dont l’adhésion est archivée n’y figure pas', async () => {
		expect(await activeIds()).not.toContain(archivedStudentId);
	});

	it('un élève hors-classe n’y figure pas', async () => {
		expect(await activeIds()).not.toContain(outsideStudentId);
	});

	it('un élève de test, même membre actif d’une classe, n’y figure pas', async () => {
		expect(await activeIds()).not.toContain(testStudentId);
	});

	it('un professeur n’y figure pas', async () => {
		expect(await activeIds()).not.toContain(teacherId);
	});

	it.each([
		['un élève', () => student],
		['un professeur', () => teacher],
		['un visiteur anonyme', () => anonClient()]
	])('%s ne peut pas l’appeler (42501)', async (_who, client) => {
		const { data, error } = await callActiveStudentIds(client());
		// Le CODE compte : `PGRST202` voudrait dire que la fonction n'existe pas.
		expect(error?.code).toBe('42501');
		expect(data).toBeNull();
	});
});
