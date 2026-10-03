/**
 * Chat : le VRAI store client sur le canal privé (base locale requise)
 * ===================================================================
 *
 * S3, PR 2. La PR 1 (`realtime-chat-prive.test.ts`) prouve les policies avec des
 * canaux écrits à la main ; ce fichier fait tourner `chatStore` lui-même (une
 * instance par utilisateur, modules rechargés), contre le serveur Realtime
 * local, avec de vrais comptes connectés.
 *
 *   1. A et B (participants) échangent : B affiche le message de A, expéditeur
 *      relu en base.
 *   2. Signal forgé par un participant (expéditeur « prof », contenu inventé) :
 *      B affiche la ligne de la base, jamais le payload ; un id inconnu → rien.
 *   3. postgres_changes marche sur le canal privé : une ligne insérée sans
 *      broadcast arrive chez B.
 *   4. O (authentifié, non participant) : abonnement REFUSÉ, rien reçu. C'est
 *      le test qui échoue si le store repasse en canal public.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type ModuleChat = typeof import('$lib/stores/chat.svelte');
type ModuleRealtime = typeof import('$lib/stores/supabaseRealtime.svelte');

interface Session {
	client: Client;
	store: ModuleChat['chatStore'];
	realtime: ModuleRealtime['supabaseRealtimeManager'];
}

// ============================================================================
// CONSTANTS
// ============================================================================

vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '1' }));

const service = createServiceRoleClient();

/** Délai d'attente d'un message : au-delà, on conclut qu'il n'arrivera pas. */
const ATTENTE_MS = 4_000;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Ouvre une session : client connecté + store de chat NEUF (modules rechargés :
 * `chatStore` et le gestionnaire Realtime sont des singletons).
 */
async function ouvrirSession(email: string, userId: string): Promise<Session> {
	const client = await createAuthenticatedClient(email);
	vi.resetModules();
	const { chatStore } = await import('$lib/stores/chat.svelte');
	const { supabaseRealtimeManager } = await import('$lib/stores/supabaseRealtime.svelte');
	supabaseRealtimeManager.init(client, userId);
	chatStore.init(client, userId, { full_name: null, avatar_url: null });
	return { client, store: chatStore, realtime: supabaseRealtimeManager };
}

async function attendre(ms: number): Promise<void> {
	await new Promise((r) => setTimeout(r, ms));
}

/** Attend qu'un message vérifie `predicat`, ou que le délai expire. */
async function attendreMessage(
	session: Session,
	conversationId: string,
	predicat: (m: ReturnType<Session['store']['getMessages']>[number]) => boolean
) {
	const fin = Date.now() + ATTENTE_MS;
	while (Date.now() < fin) {
		const trouve = session.store.getMessages(conversationId).find(predicat);
		if (trouve) return trouve;
		await attendre(50);
	}
	return undefined;
}

async function insererMessage(conversationId: string, senderId: string, texte: string) {
	const { data, error } = await service
		.from('messages')
		.insert({
			conversation_id: conversationId,
			sender_id: senderId,
			content: { text: texte },
			plain_text: texte
		})
		.select('id')
		.single();
	expect(error).toBeNull();
	return (data as { id: string }).id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat : le store client sur le canal privé', { timeout: 120_000 }, () => {
	let a: { id: string; email: string };
	let b: { id: string; email: string };
	let o: { id: string; email: string };
	let prof: { id: string };
	let conv: string;
	let sessionA: Session;
	let sessionB: Session;
	let sessionO: Session;
	/** Message de conv écrit AVANT l'abonnement de B : seul un signal le lui apporte. */
	let messageAncien: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		a = (await TestData.profile().withRole('student').create()) as typeof a;
		b = (await TestData.profile().withRole('student').create()) as typeof b;
		o = (await TestData.profile().withRole('student').create()) as typeof o;
		prof = await TestData.profile().withRole('student').create();

		const { data: convs, error } = await service
			.from('conversations')
			.insert([{ is_group: false }])
			.select('id');
		expect(error).toBeNull();
		conv = (convs as { id: string }[])[0].id;

		const participants = await service.from('conversation_participants').insert([
			{ conversation_id: conv, user_id: a.id },
			{ conversation_id: conv, user_id: b.id }
		]);
		expect(participants.error).toBeNull();

		messageAncien = await insererMessage(conv, a.id, 'contenu enregistré en base');

		sessionA = await ouvrirSession(a.email, a.id);
		sessionB = await ouvrirSession(b.email, b.id);
		sessionO = await ouvrirSession(o.email, o.id);

		await sessionA.store.subscribeToConversation(conv);
		await sessionB.store.subscribeToConversation(conv);
	}, 120_000);

	afterAll(async () => {
		for (const s of [sessionA, sessionB, sessionO]) {
			await s?.store.cleanup();
			await s?.realtime.disconnect();
			s?.client.realtime.disconnect();
		}
		if (conv) {
			await service.from('messages').delete().eq('conversation_id', conv);
			await service.from('conversation_participants').delete().eq('conversation_id', conv);
			await service.from('conversations').delete().eq('id', conv);
		}
		await cleanupAllTestData();
	});

	it('deux participants échangent en privé : B affiche le message de A, expéditeur relu en base', async () => {
		const envoye = await sessionA.store.sendMessage(conv, 'Bonjour B');
		expect(envoye, 'envoi de A refusé').not.toBeNull();

		const recu = await attendreMessage(sessionB, conv, (m) => m.id === envoye!.id);
		expect(recu, 'B n’a rien reçu').toBeDefined();
		expect(recu!.plain_text).toBe('Bonjour B');
		// L'expéditeur vient de la ligne en base (`sender_id`). Son nom dépend de
		// la lecture des profils (hors périmètre) : non asserté ici.
		expect(recu!.sender_id).toBe(a.id);
		expect(recu!.is_broadcast).toBeUndefined();
	});

	it('un signal forgé par un participant : B affiche la ligne de la base, jamais le payload', async () => {
		const canalA = sessionA.realtime.getChannel(`chat-${conv}`);
		expect(canalA).toBeDefined();

		// Id inconnu : rien ne doit s'afficher.
		const inconnu = crypto.randomUUID();
		const forge = (id: string) => ({
			type: 'broadcast' as const,
			event: 'new_message',
			payload: {
				type: 'new_message',
				message: {
					id,
					conversation_id: conv,
					sender_id: prof.id,
					content: { text: 'FAUX : venez me voir' },
					plain_text: 'FAUX : venez me voir',
					created_at: new Date().toISOString(),
					sender: { id: prof.id, full_name: 'Le Professeur', avatar_url: null }
				}
			}
		});
		expect(await canalA!.send(forge(inconnu))).toBe('ok');

		// Id réel (écrit avant l'abonnement de B : postgres_changes ne l'apporte pas).
		expect(await canalA!.send(forge(messageAncien))).toBe('ok');

		const affiche = await attendreMessage(sessionB, conv, (m) => m.id === messageAncien);
		expect(affiche, 'le signal n’a pas été relu en base').toBeDefined();
		expect(affiche!.plain_text).toBe('contenu enregistré en base');
		expect(affiche!.sender_id).toBe(a.id);
		expect(JSON.stringify(affiche)).not.toContain('FAUX');
		expect(JSON.stringify(affiche)).not.toContain('Le Professeur');
		expect(sessionB.store.getMessages(conv).some((m) => m.id === inconnu)).toBe(false);
	});

	it('postgres_changes marche sur le canal privé : une ligne écrite sans broadcast arrive chez B', async () => {
		const id = await insererMessage(conv, a.id, 'écrit sans broadcast');
		const recu = await attendreMessage(sessionB, conv, (m) => m.id === id);
		expect(recu, 'postgres_changes muet sur le canal privé').toBeDefined();
		expect(recu!.plain_text).toBe('écrit sans broadcast');
	});

	it('un non-participant ne peut pas s’abonner et ne reçoit rien', async () => {
		await expect(sessionO.store.subscribeToConversation(conv)).rejects.toThrow();

		const envoye = await sessionA.store.sendMessage(conv, 'pas pour O');
		expect(envoye).not.toBeNull();
		await attendre(ATTENTE_MS);
		expect(sessionO.store.getMessages(conv)).toEqual([]);

		await sessionO.realtime.unsubscribeChannel(`chat-${conv}`);
	});
});
