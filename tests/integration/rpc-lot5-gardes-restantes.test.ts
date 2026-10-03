/**
 * RPC lot 5 : gardes restantes (base locale requise)
 * ==================================================
 *
 * Migration `20261003230000_rpc_lot5_gardes_restantes.sql` : les 24 fonctions
 * SECURITY DEFINER relevées par le garde-fou Q145. Décision de David (Q143) :
 * un élève ne lit ni n'écrit rien sur le compte d'un autre ; prof et admin
 * gardent ce que leurs écrans font.
 *
 * 1. award_achievement_manual : réservée prof/admin. L'élève A ne s'attribue
 *    rien, n'attribue rien à B (recompté au client service) ; le prof, oui.
 * 2. Gardes « soi ou prof » et « soi, ami ou prof » : A sur B → 42501 ;
 *    TÉMOINS : A sur lui-même, A sur un ami (marché), le prof.
 * 3. Sans appelant utilisateur : EXECUTE retiré à authenticated (A et prof
 *    refusés, même sur soi) ; le service et les fonctions SECURITY DEFINER
 *    appelantes gardent l'accès (témoin : send_private_message, qui appelle
 *    deux fonctions révoquées, marche toujours).
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
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
type Appel = [string, Record<string, unknown>];

// ============================================================================
// CONSTANTS
// ============================================================================

const service = createServiceRoleClient();

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

/** Succès de test, « event_based » : attribuable par award_achievement_manual. */
const SUCCES = 'test_lot5_attribution_manuelle';

/** Identifiants quelconques : les gardes refusent AVANT toute lecture. */
const QUELCONQUE = '00000000-0000-4000-8000-0000000000c5';

/** Les 16 signatures révoquées à authenticated (section 2 de la migration). */
const SIGNATURES_REVOQUEES = [
	'public.record_listing_view(uuid, uuid)',
	'public.get_user_frequent_templates(uuid, integer)',
	'public.validate_attachment_upload(uuid, uuid, integer)',
	'public.validate_1on1_chat_creation(uuid, uuid)',
	'public.calculate_daily_challenge_gidouilles(text, integer, uuid)',
	'public.calculate_minesweeper_gidouilles(text, integer, uuid, integer)',
	'public.calculate_minesweeper_gidouilles(text, integer, uuid, integer, integer)',
	'public.check_and_unlock_achievements(uuid)',
	'public.update_student_observable_state(uuid, uuid)',
	'public.get_students_in_class(uuid)',
	'public.validate_class_message_recipients(uuid, uuid)',
	'public.validate_message_recipients(uuid, uuid[])',
	'public.check_achievement_prerequisites(uuid, text)',
	'public.get_next_riddle_attempt_number(uuid, uuid)',
	'public.is_kanban_board_member(uuid, uuid)',
	'public.can_participate_in_tournament(uuid, uuid)'
];

// ============================================================================
// HELPERS
// ============================================================================

async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
}

async function succesDe(studentId: string): Promise<number> {
	const { count, error } = await service
		.from('student_achievements')
		.select('id', { count: 'exact', head: true })
		.eq('student_id', studentId)
		.eq('achievement_id', SUCCES);
	expect(error).toBeNull();
	return count ?? -1;
}

// ============================================================================
// TESTS
// ============================================================================

describe('RPC lot 5 : gardes restantes', () => {
	let eleveA: SupabaseClient<Database>;
	let prof: SupabaseClient<Database>;
	let aId: string;
	let bId: string;
	let amiId: string;
	let profId: string;
	let classeId: string;
	let ecoleId: string;
	let annonceId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await TestData.profile().withRole('student').create();
		const b = await TestData.profile().withRole('student').create();
		const ami = await TestData.profile().withRole('student').create();
		const p = await TestData.profile().withRole('teacher').create();
		aId = a.id;
		bId = b.id;
		amiId = ami.id;
		profId = p.id;

		classeId = (await TestData.class().withName('Classe RPC lot 5').create()).id;
		const membres = await service.from('class_members').insert([
			{ class_id: classeId, student_id: aId, status: 'active' },
			{ class_id: classeId, student_id: bId, status: 'active' }
		]);
		expect(membres.error).toBeNull();

		const amitie = await service
			.from('friendships')
			.insert({ requester_id: aId, addressee_id: amiId, status: 'accepted' });
		expect(amitie.error).toBeNull();

		const succes = await service.from('achievements').insert({
			id: SUCCES,
			context: 'system',
			category: 'special',
			name: 'Lot 5',
			description: 'Succès de test du lot 5',
			icon: '🧪',
			unlock_type: 'event_based',
			metadata: { points: 10, gidouilles_reward: 3 }
		});
		expect(succes.error).toBeNull();

		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: 'Lycée RPC lot 5', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(ecoleError).toBeNull();
		ecoleId = (ecole as { id: string }).id;
		const { data: annonce, error: annonceError } = await service
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
		expect(annonceError).toBeNull();
		annonceId = (annonce as { id: string }).id;

		eleveA = await createAuthenticatedClient(a.email);
		prof = await createAuthenticatedClient(p.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('student_achievements').delete().eq('achievement_id', SUCCES);
		await service.from('achievements').delete().eq('id', SUCCES);
		await service.from('marketplace_listing_views').delete().eq('listing_id', annonceId);
		await service.from('marketplace_listings').delete().eq('id', annonceId);
		await service.from('schools').delete().eq('id', ecoleId);
		await service.from('friendships').delete().eq('requester_id', aId);
		await service.from('private_messages').delete().eq('sender_id', aId);
		await service.from('class_members').delete().eq('class_id', classeId);
		await service.from('classes').delete().eq('id', classeId);
		await cleanupAllTestData();
	});

	// ===========================================================================
	// 1. award_achievement_manual : réservée prof/admin
	// ===========================================================================

	it('A ne s’attribue pas de succès, ni à B (recompté au service)', async () => {
		for (const cible of [aId, bId]) {
			const { error } = await rpc(eleveA, 'award_achievement_manual', {
				p_student_id: cible,
				p_achievement_id: SUCCES,
				p_reason: 'triche'
			});
			expect(error?.code, `succès accepté à A pour ${cible}`).toBe(REFUS);
		}
		expect(await succesDe(aId)).toBe(0);
		expect(await succesDe(bId)).toBe(0);
	});

	it('témoin : le prof attribue le succès à B, attribué par lui', async () => {
		const { data, error } = await rpc(prof, 'award_achievement_manual', {
			p_student_id: bId,
			p_achievement_id: SUCCES,
			p_reason: 'aide un camarade'
		});
		expect(error).toBeNull();
		expect(data).toBe(true);
		const { data: ligne, error: lectureError } = await service
			.from('student_achievements')
			.select('unlocked_by, points_awarded')
			.eq('student_id', bId)
			.eq('achievement_id', SUCCES)
			.single();
		expect(lectureError).toBeNull();
		expect(ligne).toEqual({ unlocked_by: profId, points_awarded: 10 });
	});

	it('le contrôle d’inscription reste : le prof ne vise pas un élève hors classe', async () => {
		const { error } = await rpc(prof, 'award_achievement_manual', {
			p_student_id: amiId,
			p_achievement_id: SUCCES
		});
		expect(error?.message).toMatch(/does not have access to this student/);
		expect(await succesDe(amiId)).toBe(0);
	});

	// ===========================================================================
	// 2. Gardes sur le compte visé
	// ===========================================================================

	/** Fonctions gardées « soi ou prof/admin ». */
	const soiOuProf = (id: string): Appel[] => [
		['is_conversation_participant', { p_conversation_id: QUELCONQUE, p_user_id: id }],
		['is_riddle_assigned_to_student', { p_riddle_id: QUELCONQUE, p_student_id: id }],
		['student_has_exercise_access', { p_exercise_id: QUELCONQUE, p_student_id: id }],
		['can_moderate_message', { moderator_uuid: id, message_uuid: QUELCONQUE }]
	];

	/** Fonctions du marché gardées « soi, ami ou prof/admin ». */
	const marche = (id: string): Appel[] => [
		['check_daily_trade_limit', { p_user_id: id }],
		['check_marketplace_enabled', { p_student_id: id }]
	];

	it('A ne lit rien sur le compte de B (chaque fonction gardée)', async () => {
		for (const [nom, args] of [...soiOuProf(bId), ...marche(bId)]) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error?.code, `${nom} accepté sur le compte de B`).toBe(REFUS);
		}
	});

	it('témoin : A sur SON compte', async () => {
		for (const [nom, args] of [...soiOuProf(aId), ...marche(aId)]) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error, `${nom} refusé à A sur lui-même`).toBeNull();
		}
		const limite = await rpc(eleveA, 'check_daily_trade_limit', { p_user_id: aId });
		expect(limite.data).toMatchObject({ success: true, trades_today: 0 });
	});

	it('témoin : A vérifie son AMI, partenaire d’échange (/api/marketplace/trades)', async () => {
		for (const [nom, args] of marche(amiId)) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error, `${nom} refusé à A sur son ami`).toBeNull();
		}
	});

	it('témoin : le prof garde ses écrans', async () => {
		for (const [nom, args] of [...soiOuProf(bId), ...marche(bId)]) {
			const { error } = await rpc(prof, nom, args);
			expect(error, `${nom} refusé au prof`).toBeNull();
		}
	});

	it('get_teacher_classes_for_messaging : refusée à l’élève, rend les classes au prof', async () => {
		expect((await rpc(eleveA, 'get_teacher_classes_for_messaging')).error?.code).toBe(REFUS);
		const { data, error } = await rpc(prof, 'get_teacher_classes_for_messaging');
		expect(error).toBeNull();
		const classes = data as { class_id: string; student_count: number }[];
		expect(classes.find((c) => c.class_id === classeId)?.student_count).toBe(2);
	});

	// ===========================================================================
	// 3. Sans appelant utilisateur : EXECUTE retiré à authenticated
	// ===========================================================================

	const sansAppelant = (id: string): Appel[] => [
		['record_listing_view', { p_listing_id: annonceId, p_user_id: id }],
		['get_user_frequent_templates', { p_user_id: id, p_limit: 5 }],
		['validate_attachment_upload', { p_message_id: QUELCONQUE, p_user_id: id, p_file_size: 1 }],
		['validate_1on1_chat_creation', { p_user1_id: id, p_user2_id: QUELCONQUE }],
		[
			'calculate_daily_challenge_gidouilles',
			{ p_difficulty: 'beginner', p_time_seconds: 60, p_student_id: id }
		],
		// La surcharge à 4 arguments est indiscernable en RPC (PGRST203) : ses
		// droits sont vérifiés en SQL ci-dessous.
		[
			'calculate_minesweeper_gidouilles',
			{
				p_difficulty: 'beginner',
				p_time_seconds: 60,
				p_student_id: id,
				p_hints_used: 0,
				p_reduced_penalty_hints: 0
			}
		],
		['check_and_unlock_achievements', { p_game_id: QUELCONQUE }],
		['update_student_observable_state', { p_student_id: id, p_observable_id: QUELCONQUE }],
		['get_students_in_class', { class_uuid: classeId }],
		['validate_class_message_recipients', { sender_uuid: id, class_uuid: classeId }],
		['validate_message_recipients', { sender_uuid: id, recipient_uuids: [profId] }],
		['check_achievement_prerequisites', { p_student_id: id, p_achievement_id: SUCCES }],
		['get_next_riddle_attempt_number', { p_riddle_id: QUELCONQUE, p_student_id: id }],
		['is_kanban_board_member', { p_board_id: QUELCONQUE, p_user_id: id }],
		['can_participate_in_tournament', { p_tournament_id: QUELCONQUE, p_student_id: id }]
	];

	it('sans appelant : refusées à tout compte connecté, même sur soi', async () => {
		for (const [nom, args] of [...sansAppelant(bId), ...sansAppelant(aId)]) {
			expect((await rpc(eleveA, nom, args)).error?.code, `${nom} accepté à A`).toBe(REFUS);
			expect((await rpc(prof, nom, args)).error?.code, `${nom} accepté au prof`).toBe(REFUS);
		}
		// Aucune vue n'a été enregistrée au nom de B, ni de A (recompté au service).
		const { count, error } = await service
			.from('marketplace_listing_views')
			.select('id', { count: 'exact', head: true })
			.eq('listing_id', annonceId);
		expect(error).toBeNull();
		expect(count).toBe(0);
		const { data: annonce } = await service
			.from('marketplace_listings')
			.select('view_count')
			.eq('id', annonceId)
			.single();
		expect(annonce?.view_count ?? 0).toBe(0);
	});

	it('droits relus en SQL : authenticated n’a plus EXECUTE, service_role l’a', async () => {
		const pg = await getPostgresClient();
		for (const sig of SIGNATURES_REVOQUEES) {
			const { rows } = await pg.query<{ auth: boolean; anon: boolean; service: boolean }>(
				`select has_function_privilege('authenticated', $1, 'EXECUTE') as auth,
				        has_function_privilege('anon', $1, 'EXECUTE') as anon,
				        has_function_privilege('service_role', $1, 'EXECUTE') as service`,
				[sig]
			);
			expect(rows[0], sig).toEqual({ auth: false, anon: false, service: true });
		}
	});

	it('témoin : le client service les appelle toujours', async () => {
		for (const [nom, args] of sansAppelant(aId)) {
			if (nom === 'record_listing_view') continue; // écrirait une vue
			const { error } = await rpc(service, nom, args);
			expect(error?.code, `${nom} refusé au service`).not.toBe(REFUS);
		}
	});

	it('témoin : send_private_message, qui appelle deux fonctions révoquées, marche', async () => {
		const { data, error } = await rpc(eleveA, 'send_private_message', {
			p_sender_id: aId,
			p_recipient_ids: [profId],
			p_subject: 'Lot 5',
			p_content: { type: 'doc', content: [] },
			p_is_group_message: false,
			p_class_id: null,
			p_parent_message_id: null
		});
		expect(error).toBeNull();
		const { data: message, error: lectureError } = await service
			.from('private_messages')
			.select('sender_id')
			.eq('id', data as string)
			.single();
		expect(lectureError).toBeNull();
		expect(message).toEqual({ sender_id: aId });
	});
});
