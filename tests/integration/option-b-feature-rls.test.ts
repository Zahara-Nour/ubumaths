/**
 * Option B — Feature RLS unification — Integration Tests
 * ======================================================
 *
 * Mono-teacher (Option B): the sole teacher reads the pedagogical work of ANY
 * student, including students in NO class (hors-classe). Several feature RLS
 * policies stayed class-scoped via `is_teacher_of_student(...)`, which hid
 * hors-classe students' work from the teacher. These tests pin Option B on the
 * Python work tables (representative of the `is_teacher_of_student -> is_my_student`
 * swap) and MUST fail against the pre-migration schema.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/option-b-feature-rls
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

describe('Option B - Feature RLS - Integration Tests', () => {
	let service: SupabaseClient<Database>;

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
	});

	// ========================================================================
	// python_files
	// ========================================================================

	it('the teacher reads the python file of a hors-classe student', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const outOfClassStudent = await TestData.profile().withRole('student').create();

		const { data: file, error: insErr } = await service
			.from('python_files')
			.insert({ owner_id: outOfClassStudent.id, title: 'hello.py', code: 'print(1)' })
			.select()
			.single();
		expect(insErr).toBeNull();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data, error } = await teacherClient
			.from('python_files')
			.select('id')
			.eq('id', file!.id);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('a student never reads another student python file', async () => {
		await TestData.profile().withRole('teacher').create();
		const owner = await TestData.profile().withRole('student').create();
		const other = await TestData.profile().withRole('student').create();

		const { data: file } = await service
			.from('python_files')
			.insert({ owner_id: owner.id, title: 'secret.py', code: '# secret' })
			.select()
			.single();

		const otherClient = await createAuthenticatedClient(other.email);
		const { data } = await otherClient.from('python_files').select('id').eq('id', file!.id);

		expect(data).toHaveLength(0);
	});

	// ========================================================================
	// python_notebooks
	// ========================================================================

	it('the teacher reads the python notebook of a hors-classe student', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const outOfClassStudent = await TestData.profile().withRole('student').create();

		const { data: notebook, error: insErr } = await service
			.from('python_notebooks')
			.insert({
				author_id: outOfClassStudent.id,
				title: 'Notebook',
				content: { version: 1, metadata: {}, cells: [] }
			})
			.select()
			.single();
		expect(insErr).toBeNull();

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data, error } = await teacherClient
			.from('python_notebooks')
			.select('id')
			.eq('id', notebook!.id);

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});
});
