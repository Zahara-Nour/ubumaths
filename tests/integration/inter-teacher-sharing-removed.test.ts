/**
 * Inter-teacher content sharing removed — Integration Tests
 * =========================================================
 *
 * Mono-teacher model: there is no teacher-to-teacher content sharing. The
 * "other creator" in these tests is the ADMIN (the single-teacher trigger
 * forbids a second teacher account, but an admin may coexist). Each test
 * proves the teacher can no longer read the admin's shared content, while the
 * legitimate access paths (own content, public student-facing exercises) keep
 * working. They MUST fail against the pre-migration schema, where the teacher
 * still sees public templates / all exercises / same-school worksheets.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/inter-teacher-sharing-removed
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Minimal exercise row matching the ExerciseBuilder shape (see test-data-factory).
function exerciseRow(createdBy: string, isPublic: boolean) {
	return {
		created_by: createdBy,
		category: 'automatisme',
		variations: [{ label: 'default', statement_md: 'Q?', solution_md: 'A' }],
		is_public: isPublic
	};
}

describe('Inter-teacher sharing removed - Integration Tests', () => {
	let service: SupabaseClient<Database>;

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
	});

	// ========================================================================
	// chapter_templates — public library removed
	// ========================================================================

	it('the teacher cannot see the admin public published chapter template', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		const { data: tpl } = await service
			.from('chapter_templates')
			.insert({
				created_by: admin.id,
				title: 'Public lib template',
				status: 'published',
				is_public: true
			})
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('chapter_templates').select('id').eq('id', tpl!.id);

		expect(data).toHaveLength(0);
	});

	it('the teacher still sees their own chapter template', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();

		const { data: tpl } = await service
			.from('chapter_templates')
			.insert({ created_by: teacher.id, title: 'Mine', status: 'draft', is_public: false })
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('chapter_templates').select('id').eq('id', tpl!.id);

		expect(data).toHaveLength(1);
	});

	// ========================================================================
	// exercises — "Teachers can view all" tightened to "view own"
	// ========================================================================

	it('the teacher cannot see the admin private exercise', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		const { data: ex } = await service
			.from('exercises')
			.insert(exerciseRow(admin.id, false))
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('exercises').select('id').eq('id', ex!.id);

		expect(data).toHaveLength(0);
	});

	it('the teacher still sees a public exercise (student-facing access preserved)', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		const { data: ex } = await service
			.from('exercises')
			.insert(exerciseRow(admin.id, true))
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('exercises').select('id').eq('id', ex!.id);

		expect(data).toHaveLength(1);
	});

	it('the teacher still sees their own exercise', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();

		const { data: ex } = await service
			.from('exercises')
			.insert(exerciseRow(teacher.id, false))
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('exercises').select('id').eq('id', ex!.id);

		expect(data).toHaveLength(1);
	});

	// ========================================================================
	// worksheet_templates — public library removed
	// ========================================================================

	it('the teacher cannot see the admin public worksheet template', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		const { data: tpl } = await service
			.from('worksheet_templates')
			.insert({
				created_by: admin.id,
				name: 'Public WS template',
				template_content: 'content',
				is_public: true
			})
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('worksheet_templates').select('id').eq('id', tpl!.id);

		expect(data).toHaveLength(0);
	});

	// ========================================================================
	// worksheets — cross-teacher same-school branch removed
	// ========================================================================

	it('the teacher cannot see a published worksheet created by the admin (same school)', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();

		// Put teacher and admin in the same school so the legacy cross-teacher
		// branch (p1.school_id = p2.school_id) would currently match. school_id is a
		// FK → schools (ON DELETE SET NULL); cleanup purges schools with city 'Testville'.
		const { data: school, error: schoolErr } = await service
			.from('schools')
			.insert({ name: `WS School ${crypto.randomUUID()}`, city: 'Testville', country: 'FR' })
			.select()
			.single();
		expect(schoolErr).toBeNull();
		const { error: updErr } = await service
			.from('profiles')
			.update({ school_id: school!.id })
			.in('id', [teacher.id, admin.id]);
		expect(updErr).toBeNull();

		const { data: ws } = await service
			.from('worksheets')
			.insert({ created_by: admin.id, title: 'Admin WS', status: 'published' })
			.select()
			.single();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data } = await teacherClient.from('worksheets').select('id').eq('id', ws!.id);

		expect(data).toHaveLength(0);
	});
});
