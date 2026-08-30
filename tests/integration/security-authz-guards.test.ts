/**
 * Security — authenticated authorization guards (needs a running DB)
 * ==================================================================
 *
 * Vague-0 incident regression guard (docs/wip/security-audit-2026-08.md).
 *
 * Anon lockdown is not enough: a logged-in STUDENT (the largest population, and
 * the one holding minors' data) must not be able to escalate or act as someone
 * else. These tests assert, as an authenticated student:
 *   - C4: cannot set own role to admin (RLS WITH CHECK + role-change trigger),
 *         but CAN still edit own non-privileged fields (no over-blocking).
 *   - C3: cannot send a message as another user, cannot read another's inbox,
 *         but CAN read own inbox (guard does not over-block).
 *   - C1: cannot call promote_user_to_admin.
 *   - C8: cannot call the teacher-only validate_riddle_attempt.
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

async function studentRole(id: string): Promise<string | undefined> {
	const svc = createServiceRoleClient();
	const { data } = await svc.from('profiles').select('role').eq('id', id).single();
	return data?.role;
}

describe('Security — authenticated authorization guards', () => {
	let student: Database['public']['Tables']['profiles']['Row'];
	let victim: Database['public']['Tables']['profiles']['Row'];

	beforeAll(async () => {
		await cleanupAllTestData();
		student = await TestData.profile().withRole('student').create();
		// A second student as the "victim" of impersonation / IDOR attempts. Using a
		// student (not a teacher) sidesteps the enforce_single_teacher constraint.
		victim = await TestData.profile().withRole('student').create();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('C4 — a student cannot escalate own role to admin', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		// May error (RLS/trigger) or silently affect 0 rows — the definitive check is
		// that the stored role is unchanged.
		await client.from('profiles').update({ role: 'admin' }).eq('id', student.id);
		expect(await studentRole(student.id)).toBe('student');
	});

	it('C4 — a student can still update own non-privileged fields', async () => {
		expect.assertions(2);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client
			.from('profiles')
			.update({ firstname: 'Renamed' })
			.eq('id', student.id);
		expect(error).toBeNull();
		const svc = createServiceRoleClient();
		const { data } = await svc.from('profiles').select('firstname').eq('id', student.id).single();
		expect(data?.firstname).toBe('Renamed');
	});

	it('C3 — a student cannot send a message impersonating another user', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('send_private_message', {
			p_sender_id: victim.id, // not the caller
			p_recipient_ids: [student.id],
			p_subject: 'spoof',
			p_content: { type: 'doc', content: [] },
			p_is_group_message: false,
			p_class_id: null,
			p_parent_message_id: null
		});
		expect(error).not.toBeNull();
	});

	it('C3 — a student cannot read another user inbox', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('get_user_inbox', {
			p_user_id: victim.id,
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 20,
			p_offset: 0
		});
		// Must be blocked specifically by the caller guard (not merely an empty result):
		// if the guard were reverted, this would return the victim's inbox with error=null.
		expect(error?.message ?? '').toContain('unauthorized');
	});

	it('C3 — a student can read own inbox (guard does not over-block)', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('get_user_inbox', {
			p_user_id: student.id,
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 20,
			p_offset: 0
		});
		expect(error).toBeNull();
	});

	it('C1 — a student cannot promote via promote_user_to_admin', async () => {
		expect.assertions(2);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('promote_user_to_admin', { user_email: student.email });
		expect(error).not.toBeNull();
		expect(await studentRole(student.id)).toBe('student');
	});

	it('C8 — a student cannot validate a riddle attempt (teacher-only)', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		// The teacher/admin guard is the RPC's first statement, so a student is
		// rejected with 'unauthorized' regardless of whether the attempt exists — and
		// a random id would give a *different* error if the guard were reverted.
		const { error } = await client.rpc('validate_riddle_attempt', {
			p_attempt_id: crypto.randomUUID(),
			p_is_correct: true
		});
		expect(error?.message ?? '').toContain('unauthorized');
	});

	// ── F2: profiles self-write of currency / school (RLS WITH CHECK) ──────────
	it('F2 — a student cannot inflate own gidouilles', async () => {
		expect.assertions(1);
		const svc = createServiceRoleClient();
		await svc.from('profiles').update({ gidouilles: 100 }).eq('id', student.id);
		const client = await createAuthenticatedClient(student.email);
		await client.from('profiles').update({ gidouilles: 999999 }).eq('id', student.id);
		const { data } = await svc.from('profiles').select('gidouilles').eq('id', student.id).single();
		expect(data?.gidouilles).toBe(100); // unchanged — increase blocked
	});

	it('F2 — a student can still spend (decrease) own gidouilles', async () => {
		expect.assertions(2);
		const svc = createServiceRoleClient();
		await svc.from('profiles').update({ gidouilles: 100 }).eq('id', student.id);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.from('profiles').update({ gidouilles: 50 }).eq('id', student.id);
		expect(error).toBeNull();
		const { data } = await svc.from('profiles').select('gidouilles').eq('id', student.id).single();
		expect(data?.gidouilles).toBe(50); // decrease allowed (e.g. buddy change)
	});

	it('F2 — a student cannot change own school_id (safeguarding boundary)', async () => {
		expect.assertions(1);
		const svc = createServiceRoleClient();
		const { data: school } = await svc
			.from('schools')
			.insert({ name: `Test School ${crypto.randomUUID()}`, city: 'Testville', country: 'FR' })
			.select('id')
			.single();
		await svc.from('profiles').update({ school_id: school!.id }).eq('id', student.id);
		const client = await createAuthenticatedClient(student.email);
		await client.from('profiles').update({ school_id: null }).eq('id', student.id);
		const { data } = await svc.from('profiles').select('school_id').eq('id', student.id).single();
		expect(data?.school_id).toBe(school!.id); // unchanged — self-move blocked
	});

	// ── F1: draw_multiple_vip_cards internal guards (direct RPC bypass) ─────────
	it('F1 — a student cannot force rarity in a direct draw RPC call', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('draw_multiple_vip_cards', {
			p_student_id: student.id,
			p_count: 1,
			p_payment_method: 'gidouilles',
			p_gidouilles_cost: 3,
			p_vip_card_instance_id: null,
			p_force_rarity: 'legendary',
			p_min_rarity: null,
			p_exclude_card_ids: null,
			p_only_cards_with_actions: false
		});
		// Guard runs before any balance/pool logic → a reverted guard would yield a
		// different (balance) error, not this permission code.
		expect(error?.code).toBe('42501');
	});

	it('F1 — a student cannot underpay in a direct draw RPC call', async () => {
		expect.assertions(1);
		const client = await createAuthenticatedClient(student.email);
		const { error } = await client.rpc('draw_multiple_vip_cards', {
			p_student_id: student.id,
			p_count: 10,
			p_payment_method: 'gidouilles',
			p_gidouilles_cost: 1,
			p_vip_card_instance_id: null,
			p_force_rarity: null,
			p_min_rarity: null,
			p_exclude_card_ids: null,
			p_only_cards_with_actions: false
		});
		expect(error?.code).toBe('22023');
	});
});
