/**
 * Palotins d'une classe, vus par le professeur : la vraie requête contre PostgREST
 * ================================================================================
 *
 * La page Gamification › Palotins affichait « Aucun Bataillon actif » quoi qu'il arrive : sa
 * requête embarquait `student_buddies:student_id` depuis `class_members`, que PostgREST résout
 * vers `profiles` (`column profiles_1.palotin_type does not exist`) ; chaque classe était
 * sautée. Le test unitaire de la page passait par une fausse base qui accepte toute requête.
 * Ce fichier prouve, avec de vrais comptes et le client du PROF, que :
 *   - la requête passe ;
 *   - un élève qui a choisi un Palotin le rend, avec son niveau et sa Constance ;
 *   - un élève sans Palotin est listé, sans Palotin ;
 *   - un élève d'une autre classe n'apparaît pas.
 *
 * `pnpm test:integration tests/integration/palotins-vue-prof.test.ts`
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { fetchClassMembersWithBuddies } from '#lib/server/buddy-class.ts';

// Types
type Client = SupabaseClient<Database>;

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Variables
const service = createServiceRoleClient();
let prof: Client;
let classeId: string;
let avecPalotin: string;
let sansPalotin: string;
let ailleurs: string;

// Functions
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

describe('Palotins d’une classe, lus par le prof', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const profilProf = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(profilProf.email);
		avecPalotin = (await TestData.profile().withRole('student').create()).id;
		sansPalotin = (await TestData.profile().withRole('student').create()).id;
		ailleurs = (await TestData.profile().withRole('student').create()).id;

		const classe = await TestData.class().create();
		const autre = await TestData.class().create();
		classeId = classe.id;
		const { error: membres } = await service.from('class_members').insert([
			{ class_id: classe.id, student_id: avecPalotin, status: 'active' },
			{ class_id: classe.id, student_id: sansPalotin, status: 'active' },
			{ class_id: autre.id, student_id: ailleurs, status: 'active' }
		]);
		if (membres) throw new Error(`décor : classes : ${membres.message}`);

		const { error: palotin } = await service.from('student_buddies').insert({
			student_id: avecPalotin,
			palotin_type: 'pile',
			xp: 130,
			level: 4,
			current_streak: 2,
			longest_streak: 5
		});
		if (palotin) throw new Error(`décor : Palotin : ${palotin.message}`);
	});

	afterAll(async () => {
		await service.from('student_buddies').delete().in('student_id', [avecPalotin]);
		await cleanupAllTestData();
	});

	it('rend chaque élève actif de la classe, avec son Palotin s’il en a un', async () => {
		const membres = await fetchClassMembersWithBuddies(prof, classeId);
		const parEleve = new Map(membres.map((m) => [m.student_id, m]));

		expect([...parEleve.keys()].sort()).toEqual([avecPalotin, sansPalotin].sort());
		expect(parEleve.get(avecPalotin)?.student_buddies).toMatchObject({
			palotin_type: 'pile',
			xp: 130,
			level: 4,
			current_streak: 2,
			longest_streak: 5
		});
		expect(parEleve.get(sansPalotin)?.student_buddies).toBeNull();
		expect(parEleve.get(avecPalotin)?.profiles).not.toBeNull();
		expect(parEleve.has(ailleurs)).toBe(false);
	});
});
