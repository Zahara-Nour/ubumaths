/**
 * RPC lot 3 : un élève n'agit plus sur le compte d'un autre (base locale requise)
 * ===============================================================================
 *
 * Migration `20261003190000_rpc_lot3_compte_autrui.sql`. Des fonctions
 * SECURITY DEFINER exécutables par `authenticated` prenaient l'identifiant de
 * l'utilisateur visé en paramètre sans regarder QUI appelait : un élève rangeait
 * les messages d'un autre, marquait ses conversations lues, l'affichait « en
 * ligne », ouvrait une conversation à sa place, et s'attribuait score 2048, XP
 * de compagnon et succès.
 *
 * Décisions de David (Q143, Q141) : un élève n'agit plus sur le compte d'un
 * autre et ne s'attribue plus de récompense.
 *
 * Décor : trois élèves de la même école. A est ami avec B, B est ami avec C.
 * Chaque refus est suivi d'un recomptage AU CLIENT SERVICE de l'état de B (la
 * RLS échoue en silence : seul l'état relu prouve que rien n'a bougé), et
 * accompagné d'un TÉMOIN : l'usage légitime doit continuer de marcher.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Le client service des modules serveur lit process.env (qui peut viser la prod
// via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Le consentement parental est hors sujet ici (testé ailleurs).
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: vi.fn() }));

import { addBuddyXp } from '$lib/server/buddy-queries';
import { processEvent } from '$lib/server/achievements/service';
import { POST as soumettreScore2048 } from '../../src/routes/api/games/2048/scores/+server';

const service = createServiceRoleClient();

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

/** Succès de test : déverrouillé par l'événement `lot3_evenement`. */
const SUCCES_ID = 'lot3_test_succes';
const EVENEMENT = 'lot3_evenement';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
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

/** Relit UNE ligne au client service (l'état réel, pas ce que voit l'élève). */
async function ligne<T>(table: string, filtre: Record<string, string>): Promise<T | null> {
	let q = service.from(table as never).select('*');
	for (const [k, v] of Object.entries(filtre)) q = q.eq(k as never, v as never);
	const { data, error } = await q.maybeSingle();
	expect(error).toBeNull();
	return data as T | null;
}

async function compte(table: string, filtre: Record<string, string>): Promise<number> {
	let q = service.from(table as never).select('*', { count: 'exact', head: true });
	for (const [k, v] of Object.entries(filtre)) q = q.eq(k as never, v as never);
	const { count, error } = await q;
	expect(error).toBeNull();
	return count ?? 0;
}

type Inbox = {
	status: string;
	is_starred: boolean;
	read_at: string | null;
	folder_id: string | null;
};

describe('RPC lot 3 : un élève n’agit plus sur le compte d’un autre', () => {
	let eleveA: SupabaseClient<Database>;
	let aId: string;
	let bId: string;
	let cId: string;
	let ecole: string;
	let messageB: string;
	let messageA: string;
	let dossierB: string;
	let dossierA: string;
	let conversationBC: string;
	let tutorB: string;
	let tutorA: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.from('achievements').delete().eq('id', SUCCES_ID);

		ecole = await insert('schools', {
			name: 'Lycée RPC lot 3',
			city: 'Testville',
			country: 'France'
		});
		const eleve = async () => {
			const p = await TestData.profile().withRole('student').create();
			const { error } = await service.from('profiles').update({ school_id: ecole }).eq('id', p.id);
			expect(error).toBeNull();
			return p;
		};
		const a = await eleve();
		aId = a.id;
		bId = (await eleve()).id;
		cId = (await eleve()).id;

		for (const [r, d] of [
			[aId, bId],
			[bId, cId]
		]) {
			await insert('friendships', { requester_id: r, addressee_id: d, status: 'accepted' });
		}

		// Messagerie : un message de C reçu par B, un message de C reçu par A.
		const message = async (destinataire: string) => {
			const id = await insert('private_messages', {
				sender_id: cId,
				subject: 'RPC lot 3',
				content: { type: 'doc', content: [] },
				plain_text: 'RPC lot 3'
			});
			await insert('message_inbox', { message_id: id, recipient_id: destinataire });
			return id;
		};
		messageB = await message(bId);
		messageA = await message(aId);
		dossierB = await insert('user_folders', { user_id: bId, name: 'Dossier de B' });
		dossierA = await insert('user_folders', { user_id: aId, name: 'Dossier de A' });

		// Conversation B-C, dont A ne fait pas partie.
		conversationBC = await insert('conversations', { is_group: false, created_by: bId });
		await insert('conversation_participants', { conversation_id: conversationBC, user_id: bId });
		await insert('conversation_participants', { conversation_id: conversationBC, user_id: cId });

		// Présence de B : hors ligne.
		const { error: presenceError } = await service
			.from('user_presence')
			.insert({ user_id: bId, status: 'offline' });
		expect(presenceError).toBeNull();

		// Tuteur : une conversation pour B, une pour A.
		tutorB = await insert('tutor_conversations', { student_id: bId });
		tutorA = await insert('tutor_conversations', { student_id: aId });

		// Compagnons et succès de test.
		for (const id of [aId, bId]) {
			const { error } = await service
				.from('student_buddies')
				.insert({ student_id: id, palotin_type: 'giron' });
			expect(error).toBeNull();
		}
		const { error: succesError } = await service.from('achievements').insert({
			id: SUCCES_ID,
			context: 'meta',
			category: 'special',
			name: 'Succès de test lot 3',
			description: 'Déverrouillé par un événement de test',
			icon: '🧪',
			unlock_type: 'event_based',
			metadata: { unlock_conditions: { type: EVENEMENT }, points: 1 },
			is_active: true,
			display_order: 9999
		});
		expect(succesError).toBeNull();

		eleveA = await createAuthenticatedClient(a.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('conversations').delete().eq('id', conversationBC);
		await service.from('student_achievements').delete().eq('achievement_id', SUCCES_ID);
		await service.from('achievement_events').delete().eq('event_type', EVENEMENT);
		await service.from('achievements').delete().eq('id', SUCCES_ID);
		await cleanupAllTestData();
		await service.from('schools').delete().eq('id', ecole);
	});

	// ===========================================================================
	// F10 — messagerie
	// ===========================================================================

	const inboxB = () => ligne<Inbox>('message_inbox', { message_id: messageB, recipient_id: bId });
	const ETAT_B_INTACT = { status: 'inbox', is_starred: false, read_at: null, folder_id: null };

	it('F10 : A ne range, n’étoile, ne déplace ni ne lit le message de B', async () => {
		const appels: [string, Record<string, unknown>][] = [
			['update_message_status', { p_message_id: messageB, p_user_id: bId, p_status: 'trash' }],
			['toggle_message_star', { p_message_id: messageB, p_user_id: bId }],
			['mark_message_as_read', { p_message_id: messageB, p_user_id: bId }],
			['move_message_to_folder', { p_message_id: messageB, p_user_id: bId, p_folder_id: dossierB }]
		];
		for (const [nom, args] of appels) {
			const { error } = await rpc(eleveA, nom, args);
			expect(error?.code, `${nom} accepté sur le compte de B`).toBe(REFUS);
		}
		expect(await inboxB()).toMatchObject(ETAT_B_INTACT);
	});

	it('F10 témoin : A agit sur SON message', async () => {
		const soi = { p_message_id: messageA, p_user_id: aId };
		expect((await rpc(eleveA, 'mark_message_as_read', soi)).error).toBeNull();
		const etoile = await rpc(eleveA, 'toggle_message_star', soi);
		expect(etoile.error).toBeNull();
		expect(etoile.data).toBe(true);
		expect(
			(await rpc(eleveA, 'move_message_to_folder', { ...soi, p_folder_id: dossierA })).error
		).toBeNull();
		expect(
			(await rpc(eleveA, 'update_message_status', { ...soi, p_status: 'archived' })).error
		).toBeNull();
		const etat = await ligne<Inbox>('message_inbox', { message_id: messageA, recipient_id: aId });
		expect(etat).toMatchObject({ status: 'archived', is_starred: true, folder_id: dossierA });
		expect(etat?.read_at).not.toBeNull();
	});

	// ===========================================================================
	// F11 — conversation, présence
	// ===========================================================================

	it('F11 : A ne marque pas lue la conversation de B', async () => {
		const { error } = await rpc(eleveA, 'mark_conversation_read', {
			p_conversation_id: conversationBC,
			p_user_id: bId,
			p_message_id: null
		});
		expect(error?.code).toBe(REFUS);
		const p = await ligne<{ last_read_at: string | null }>('conversation_participants', {
			conversation_id: conversationBC,
			user_id: bId
		});
		expect(p?.last_read_at).toBeNull();
	});

	it('F11 : A n’ouvre pas de conversation au nom de B (ami de C)', async () => {
		const avant = await compte('conversation_participants', { user_id: cId });
		const { error } = await rpc(eleveA, 'create_1on1_chat', {
			p_user1_id: bId,
			p_user2_id: cId
		});
		expect(error?.code).toBe(REFUS);
		expect(await compte('conversation_participants', { user_id: cId })).toBe(avant);
	});

	it('F11 : A n’affiche pas B « en ligne »', async () => {
		const { error } = await rpc(eleveA, 'upsert_user_presence', {
			p_user_id: bId,
			p_status: 'online'
		});
		expect(error?.code).toBe(REFUS);
		expect((await ligne<{ status: string }>('user_presence', { user_id: bId }))?.status).toBe(
			'offline'
		);
	});

	it('F11 témoin : A ouvre sa conversation avec son ami B, la marque lue, se dit en ligne', async () => {
		const chat = await rpc(eleveA, 'create_1on1_chat', { p_user1_id: aId, p_user2_id: bId });
		expect(chat.error).toBeNull();
		const conversationAB = chat.data as string;
		expect(conversationAB).toBeTruthy();

		expect(
			(
				await rpc(eleveA, 'mark_conversation_read', {
					p_conversation_id: conversationAB,
					p_user_id: aId,
					p_message_id: null
				})
			).error
		).toBeNull();
		const p = await ligne<{ last_read_at: string | null }>('conversation_participants', {
			conversation_id: conversationAB,
			user_id: aId
		});
		expect(p?.last_read_at).not.toBeNull();

		expect(
			(await rpc(eleveA, 'upsert_user_presence', { p_user_id: aId, p_status: 'online' })).error
		).toBeNull();
		expect((await ligne<{ status: string }>('user_presence', { user_id: aId }))?.status).toBe(
			'online'
		);
		await service.from('conversations').delete().eq('id', conversationAB);
	});

	it('F11 témoin : la règle d’amitié reste (A et C ne sont pas amis)', async () => {
		const { error } = await rpc(eleveA, 'create_1on1_chat', { p_user1_id: aId, p_user2_id: cId });
		expect(error?.message).toMatch(/must be friends/);
	});

	// ===========================================================================
	// À vérifier de l'inventaire — tuteur
	// ===========================================================================

	it('tuteur : A n’écrit pas dans la conversation de B, ni ses statistiques', async () => {
		const ins = await rpc(eleveA, 'insert_tutor_messages', {
			p_conversation_id: tutorB,
			p_user_id: bId,
			p_messages: [{ role: 'user', content: 'faux message' }]
		});
		expect(ins.error?.code).toBe(REFUS);
		expect(await compte('tutor_messages', { conversation_id: tutorB })).toBe(0);

		const stats = await rpc(eleveA, 'update_tutor_conversation_stats', {
			p_conversation_id: tutorB,
			p_user_id: bId,
			p_message_count: 99,
			p_max_help_level: 5
		});
		expect(stats.error?.code).toBe(REFUS);
		const conv = await ligne<{ message_count: number; max_help_level_reached: number }>(
			'tutor_conversations',
			{ id: tutorB }
		);
		expect(conv).toMatchObject({ message_count: 0, max_help_level_reached: 0 });
	});

	it('tuteur témoin : A écrit dans SA conversation', async () => {
		const ins = await rpc(eleveA, 'insert_tutor_messages', {
			p_conversation_id: tutorA,
			p_user_id: aId,
			p_messages: [{ role: 'user', content: 'bonjour' }]
		});
		expect(ins.error).toBeNull();
		expect(await compte('tutor_messages', { conversation_id: tutorA })).toBe(1);
		const stats = await rpc(eleveA, 'update_tutor_conversation_stats', {
			p_conversation_id: tutorA,
			p_user_id: aId,
			p_message_count: 1,
			p_max_help_level: 1
		});
		expect(stats.error).toBeNull();
	});

	// ===========================================================================
	// F12 — score 2048, XP du compagnon
	// ===========================================================================

	it('F12 : A ne s’inscrit aucun score 2048, ni pour lui ni pour B', async () => {
		for (const cible of [aId, bId]) {
			const { error } = await rpc(eleveA, 'upsert_2048_score', {
				p_user_id: cible,
				p_score: 99_999_999,
				p_reached_2048: true,
				p_reached_4096: true
			});
			expect(error?.code, `score inscrit pour ${cible === aId ? 'A' : 'B'}`).toBe(REFUS);
		}
		expect(await compte('game_2048_scores', { user_id: aId })).toBe(0);
		expect(await compte('game_2048_scores', { user_id: bId })).toBe(0);
	});

	it('F12 : A ne crédite d’XP aucun compagnon, ni le sien ni celui de B', async () => {
		for (const cible of [aId, bId]) {
			const { error } = await rpc(eleveA, 'add_buddy_xp', {
				p_student_id: cible,
				p_xp: 5000,
				p_is_milestone: true
			});
			expect(error?.code).toBe(REFUS);
		}
		expect((await ligne<{ xp: number }>('student_buddies', { student_id: aId }))?.xp).toBe(0);
		expect((await ligne<{ xp: number }>('student_buddies', { student_id: bId }))?.xp).toBe(0);
	});

	it('F12 témoin : la route 2048 enregistre le score de l’élève de la session', async () => {
		// Sans la migration, le test précédent a écrit un score : on repart de zéro.
		await service.from('game_2048_scores').delete().eq('user_id', aId);
		const response = await soumettreScore2048({
			request: new Request('http://localhost/api/games/2048/scores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ score: 512, reached_2048: false, reached_4096: false })
			}),
			locals: {
				supabase: eleveA as unknown as App.Locals['supabase'],
				user: { id: aId } as User,
				profile: { id: aId, role: 'student' }
			} as unknown as App.Locals
		} as unknown as Parameters<typeof soumettreScore2048>[0]);
		expect(response.status).toBe(200);
		expect(
			await ligne<{ best_score: number; games_played: number }>('game_2048_scores', {
				user_id: aId
			})
		).toMatchObject({ best_score: 512, games_played: 1 });
	});

	it('F12 témoin : le serveur crédite l’XP par addBuddyXp', async () => {
		await service
			.from('student_buddies')
			.update({ xp: 0, level: 1, xp_earned_today: 0 })
			.eq('student_id', aId);
		const res = await addBuddyXp(aId, 10, false);
		expect(res.xp_gained).toBe(10);
		expect((await ligne<{ xp: number }>('student_buddies', { student_id: aId }))?.xp).toBe(10);
	});

	// ===========================================================================
	// Q141 — succès
	// ===========================================================================

	it('Q141 : A ne déclenche aucun succès, ni pour lui ni pour B', async () => {
		for (const cible of [aId, bId]) {
			const { error } = await rpc(eleveA, 'process_achievement_event', {
				p_event_type: EVENEMENT,
				p_student_id: cible,
				p_event_data: {}
			});
			expect(error?.code).toBe(REFUS);
		}
		const prog = await rpc(eleveA, 'update_achievement_progress', {
			p_student_id: aId,
			p_achievement_id: SUCCES_ID,
			p_delta: 1000,
			p_context_key: null
		});
		expect(prog.error?.code).toBe(REFUS);
		expect(await compte('student_achievements', { achievement_id: SUCCES_ID })).toBe(0);
		expect(await compte('achievement_events', { event_type: EVENEMENT })).toBe(0);
	});

	it('Q151 : la route POST /api/achievements/events n’existe plus', () => {
		// Elle laissait un élève s'envoyer ses propres événements, eventData libre,
		// donc s'attribuer des succès par le serveur. Supprimée : aucun POST ne peut
		// plus créer de ligne student_achievements par ce chemin.
		const route = resolve(__dirname, '../../src/routes/api/achievements/events');
		expect(existsSync(route)).toBe(false);
	});

	it('Q141 témoin : le serveur déclenche le succès par processEvent', async () => {
		await service.from('student_achievements').delete().eq('achievement_id', SUCCES_ID);
		const res = await processEvent(EVENEMENT, aId, { reference_id: 'lot3' });
		expect(res.count).toBe(1);
		expect(
			await compte('student_achievements', { achievement_id: SUCCES_ID, student_id: aId })
		).toBe(1);
	});
});
