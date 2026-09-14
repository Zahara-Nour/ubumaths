/**
 * Assigner une carte de kanban, et l'élève qui a quitté la classe
 * ===============================================================
 *
 * `20260915400000` a fermé l'ACCÈS de l'élève archivé au kanban. Il restait le
 * sens inverse : le professeur pouvait encore lui ASSIGNER une carte, parce que
 * `is_kanban_board_member` refait le test d'adhésion à la main, sans filtre de
 * statut — et sans jamais nommer `is_class_member`, donc invisible à un grep.
 *
 * ⚠️ Le piège de cette correction est le RETRAIT. La même fonction sert de
 * `USING` à `kanban_card_assignees_delete` : un filtre posé au mauvais endroit
 * rendrait le professeur incapable de retirer l'assignation d'un élève
 * archivé — un verrou fail-closed sur exactement la ligne qu'on veut nettoyer.
 * D'où un cas dédié, qui échouerait si on avait corrigé la fonction partagée.
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

describe('assigner une carte de kanban', () => {
	let carte: string;
	let cartePersonnelle: string;
	let profId: string;
	let prof: SupabaseClient<Database>;
	let actifId: string;
	let archiveId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const enseignant = await TestData.profile().withRole('teacher').create();
		profId = enseignant.id;
		prof = await clientFor(enseignant.email);

		const ecole = await insert('schools', {
			name: 'Lycée assign JJ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année assign JJ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE assign JJ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'JJAS01',
			is_active: true
		});

		const tableau = await insert('kanban_boards', {
			owner_id: enseignant.id,
			class_id: classe,
			title: 'Tableau assign JJ'
		});
		const colonne = await insert('kanban_columns', {
			board_id: tableau,
			title: 'À faire JJ',
			position: 0
		});
		carte = await insert('kanban_cards', {
			column_id: colonne,
			title: 'Carte à assigner JJ',
			position: 0
		});

		// Un tableau PERSONNEL (sans classe) : l'autre court-circuit de la
		// fonction, celui qui dit « il n'y a pas de classe dont on puisse être
		// archivé ».
		const tableauPerso = await insert('kanban_boards', {
			owner_id: enseignant.id,
			class_id: null,
			title: 'Tableau perso JJ'
		});
		const colonnePerso = await insert('kanban_columns', {
			board_id: tableauPerso,
			title: 'Perso JJ',
			position: 0
		});
		cartePersonnelle = await insert('kanban_cards', {
			column_id: colonnePerso,
			title: 'Carte perso JJ',
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
			return profil.id;
		};

		actifId = await eleve('active');
		archiveId = await eleve('archived');
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/**
	 * Le témoin. Sans lui, une correction qui interdirait TOUTE assignation
	 * passerait pour une réussite.
	 */
	it('le professeur peut assigner un élève ACTIF', async () => {
		const { error } = await prof
			.from('kanban_card_assignees')
			.insert({ card_id: carte, user_id: actifId });
		expect(error).toBeNull();

		const { data } = await service
			.from('kanban_card_assignees')
			.select('user_id')
			.eq('card_id', carte)
			.eq('user_id', actifId);
		expect(data?.length, 'l’assignation d’un élève actif n’a pas été enregistrée').toBe(1);
	});

	/**
	 * ⚠️ Le court-circuit `p_assignee = v_owner`. Sans lui, le professeur ne
	 * peut plus s'assigner lui-même sur un tableau de CLASSE : il n'a pas de
	 * ligne dans `class_members`, donc l'exigence d'adhésion active le refuse.
	 * Geste quotidien, qui cassait sans qu'aucun test ne rougisse.
	 */
	it('le professeur peut s’assigner lui-même sur un tableau de classe', async () => {
		const { error } = await prof
			.from('kanban_card_assignees')
			.insert({ card_id: carte, user_id: profId });
		expect(error).toBeNull();

		const { data } = await service
			.from('kanban_card_assignees')
			.select('user_id')
			.eq('card_id', carte)
			.eq('user_id', profId);
		expect(data?.length, 'le professeur ne peut plus s’assigner').toBe(1);
	});

	/**
	 * ⚠️ L'autre court-circuit, `v_class is null`. Un tableau personnel n'a pas
	 * de classe : exiger une adhésion active y interdirait toute assignation.
	 */
	it('le propriétaire d’un tableau PERSONNEL peut encore s’assigner', async () => {
		const { error } = await prof
			.from('kanban_card_assignees')
			.insert({ card_id: cartePersonnelle, user_id: profId });
		expect(error).toBeNull();

		const { data } = await service
			.from('kanban_card_assignees')
			.select('user_id')
			.eq('card_id', cartePersonnelle);
		expect(data?.length, 'le tableau personnel n’accepte plus d’assignation').toBe(1);
	});

	it('le professeur ne peut PAS assigner un élève ARCHIVÉ', async () => {
		const { error } = await prof
			.from('kanban_card_assignees')
			.insert({ card_id: carte, user_id: archiveId });
		expect(error, 'l’assignation d’un ancien élève aurait dû être refusée').not.toBeNull();

		const { data } = await service
			.from('kanban_card_assignees')
			.select('user_id')
			.eq('card_id', carte)
			.eq('user_id', archiveId);
		expect(data).toEqual([]);
	});

	/**
	 * ⚠️ LE cas qui protège la correction d'elle-même.
	 *
	 * Une assignation posée AVANT l'archivage survit : le trigger de nettoyage
	 * ne joue que sur la transition. Le professeur doit donc pouvoir la retirer
	 * — et il ne le pourrait plus si le filtre de statut avait été posé dans
	 * `is_kanban_board_member`, partagée avec le `USING` du DELETE.
	 */
	it('le professeur peut encore RETIRER l’assignation d’un élève archivé', async () => {
		// Posée par le service, comme si elle datait d'avant l'archivage.
		const { error: pose } = await service
			.from('kanban_card_assignees')
			.insert({ card_id: carte, user_id: archiveId });
		expect(pose, 'le décor n’a pas pu être posé').toBeNull();

		const { error } = await prof
			.from('kanban_card_assignees')
			.delete()
			.eq('card_id', carte)
			.eq('user_id', archiveId);
		expect(error).toBeNull();

		const { data } = await service
			.from('kanban_card_assignees')
			.select('user_id')
			.eq('card_id', carte)
			.eq('user_id', archiveId);
		expect(data, 'le professeur ne peut plus nettoyer une assignation périmée').toEqual([]);
	});
});
