/**
 * Security — self-registration anchored on the class code (needs a running DB)
 * ============================================================================
 * Vague-1 findings H9/H10 (docs/wip/security-audit-2026-08.md):
 *   - H9: handle_new_user must NOT enroll on a client-supplied class_id — a direct
 *         GoTrue signup with a bare class UUID (no code) must not get into a class.
 *         Enrollment requires the join CODE (re-resolved in the trigger).
 *   - H10: the students_can_join policy is dropped — a student cannot INSERT a
 *         class_members row directly.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

async function makeOpenClass(svc: SupabaseClient<Database>) {
	const { data: school, error: schoolErr } = await svc
		.from('schools')
		.insert({ name: `S ${crypto.randomUUID()}`, city: 'Testville', country: 'FR' })
		.select('id')
		.single();
	if (schoolErr) throw new Error(`school insert: ${schoolErr.message}`);
	const { data: cls, error: clsErr } = await svc
		.from('classes')
		.insert({
			name: 'H9 Class',
			join_code: `H9${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
			is_active: true,
			registration_open: true,
			school_id: school!.id,
			grade: '6'
		} as Database['public']['Tables']['classes']['Insert'])
		.select('id, join_code')
		.single();
	if (clsErr) throw new Error(`class insert: ${clsErr.message}`);
	return cls!;
}

async function membershipsOf(svc: SupabaseClient<Database>, uid: string) {
	const { data } = await svc.from('class_members').select('class_id').eq('student_id', uid);
	return (data ?? []).map((m) => m.class_id);
}

describe('Security — signup anchored on class code (H9/H10)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		// A class insert fires the class-chat conversation trigger, which needs the
		// (single) teacher to exist.
		await TestData.profile().withRole('teacher').create();
	});
	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('H9 — a bare class_id in signup metadata does NOT enroll (code required)', async () => {
		expect.assertions(2);
		const svc = createServiceRoleClient();
		const cls = await makeOpenClass(svc);

		// Attack: sign up directly with the old vector (class_id only, no code).
		const { data: attacker } = await svc.auth.admin.createUser({
			email: `h9a-${crypto.randomUUID()}@test.com`,
			password: 'password123',
			email_confirm: true,
			user_metadata: { class_id: cls.id, firstname: 'Mal', lastname: 'Ory' }
		});
		expect(await membershipsOf(svc, attacker.user!.id)).not.toContain(cls.id);

		// Legit: sign up with the actual join CODE → enrolled.
		const { data: legit } = await svc.auth.admin.createUser({
			email: `h9b-${crypto.randomUUID()}@test.com`,
			password: 'password123',
			email_confirm: true,
			user_metadata: { class_code: cls.join_code, firstname: 'Good', lastname: 'Kid' }
		});
		expect(await membershipsOf(svc, legit.user!.id)).toContain(cls.id);
	});

	it('H10 — a student cannot INSERT a class_members row directly', async () => {
		expect.assertions(1);
		const svc = createServiceRoleClient();
		const cls = await makeOpenClass(svc);
		const student = await TestData.profile().withRole('student').create();
		const client = await createAuthenticatedClient(student.email);

		await client.from('class_members').insert({ class_id: cls.id, student_id: student.id });

		// No membership was created (policy dropped).
		expect(await membershipsOf(svc, student.id)).not.toContain(cls.id);
	});
});
