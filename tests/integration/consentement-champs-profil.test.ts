/**
 * Champs de consentement d'un profil : plus modifiables par l'élève
 * =================================================================
 *
 * Migration `20261001160000_champs_consentement_verrouilles` (décision Q65, option b).
 *
 * Ce que le fichier prouve :
 *   1. un élève connecté ne peut plus se déclarer « consentement obtenu », ni se
 *      dispenser, ni prolonger son délai de grâce (ROUGE avant la migration) ;
 *   2. non-régression : l'élève modifie toujours le reste de son profil ; le
 *      professeur et l'admin modifient toujours ces champs ; le client service aussi ;
 *      le lien envoyé au parent (grant_parental_consent) accorde toujours le
 *      consentement.
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

/** État initial imposé avant chaque scénario : consentement requis, non obtenu. */
const SANS_CONSENTEMENT = {
	consent_required: true,
	consent_granted_at: null,
	consent_grace_period_ends: null
};

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

async function reinitialiser(id: string): Promise<void> {
	const { error } = await service.from('profiles').update(SANS_CONSENTEMENT).eq('id', id);
	if (error) throw new Error(error.message);
}

async function consentementDe(id: string) {
	const { data, error } = await service
		.from('profiles')
		.select('consent_required, consent_granted_at, consent_grace_period_ends, firstname')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('champs de consentement verrouillés pour l’élève', () => {
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
		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
		admin = await clientFor(profilAdmin.email);
	});

	afterAll(async () => {
		await service.from('parental_consents').delete().eq('student_id', eleveId);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// 1. Refusé à l'élève
	// --------------------------------------------------------------------------

	it.each([
		['se déclarer « consentement obtenu »', { consent_granted_at: new Date().toISOString() }],
		['se dispenser de consentement', { consent_required: false }],
		[
			'prolonger son délai de grâce',
			{ consent_grace_period_ends: new Date(Date.now() + 365 * 86_400_000).toISOString() }
		]
	])("l'élève ne peut pas %s", async (_cas, changement) => {
		await reinitialiser(eleveId);
		const { error } = await eleve.from('profiles').update(changement).eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect(await consentementDe(eleveId)).toMatchObject(SANS_CONSENTEMENT);
	});

	// --------------------------------------------------------------------------
	// 2. Non-régression
	// --------------------------------------------------------------------------

	it("l'élève modifie toujours le reste de son profil, consentement renvoyé à l'identique", async () => {
		await reinitialiser(eleveId);
		const { data, error } = await eleve
			.from('profiles')
			.update({ firstname: 'Prénom ZZ', ...SANS_CONSENTEMENT })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await consentementDe(eleveId)).firstname).toBe('Prénom ZZ');
	});

	it('le professeur prolonge le délai de grâce et dispense un élève', async () => {
		await reinitialiser(eleveId);
		const fin = new Date(Date.now() + 30 * 86_400_000).toISOString();
		const { data, error } = await enseignant
			.from('profiles')
			.update({ consent_grace_period_ends: fin, consent_required: false })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		const apres = await consentementDe(eleveId);
		expect(apres.consent_required).toBe(false);
		expect(apres.consent_grace_period_ends).not.toBeNull();
	});

	it("l'admin modifie ces champs", async () => {
		await reinitialiser(eleveId);
		const { data, error } = await admin
			.from('profiles')
			.update({ consent_required: false })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await consentementDe(eleveId)).consent_required).toBe(false);
	});

	it('le client service modifie ces champs', async () => {
		await reinitialiser(eleveId);
		const { error } = await service
			.from('profiles')
			.update({ consent_granted_at: new Date().toISOString() })
			.eq('id', eleveId);
		expect(error).toBeNull();
		expect((await consentementDe(eleveId)).consent_granted_at).not.toBeNull();
	});

	it('le lien envoyé au parent accorde toujours le consentement', async () => {
		await reinitialiser(eleveId);
		const { data: demande, error: errDemande } = await service
			.from('parental_consents')
			.insert({ student_id: eleveId, parent_email: 'parent.zz-profil@example.com' })
			.select('consent_token')
			.single();
		expect(errDemande).toBeNull();
		const { data, error } = await service.rpc('grant_parental_consent', {
			p_token: demande!.consent_token,
			p_ip: '198.51.100.8',
			p_user_agent: 'Firefox réel'
		});
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
		expect((await consentementDe(eleveId)).consent_granted_at).not.toBeNull();
	});
});
