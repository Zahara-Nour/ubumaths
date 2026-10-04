/**
 * Échanges de cartes : le VRAI store client sur le canal privé (base locale requise)
 * ================================================================================
 *
 * PR 2. La PR 1 (`realtime-trade-prive.test.ts`) prouve les policies avec des
 * canaux écrits à la main ; ce fichier fait tourner `tradeRealtimeStore` lui-même
 * (une instance par élève, modules rechargés), contre le serveur Realtime local,
 * avec de vrais comptes connectés.
 *
 *   1. A (initiateur) et B (partenaire) échangent : B voit l'offre de A, relue
 *      en base, et son message de chat, auteur = A.
 *   2. Payloads forgés par A (fausse offre, faux statut, faux auteur) : B
 *      affiche la base, jamais le payload.
 *   3. O (3ᵉ élève) : abonnement REFUSÉ, rien reçu. C'est le test qui échoue si
 *      le store repasse en canal public.
 *
 * Pas de délai fixe avant d'émettre : `init()` attend `SUBSCRIBED`, état prêt du
 * canal broadcast (aucun postgres_changes ici).
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
import type { MarketplaceTrade } from '$lib/types/marketplace';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type TradeModule = typeof import('$lib/stores/tradeRealtime.svelte');
type RealtimeModule = typeof import('$lib/stores/supabaseRealtime.svelte');

interface Session {
	client: Client;
	store: TradeModule['tradeRealtimeStore'];
	realtime: RealtimeModule['supabaseRealtimeManager'];
}

// ============================================================================
// CONSTANTS
// ============================================================================

vi.mock('$app/environment', () => ({ browser: true, building: false, dev: true, version: '1' }));

const service = createServiceRoleClient();

/** Délai d'attente d'une réception : au-delà, on conclut qu'elle n'arrivera pas. */
const WAIT_MS = 4_000;

const CARD = '44444444-4444-4444-a444-444444444444';
const FORGED_CARD = '55555555-5555-4555-a555-555555555555';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Le store pose ses écouteurs d'activité sur `document` (absent en
 * environnement node) : un EventTarget suffit.
 */
function stubDocument(): void {
	if (!('document' in globalThis)) {
		vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
	}
}

/** Client connecté + store d'échange NEUF (singletons : modules rechargés). */
async function openSession(email: string, userId: string): Promise<Session> {
	const client = await createAuthenticatedClient(email);
	vi.resetModules();
	const { tradeRealtimeStore } = await import('$lib/stores/tradeRealtime.svelte');
	const { supabaseRealtimeManager } = await import('$lib/stores/supabaseRealtime.svelte');
	supabaseRealtimeManager.init(client, userId);
	return { client, store: tradeRealtimeStore, realtime: supabaseRealtimeManager };
}

async function sleep(ms: number): Promise<void> {
	await new Promise((r) => setTimeout(r, ms));
}

/** Attend que `predicate` soit vrai, ou que le délai expire. */
async function waitUntil(predicate: () => boolean): Promise<boolean> {
	const end = Date.now() + WAIT_MS;
	while (Date.now() < end) {
		if (predicate()) return true;
		await sleep(50);
	}
	return false;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Échanges : le store client sur le canal privé', { timeout: 120_000 }, () => {
	let a: { id: string; email: string };
	let b: { id: string; email: string };
	let o: { id: string; email: string };
	let trade: string;
	let sessionA: Session;
	let sessionB: Session;
	let sessionO: Session;

	beforeAll(async () => {
		stubDocument();
		await cleanupAllTestData();
		a = (await TestData.profile().withRole('student').create()) as typeof a;
		b = (await TestData.profile().withRole('student').create()) as typeof b;
		o = (await TestData.profile().withRole('student').create()) as typeof o;

		const { data, error } = await service
			.from('marketplace_trades')
			.insert({ trade_type: 'friend', initiator_id: a.id, partner_id: b.id })
			.select('id')
			.single();
		expect(error).toBeNull();
		trade = (data as { id: string }).id;

		sessionA = await openSession(a.email, a.id);
		sessionB = await openSession(b.email, b.id);
		sessionO = await openSession(o.email, o.id);

		await sessionA.store.init(trade, a.id, sessionA.client);
		await sessionB.store.init(trade, b.id, sessionB.client);
	}, 120_000);

	afterAll(async () => {
		for (const s of [sessionA, sessionB, sessionO]) {
			s?.store.destroy();
			await s?.realtime.disconnect();
			s?.client.realtime.disconnect();
		}
		if (trade) await service.from('marketplace_trades').delete().eq('id', trade);
		await cleanupAllTestData();
		vi.unstubAllGlobals();
	});

	it('les deux élèves échangent en privé : offre relue en base, message signé par l’autre élève', async () => {
		sessionA.store.setGidouilles(7);
		const offerSeen = await waitUntil(() => sessionB.store.partnerOffer.gidouilles === 7);
		expect(offerSeen, 'B n’a pas vu l’offre de A').toBe(true);

		await sessionA.store.sendMessage('Bonjour B');
		const chatSeen = await waitUntil(() =>
			sessionB.store.messages.some((m) => m.message === 'Bonjour B')
		);
		expect(chatSeen, 'B n’a pas reçu le message de A').toBe(true);
		const received = sessionB.store.messages.find((m) => m.message === 'Bonjour B');
		expect(received!.senderId).toBe(a.id);
	});

	it('des payloads forgés par un des deux élèves ne sont jamais affichés tels quels', async () => {
		const channelA = sessionA.realtime.getChannel(`trade:${trade}`);
		expect(channelA).toBeDefined();

		// Offre réelle de A en base : une carte.
		const saved = await service
			.from('marketplace_trades')
			.update({
				current_offer: {
					from_initiator: { cards: [CARD], gidouilles: 3 },
					from_partner: { cards: [], gidouilles: 0 }
				}
			})
			.eq('id', trade)
			.select('id');
		expect(saved.data).toHaveLength(1);

		const send = (event: string, payload: Record<string, unknown>) =>
			channelA!.send({ type: 'broadcast', event, payload });
		expect(
			await send('offer_updated', { from: 'initiator', cards: [FORGED_CARD], gidouilles: 9999 })
		).toBe('ok');
		expect(await send('trade_completed', { tradeId: trade })).toBe('ok');
		expect(
			await send('chat_message', {
				id: crypto.randomUUID(),
				senderId: b.id,
				message: 'signé B ?',
				createdAt: '2000-01-01T00:00:00.000Z'
			})
		).toBe('ok');

		const offerFromDb = await waitUntil(() => sessionB.store.partnerOffer.gidouilles === 3);
		expect(offerFromDb, 'B n’a pas relu l’offre en base').toBe(true);
		expect(sessionB.store.partnerOffer.cards).toEqual([CARD]);
		expect(sessionB.store.trade?.status).toBe('negotiating');

		expect(
			await waitUntil(() => sessionB.store.messages.some((m) => m.message === 'signé B ?'))
		).toBe(true);
		const forged = sessionB.store.messages.find((m) => m.message === 'signé B ?');
		expect(forged!.senderId).toBe(a.id);
		expect(forged!.createdAt.startsWith('2000')).toBe(false);
	});

	it('un 3ᵉ élève ne peut pas s’abonner et ne reçoit rien', async () => {
		// O ne lit pas la ligne de l'échange : `init()` s'arrêterait AVANT le canal.
		// On prépare donc le store à la main pour tester la jonction elle-même.
		const store = sessionO.store;
		store['supabase'] = sessionO.client;
		store['userId'] = o.id;
		store.tradeId = trade;
		store.myRole = 'partner';
		store.trade = {
			id: trade,
			initiator_id: a.id,
			partner_id: o.id,
			status: 'negotiating'
		} as MarketplaceTrade;

		// Refus d'AUTORISATION du serveur (pas un délai ni une panne réseau)
		await expect(store['subscribeToChannel']()).rejects.toThrow(/Unauthorized|permissions to read/);

		// Abonné PUBLIC sur le même nom de canal (client séparé) : si A diffusait
		// en public, il recevrait ses signaux. Il ne doit rien recevoir.
		const publicClient = await createAuthenticatedClient(o.email);
		const publicReceived: unknown[] = [];
		const publicChannel = publicClient
			.channel(`trade:${trade}`)
			.on('broadcast', { event: '*' }, (message) => publicReceived.push(message));
		const publicStatus = await new Promise<string>((resolve) =>
			publicChannel.subscribe((status) => {
				if (status !== 'CLOSED') resolve(status);
			})
		);
		expect(publicStatus, 'le témoin public n’a pas pu s’abonner').toBe('SUBSCRIBED');

		await sessionA.store.sendMessage('pas pour O');
		sessionA.store.setGidouilles(11);
		// B reçoit (témoin) ; O, pendant le même temps, rien.
		expect(
			await waitUntil(() => sessionB.store.messages.some((m) => m.message === 'pas pour O'))
		).toBe(true);
		await sleep(1_000);
		expect(store.messages).toEqual([]);
		expect(store.partnerOffer).toEqual({ cards: [], gidouilles: 0 });
		expect(publicReceived, 'A a diffusé en public').toEqual([]);

		await publicClient.removeChannel(publicChannel);
		publicClient.realtime.disconnect();

		await sessionO.realtime.unsubscribeChannel(`trade:${trade}`);
	});
});
