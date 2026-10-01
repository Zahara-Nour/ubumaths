/**
 * Consentement parental : accordé par le serveur seul
 * ====================================================
 *
 * Migration `20261001150000_consentement_parental_par_le_serveur` :
 * grant_parental_consent n'est plus exécutable que par service_role.
 *
 * Ce que le fichier prouve :
 *   1. anon, détenteur du lien, ne peut plus appeler la fonction directement en
 *      inscrivant une IP et un navigateur de son choix (ROUGE avant la migration) ;
 *   2. un compte connecté ne le peut pas non plus (ROUGE avant la migration) ;
 *   3. non-régression : le client service (celui de la page /consent/[token])
 *      accorde le consentement et enregistre l'IP et le navigateur transmis ;
 *   4. get_consent_info reste lisible sans connexion (la page en dépend).
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const SIGNATURE = 'public.grant_parental_consent(uuid, inet, text)';

/** Client de service : ensemencement, constats, et appel légitime de la page. */
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

/** Crée une demande de consentement en attente et rend son jeton. */
async function demandeEnAttente(studentId: string): Promise<string> {
	const { data, error } = await service
		.from('parental_consents')
		.insert({ student_id: studentId, parent_email: 'parent.zz-consent@example.com' })
		.select('consent_token')
		.single();
	if (error) throw new Error(error.message);
	return data.consent_token;
}

async function etatDe(token: string) {
	const { data, error } = await service
		.from('parental_consents')
		.select('status, consent_ip, consent_user_agent')
		.eq('consent_token', token)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('consentement parental accordé par le serveur seul', () => {
	let studentId: string;
	let connecte: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const eleve = await TestData.profile().withRole('student').create();
		studentId = eleve.id;
		const autre = await TestData.profile().withRole('student').create();
		connecte = await clientFor(autre.email);
	});

	afterAll(async () => {
		await service.from('parental_consents').delete().eq('student_id', studentId);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// 1-2. Appel direct refusé
	// --------------------------------------------------------------------------

	it("anon ne peut plus accorder le consentement en choisissant l'IP et le navigateur", async () => {
		const token = await demandeEnAttente(studentId);
		const { error } = await anonClient().rpc('grant_parental_consent', {
			p_token: token,
			p_ip: '203.0.113.66',
			p_user_agent: 'Navigateur inventé'
		});
		expect(error?.code).toBe('42501');
		expect(await etatDe(token)).toMatchObject({
			status: 'pending',
			consent_ip: null,
			consent_user_agent: null
		});
	});

	it('un compte connecté ne peut pas non plus appeler la fonction', async () => {
		const token = await demandeEnAttente(studentId);
		const { error } = await connecte.rpc('grant_parental_consent', {
			p_token: token,
			p_ip: '203.0.113.67',
			p_user_agent: 'Navigateur inventé'
		});
		expect(error?.code).toBe('42501');
		expect((await etatDe(token)).status).toBe('pending');
	});

	it.each(['anon', 'authenticated', 'public'])(
		"%s n'a plus EXECUTE sur grant_parental_consent",
		async (role) => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ granted: boolean }>(
				`select has_function_privilege($1, $2, 'EXECUTE') as granted`,
				[role, SIGNATURE]
			);
			expect(rows[0].granted).toBe(false);
		}
	);

	// --------------------------------------------------------------------------
	// 3-4. Non-régression
	// --------------------------------------------------------------------------

	it("le client service accorde le consentement avec l'IP et le navigateur transmis", async () => {
		const token = await demandeEnAttente(studentId);
		const { data, error } = await service.rpc('grant_parental_consent', {
			p_token: token,
			p_ip: '198.51.100.7',
			p_user_agent: 'Firefox réel'
		});
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
		expect(await etatDe(token)).toMatchObject({
			status: 'granted',
			consent_ip: '198.51.100.7',
			consent_user_agent: 'Firefox réel'
		});
	});

	it('get_consent_info reste lisible sans connexion', async () => {
		const token = await demandeEnAttente(studentId);
		const { data, error } = await anonClient().rpc('get_consent_info', { p_token: token });
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
	});
});
