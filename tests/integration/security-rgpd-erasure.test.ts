/**
 * Security — RGPD erasure (needs a running DB)
 * ============================================
 * Vague-1 guards (docs/wip/security-audit-2026-08.md):
 *   - H14: pending_students PII is removed once a real profile exists for that email.
 *   - H15: deleting a staff member who moderated no longer fails on the FK, and the
 *          moderation log is preserved with an anonymized (null) moderator.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { deleteAuthUser } from '../helpers/database/postgres-client';

describe('Security — RGPD erasure', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
	});
	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('H14 — pending_students PII is purged when a profile is created for that email', async () => {
		expect.assertions(2);
		const svc = createServiceRoleClient();
		const email = `pending-${crypto.randomUUID()}@test.com`;
		await svc.from('pending_students').insert({
			email,
			firstname: 'Kid',
			lastname: 'Test',
			parent_email: 'parent@test.com'
		});
		const before = await svc.from('pending_students').select('id').eq('email', email);
		expect((before.data ?? []).length).toBe(1);

		// Creating the auth user fires handle_new_user (profile creation = activation).
		await TestData.profile().withRole('student').withEmail(email).create();

		const after = await svc.from('pending_students').select('id').eq('email', email);
		expect((after.data ?? []).length).toBe(0);
	});

	it('H15 — deleting a staff moderator succeeds; the log survives anonymized', async () => {
		expect.assertions(2);
		const svc = createServiceRoleClient();
		const teacher = await TestData.profile().withRole('teacher').create();

		const { data: log, error: insErr } = await svc
			.from('moderation_logs')
			.insert({
				moderator_id: teacher.id,
				action: 'delete_message',
				target_type: 'message',
				target_id: crypto.randomUUID()
			})
			.select('id')
			.single();
		expect(insErr).toBeNull();

		// Real deletion path: remove the auth user → cascades to profile → FK SET NULL.
		await deleteAuthUser(teacher.id);

		const { data } = await svc
			.from('moderation_logs')
			.select('moderator_id')
			.eq('id', log!.id)
			.single();
		expect(data?.moderator_id).toBeNull();
	});
});
