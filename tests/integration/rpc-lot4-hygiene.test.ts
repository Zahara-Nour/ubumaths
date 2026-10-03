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
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Le consentement parental est hors sujet ici (testé ailleurs).
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: vi.fn() }));

import { POST as rejoindreFile } from '../../src/routes/api/games/minesweeper/multiplayer/queue/+server';

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
	let eleveB: SupabaseClient<Database>;
	let ecoleId: string;
	let annonces: string[] = [];
	/** Saison du démineur : le mois courant (convention des RPC multijoueur). */
	const SAISON = new Date().toISOString().slice(0, 7);
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
		const b = await TestData.profile().withRole('student').create();
		bId = b.id;
		const p = await TestData.profile().withRole('teacher').create();
		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: 'Lycée RPC lot 4', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(ecoleError).toBeNull();
		ecoleId = (ecole as { id: string }).id;
		classeId = (await TestData.class().withName('Classe RPC lot 4').create()).id;

		// La tâche réparée réécrit sample_count/updated_at : on restaure après.
		const { data, error } = await service.from('minesweeper_reference_times').select('*');
		expect(error).toBeNull();
		referencesDemineur = data ?? [];

		eleveA = await createAuthenticatedClient(a.email);
		eleveB = await createAuthenticatedClient(b.email);
		prof = await createAuthenticatedClient(p.email);
	}, 120_000);

	afterAll(async () => {
		const joueurs = `player1_id.in.(${aId},${bId}),player2_id.in.(${aId},${bId})`;
		await service.from('minesweeper_multiplayer_matches').delete().or(joueurs);
		await service.from('minesweeper_multiplayer_queue').delete().in('student_id', [aId, bId]);
		await service.from('minesweeper_player_stats').delete().in('student_id', [aId, bId]);
		if (annonces.length > 0) {
			await service.from('marketplace_listing_views').delete().in('listing_id', annonces);
			await service.from('marketplace_listings').delete().in('id', annonces);
		}
		await service.from('schools').delete().eq('id', ecoleId);
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
			expect((await rpc(service, nom, args)).error, `${nom} refusé au service`).toBeNull();
		}
	});

	// ===========================================================================
	// Q160 — multijoueur du démineur
	// ===========================================================================

	it('Q160 : ensure_player_stats_exist crée la ligne de la saison courante, idempotente', async () => {
		await service.from('minesweeper_player_stats').delete().eq('student_id', aId);
		for (let i = 0; i < 2; i++) {
			const { error } = await rpc(service, 'ensure_player_stats_exist', { p_student_id: aId });
			expect(error).toBeNull();
		}
		const { data, error } = await service
			.from('minesweeper_player_stats')
			.select('season')
			.eq('student_id', aId);
		expect(error).toBeNull();
		expect(data).toEqual([{ season: SAISON }]);
	});

	it('Q160 : deux élèves passent par la route de file d’attente et un match est créé', async () => {
		// Précondition : personne d'autre n'attend sur ce créneau (sinon le
		// premier élève serait apparié à un inconnu).
		const { count, error: fileError } = await service
			.from('minesweeper_multiplayer_queue')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'waiting')
			.eq('difficulty', 'expert')
			.eq('match_type', 'quick');
		expect(fileError).toBeNull();
		expect(count).toBe(0);

		const rejoindre = async (client: SupabaseClient<Database>, id: string) => {
			const response = await rejoindreFile({
				request: new Request('http://localhost/api/games/minesweeper/multiplayer/queue', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ difficulty: 'expert', match_type: 'quick' })
				}),
				locals: {
					supabase: client as unknown as App.Locals['supabase'],
					safeGetSession: async () => ({ user: { id } as User, session: {} })
				} as unknown as App.Locals
			} as unknown as Parameters<typeof rejoindreFile>[0]);
			expect(response.status).toBe(200);
			return (await response.json()) as Record<string, unknown>;
		};

		const premier = await rejoindre(eleveA, aId);
		expect(premier).toMatchObject({ matched: false, waiting: true });

		const second = await rejoindre(eleveB, bId);
		expect(second).toMatchObject({ matched: true, opponent_id: aId, player_number: 2 });
		expect(second.seed).toMatch(/^[0-9a-f]{32}$/);

		const { data: match, error } = await service
			.from('minesweeper_multiplayer_matches')
			.select('player1_id, player2_id, status')
			.eq('id', second.match_id as string)
			.single();
		expect(error).toBeNull();
		expect(match).toEqual({ player1_id: aId, player2_id: bId, status: 'countdown' });
	});

	// ===========================================================================
	// Q161 — vues d'annonces
	// ===========================================================================

	it('Q161 : deux nouvelles vues sont enregistrées, une vue répétée ne compte pas', async () => {
		const annonce = async () => {
			const { data, error } = await service
				.from('marketplace_listings')
				.insert({
					creator_id: bId,
					school_id: ecoleId,
					listing_type: 'buy',
					status: 'active',
					offered_card_ids: [],
					offered_gidouilles: 0,
					wanted_gidouilles: 5,
					expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
				})
				.select('id')
				.single();
			expect(error).toBeNull();
			return (data as { id: string }).id;
		};
		annonces = [await annonce(), await annonce()];
		const vues = async () => {
			const { data, error } = await service
				.from('marketplace_listings')
				.select('view_count')
				.in('id', annonces);
			expect(error).toBeNull();
			return (data ?? []).map((l) => l.view_count);
		};

		const premier = await rpc(eleveA, 'record_listing_views_batch', {
			p_listing_ids: annonces,
			p_user_id: aId
		});
		expect(premier.error).toBeNull();
		expect(premier.data).toMatchObject({ success: true, new_views: 2 });
		expect(await vues()).toEqual([1, 1]);
		const { count } = await service
			.from('marketplace_listing_views')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', aId)
			.in('listing_id', annonces);
		expect(count).toBe(2);

		const repetee = await rpc(eleveA, 'record_listing_views_batch', {
			p_listing_ids: annonces,
			p_user_id: aId
		});
		expect(repetee.data).toMatchObject({ success: true, new_views: 0 });
		expect(await vues()).toEqual([1, 1]);
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
