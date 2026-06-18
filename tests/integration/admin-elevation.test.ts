/**
 * Admin Elevation (Pattern 2) — Integration Tests (needs a running DB)
 * ===================================================================
 *
 * Run `pnpm db:start` first; the orchestrator runs this, not the implementing
 * agent. Verifies the CORE invariant of server-side admin elevation:
 *
 *   `createAdminClient(adminAccessToken)` issues queries that RLS evaluates
 *   with `auth.uid() = <admin>` — i.e. the request-scoped client really acts
 *   AS the admin (audit + RLS preserved), without persisting any session.
 *
 * It also confirms the negative: a client built from a TEACHER's access token
 * does NOT see admin-only data — the elevation cookie's power comes entirely
 * from WHOSE token it carries (verified server-side via getUser + role check),
 * never from the cookie's mere presence.
 *
 * NOTE: this exercises `createAdminClient` (the request-scoped admin client) and
 * the token→identity binding. The full handle (createAdminElevationHandle) is
 * covered by the unit suite; here we assert the RLS identity end-to-end.
 *
 * @module tests/integration/admin-elevation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';
import { createAdminClient } from '$lib/server/adminElevation';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Sign in via a throwaway client and return only the access token. */
async function getAccessToken(email: string): Promise<string> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { data, error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error || !data.session) {
		throw new Error(`sign-in failed for ${email}: ${error?.message ?? 'no session'}`);
	}
	return data.session.access_token;
}

describe('Admin Elevation — createAdminClient acts as the admin under RLS', () => {
	let adminEmail: string;
	let adminId: string;
	let teacherEmail: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		adminEmail = admin.email;
		adminId = admin.id;
		teacherEmail = teacher.email;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('binds auth.uid() to the admin (createAdminClient sends the admin Bearer token)', async () => {
		const adminToken = await getAccessToken(adminEmail);
		const adminClient = createAdminClient(adminToken);

		// getUser() on the request-scoped client must resolve to the admin.
		const { data, error } = await adminClient.auth.getUser();
		expect(error).toBeNull();
		expect(data.user?.id).toBe(adminId);
	});

	it('an admin-token client reads admin-gated data that a teacher-token client cannot', async () => {
		// error_logs has SELECT gated by is_admin(); seed one row via service role.
		await TestData.errorLog().create();

		const adminToken = await getAccessToken(adminEmail);
		const teacherToken = await getAccessToken(teacherEmail);

		const adminClient = createAdminClient(adminToken);
		const teacherClient = createAdminClient(teacherToken);

		const { data: adminRows } = await adminClient.from('error_logs').select('id').limit(5);
		const { data: teacherRows } = await teacherClient.from('error_logs').select('id').limit(5);

		// Admin sees the seeded row(s); the teacher-token client (NOT an admin) does not.
		expect((adminRows ?? []).length).toBeGreaterThanOrEqual(1);
		// The teacher must not gain admin-only visibility just by being wrapped
		// in createAdminClient — power comes from the token's identity (RLS), not
		// from the wrapper.
		expect((teacherRows ?? []).length).toBe(0);
	});

	it('does not persist a session (request-scoped, no token leakage between clients)', async () => {
		const adminToken = await getAccessToken(adminEmail);
		const adminClient = createAdminClient(adminToken);
		await adminClient.auth.getUser();

		// A fresh anon client built the normal way has no admin session.
		const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { data } = await anon.auth.getUser();
		expect(data.user).toBeNull();
	});
});
