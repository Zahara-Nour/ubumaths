/**
 * On ne se déclare pas ami tout seul (base locale requise)
 * ========================================================
 *
 * `friendships` est devenue une table d'AUTORISATION : depuis `20260915440000`,
 * une amitié acceptée ouvre le profil de l'autre. Deux trous permettaient donc
 * de s'auto-octroyer cette lecture.
 *
 * 1. L'INSERT ne contraignait pas `status` : on insérait directement
 *    `accepted`. Une boucle sur les élèves de son école ouvrait tous leurs
 *    profils, e-mails compris.
 * 2. L'UPDATE n'avait pas de `with check`. ⚠️ Postgres réutilise alors le
 *    `using` sur la NOUVELLE ligne : l'addressee ne pouvait pas se retirer
 *    lui-même, mais rien ne l'empêchait de réécrire `requester_id` vers
 *    n'importe qui et de passer en `accepted`.
 *
 * ⚠️ Le second ne se ferme PAS par une policy : une policy ne peut pas
 * comparer la nouvelle ligne à l'ancienne. D'où un trigger `before update`.
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

describe('une amitié ne se forge pas', () => {
	let attaquant: SupabaseClient<Database>;
	let attaquantId: string;
	let cibleId: string;
	let complicId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		await TestData.profile().withRole('teacher').create();

		// `same_school` garde l'INSERT : les trois comptes partagent l'école.
		const ecole = await insert('schools', {
			name: 'Lycée amitiés FF',
			city: 'Testville',
			country: 'France'
		});

		const eleve = async () => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecole })
				.eq('id', profil.id);
			expect(error).toBeNull();
			return profil;
		};

		const a = await eleve();
		attaquantId = a.id;
		attaquant = await clientFor(a.email);

		cibleId = (await eleve()).id;

		// Un troisième compte, cible de la forge — on n'a besoin que de son id.
		complicId = (await eleve()).id;
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** Le témoin : le flux normal doit continuer de marcher. */
	it('une demande en attente reste possible', async () => {
		const { error } = await attaquant.from('friendships').insert({
			requester_id: attaquantId,
			addressee_id: cibleId,
			status: 'pending',
			friendship_type: 'friend'
		});
		expect(error, 'le flux légitime a été cassé').toBeNull();
	});

	/**
	 * ⚠️ LE trou nº 1. Sans le garde, cette insertion réussit et l'attaquant
	 * lit le profil complet de sa cible — e-mail compris — sans que celle-ci
	 * ait rien accepté.
	 */
	it('on ne peut pas s’insérer directement en « accepted »', async () => {
		const { error } = await attaquant.from('friendships').insert({
			requester_id: attaquantId,
			addressee_id: complicId,
			status: 'accepted',
			friendship_type: 'friend'
		});
		expect(error, 'une amitié forgée a été acceptée par la base').not.toBeNull();

		const { data } = await service
			.from('friendships')
			.select('status')
			.eq('requester_id', attaquantId)
			.eq('addressee_id', complicId);
		expect(data).toEqual([]);
	});

	/**
	 * ⚠️ LE trou nº 2, et il ne se ferme pas par une policy. L'addressee d'une
	 * demande réelle réécrit `requester_id` vers un tiers : il se fabrique une
	 * amitié acceptée avec quelqu'un qui ne lui a jamais écrit.
	 */
	it('l’addressee ne peut pas réécrire l’autre partie', async () => {
		// Une vraie demande, du complice vers l'attaquant.
		const lien = await insert('friendships', {
			requester_id: complicId,
			addressee_id: attaquantId,
			status: 'pending',
			friendship_type: 'friend'
		});

		const { error } = await attaquant
			.from('friendships')
			.update({ requester_id: cibleId, status: 'accepted' })
			.eq('id', lien);
		expect(error, 'les parties de l’amitié ont pu être réécrites').not.toBeNull();

		const { data } = await service
			.from('friendships')
			.select('requester_id, status')
			.eq('id', lien)
			.single();
		expect(data?.requester_id, 'le demandeur a été remplacé').toBe(complicId);
	});

	/** Accepter reste possible : c'est tout l'objet de la policy UPDATE. */
	it('l’addressee peut toujours accepter', async () => {
		const lien = await insert('friendships', {
			requester_id: cibleId,
			addressee_id: attaquantId,
			status: 'pending',
			friendship_type: 'friend'
		});

		const { error } = await attaquant
			.from('friendships')
			.update({ status: 'accepted' })
			.eq('id', lien);
		expect(error).toBeNull();

		const { data } = await service.from('friendships').select('status').eq('id', lien).single();
		expect(data?.status, 'l’acceptation ne passe plus').toBe('accepted');
	});
});
