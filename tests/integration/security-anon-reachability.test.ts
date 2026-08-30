/**
 * Security — anon reachability (needs a running DB)
 * =================================================
 *
 * Vague-0 incident regression guard (docs/wip/security-audit-2026-08.md).
 *
 * The public `anon` key ships in the browser bundle, so `/rest/v1/` and
 * `/rest/v1/rpc/` are callable by anyone with curl. These tests assert that an
 * UNAUTHENTICATED client can no longer:
 *   - read `profiles` (C2 — mass PII dump of minors)
 *   - promote itself to admin (C1)
 *   - delete arbitrary accounts (C5)
 *   - dump the user table (C6)
 *   - poison the rate limiter / lock accounts out (C7)
 *   - impersonate the teacher or read anyone's inbox (C3)
 *
 * All of these were confirmed exploitable in production on 2026-08-30 before the
 * Vague-0 migrations. This suite fails if any REVOKE / DROP POLICY is reverted.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** A fresh anon client (no session) — exactly what a stranger with the public key has. */
function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

describe('Security — anon reachability', () => {
	let studentEmail: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		// A real profile must exist so the "anon reads 0 profiles" test is meaningful.
		const student = await TestData.profile().withRole('student').create();
		studentEmail = student.email;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('C2 — anon cannot read any profile (minors PII)', async () => {
		expect.assertions(1);
		const { data } = await anonClient()
			.from('profiles')
			.select('email,firstname,lastname')
			.limit(50);
		expect(data ?? []).toHaveLength(0);
	});

	it('C9 — anon cannot read the rate_limits table (leaks emails + school IP)', async () => {
		expect.assertions(1);
		const { data } = await anonClient().from('rate_limits').select('key').limit(50);
		expect(data ?? []).toHaveLength(0);
	});

	it('C1 — anon cannot call promote_user_to_admin', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('promote_user_to_admin', { user_email: studentEmail });
		expect(error).not.toBeNull();
	});

	it('C5 — anon cannot call delete_user_account', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('delete_user_account', {
			p_user_id: crypto.randomUUID()
		});
		expect(error).not.toBeNull();
	});

	it('C6 — anon cannot call search_users_unaccent', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('search_users_unaccent', {
			search_term: 'a',
			result_limit: 1000
		});
		expect(error).not.toBeNull();
	});

	it('C7 — anon cannot call check_and_increment_rate_limit (account-lockout primitive)', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('check_and_increment_rate_limit', {
			p_key: `ratelimit:login:email:${studentEmail}`,
			p_max_count: 99999,
			p_window_seconds: 31536000
		});
		expect(error).not.toBeNull();
	});

	it('C3 — anon cannot call send_private_message (teacher impersonation)', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('send_private_message', {
			p_sender_id: crypto.randomUUID(),
			p_recipient_ids: [crypto.randomUUID()],
			p_subject: 'spoof',
			p_content: { type: 'doc', content: [] },
			p_is_group_message: false,
			p_class_id: null,
			p_parent_message_id: null
		});
		expect(error).not.toBeNull();
	});

	it('C3 — anon cannot call get_user_inbox (read anyone messages)', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('get_user_inbox', {
			p_user_id: crypto.randomUUID(),
			p_status: 'inbox',
			p_folder_id: null,
			p_limit: 20,
			p_offset: 0
		});
		expect(error).not.toBeNull();
	});
});
