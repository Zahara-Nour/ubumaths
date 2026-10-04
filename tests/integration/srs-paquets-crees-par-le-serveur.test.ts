/**
 * Paquets SRS auto-gérés et assignés : créés par le SERVEUR (base locale requise)
 * ===============================================================================
 *
 * Décision de David (2026-10-04, option a) : un paquet auto-géré ou assigné est
 * TOUJOURS créé par le serveur, jamais par l'élève. Ce fichier prouve, avec de
 * vrais comptes :
 *   - qu'un nouvel élève obtient toujours son paquet Programme, créé par le
 *     client service pour l'utilisateur de la session (`ensureProgrammeDeck`) ;
 *   - que l'écran du professeur (`findAssignedDeckCopy`) retrouve la copie de
 *     CE deck par `source_deck_id`, même quand l'élève possède d'autres paquets
 *     assignés du même nom — l'ancien appariement par nom prenait le plus récent.
 *
 * ⚠️ La RLS refuse en silence : tout est relu avec le client service.
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

import { ensureProgrammeDeck } from '$lib/server/srs/programme-deck';
import { findAssignedDeckCopy } from '$lib/server/srs/deck-copy';

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

const NOM_COMMUN = 'Fractions — paquet homonyme';

const service = createServiceRoleClient();

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

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

/** Les paquets Programme de l'élève, lus hors RLS. */
async function paquetsProgramme(ownerId: string) {
	const { data, error } = await service
		.from('srs_decks')
		.select('id, owner_id, is_auto_managed, is_assigned, source_deck_id')
		.eq('owner_id', ownerId)
		.eq('is_auto_managed', true);
	if (error) throw new Error(error.message);
	return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('paquets SRS auto-gérés et assignés : créés par le serveur', () => {
	let eleve: Client;
	let eleveId: string;
	let prof: Client;
	let profId: string;
	let sourceA: string;
	let sourceB: string;
	let copieA: string;
	let copieB: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilEleve = await TestData.profile().withRole('student').create();
		eleveId = profilEleve.id;
		eleve = await clientFor(profilEleve.email);

		const profilProf = await TestData.profile().withRole('teacher').create();
		profId = profilProf.id;
		prof = await clientFor(profilProf.email);

		// Deux decks du professeur, de MÊME nom, tous deux assignés à l'élève.
		sourceA = await insert('srs_decks', {
			owner_id: profId,
			name: NOM_COMMUN,
			deck_type: 'personal'
		});
		sourceB = await insert('srs_decks', {
			owner_id: profId,
			name: NOM_COMMUN,
			deck_type: 'personal'
		});

		// Copies telles que les pose l'assignation (client service, source posée).
		copieA = await insert('srs_decks', {
			owner_id: eleveId,
			name: NOM_COMMUN,
			deck_type: 'personal',
			is_assigned: true,
			source_deck_id: sourceA
		});
		copieB = await insert('srs_decks', {
			owner_id: eleveId,
			name: NOM_COMMUN,
			deck_type: 'personal',
			is_assigned: true,
			source_deck_id: sourceB
		});
		for (const source of [sourceA, sourceB]) {
			await insert('srs_deck_assignments', {
				source_deck_id: source,
				assigned_by: profId,
				assigned_to: eleveId,
				assignment_type: 'student'
			});
		}

		// Le paquet le plus RÉCENT porte aussi ce nom, sans source : c'est lui que
		// l'ancien appariement par nom (`order created_at desc`) aurait affiché.
		await insert('srs_decks', {
			owner_id: eleveId,
			name: NOM_COMMUN,
			deck_type: 'personal',
			is_assigned: true
		});
	}, 120_000);

	afterAll(async () => {
		await service.from('srs_deck_assignments').delete().eq('assigned_by', profId);
		await service.from('srs_decks').delete().in('owner_id', [eleveId, profId]);
		await cleanupAllTestData();
	});

	it('un nouvel élève obtient son paquet Programme, à son nom, créé par le serveur', async () => {
		expect(await paquetsProgramme(eleveId), 'décor : aucun paquet Programme').toHaveLength(0);

		const id = await ensureProgrammeDeck(eleve, eleveId);

		expect(await paquetsProgramme(eleveId)).toEqual([
			{
				id,
				owner_id: eleveId,
				is_auto_managed: true,
				is_assigned: false,
				source_deck_id: null
			}
		]);

		// L'élève le lit avec SON client (la lecture reste sous sa RLS)…
		const { data: lu, error } = await eleve.from('srs_decks').select('id').eq('id', id);
		expect(error).toBeNull();
		expect(lu).toEqual([{ id }]);

		// … et un second appel retrouve le même paquet, sans en créer d'autre.
		await expect(ensureProgrammeDeck(eleve, eleveId)).resolves.toBe(id);
		expect(await paquetsProgramme(eleveId)).toHaveLength(1);
	});

	it('l’écran du professeur retrouve la copie de CE deck, pas un homonyme', async () => {
		// Décor discriminant : l'ANCIENNE requête de l'écran (par nom, la plus
		// récente), rejouée sous le client du professeur, prend un autre paquet.
		const { data: parNom, error } = await prof
			.from('srs_decks')
			.select('id')
			.eq('owner_id', eleveId)
			.eq('is_assigned', true)
			.eq('name', NOM_COMMUN)
			.order('created_at', { ascending: false })
			.limit(1);
		expect(error).toBeNull();
		expect(parNom?.[0]?.id, 'décor : l’appariement par nom tombait juste').not.toBe(copieA);

		const pourA = await findAssignedDeckCopy(prof, eleveId, sourceA);
		const pourB = await findAssignedDeckCopy(prof, eleveId, sourceB);

		expect(pourA?.id).toBe(copieA);
		expect(pourB?.id).toBe(copieB);
	});

	it('sans copie de ce deck, l’écran n’affiche rien (pas un homonyme)', async () => {
		const sourceC = await insert('srs_decks', {
			owner_id: profId,
			name: NOM_COMMUN,
			deck_type: 'personal'
		});

		await expect(findAssignedDeckCopy(prof, eleveId, sourceC)).resolves.toBeNull();
	});
});
