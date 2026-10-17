/**
 * Security — exercise share tokens (needs a running DB)
 * =====================================================
 * Vague-1 finding H8 (docs/archive/wip/security-audit-2026-08.md).
 *
 * Before: two PUBLIC blanket RLS policies let anon `GET /rest/v1/exercises` read
 * every ever-shared exercise (solution included) and `GET /rest/v1/exercise_share_tokens`
 * dump every live token. After: access goes through a SECURITY DEFINER RPC that
 * requires the exact token; the private exercise and the token table are invisible
 * to anon.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
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

describe('Security — exercise share tokens (H8)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
	});
	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('anon cannot dump shared exercises or tokens, but can read via a valid token', async () => {
		expect.assertions(4);
		const svc = createServiceRoleClient();
		const teacher = await TestData.profile().withRole('teacher').create();
		const ex = await TestData.exercise(teacher.id).withSolution('SECRET SOLUTION').create();
		const token = `tok${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
		await svc.from('exercise_share_tokens').insert({
			token,
			exercise_id: ex.id,
			created_by: teacher.id,
			is_active: true
		});

		const anon = anonClient();

		// Cannot read the private (non-public) exercise directly anymore.
		const exRead = await anon.from('exercises').select('id').eq('id', ex.id);
		expect(exRead.data ?? []).toHaveLength(0);

		// Cannot dump the token table.
		const tokRead = await anon.from('exercise_share_tokens').select('token').limit(50);
		expect(tokRead.data ?? []).toHaveLength(0);

		// CAN read the exercise through the RPC with the exact valid token.
		const { data: viaToken } = await anon
			.rpc('get_exercise_by_share_token', { p_token: token })
			.maybeSingle();
		expect((viaToken as { id: string } | null)?.id).toBe(ex.id);

		// An unknown token yields nothing.
		const { data: invalid } = await anon
			.rpc('get_exercise_by_share_token', { p_token: 'does-not-exist' })
			.maybeSingle();
		expect(invalid).toBeNull();
	});
	// Compteur d'accès : chaque ouverture par un jeton valide l'incrémente
	// (la page du professeur affiche « N accès »). Un jeton révoqué ne compte pas.
	it('chaque lecture par jeton valide incrémente access_count, pas un jeton révoqué', async () => {
		// Mono-professeur : un seul compte teacher, celui du test précédent est retiré.
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		const teacher = await TestData.profile().withRole('teacher').create();
		const ex = await TestData.exercise(teacher.id).create();
		const token = `tok${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
		const revoked = `tok${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
		const inserted = await svc
			.from('exercise_share_tokens')
			.insert([
				{ token, exercise_id: ex.id, created_by: teacher.id, is_active: true },
				{ token: revoked, exercise_id: ex.id, created_by: teacher.id, is_active: false }
			])
			.select('id');
		expect(inserted.error).toBeNull();
		expect(inserted.data).toHaveLength(2);

		const anon = anonClient();
		for (let i = 0; i < 2; i++) {
			const { data } = await anon
				.rpc('get_exercise_by_share_token', { p_token: token })
				.maybeSingle();
			expect((data as { id: string } | null)?.id).toBe(ex.id);
		}
		const { data: none } = await anon
			.rpc('get_exercise_by_share_token', { p_token: revoked })
			.maybeSingle();
		expect(none).toBeNull();

		const { data: rows, error } = await svc
			.from('exercise_share_tokens')
			.select('token, access_count, last_accessed_at')
			.in('token', [token, revoked]);
		expect(error).toBeNull();
		const valid = rows?.find((r) => r.token === token);
		const dead = rows?.find((r) => r.token === revoked);
		expect(valid?.access_count).toBe(2);
		expect(valid?.last_accessed_at).not.toBeNull();
		expect(dead?.access_count ?? 0).toBe(0);
	});
});
