/**
 * Le paquet Programme est rempli par le SERVEUR seul
 * ==================================================
 *
 * La policy large « Users can create cards in decks » (TO public) acceptait :
 * - toute insertion dans un paquet non assigné de l'appelant — paquet Programme
 *   (`is_auto_managed`) compris ;
 * - n'importe quelle insertion d'un prof / admin, dans le paquet de n'importe qui.
 * La migration 20261003100000 la rattache à `service_role` seul ; reste active
 * pour `authenticated` la policy stricte (propre paquet, non assigné, non
 * auto-managé). `ensureProgrammeDeckCard` écrit désormais avec le client service.
 *
 * ⚠️ Les refus sont testés avec un client AUTHENTIFIÉ (jamais `auth.uid()` NULL)
 * et en relisant la base avec le client service : un refus RLS peut rendre
 * zéro ligne sans erreur.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Le module serveur prend son client service dans process.env (qui peut viser la
// prod via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { ensureProgrammeDeckCard } from '$lib/server/srs/programme-deck';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const TEMPLATE_ID = '7a1d0c55-4e1b-4c3a-9d1e-2f0a6b8c9d01';

const service = createServiceRoleClient();

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

async function createDeck(row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from('srs_decks')
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`srs_decks : ${error.message}`);
	return (data as { id: string }).id;
}

/** Nombre de cartes du paquet, lu en contournant la RLS. */
async function cardCount(deckId: string): Promise<number> {
	const { count, error } = await service
		.from('srs_cards')
		.select('id', { count: 'exact', head: true })
		.eq('deck_id', deckId);
	if (error) throw new Error(`srs_cards : ${error.message}`);
	return count ?? 0;
}

const customCard = (deckId: string, front: string) => ({
	deck_id: deckId,
	card_type: 'custom',
	front_content: front,
	back_content: 'réponse'
});

describe('srs_cards : le paquet Programme est rempli par le serveur', () => {
	let eleve: SupabaseClient<Database>;
	let eleveId: string;
	let prof: SupabaseClient<Database>;
	let programmeEleve: string;
	let paquetPersoEleve: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilEleve = await TestData.profile().withRole('student').create();
		eleveId = profilEleve.id;
		eleve = await clientFor(profilEleve.email);

		const profilProf = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(profilProf.email);

		programmeEleve = await createDeck({
			owner_id: eleveId,
			name: 'Programme',
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true
		});
		paquetPersoEleve = await createDeck({
			owner_id: eleveId,
			name: 'Perso PP',
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: false
		});

		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
		const { error: templateError } = await service.from('question_templates').insert({
			id: TEMPLATE_ID,
			type: 'fill_in_blanks',
			title: 'Paquet Programme PP',
			theme: 'Fractions',
			domain: 'Nombres',
			subdomain: null,
			level: 1,
			grades: ['3'],
			status: 'published',
			variations: [{ statement: 'Combien font $2+2$ ? $?$', blanks: [{ expectedAnswer: '4' }] }]
		});
		expect(templateError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
		await cleanupAllTestData();
	});

	it('(a) un élève ne peut plus insérer dans son paquet Programme', async () => {
		const avant = await cardCount(programmeEleve);
		// Sans `.select()` : le refus doit venir du WITH CHECK, pas de la relecture
		// RETURNING (que la RLS de SELECT refuserait de toute façon au prof).
		const { error } = await eleve
			.from('srs_cards')
			.insert(customCard(programmeEleve, 'Forgée par l’élève'));

		expect(await cardCount(programmeEleve), 'la carte a été écrite').toBe(avant);
		expect(error?.code).toBe('42501');
	});

	it('(b) un prof ne peut plus insérer dans le paquet d’un élève', async () => {
		const avant = await cardCount(paquetPersoEleve);
		// Sans `.select()` : le refus doit venir du WITH CHECK, pas de la relecture
		// RETURNING (que la RLS de SELECT refuserait de toute façon au prof).
		const { error } = await prof
			.from('srs_cards')
			.insert(customCard(paquetPersoEleve, 'Posée par le prof'));

		expect(await cardCount(paquetPersoEleve), 'la carte a été écrite').toBe(avant);
		expect(error?.code).toBe('42501');
	});

	// Le témoin : une migration qui refuserait TOUT passerait (a) et (b).
	it('(c) un élève insère toujours dans son propre paquet non assigné non auto-managé', async () => {
		const avant = await cardCount(paquetPersoEleve);
		const { data, error } = await eleve
			.from('srs_cards')
			.insert(customCard(paquetPersoEleve, 'Carte perso'))
			.select('id');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await cardCount(paquetPersoEleve)).toBe(avant + 1);
	});

	it('(d) le flux serveur ensureProgrammeDeckCard ajoute la carte au paquet Programme', async () => {
		const avant = await cardCount(programmeEleve);

		await ensureProgrammeDeckCard(eleve, eleveId, TEMPLATE_ID);

		const { data, error } = await service
			.from('srs_cards')
			.select('deck_id, card_type, template_id')
			.eq('deck_id', programmeEleve)
			.eq('template_id', TEMPLATE_ID);
		expect(error).toBeNull();
		expect(data).toEqual([
			{ deck_id: programmeEleve, card_type: 'template', template_id: TEMPLATE_ID }
		]);
		expect(await cardCount(programmeEleve)).toBe(avant + 1);

		// Idempotent : un second appel ne double pas la carte
		await ensureProgrammeDeckCard(eleve, eleveId, TEMPLATE_ID);
		expect(await cardCount(programmeEleve)).toBe(avant + 1);
	});
});
