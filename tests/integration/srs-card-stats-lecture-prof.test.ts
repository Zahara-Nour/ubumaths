/**
 * Cartes de révision : qui lit `srs_card_stats` d'un élève
 * ========================================================
 *
 * Migration 20261021173000 (question d'accès tranchée par David le 2026-10-21) :
 *   - le prof lit les cartes d'un élève à qui il n'a assigné AUCUN paquet ;
 *   - l'élève lit les siennes, pas celles d'un autre élève ;
 *   - `anon` ne lit rien ;
 *   - le prof ne peut toujours pas écrire (lecture seule).
 *
 * La RLS refuse EN SILENCE (zéro ligne) : chaque refus est vérifié par un
 * témoin qui, lui, lit la ligne.
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// ============================================================================
// VARIABLES
// ============================================================================

const service = createServiceRoleClient();

let prof: Client;
let eleve: Client;
let eleveId: string;
let autre: Client;
let anon: Client;
let templateId: string;
let cardId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function clientFor(email: string): Promise<Client> {
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

async function cardIdsSeenBy(client: Client): Promise<string[]> {
	const { data, error } = await client.from('srs_card_stats').select('id').eq('user_id', eleveId);
	expect(error).toBeNull();
	return (data ?? []).map((row) => row.id);
}

// ============================================================================
// SUITE
// ============================================================================

describe('srs_card_stats : lecture par le professeur', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const profilProf = await TestData.profile().withRole('teacher').create();
		const profilEleve = await TestData.profile().withRole('student').create();
		const profilAutre = await TestData.profile().withRole('student').create();
		eleveId = profilEleve.id;
		prof = await clientFor(profilProf.email);
		eleve = await clientFor(profilEleve.email);
		autre = await clientFor(profilAutre.email);
		anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Aucun paquet assigné : seule la nouvelle policy peut ouvrir la carte au prof
		templateId = await createFakeTemplate(service, eleveId);
		const { data, error } = await service
			.from('srs_card_stats')
			.insert({
				user_id: eleveId,
				card_reference_type: 'template',
				card_reference_id: templateId,
				state: 'review',
				next_review: new Date().toISOString()
			})
			.select('id')
			.single();
		if (error || !data) throw new Error(`décor : carte : ${error?.message}`);
		cardId = data.id;
	});

	afterAll(async () => {
		await service.from('srs_card_stats').delete().eq('id', cardId);
		await service.from('question_templates').delete().eq('id', templateId);
		await cleanupAllTestData();
	});

	it('l’élève lit sa carte (témoin)', async () => {
		expect(await cardIdsSeenBy(eleve)).toEqual([cardId]);
	});

	it('le prof lit la carte d’un élève sans paquet assigné', async () => {
		expect(await cardIdsSeenBy(prof)).toEqual([cardId]);
	});

	it('un autre élève ne la lit pas', async () => {
		expect(await cardIdsSeenBy(autre)).toEqual([]);
	});

	it('anon ne la lit pas', async () => {
		const { data, error } = await anon.from('srs_card_stats').select('id').eq('user_id', eleveId);
		// anon sans privilège SELECT : refus explicite ou zéro ligne, jamais la carte
		expect(error === null ? data : []).toEqual([]);
	});

	it('le prof ne peut toujours pas la modifier', async () => {
		const { data } = await prof
			.from('srs_card_stats')
			.update({ state: 'new' })
			.eq('id', cardId)
			.select('id');
		expect(data ?? []).toEqual([]);
		const { data: relue } = await service
			.from('srs_card_stats')
			.select('state')
			.eq('id', cardId)
			.single();
		expect(relue?.state).toBe('review');
	});
});
