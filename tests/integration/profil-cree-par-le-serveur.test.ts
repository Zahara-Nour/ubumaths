/**
 * Profil : créé par la base ou par le serveur, plus par le compte lui-même
 * =========================================================================
 *
 * Migration `20261001200000_profil_cree_par_le_serveur`.
 *
 * Ce que le fichier prouve :
 *   1. un compte connecté resté sans profil ne peut plus créer le sien en choisissant
 *      son statut et son école (ROUGE avant la migration) ;
 *   2. non-régression : le client service (connexion Google) crée toujours un profil
 *      manquant ; handle_new_user crée toujours le profil à l'inscription.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function profilExiste(id: string): Promise<boolean> {
	const { data, error } = await service.from('profiles').select('id').eq('id', id);
	if (error) throw new Error(error.message);
	return (data ?? []).length === 1;
}

/** Un compte resté sans profil (handle_new_user avale ses erreurs). */
async function compteSansProfil() {
	const profil = await TestData.profile().withRole('student').create();
	const client = await clientFor(profil.email);
	const { error } = await service.from('profiles').delete().eq('id', profil.id);
	if (error) throw new Error(error.message);
	return { id: profil.id, email: profil.email, client };
}

// ============================================================================
// TESTS
// ============================================================================

describe('profil créé par la base ou le serveur seulement', () => {
	let ecoleId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const { data, error } = await service
			.from('schools')
			.insert({ name: 'Lycée ZZ-profil-insert', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		if (error) throw new Error(error.message);
		ecoleId = data.id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it("un compte sans profil ne peut plus créer le sien en se déclarant approuvé dans l'école de son choix", async () => {
		const { id, email, client } = await compteSansProfil();
		const { error } = await client.from('profiles').insert({
			id,
			email,
			role: 'student',
			status: 'approved',
			school_id: ecoleId
		});
		expect(error?.code).toBe('42501');
		expect(await profilExiste(id)).toBe(false);
	});

	it('le client service (connexion Google) crée toujours un profil manquant', async () => {
		const { id, email } = await compteSansProfil();
		const { error } = await service.from('profiles').insert({
			id,
			email,
			role: 'student',
			school_id: null,
			status: 'pending'
		});
		expect(error).toBeNull();
		expect(await profilExiste(id)).toBe(true);
	});

	it("handle_new_user crée toujours le profil à l'inscription", async () => {
		const profil = await TestData.profile().withRole('student').create();
		expect(await profilExiste(profil.id)).toBe(true);
	});
});
