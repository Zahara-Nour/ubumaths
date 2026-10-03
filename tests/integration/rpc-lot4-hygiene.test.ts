/**
 * RPC lot 4 : hygiène (base locale requise)
 * =========================================
 *
 * Migration `20261003210000_rpc_lot4_hygiene.sql`. Décision de David (Q143) :
 * un élève ne lit ni n'écrit plus rien sur le compte d'un autre ; prof et admin
 * gardent leurs écrans.
 *
 * 1. Gardes : l'élève A appelle chaque fonction sur le compte de B → 42501 ;
 *    TÉMOINS : A sur lui-même, et le prof, passent toujours.
 * 2. Policies qui appellent ces fonctions (avec auth.uid()) : elles laissent
 *    toujours passer l'usage légitime (lecture relue au client service : la
 *    RLS échoue en silence).
 * 3. Fonctions sans appelant : EXECUTE retiré à authenticated, le service garde.
 * 4. Tâche cassée réparée : recalculate_minesweeper_reference_times (42702).
 * 5. search_path : plus aucune fonction SECURITY DEFINER de `public` sans
 *    pg_temp explicite en dernière position.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const service = createServiceRoleClient();

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
}

describe('RPC lot 4 : hygiène', () => {
	let eleveA: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;
	let aId: string;
	let bId: string;
	let classeId: string;
	/** Identifiants quelconques : la garde refuse AVANT toute lecture. */
	const DECK = '00000000-0000-4000-8000-0000000000d1';
	const ANNONCE = '00000000-0000-4000-8000-0000000000a1';
	const TOURNOI = '00000000-0000-4000-8000-0000000000e1';
	const DATE_EXPORT = '2099-01-01';
	let referencesDemineur: Record<string, unknown>[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await TestData.profile().withRole('student').create();
		aId = a.id;
		bId = (await TestData.profile().withRole('student').create()).id;
		const p = await TestData.profile().withRole('teacher').create();
		classeId = (await TestData.class().withName('Classe RPC lot 4').create()).id;

		// La tâche réparée réécrit sample_count/updated_at : on restaure après.
		const { data, error } = await service.from('minesweeper_reference_times').select('*');
		expect(error).toBeNull();
		referencesDemineur = data ?? [];

		eleveA = await createAuthenticatedClient(a.email);
		prof = await createAuthenticatedClient(p.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('whiteboard_export_counters').delete().eq('class_id', classeId);
		await service.from('python_notebooks').delete().eq('author_id', aId);
		await service.from('python_files').delete().eq('owner_id', aId);
		if (referencesDemineur.length > 0) {
			await service.from('minesweeper_reference_times').upsert(referencesDemineur as never);
		}
		await service.from('classes').delete().eq('id', classeId);
		await cleanupAllTestData();
	});

	// ===========================================================================
	// 1. Gardes : A sur B refusé ; A sur lui-même et le prof passent
	// ===========================================================================

	/** Fonctions qui prennent l'identifiant du compte visé. */
	const surCompte = (id: string): [string, Record<string, unknown>][] => [
		['get_private_messages_unread_count', { p_user_id: id }],
		['get_user_status', { user_id: id }],
		['get_deck_stats', { p_user_id: id, p_deck_id: DECK }],
		['count_user_notebooks', { p_user_id: id }],
		['count_user_python_files', { p_user_id: id }],
		['get_2048_user_rank', { p_user_id: id }],
		['has_proposal_on_listing', { p_listing_id: ANNONCE, p_user_id: id }],
		['record_listing_views_batch', { p_listing_ids: [], p_user_id: id }]
	];

	it('A ne lit ni n’écrit sur le compte de B (chaque fonction gardée)', async () => {
		for (const [nom, args] of surCompte(bId)) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error?.code, `${nom} accepté sur le compte de B`).toBe(REFUS);
		}
	});

	it('témoin : A sur SON compte', async () => {
		for (const [nom, args] of surCompte(aId)) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error, `${nom} refusé à A sur lui-même`).toBeNull();
		}
		// Valeurs, pas seulement l'absence d'erreur.
		expect((await rpc(eleveA, 'count_user_notebooks', { p_user_id: aId })).data).toBe(0);
		expect((await rpc(eleveA, 'get_user_status', { user_id: aId })).data).not.toBeNull();
		const vues = await rpc(eleveA, 'record_listing_views_batch', {
			p_listing_ids: [],
			p_user_id: aId
		});
		expect(vues.data).toMatchObject({ success: true });
	});

	it('témoin : le prof garde ses écrans (stats d’un élève, rang, statut)', async () => {
		for (const [nom, args] of [
			['get_deck_stats', { p_user_id: bId, p_deck_id: DECK }],
			['get_user_status', { user_id: bId }],
			['count_user_notebooks', { p_user_id: bId }],
			['get_2048_user_rank', { p_user_id: bId }]
		] as [string, Record<string, unknown>][]) {
			const { error } = await rpc(prof, nom, args);
			expect(error, `${nom} refusé au prof`).toBeNull();
		}
	});

	it('messagerie et vues : réservées au compte lui-même, prof compris', async () => {
		for (const [nom, args] of [
			['get_private_messages_unread_count', { p_user_id: bId }],
			['record_listing_views_batch', { p_listing_ids: [], p_user_id: bId }]
		] as [string, Record<string, unknown>][]) {
			const { error } = await rpc(prof, nom, args);
			expect(error?.code, `${nom} accepté au prof sur B`).toBe(REFUS);
		}
	});

	it('actions prof : refusées à l’élève, permises au prof', async () => {
		const appels: [string, Record<string, unknown>][] = [
			['backfill_tournament_scores', { p_tournament_id: TOURNOI }],
			['get_next_export_counter', { p_class_id: classeId, p_export_date: DATE_EXPORT }]
		];
		for (const [nom, args] of appels) {
			expect((await rpc(eleveA, nom, args)).error?.code, `${nom} accepté à l’élève`).toBe(REFUS);
		}
		// Le compteur n'a pas bougé : seul le prof l'incrémente.
		const { data: avant } = await service
			.from('whiteboard_export_counters')
			.select('counter')
			.eq('class_id', classeId);
		expect(avant).toEqual([]);

		for (const [nom, args] of appels) {
			expect((await rpc(prof, nom, args)).error, `${nom} refusé au prof`).toBeNull();
		}
		const compteur = await rpc(prof, 'get_next_export_counter', {
			p_class_id: classeId,
			p_export_date: DATE_EXPORT
		});
		expect(compteur.data).toBe(2);
	});

	// ===========================================================================
	// 2. Les policies qui appellent ces fonctions laissent passer l'usage légitime
	// ===========================================================================

	it('policies : A crée son notebook, son fichier python, modifie son profil', async () => {
		const nb = await eleveA
			.from('python_notebooks')
			.insert({
				title: 'Lot 4',
				content: { version: 1, metadata: {}, cells: [] },
				author_id: aId
			})
			.select('id');
		expect(nb.error).toBeNull();
		expect(nb.data).toHaveLength(1);

		const fichier = await eleveA
			.from('python_files')
			.insert({ title: 'lot4.py', code: 'print(1)', owner_id: aId })
			.select('id');
		expect(fichier.error).toBeNull();
		expect(fichier.data).toHaveLength(1);

		const profil = await eleveA
			.from('profiles')
			.update({ full_name: 'Élève lot 4' })
			.eq('id', aId)
			.select('full_name');
		expect(profil.error).toBeNull();
		expect(profil.data).toEqual([{ full_name: 'Élève lot 4' }]);
	});

	// ===========================================================================
	// 3. Sans appelant : service_role seul
	// ===========================================================================

	const sansAppelant = (id: string): [string, Record<string, unknown>][] => [
		['get_unread_count', { p_conversation_id: DECK, p_user_id: id }],
		['is_user_restricted', { p_user_id: id, p_conversation_id: null }],
		['get_mathemo_user_rank', { p_user_id: id }],
		['ensure_player_stats_exist', { p_student_id: id }]
	];

	it('fonctions sans appelant : refusées à tout compte connecté, même sur soi', async () => {
		for (const [nom, args] of sansAppelant(aId)) {
			expect((await rpc(eleveA, nom, args)).error?.code, `${nom} accepté à A`).toBe(REFUS);
			expect((await rpc(prof, nom, args)).error?.code, `${nom} accepté au prof`).toBe(REFUS);
		}
	});

	it('témoin : le client service les appelle toujours', async () => {
		for (const [nom, args] of sansAppelant(aId)) {
			const { error } = await rpc(service, nom, args);
			if (nom === 'ensure_player_stats_exist') {
				// Bug HORS lot 4, signalé : ON CONFLICT (student_id) alors que la clé
				// est (student_id, season) → 42P10. Le droit passe, le corps échoue.
				expect(error?.code, `${nom} refusé au service`).toBe('42P10');
			} else {
				expect(error, `${nom} refusé au service`).toBeNull();
			}
		}
	});

	// ===========================================================================
	// 4. Tâche de maintenance réparée
	// ===========================================================================

	it('recalculate_minesweeper_reference_times s’exécute (plus de 42702)', async () => {
		const { error } = await rpc(service, 'recalculate_minesweeper_reference_times');
		expect(error).toBeNull();
		const { error: cronError } = await rpc(service, 'run_recalculate_minesweeper_ref_times');
		expect(cronError).toBeNull();
	});

	// ===========================================================================
	// 5. search_path
	// ===========================================================================

	it('aucune fonction SECURITY DEFINER de public sans pg_temp en dernier', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ proname: string }>(`
			select p.proname
			from pg_proc p
			where p.pronamespace = 'public'::regnamespace and p.prosecdef
			  and not exists (
			    select 1 from unnest(coalesce(p.proconfig, '{}')) c
			    where c like 'search_path=%' and c ~ 'pg_temp"?$'
			  )`);
		expect(rows.map((r) => r.proname)).toEqual([]);
	});
});
