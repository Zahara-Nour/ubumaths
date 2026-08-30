/**
 * Security — classmate relation expiry (needs a running DB)
 * =========================================================
 * Vague-2 finding M14 (docs/wip/security-audit-2026-08.md): are_classmates() must
 * only count ACTIVE memberships in an ACTIVE class, so a student who left
 * (status='archived') no longer sees a former classmate's profile.
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
import type { Database } from '$lib/types/database';

describe('Security — classmate relation expiry (M14)', () => {
	let studentA: Database['public']['Tables']['profiles']['Row'];
	let studentB: Database['public']['Tables']['profiles']['Row'];
	let classId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		await TestData.profile().withRole('teacher').create(); // for the class-chat trigger
		studentA = await TestData.profile().withRole('student').create();
		studentB = await TestData.profile().withRole('student').create();
		const cls = await TestData.class().create();
		classId = cls.id;
		await svc.from('class_members').insert([
			{ class_id: classId, student_id: studentA.id, status: 'active' },
			{ class_id: classId, student_id: studentB.id, status: 'active' }
		]);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// NOTE: tested via the are_classmates() RPC directly, because a separate deferred
	// policy ("Anyone can view profiles for leaderboard" TO authenticated USING(true),
	// the authenticated half of C2) currently masks profile-level visibility. Once
	// that narrowing lands, are_classmates gates the classmate profiles policy.
	it('are_classmates is true for active classmates and false after one is archived', async () => {
		expect.assertions(2);
		const clientA = await createAuthenticatedClient(studentA.email);

		const before = await clientA.rpc('are_classmates', { p_user_id: studentB.id });
		expect(before.data).toBe(true);

		const svc = createServiceRoleClient();
		await svc
			.from('class_members')
			.update({ status: 'archived' })
			.eq('student_id', studentB.id)
			.eq('class_id', classId);

		const after = await clientA.rpc('are_classmates', { p_user_id: studentB.id });
		expect(after.data).toBe(false); // B left → no longer an active classmate
	});
});
