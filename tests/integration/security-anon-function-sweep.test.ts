/**
 * Security — anon SECURITY DEFINER function sweep (needs a running DB)
 * ===================================================================
 * Vague-1 finding H1 (docs/wip/security-audit-2026-08.md).
 *
 * EXECUTE on SECURITY DEFINER functions is revoked from PUBLIC + anon; only a
 * 3-function whitelist (public logged-out flows) keeps anon EXECUTE. This suite
 * asserts a non-whitelisted definer RPC is unreachable by anon, while a
 * whitelisted one remains callable.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

describe('Security — anon SECURITY DEFINER sweep (H1)', () => {
	it('anon can still call a whitelisted public RPC (get_consent_info)', async () => {
		expect.assertions(2);
		const { error } = await anonClient().rpc('get_consent_info', { p_token: crypto.randomUUID() });
		// Callable by anon: not a permission error, not a "function not found for role".
		expect(error?.code).not.toBe('42501');
		expect(error?.code).not.toBe('PGRST202');
	});

	it('anon cannot call a non-whitelisted SECURITY DEFINER RPC (add_student_gidouilles)', async () => {
		expect.assertions(1);
		const { error } = await anonClient().rpc('add_student_gidouilles', {
			p_student_id: crypto.randomUUID(),
			p_amount: 999999
		});
		expect(error).not.toBeNull();
	});
});
