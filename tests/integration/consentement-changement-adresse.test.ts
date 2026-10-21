/**
 * Consentement parental : changer l'adresse invalide l'ancien lien
 * ================================================================
 *
 * Contre-revue de la PR 3 (2026-10-21) : l'adresse du parent d'une demande `granted` est celle
 * où part le lien « Mot de passe oublié » de l'enfant (R1). Si le prof corrige l'adresse A en B
 * sans changer de jeton, le lien déjà reçu par A accorde la demande… à l'adresse B, que
 * personne n'a confirmée. Correctif : l'ancienne demande est fermée (`closePendingConsentRequest`)
 * et une nouvelle, à jeton neuf, part à B.
 *
 * Ce que le fichier prouve, avec le client du PROF (RLS et trigger réels) :
 *   1. la demande fermée ne s'accorde plus avec son jeton (`grant_parental_consent` ne regarde
 *      que l'échéance : le statut `expired` seul ne suffirait pas) ;
 *   2. le prof peut créer la nouvelle demande, dont le jeton s'accorde.
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
import { closePendingConsentRequest } from '$lib/server/parental-consent-requests';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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

/** Ce que fait la page /consent/[token] (client service). */
async function accorder(token: string) {
	const { data, error } = await service.rpc('grant_parental_consent', {
		p_token: token,
		p_ip: '198.51.100.7',
		p_user_agent: 'Firefox'
	});
	if (error) throw new Error(error.message);
	return data as { success: boolean; error?: string };
}

// ============================================================================
// TESTS
// ============================================================================

describe('changer l’adresse du parent invalide l’ancien lien', () => {
	let studentId: string;
	let prof: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = await TestData.class().withName('3e consentement adresse ZZ').create();
		const eleve = await TestData.profile().withRole('student').create();
		studentId = eleve.id;
		const { error } = await service
			.from('class_members')
			.insert({ class_id: klass.id, student_id: studentId, status: 'active' });
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
		prof = await clientFor(teacher.email);
	});

	afterAll(async () => {
		await service.from('parental_consents').delete().eq('student_id', studentId);
		await cleanupAllTestData();
	});

	it('demande fermée par le prof → son jeton est refusé, rien n’est accordé', async () => {
		const { data: ancienne, error } = await prof
			.from('parental_consents')
			.insert({ student_id: studentId, parent_email: 'a.zz-adresse@example.com' })
			.select('id, consent_token')
			.single();
		expect(error).toBeNull();

		expect(await closePendingConsentRequest(prof, ancienne!.id)).toBe(true);

		expect(await accorder(ancienne!.consent_token)).toMatchObject({
			success: false,
			error: 'TOKEN_EXPIRED'
		});
		const { data: etat } = await service
			.from('parental_consents')
			.select('status')
			.eq('id', ancienne!.id)
			.single();
		expect(etat?.status).toBe('expired');
	});

	it('la nouvelle demande, à jeton neuf, s’accorde à la nouvelle adresse', async () => {
		const { data: nouvelle, error } = await prof
			.from('parental_consents')
			.insert({ student_id: studentId, parent_email: 'b.zz-adresse@example.com' })
			.select('id, consent_token')
			.single();
		expect(error).toBeNull();
		expect(await accorder(nouvelle!.consent_token)).toMatchObject({ success: true });
	});

	it('une demande déjà accordée ne se ferme pas', async () => {
		const { data: accordee } = await service
			.from('parental_consents')
			.select('id')
			.eq('student_id', studentId)
			.eq('status', 'granted')
			.single();
		expect(await closePendingConsentRequest(prof, accordee!.id)).toBe(false);
	});
});
