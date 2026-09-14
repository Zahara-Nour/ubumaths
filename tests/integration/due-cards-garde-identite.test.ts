/**
 * `get_due_cards_for_deck` : l'identité ne se passe pas en paramètre
 * ==================================================================
 *
 * La fonction est SECURITY DEFINER — elle contourne la RLS de `srs_cards` et
 * `srs_card_stats` — et `authenticated` a le droit de l'exécuter. PostgREST
 * l'expose donc sur `rpc/get_due_cards_for_deck`, et elle prenait l'identité
 * de l'utilisateur EN PARAMÈTRE.
 *
 * Un élève connecté pouvait ainsi lire l'échéancier d'un camarade : difficulté,
 * stabilité, prochaine révision, carte par carte. Le contrôle existait, mais
 * dans la ROUTE — que cet appel n'emprunte pas.
 *
 * ⚠️ CES CAS PASSENT PAR UN CLIENT AUTHENTIFIÉ, jamais par une connexion
 * directe : sous `postgres`, `auth.uid()` vaut NULL, la garde sort avant d'être
 * exercée, et le test serait un faux positif — c'est la règle « jamais de
 * smoke-test `auth.uid()` NULL » de ce dépôt, et elle s'applique mot pour mot.
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

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('garde d’identité de get_due_cards_for_deck', () => {
	let alice: SupabaseClient<Database>;
	let aliceId: string;
	let deckAlice: string;
	let bobId: string;
	let deckBob: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilAlice = await TestData.profile().withRole('student').create();
		aliceId = profilAlice.id;
		alice = await clientFor(profilAlice.email);

		const profilBob = await TestData.profile().withRole('student').create();
		bobId = profilBob.id;

		const deck = async (proprietaire: string, nom: string) => {
			const id = await insert('srs_decks', {
				owner_id: proprietaire,
				name: nom,
				deck_type: 'personal'
			});
			await insert('srs_cards', {
				deck_id: id,
				card_type: 'custom',
				front_content: `Carte de ${nom}`,
				back_content: 'réponse'
			});
			return id;
		};

		deckAlice = await deck(aliceId, 'Deck Alice SS');
		deckBob = await deck(bobId, 'Deck Bob SS');
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// Le témoin : sans lui, une garde qui refuserait TOUT passerait pour un
	// correctif réussi.
	it('Alice lit son propre deck', async () => {
		const { data, error } = await alice.rpc('get_due_cards_for_deck', {
			p_user_id: aliceId,
			p_deck_id: deckAlice
		});

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('Alice ne peut pas lire l’échéancier de Bob', async () => {
		const { data, error } = await alice.rpc('get_due_cards_for_deck', {
			p_user_id: bobId,
			p_deck_id: deckBob
		});

		expect(error, 'la fonction aurait dû refuser').not.toBeNull();
		expect(error?.code).toBe('42501');
		expect(data).toBeNull();
	});

	/**
	 * La seconde fuite, plus discrète : avec son PROPRE identifiant et le deck
	 * d'un camarade, Alice obtenait la COMPOSITION de ce deck — identifiants de
	 * cartes et de modèles — assortie de statistiques par défaut.
	 */
	it('Alice ne peut pas lire la composition du deck de Bob', async () => {
		const { data, error } = await alice.rpc('get_due_cards_for_deck', {
			p_user_id: aliceId,
			p_deck_id: deckBob
		});

		expect(error, 'la fonction aurait dû refuser').not.toBeNull();
		expect(error?.code).toBe('42501');
		expect(data).toBeNull();
	});

	it('la révision forcée n’ouvre aucune porte de plus', async () => {
		const { error } = await alice.rpc('get_due_cards_for_deck', {
			p_user_id: bobId,
			p_deck_id: deckBob,
			p_all: true
		});

		expect(error?.code).toBe('42501');
	});
});
