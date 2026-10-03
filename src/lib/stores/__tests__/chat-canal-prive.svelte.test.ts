/**
 * Chat : canal temps réel PRIVÉ, broadcast = simple SIGNAL (S3, PR 2)
 * ====================================================================
 *
 * Décision de David (2026-10-03) : seuls les participants écoutent et diffusent ;
 * l'expéditeur affiché est celui enregistré en base. La policy de
 * `realtime.messages` n'inspecte pas le payload : un participant peut forger un
 * broadcast `new_message` (expéditeur « le professeur », contenu inventé). Le
 * client ne doit donc JAMAIS afficher le payload : il relit la ligne en base
 * (sous RLS) par son identifiant et n'affiche que ce que la base rend.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatStore } from '../chat.svelte';
import { supabaseRealtimeManager } from '../supabaseRealtime.svelte';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type Ecouteur = (payload: unknown) => void;

interface CanalSimule {
	canal: RealtimeChannel;
	diffuser: (event: string, payload: unknown) => void;
	send: ReturnType<typeof vi.fn>;
}

interface LigneMessage {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: { text: string };
	plain_text: string;
	created_at: string;
	edited_at: null;
	deleted_at: null;
	is_flagged: boolean;
	flag_reason: null;
	sender: { id: string; firstname: string; lastname: string; avatar_url: null };
}

interface LigneReaction {
	id: string;
	message_id: string;
	user_id: string;
	emoji: string;
	created_at: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CONV = '11111111-1111-4111-a111-111111111111';
const AUTRE_CONV = '99999999-9999-4999-a999-999999999999';
const MOI = '22222222-2222-4222-a222-222222222222';
const CAMARADE = '33333333-3333-4333-a333-333333333333';
const PROF = '77777777-7777-4777-a777-777777777777';
const MSG = '44444444-4444-4444-a444-444444444444';
const MSG_INCONNU = '55555555-5555-4555-a555-555555555555';

vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '1' }));

// ============================================================================
// HELPERS
// ============================================================================

function canalSimule(): CanalSimule {
	const ecouteurs = new Map<string, Ecouteur[]>();
	const send = vi.fn(() => Promise.resolve('ok' as const));
	const canal = {
		on: vi.fn(function (
			this: RealtimeChannel,
			type: string,
			config: { event?: string },
			cb: Ecouteur
		) {
			const cle = `${type}:${config?.event ?? ''}`;
			ecouteurs.set(cle, [...(ecouteurs.get(cle) ?? []), cb]);
			return this;
		}),
		send,
		subscribe: vi.fn(),
		unsubscribe: vi.fn()
	} as unknown as RealtimeChannel;
	return {
		canal,
		send,
		diffuser: (event, payload) =>
			(ecouteurs.get(`broadcast:${event}`) ?? []).forEach((cb) => cb({ payload }))
	};
}

/** Ligne `messages` telle que la base la rend (expéditeur joint depuis `profiles`). */
function ligneEnBase(id: string, conversationId = CONV): LigneMessage {
	return {
		id,
		conversation_id: conversationId,
		sender_id: CAMARADE,
		content: { text: 'contenu enregistré' },
		plain_text: 'contenu enregistré',
		created_at: '2026-10-03T10:00:00.000Z',
		edited_at: null,
		deleted_at: null,
		is_flagged: false,
		flag_reason: null,
		sender: { id: CAMARADE, firstname: 'Camille', lastname: 'Camarade', avatar_url: null }
	};
}

/**
 * Faux client : `messages` rend les lignes de `base` (zéro ligne = PGRST116,
 * comme un refus RLS), `message_reactions` rend `reactions`.
 */
function clientSimule(base: Map<string, LigneMessage>, reactions: LigneReaction[] = []) {
	const setAuth = vi.fn(() => Promise.resolve());
	const from = vi.fn((table: string) => {
		if (table === 'message_reactions') {
			return {
				select: vi.fn(() => ({
					in: vi.fn((_col: string, ids: string[]) =>
						Promise.resolve({
							data: reactions.filter((r) => ids.includes(r.message_id)),
							error: null
						})
					),
					eq: vi.fn((_col: string, id: string) =>
						Promise.resolve({ data: reactions.filter((r) => r.message_id === id), error: null })
					)
				}))
			};
		}
		return {
			select: vi.fn(() => ({
				eq: vi.fn((_col: string, id: string) => ({
					single: vi.fn(() => {
						const ligne = base.get(id);
						return Promise.resolve(
							ligne
								? { data: ligne, error: null }
								: {
										data: null,
										error: { code: 'PGRST116', message: 'JSON object requested, 0 rows' }
									}
						);
					})
				}))
			})),
			insert: vi.fn((ligne: { id: string; conversation_id: string }) => ({
				select: vi.fn(() => ({
					single: vi.fn(() => {
						base.set(ligne.id, { ...ligneEnBase(ligne.id, ligne.conversation_id), sender_id: MOI });
						return Promise.resolve({ data: base.get(ligne.id), error: null });
					})
				}))
			}))
		};
	});
	const client = {
		from,
		rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
		realtime: { setAuth },
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
	return { client, setAuth, from };
}

/** Payload forgé par un participant malveillant : se fait passer pour le prof. */
function payloadForge(id: string) {
	return {
		type: 'new_message',
		message: {
			id,
			conversation_id: CONV,
			sender_id: PROF,
			content: { text: 'FAUX : venez me voir après les cours' },
			plain_text: 'FAUX : venez me voir après les cours',
			created_at: '2026-10-03T09:00:00.000Z',
			sender: { id: PROF, full_name: 'Le Professeur', avatar_url: null }
		}
	};
}

function reinitialiser(client: SupabaseClient<Database>) {
	chatStore['supabase'] = null;
	chatStore['userId'] = null;
	chatStore['currentUser'] = null;
	chatStore.init(client, MOI, { full_name: 'Moi', avatar_url: null });
	chatStore['messages'].clear();
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat : canal privé, le broadcast ne sert que de signal', () => {
	let sim: CanalSimule;

	beforeEach(() => {
		sim = canalSimule();
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(sim.canal);
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		vi.spyOn(supabaseRealtimeManager, 'getChannel').mockReturnValue(sim.canal);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('s’abonne en canal PRIVÉ, après avoir transmis le jeton de session à Realtime', async () => {
		const { client, setAuth } = clientSimule(new Map());
		reinitialiser(client);

		await chatStore.subscribeToConversation(CONV);

		expect(supabaseRealtimeManager.createChannel).toHaveBeenCalledWith(`chat-${CONV}`, {
			private: true
		});
		expect(setAuth).toHaveBeenCalled();
		const ordreSetAuth = setAuth.mock.invocationCallOrder[0];
		const ordreSubscribe = vi.mocked(supabaseRealtimeManager.subscribeChannel).mock
			.invocationCallOrder[0];
		expect(ordreSetAuth).toBeLessThan(ordreSubscribe);
	});

	it('un new_message forgé n’est pas affiché tel quel : c’est la ligne relue en base qui l’est', async () => {
		const { client } = clientSimule(new Map([[MSG, ligneEnBase(MSG)]]));
		reinitialiser(client);
		await chatStore.subscribeToConversation(CONV);

		sim.diffuser('new_message', payloadForge(MSG));

		// Rien n'est affiché depuis le payload, même un instant.
		expect(chatStore.getMessages(CONV)).toEqual([]);

		await vi.waitFor(() => expect(chatStore.getMessages(CONV)).toHaveLength(1));
		const [affiche] = chatStore.getMessages(CONV);
		expect(affiche.id).toBe(MSG);
		expect(affiche.sender_id).toBe(CAMARADE);
		expect(affiche.sender?.full_name).toBe('Camille Camarade');
		expect(affiche.plain_text).toBe('contenu enregistré');
		expect(affiche.content).toEqual({ text: 'contenu enregistré' });
		expect(affiche.is_broadcast).toBeUndefined();
		expect(JSON.stringify(affiche)).not.toContain('FAUX');
		expect(JSON.stringify(affiche)).not.toContain('Le Professeur');
	});

	it('un id inexistant ou illisible (RLS → zéro ligne) n’affiche rien', async () => {
		const { client, from } = clientSimule(new Map());
		reinitialiser(client);
		await chatStore.subscribeToConversation(CONV);

		sim.diffuser('new_message', payloadForge(MSG_INCONNU));

		await vi.waitFor(() => expect(from).toHaveBeenCalledWith('messages'));
		await new Promise((r) => setTimeout(r, 20));
		expect(chatStore.getMessages(CONV)).toEqual([]);
	});

	it('une ligne d’une AUTRE conversation, signalée sur ce canal, n’est pas affichée ici', async () => {
		const { client, from } = clientSimule(new Map([[MSG, ligneEnBase(MSG, AUTRE_CONV)]]));
		reinitialiser(client);
		await chatStore.subscribeToConversation(CONV);

		sim.diffuser('new_message', payloadForge(MSG));

		await vi.waitFor(() => expect(from).toHaveBeenCalledWith('messages'));
		await new Promise((r) => setTimeout(r, 20));
		expect(chatStore.getMessages(CONV)).toEqual([]);
		expect(chatStore.getMessages(AUTRE_CONV)).toEqual([]);
	});

	it('une réaction forgée n’est pas appliquée : les réactions affichées sont relues en base', async () => {
		const reactionsEnBase: LigneReaction[] = [
			{
				id: 'r1',
				message_id: MSG,
				user_id: CAMARADE,
				emoji: '👍',
				created_at: '2026-10-03T10:01:00.000Z'
			}
		];
		const { client } = clientSimule(new Map([[MSG, ligneEnBase(MSG)]]), reactionsEnBase);
		reinitialiser(client);
		await chatStore.subscribeToConversation(CONV);
		sim.diffuser('new_message', { type: 'new_message', message: { id: MSG } });
		await vi.waitFor(() => expect(chatStore.getMessages(CONV)).toHaveLength(1));

		// Payload forgé : 💩 « ajouté » au nom d'un autre utilisateur.
		sim.diffuser('message_reaction', {
			type: 'message_reaction',
			messageId: MSG,
			userId: PROF,
			emoji: '💩',
			action: 'add'
		});

		await vi.waitFor(() =>
			expect(chatStore.getMessages(CONV)[0].reactions?.map((r) => r.emoji)).toEqual(['👍'])
		);
		const [reaction] = chatStore.getMessages(CONV)[0].reactions ?? [];
		expect(reaction.user_id).toBe(CAMARADE);
		expect(reaction.count).toBe(1);
		expect(reaction.user_reacted).toBe(false);
	});

	it('l’envoi ne diffuse qu’un signal (l’id), après l’écriture en base', async () => {
		const base = new Map<string, LigneMessage>();
		const { client } = clientSimule(base);
		reinitialiser(client);
		await chatStore.subscribeToConversation(CONV);

		let ligneDejaEnBase = false;
		sim.send.mockImplementation(() => {
			ligneDejaEnBase = base.size === 1;
			return Promise.resolve('ok');
		});

		const envoye = await chatStore.sendMessage(CONV, 'Bonjour');

		expect(envoye).not.toBeNull();
		expect(sim.send).toHaveBeenCalledTimes(1);
		expect(sim.send).toHaveBeenCalledWith({
			type: 'broadcast',
			event: 'new_message',
			payload: { type: 'new_message', message: { id: envoye!.id } }
		});
		expect(ligneDejaEnBase).toBe(true);
	});
});
