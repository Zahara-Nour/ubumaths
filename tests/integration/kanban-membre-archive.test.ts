/**
 * Le kanban d'une classe et l'élève qui l'a quittée (base locale requise)
 * =======================================================================
 *
 * `is_class_member()` ne regardait QUE l'existence de l'adhésion, jamais son
 * statut. Or l'adhésion survit au départ depuis le 2026-09-13 : un élève
 * archivé restait donc membre aux yeux de la base.
 *
 * ⚠️ Ce n'est pas qu'une fuite en lecture. La chaîne descend par
 * `can_access_kanban_board` → `can_access_kanban_column`, et ce sont les
 * clauses `WITH CHECK` de `kanban_cards_insert` et `kanban_cards_update` :
 * l'ancien élève pouvait CRÉER, MODIFIER et SUPPRIMER des cartes sur le
 * tableau d'une classe dont il ne fait plus partie — du contenu collectif, que
 * ses anciens camarades continuent de lire.
 *
 * Tranché par David le 2026-09-14 : on coupe TOUT. Un tableau de classe n'est
 * pas le travail personnel de l'élève (la progression des objectifs, elle,
 * reste visible mais gelée) ; c'est un espace partagé qu'il a quitté.
 *
 * ⚠️ Un smoke-test `auth.uid()` NULL ne prouverait rien : `is_class_member`
 * rend FALSE sans session, donc tous les cas passeraient pour bons.
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

describe('kanban de classe — l’élève archivé', () => {
	let tableau: string;
	let colonne: string;
	let carte: string;
	let actif: SupabaseClient<Database>;
	let archive: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		// Invariant mono-professeur : un seul compte teacher pour toute la suite.
		const enseignant = await TestData.profile().withRole('teacher').create();

		const ecole = await insert('schools', {
			name: 'Lycée kanban KK',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année kanban KK',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE kanban KK',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'KKKB01',
			is_active: true
		});

		tableau = await insert('kanban_boards', {
			owner_id: enseignant.id,
			class_id: classe,
			title: 'Tableau de classe KK'
		});
		colonne = await insert('kanban_columns', {
			board_id: tableau,
			title: 'À faire KK',
			position: 0
		});
		carte = await insert('kanban_cards', {
			column_id: colonne,
			title: 'Carte collective KK',
			position: 0
		});

		const eleve = async (statut: 'active' | 'archived') => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service.from('class_members').insert({
				class_id: classe,
				student_id: profil.id,
				status: statut,
				joined_at: new Date(Date.now() - 60 * 86_400_000).toISOString()
			});
			expect(error).toBeNull();
			return clientFor(profil.email);
		};

		actif = await eleve('active');
		archive = await eleve('archived');
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * Le témoin. Sans lui, une migration qui casserait TOUT passerait pour une
	 * réussite : plus personne ne verrait le tableau, et les cas négatifs
	 * seraient verts.
	 */
	it('l’élève ACTIF voit le tableau, la colonne et la carte', async () => {
		const { data: tableaux } = await actif.from('kanban_boards').select('id').eq('id', tableau);
		expect(tableaux?.map((t) => t.id)).toEqual([tableau]);

		const { data: colonnes } = await actif.from('kanban_columns').select('id').eq('id', colonne);
		expect(colonnes?.map((c) => c.id)).toEqual([colonne]);

		const { data: cartes } = await actif.from('kanban_cards').select('id').eq('id', carte);
		expect(cartes?.map((c) => c.id)).toEqual([carte]);
	});

	it('l’élève ACTIF peut encore écrire une carte', async () => {
		const { error } = await actif
			.from('kanban_cards')
			.update({ title: 'Carte modifiée par un actif KK' })
			.eq('id', carte);
		expect(error).toBeNull();
	});

	it('l’élève ARCHIVÉ ne voit plus le tableau', async () => {
		const { data, error } = await archive.from('kanban_boards').select('id').eq('id', tableau);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('l’élève ARCHIVÉ ne voit plus les colonnes ni les cartes', async () => {
		const { data: colonnes } = await archive.from('kanban_columns').select('id').eq('id', colonne);
		expect(colonnes).toEqual([]);

		const { data: cartes } = await archive.from('kanban_cards').select('id').eq('id', carte);
		expect(cartes).toEqual([]);
	});

	/**
	 * ⚠️ LE cas qui compte. La lecture n'était que la moitié du trou :
	 * `kanban_cards_insert` a pour `WITH CHECK` `can_access_kanban_column`, qui
	 * retombe sur `is_class_member`. Un ancien élève pouvait donc écrire dans le
	 * tableau de ses anciens camarades.
	 */
	it('l’élève ARCHIVÉ ne peut pas CRÉER de carte', async () => {
		const { error } = await archive.from('kanban_cards').insert({
			column_id: colonne,
			title: 'Carte forgée par un archivé KK',
			position: 99
		});
		expect(error, 'l’insertion aurait dû être refusée par la RLS').not.toBeNull();
	});

	/**
	 * ⚠️ Une UPDATE refusée par la RLS ne lève PAS d'erreur : PostgREST ne
	 * trouve simplement aucune ligne à mettre à jour. On vérifie donc l'EFFET
	 * en base, avec le client de service — sans quoi le test serait vert même
	 * si la modification passait.
	 */
	it('l’élève ARCHIVÉ ne peut pas MODIFIER une carte', async () => {
		const INTRUS = 'Titre imposé par un archivé KK';
		await archive.from('kanban_cards').update({ title: INTRUS }).eq('id', carte);

		const { data } = await service.from('kanban_cards').select('title').eq('id', carte).single();
		expect(data?.title).not.toBe(INTRUS);
	});

	it('l’élève ARCHIVÉ ne peut pas SUPPRIMER une carte', async () => {
		await archive.from('kanban_cards').delete().eq('id', carte);

		const { data } = await service.from('kanban_cards').select('id').eq('id', carte);
		expect(
			data?.map((c) => c.id),
			'la carte a été supprimée par un ancien élève'
		).toEqual([carte]);
	});
});
