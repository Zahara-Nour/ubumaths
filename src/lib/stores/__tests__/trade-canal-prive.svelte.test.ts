/**
 * Échanges de cartes : canal temps réel PRIVÉ, broadcast = simple SIGNAL (PR 2)
 * =============================================================================
 *
 * Décision de David (2026-10-04) : seuls les deux élèves de l'échange écoutent
 * et diffusent sur `trade:<id>`. La policy de `realtime.messages` vérifie QUI
 * diffuse, pas CE QU'IL diffuse : l'un des deux élèves peut forger une offre,
 * une validation, une confirmation, un statut ou un auteur de message. Le
 * store ne doit donc rien afficher du payload : il relit la ligne de l'échange
 * en base (sous RLS). Le chat éphémère, sans source en base, garde son texte
 * mais son auteur est « l'autre élève », lu dans la ligne de l'échange.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tradeRealtimeStore } from '../tradeRealtime.svelte';
import { supabaseRealtimeManager } from '../supabaseRealtime.svelte';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { MarketplaceTrade } from '$lib/types/marketplace';

// ============================================================================
// TYPES
// ============================================================================

type Listener = (message: { payload: unknown }) => void;

interface FakeChannel {
	channel: RealtimeChannel;
	emit: (event: string, payload: unknown) => void;
	send: ReturnType<typeof vi.fn>;
}

interface TradeRow {
	status: string;
	current_offer: unknown;
	validated_by_initiator: boolean;
	validated_by_partner: boolean;
	confirmed_by_initiator: boolean | null;
	confirmed_by_partner: boolean | null;
	confirmation_started_at: string | null;
	completed_at: string | null;
	cancelled_at: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TRADE = '11111111-1111-4111-a111-111111111111';
const ME = '22222222-2222-4222-a222-222222222222';
const OTHER = '33333333-3333-4333-a333-333333333333';
const TEACHER = '77777777-7777-4777-a777-777777777777';
const DB_CARD = '44444444-4444-4444-a444-444444444444';
const FORGED_CARD = '55555555-5555-4555-a555-555555555555';

vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '1' }));

// ============================================================================
// HELPERS
// ============================================================================

function fakeChannel(): FakeChannel {
	const listeners = new Map<string, Listener[]>();
	const send = vi.fn(() => Promise.resolve('ok' as const));
	const channel = {
		on: vi.fn(function (
			this: RealtimeChannel,
			type: string,
			config: { event?: string },
			cb: Listener
		) {
			const key = `${type}:${config?.event ?? ''}`;
			listeners.set(key, [...(listeners.get(key) ?? []), cb]);
			return this;
		}),
		send,
		subscribe: vi.fn(),
		unsubscribe: vi.fn()
	} as unknown as RealtimeChannel;
	return {
		channel,
		send,
		emit: (event, payload) =>
			(listeners.get(`broadcast:${event}`) ?? []).forEach((cb) => cb({ payload }))
	};
}

/** Ligne de l'échange telle que la base la rend : l'autre élève n'a rien validé. */
function dbRow(overrides: Partial<TradeRow> = {}): TradeRow {
	return {
		status: 'negotiating',
		current_offer: {
			from_initiator: { cards: [], gidouilles: 0 },
			from_partner: { cards: [DB_CARD], gidouilles: 5 }
		},
		validated_by_initiator: false,
		validated_by_partner: false,
		confirmed_by_initiator: false,
		confirmed_by_partner: false,
		confirmation_started_at: null,
		completed_at: null,
		cancelled_at: null,
		...overrides
	};
}

/**
 * Faux client : `marketplace_trades` rend `state.row` (null = zéro ligne,
 * comme un refus RLS). `delayMs` simule une lecture lente.
 */
function fakeClient(state: { row: TradeRow | null; delayMs?: number }) {
	const setAuth = vi.fn(() => Promise.resolve());
	const reads = vi.fn();
	const from = vi.fn(() => ({
		select: vi.fn(() => ({
			eq: vi.fn(() => ({
				maybeSingle: vi.fn(async () => {
					reads();
					if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
					return { data: state.row, error: null };
				}),
				// Lecture de `current_offer` avant sauvegarde de MON offre (pas un signal)
				single: vi.fn(() => Promise.resolve({ data: state.row, error: null }))
			}))
		})),
		// `.update().eq()` est attendu tel quel, ou suivi de `.select()` (1 ligne)
		update: vi.fn(() => ({
			eq: vi.fn(() =>
				Object.assign(Promise.resolve({ data: null, error: null }), {
					select: vi.fn(() => Promise.resolve({ data: [{ id: TRADE }], error: null }))
				})
			)
		}))
	}));
	const client = {
		from,
		realtime: { setAuth },
		removeChannel: vi.fn()
	} as unknown as SupabaseClient<Database>;
	return { client, setAuth, reads };
}

/** Prépare le store : je suis l'initiateur, l'autre élève est le partenaire. */
async function setup(client: SupabaseClient<Database>) {
	tradeRealtimeStore.destroy();
	tradeRealtimeStore['supabase'] = client;
	tradeRealtimeStore['userId'] = ME;
	tradeRealtimeStore.tradeId = TRADE;
	tradeRealtimeStore.myRole = 'initiator';
	tradeRealtimeStore.trade = {
		id: TRADE,
		initiator_id: ME,
		partner_id: OTHER,
		status: 'negotiating'
	} as MarketplaceTrade;
	await tradeRealtimeStore['subscribeToChannel']();
}

// ============================================================================
// TESTS
// ============================================================================

describe('Échanges : canal privé, le broadcast ne sert que de signal', () => {
	let fake: FakeChannel;

	beforeEach(() => {
		vi.useFakeTimers();
		fake = fakeChannel();
		vi.spyOn(supabaseRealtimeManager, 'createChannel').mockReturnValue(fake.channel);
		vi.spyOn(supabaseRealtimeManager, 'subscribeChannel').mockResolvedValue(undefined);
		vi.spyOn(supabaseRealtimeManager, 'getChannel').mockReturnValue(fake.channel);
		vi.spyOn(supabaseRealtimeManager, 'unsubscribeChannel').mockResolvedValue(undefined);
	});

	afterEach(() => {
		tradeRealtimeStore.destroy();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('s’abonne en canal PRIVÉ, après avoir transmis le jeton de session à Realtime', async () => {
		const { client, setAuth } = fakeClient({ row: dbRow() });
		await setup(client);

		expect(supabaseRealtimeManager.createChannel).toHaveBeenCalledWith(`trade:${TRADE}`, {
			private: true
		});
		expect(setAuth).toHaveBeenCalled();
		const setAuthOrder = setAuth.mock.invocationCallOrder[0];
		const subscribeOrder = vi.mocked(supabaseRealtimeManager.subscribeChannel).mock
			.invocationCallOrder[0];
		expect(setAuthOrder).toBeLessThan(subscribeOrder);
	});

	it('une offre forgée n’est pas affichée : c’est l’offre relue en base qui l’est', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);

		fake.emit('offer_updated', { from: 'partner', cards: [FORGED_CARD], gidouilles: 9999 });

		// Rien n'est pris du payload, même un instant.
		expect(tradeRealtimeStore.partnerOffer.cards).not.toContain(FORGED_CARD);

		await vi.advanceTimersByTimeAsync(400);
		expect(tradeRealtimeStore.partnerOffer).toEqual({ cards: [DB_CARD], gidouilles: 5 });
	});

	it('validation et confirmation : la valeur relue en base s’affiche, jamais celle du payload', async () => {
		// La base dit OUI, le payload forgé dit NON.
		const state = {
			row: dbRow({ validated_by_partner: true, confirmed_by_partner: true }) as TradeRow | null
		};
		const { client, reads } = fakeClient(state);
		await setup(client);

		fake.emit('validation_changed', { from: 'partner', validated: false });
		fake.emit('confirmation', { from: 'partner', confirmed: false });
		await vi.advanceTimersByTimeAsync(400);
		expect(reads).toHaveBeenCalledTimes(1);
		expect(tradeRealtimeStore.partnerValidation).toBe(true);
		expect(tradeRealtimeStore.partnerConfirmation).toBe(true);

		// La base dit NON, le payload forgé dit OUI.
		state.row = dbRow();
		fake.emit('validation_changed', { from: 'partner', validated: true });
		fake.emit('confirmation', { from: 'partner', confirmed: true });
		await vi.advanceTimersByTimeAsync(400);
		expect(reads).toHaveBeenCalledTimes(2);
		expect(tradeRealtimeStore.partnerValidation).toBe(false);
		expect(tradeRealtimeStore.partnerConfirmation).toBe(false);
		expect(tradeRealtimeStore.showConfirmationModal).toBe(false);
	});

	it('un faux statut (terminé, annulé) n’est pas affiché tant que la base ne le dit pas', async () => {
		const state = { row: dbRow() as TradeRow | null };
		const { client } = fakeClient(state);
		await setup(client);

		fake.emit('trade_completed', { tradeId: TRADE });
		fake.emit('trade_cancelled', { by: 'partner' });
		await vi.advanceTimersByTimeAsync(400);
		expect(tradeRealtimeStore.trade?.status).toBe('negotiating');

		// Vraie annulation : la base la porte.
		state.row = dbRow({ status: 'cancelled', cancelled_at: '2026-10-04T10:00:00.000Z' });
		fake.emit('trade_cancelled', {});
		await vi.advanceTimersByTimeAsync(400);
		expect(tradeRealtimeStore.trade?.status).toBe('cancelled');
		expect(tradeRealtimeStore.trade?.cancelled_at).toBe('2026-10-04T10:00:00.000Z');
	});

	it('zéro ligne rendue (RLS ou échange supprimé) : rien ne change', async () => {
		const { client, reads } = fakeClient({ row: null });
		await setup(client);

		fake.emit('offer_updated', { from: 'partner', cards: [FORGED_CARD], gidouilles: 9999 });
		fake.emit('trade_completed', {});
		await vi.advanceTimersByTimeAsync(400);

		expect(reads).toHaveBeenCalled();
		expect(tradeRealtimeStore.partnerOffer).toEqual({ cards: [], gidouilles: 0 });
		expect(tradeRealtimeStore.trade?.status).toBe('negotiating');
	});

	it('chat éphémère : l’auteur affiché est l’autre élève de l’échange, jamais celui du payload', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);

		const forgedId = '66666666-6666-4666-a666-666666666666';
		fake.emit('chat_message', {
			id: forgedId,
			senderId: TEACHER,
			message: 'Bonjour',
			createdAt: '2000-01-01T00:00:00.000Z'
		});
		// Même id forgé, se fait passer pour MOI : jamais deux clés identiques.
		fake.emit('chat_message', {
			id: forgedId,
			senderId: ME,
			message: 'Re',
			createdAt: '2000-01-01T00:00:00.000Z'
		});

		const messages = tradeRealtimeStore.messages;
		expect(messages.map((m) => m.message)).toEqual(['Bonjour', 'Re']);
		expect(messages.every((m) => m.senderId === OTHER)).toBe(true);
		expect(messages.some((m) => m.id === forgedId)).toBe(false);
		expect(new Set(messages.map((m) => m.id)).size).toBe(2);
		expect(messages.some((m) => m.createdAt.startsWith('2000'))).toBe(false);
	});

	it('n’envoie que des signaux : aucune offre ni auteur dans les payloads diffusés', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);
		fake.send.mockClear();

		tradeRealtimeStore.setGidouilles(42);
		await vi.advanceTimersByTimeAsync(400);
		await tradeRealtimeStore.sendMessage('Salut');

		const sent = fake.send.mock.calls.map(
			(c) => (c as unknown as [{ event: string; payload: unknown }])[0]
		);
		const offer = sent.find((m) => m.event === 'offer_updated');
		expect(offer?.payload).toEqual({});
		const chat = sent.find((m) => m.event === 'chat_message');
		expect(chat?.payload).toEqual({ message: 'Salut' });
	});

	it('regroupe une rafale de signaux en UNE relecture', async () => {
		const { client, reads } = fakeClient({ row: dbRow() });
		await setup(client);

		for (let i = 0; i < 50; i++) {
			fake.emit(i % 2 ? 'offer_updated' : 'validation_changed', {});
		}
		await vi.advanceTimersByTimeAsync(400);
		expect(reads).toHaveBeenCalledTimes(1);
	});

	it('une seule relecture à la fois : un signal pendant la lecture en déclenche une seule autre', async () => {
		const { client, reads } = fakeClient({ row: dbRow(), delayMs: 1000 });
		await setup(client);

		fake.emit('offer_updated', {});
		await vi.advanceTimersByTimeAsync(350); // lecture lancée, pas finie
		expect(reads).toHaveBeenCalledTimes(1);

		for (let i = 0; i < 10; i++) fake.emit('offer_updated', {});
		await vi.advanceTimersByTimeAsync(500);
		expect(reads).toHaveBeenCalledTimes(1); // toujours en cours

		await vi.advanceTimersByTimeAsync(2000);
		expect(reads).toHaveBeenCalledTimes(2);
	});

	it('plafonne les relectures par fenêtre glissante, sans perdre la dernière', async () => {
		const { client, reads } = fakeClient({ row: dbRow() });
		await setup(client);

		// Un signal toutes les 400 ms pendant 10 s : 25 signaux non regroupés.
		for (let i = 0; i < 25; i++) {
			fake.emit('offer_updated', {});
			await vi.advanceTimersByTimeAsync(400);
		}
		expect(reads.mock.calls.length).toBeLessThanOrEqual(20);

		// La relecture reportée finit par avoir lieu.
		await vi.advanceTimersByTimeAsync(10_000);
		expect(reads.mock.calls.length).toBeGreaterThan(20);
	});

	it('un signal toutes les 250 ms ne repousse pas la relecture sans fin', async () => {
		const { client, reads } = fakeClient({ row: dbRow() });
		await setup(client);

		for (let elapsed = 0; elapsed < 3000; elapsed += 250) {
			fake.emit('offer_updated', {});
			await vi.advanceTimersByTimeAsync(250);
		}
		// Fenêtre fixe de 300 ms : au moins une relecture par ~500 ms.
		expect(reads.mock.calls.length).toBeGreaterThanOrEqual(5);
	});

	it('une relecture lancée avant MA validation n’est pas prise pour un refus', async () => {
		// Ligne lue AVANT que ma validation soit écrite : moi = false, l'autre = true.
		const { client } = fakeClient({ row: dbRow({ validated_by_partner: true }), delayMs: 1000 });
		await setup(client);
		tradeRealtimeStore.partnerValidation = true;

		fake.emit('offer_updated', {});
		await vi.advanceTimersByTimeAsync(350); // lecture en cours

		// Je valide pendant la lecture : la confirmation s'ouvre.
		await tradeRealtimeStore.toggleValidation();
		expect(tradeRealtimeStore.myValidation).toBe(true);
		expect(tradeRealtimeStore.showConfirmationModal).toBe(true);

		// La lecture périmée revient (moi = false) : ce n'est PAS un refus.
		await vi.advanceTimersByTimeAsync(1000);
		expect(tradeRealtimeStore.showConfirmationModal).toBe(true);
		expect(tradeRealtimeStore.myValidation).toBe(true);
	});

	it('un payload de chat invalide passe aussi par le plafond (pas de rafale d’avertissements)', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		for (let i = 0; i < 100; i++) fake.emit('chat_message', { message: '' });
		const chatWarnings = warn.mock.calls.filter((c) =>
			c.some((arg) => typeof arg === 'string' && /chat/i.test(arg))
		);
		expect(chatWarnings.length).toBeLessThanOrEqual(21);
	});

	it('le plafond de 200 messages s’applique aussi à mes envois', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);

		for (let i = 0; i < 250; i++) await tradeRealtimeStore.sendMessage(`m${i}`);
		expect(tradeRealtimeStore.messages).toHaveLength(200);
		expect(tradeRealtimeStore.messages.at(-1)?.message).toBe('m249');
	});

	it('plafonne les messages de chat reçus en rafale', async () => {
		const { client } = fakeClient({ row: dbRow() });
		await setup(client);

		for (let i = 0; i < 100; i++) {
			fake.emit('chat_message', {
				id: crypto.randomUUID(),
				senderId: OTHER,
				message: `m${i}`,
				createdAt: new Date().toISOString()
			});
		}
		expect(tradeRealtimeStore.messages.length).toBeGreaterThan(0);
		expect(tradeRealtimeStore.messages.length).toBeLessThanOrEqual(20);
	});
});
