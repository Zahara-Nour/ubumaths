/**
 * Profil : « compte de test » et bonus plus modifiables par l'élève
 * =================================================================
 *
 * Migration `20261001180000_profil_is_test_et_bonus_verrouilles` (décisions Q66, Q67).
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne peut plus se marquer « compte de test » (ROUGE avant la migration) ;
 *   2. l'élève ne peut plus augmenter son bonus (ROUGE avant la migration) ;
 *   3. le professeur ne peut plus marquer un élève « compte de test » (ROUGE avant) ;
 *   4. non-régression : l'élève modifie toujours le reste de son profil et peut faire
 *      baisser son bonus ; le professeur augmente toujours le bonus d'un élève de sa
 *      classe ; l'admin et le client service modifient is_test.
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

const MARQUE = 'ZZ-profil-champs';

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

async function etat(id: string, bonus = 10): Promise<void> {
	const { error } = await service.from('profiles').update({ is_test: false, bonus }).eq('id', id);
	if (error) throw new Error(error.message);
}

async function champsDe(id: string) {
	const { data, error } = await service
		.from('profiles')
		.select('is_test, bonus, firstname')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('is_test et bonus verrouillés pour l’élève', () => {
	let eleveId: string;
	let eleve: SupabaseClient<Database>;
	let enseignant: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const profilEleve = await TestData.profile().withRole('student').create();
		const profilProf = await TestData.profile().withRole('teacher').create();
		const profilAdmin = await TestData.profile().withRole('admin').create();
		eleveId = profilEleve.id;

		const ecole = await insert('schools', {
			name: `Lycée ${MARQUE}`,
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: `Année ${MARQUE}`,
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: `2nde ${MARQUE}`,
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZPC01',
			is_active: true
		});
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: eleveId, status: 'active' });
			expect(error).toBeNull();
		}

		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
		admin = await clientFor(profilAdmin.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// 1-3. Refusé
	// --------------------------------------------------------------------------

	it("l'élève ne peut pas se marquer « compte de test »", async () => {
		await etat(eleveId);
		const { error } = await eleve.from('profiles').update({ is_test: true }).eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect((await champsDe(eleveId)).is_test).toBe(false);
	});

	it("l'élève ne peut pas augmenter son bonus", async () => {
		await etat(eleveId, 10);
		const { error } = await eleve.from('profiles').update({ bonus: 999 }).eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect((await champsDe(eleveId)).bonus).toBe(10);
	});

	it('le professeur ne peut pas marquer un élève « compte de test »', async () => {
		await etat(eleveId);
		const { error } = await enseignant.from('profiles').update({ is_test: true }).eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect((await champsDe(eleveId)).is_test).toBe(false);
	});

	// --------------------------------------------------------------------------
	// 4. Non-régression
	// --------------------------------------------------------------------------

	it("l'élève modifie toujours le reste de son profil, champs renvoyés à l'identique", async () => {
		await etat(eleveId, 10);
		const { data, error } = await eleve
			.from('profiles')
			.update({ firstname: 'Prénom ZZ', is_test: false, bonus: 10 })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await champsDe(eleveId)).firstname).toBe('Prénom ZZ');
	});

	it("l'élève peut faire baisser son bonus", async () => {
		await etat(eleveId, 10);
		const { data, error } = await eleve
			.from('profiles')
			.update({ bonus: 4 })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await champsDe(eleveId)).bonus).toBe(4);
	});

	it("le professeur augmente le bonus d'un élève de sa classe", async () => {
		await etat(eleveId, 10);
		const { data, error } = await enseignant
			.from('profiles')
			.update({ bonus: 15 })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await champsDe(eleveId)).bonus).toBe(15);
	});

	it("l'admin modifie is_test", async () => {
		await etat(eleveId);
		const { data, error } = await admin
			.from('profiles')
			.update({ is_test: true })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await champsDe(eleveId)).is_test).toBe(true);
	});

	it('le client service modifie is_test et le bonus', async () => {
		await etat(eleveId, 10);
		const { error } = await service
			.from('profiles')
			.update({ is_test: true, bonus: 50 })
			.eq('id', eleveId);
		expect(error).toBeNull();
		expect(await champsDe(eleveId)).toMatchObject({ is_test: true, bonus: 50 });
	});
});
