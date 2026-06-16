/**
 * Single-teacher RLS (Option B) — Integration Tests
 * =================================================
 *
 * Refactor « professeur unique » — branche refactor/single-teacher.
 * Doc : docs/wip/single-teacher-refactor.md
 *
 * En mono-prof, la classe n'est plus une frontière d'accès : le prof unique
 * (et l'admin) voient les données pédagogiques de TOUS les élèves, y compris
 * hors classe. Les 13 policies de lecture prof passent toutes par le helper
 * `is_my_student(uuid)` (migration 20260616120000_teacher_sees_all_students).
 * On teste donc ce helper — pivot de tout le lot — avec de vrais clients
 * authentifiés, RLS réellement appliqué.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * NB : la migration Lot 2 (trigger mono-prof) interdit ≥ 2 comptes teacher.
 * Chaque test ne crée qu'UN teacher, et cleanupAllTestData() le retire entre
 * les tests. Si la base de test contient un teacher seedé, le retirer d'abord.
 *
 * @module tests/integration/single-teacher-rls
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

describe('Single-teacher RLS (Option B) - Integration Tests', () => {
	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it('the teacher sees ALL students — including one in NO class (Option B)', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		// élève rattaché à aucune classe : sous l'ancien modèle, invisible au prof.
		const outOfClassStudent = await TestData.profile().withRole('student').create();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data, error } = await teacherClient.rpc('is_my_student', {
			p_student_id: outOfClassStudent.id
		});

		expect(error).toBeNull();
		expect(data).toBe(true);
	});

	it('a student never sees another student', async () => {
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();

		const aClient = await createAuthenticatedClient(studentA.email);
		const { data, error } = await aClient.rpc('is_my_student', {
			p_student_id: studentB.id
		});

		expect(error).toBeNull();
		expect(data).toBe(false);
	});

	it('a student is not "their own student" either (no teacher-grade access)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const client = await createAuthenticatedClient(student.email);
		const { data } = await client.rpc('is_my_student', { p_student_id: student.id });
		expect(data).toBe(false);
	});

	it('admin sees all students', async () => {
		const admin = await TestData.profile().withRole('admin').create();
		const student = await TestData.profile().withRole('student').create();

		const adminClient = await createAuthenticatedClient(admin.email);
		const { data, error } = await adminClient.rpc('is_my_student', {
			p_student_id: student.id
		});

		expect(error).toBeNull();
		expect(data).toBe(true);
	});
});
