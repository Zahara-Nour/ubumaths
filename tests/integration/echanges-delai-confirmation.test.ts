/**
 * Échanges : la confirmation est refusée après le délai de 5 minutes
 * ==================================================================
 *
 * Migration : 20261004233000_echanges_delai_confirmation.sql (base locale requise).
 *
 * Le trigger `guard_marketplace_trade_update` refuse (42501) qu'un élève passe
 * SA confirmation à true si `confirmation_started_at` est NULL ou date de plus
 * de 5 minutes. Avant, seule la route /confirm vérifiait le délai : une
 * écriture directe par PostgREST, puis `rpc/execute_trade`, le contournait.
 *
 * Chaque refus a son témoin légitime (confirmation dans les temps, route
 * /confirm réelle, flux marché par accept_proposal_atomic) : une migration
 * qui refuserait TOUT passerait les refus.
 *
 * L'expiration est simulée en reculant `confirmation_started_at` au client
 * service, dont les écritures ne passent pas par la garde.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Les notifications de fin d'échange passent par un client service pris dans
// l'environnement : hors sujet ici.
vi.mock('$lib/server/marketplace/notifications', () => ({ notifyTradeCompleted: vi.fn() }));

import { POST as confirmerRoute } from '../../src/routes/api/marketplace/trades/[id]/confirm/+server';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type Moitie = { cards: string[]; gidouilles: number };
type Role = 'initiator' | 'partner';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Code Postgres d'un refus de garde. */
const REFUS = '42501';
const VIDE: Moitie = { cards: [], gidouilles: 0 };
const OFFRE = { from_initiator: { cards: [], gidouilles: 5 }, from_partner: VIDE };

const service = createServiceRoleClient();

// ============================================================================
// FONCTIONS
// ============================================================================

async function lireEchange(id: string) {
	const { data, error } = await service
		.from('marketplace_trades')
		.select('*')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

/** Recule le début de la phase de confirmation (client service, hors garde). */
async function reculerPhase(id: string, minutes: number): Promise<void> {
	const { data, error } = await service
		.from('marketplace_trades')
		.update({ confirmation_started_at: new Date(Date.now() - minutes * 60_000).toISOString() })
		.eq('id', id)
		.select('id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
}

/** Comme toggleValidation (store) : sa validation + l'offre entière. */
async function valider(client: Client, tradeId: string, role: Role) {
	const maintenant = new Date().toISOString();
	return role === 'initiator'
		? client
				.from('marketplace_trades')
				.update({ validated_by_initiator: true, current_offer: OFFRE, updated_at: maintenant })
				.eq('id', tradeId)
				.select('id')
		: client
				.from('marketplace_trades')
				.update({ validated_by_partner: true, current_offer: OFFRE, updated_at: maintenant })
				.eq('id', tradeId)
				.select('id');
}

/** Ce que ferait un élève par PostgREST : SA confirmation, sans passer par /confirm. */
async function confirmerEnDirect(client: Client, tradeId: string, role: Role) {
	return role === 'initiator'
		? client
				.from('marketplace_trades')
				.update({ confirmed_by_initiator: true })
				.eq('id', tradeId)
				.select('id')
		: client
				.from('marketplace_trades')
				.update({ confirmed_by_partner: true })
				.eq('id', tradeId)
				.select('id');
}

/** La route /confirm RÉELLE, appelée avec le client de l'élève. */
async function appelerConfirm(client: Client, userId: string, tradeId: string) {
	try {
		const res = await confirmerRoute({
			params: { id: tradeId },
			locals: { supabase: client, user: { id: userId } }
		} as never);
		return { status: res.status, corps: (await res.json()) as Record<string, unknown> };
	} catch (err) {
		if (isHttpError(err)) return { status: err.status, corps: { message: err.body.message } };
		throw err;
	}
}

function acceptee(res: { error: { message: string } | null; data: unknown[] | null }) {
	expect(res.error?.message ?? null).toBeNull();
	expect(res.data?.length).toBe(1);
}

// ============================================================================
// TESTS
// ============================================================================

describe('échanges : délai de confirmation vérifié par la base', () => {
	let a: Client;
	let aId: string;
	let b: Client;
	let bId: string;
	let ecoleId: string;

	/** Échange A→B validé des deux côtés : la phase de confirmation a commencé. */
	async function echangeValide(): Promise<string> {
		const { error: biensError } = await service
			.from('profiles')
			.update({ gidouilles: 100 })
			.eq('id', aId);
		expect(biensError).toBeNull();
		const { data, error } = await a
			.from('marketplace_trades')
			.insert({
				initiator_id: aId,
				partner_id: bId,
				trade_type: 'friend',
				status: 'negotiating',
				current_offer: null
			})
			.select('id')
			.single();
		if (error) throw new Error(`création refusée : ${error.message}`);
		acceptee(await valider(a, data.id, 'initiator'));
		acceptee(await valider(b, data.id, 'partner'));
		expect((await lireEchange(data.id)).confirmation_started_at).not.toBeNull();
		return data.id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		const suffixe = crypto.randomUUID().slice(0, 8);
		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: `Lycée délai confirmation ${suffixe}`, city: 'T', country: 'France' })
			.select('id')
			.single();
		if (ecoleError) throw new Error(ecoleError.message);
		ecoleId = ecole.id;

		const eleve = async () => {
			const profil = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecoleId })
				.eq('id', profil.id);
			expect(error).toBeNull();
			return profil;
		};
		const pa = await eleve();
		const pb = await eleve();
		aId = pa.id;
		bId = pb.id;
		const { error: amitieError } = await service.from('friendships').insert({
			requester_id: aId,
			addressee_id: bId,
			status: 'accepted',
			friendship_type: 'friend'
		});
		expect(amitieError).toBeNull();

		a = await createAuthenticatedClient(pa.email);
		b = await createAuthenticatedClient(pb.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('marketplace_trades').delete().in('initiator_id', [aId, bId]);
		await service.from('marketplace_trades').delete().in('partner_id', [aId, bId]);
		await cleanupAllTestData();
		await service.from('schools').delete().eq('id', ecoleId);
	});

	// ── Refus ────────────────────────────────────────────────────────────────

	it.each<[Role]>([['initiator'], ['partner']])(
		'confirmation directe après expiration (%s) : refusée, rien n’est écrit',
		async (role) => {
			const id = await echangeValide();
			await reculerPhase(id, 6);

			const res = await confirmerEnDirect(role === 'initiator' ? a : b, id, role);
			expect(res.error?.code).toBe(REFUS);
			const ligne = await lireEchange(id);
			expect(ligne.confirmed_by_initiator).toBe(false);
			expect(ligne.confirmed_by_partner).toBe(false);
		}
	);

	it('confirmation directe sans phase commencée (heure NULL) : refusée', async () => {
		const id = await echangeValide();
		// Validations conservées, heures à NULL : forme que permet la contrainte
		// validate_timestamps_consistency, posée hors garde.
		const { error } = await service
			.from('marketplace_trades')
			.update({ validated_at: null, confirmation_started_at: null })
			.eq('id', id);
		expect(error).toBeNull();

		expect((await confirmerEnDirect(a, id, 'initiator')).error?.code).toBe(REFUS);
		expect((await lireEchange(id)).confirmed_by_initiator).toBe(false);
	});

	it('contournement complet : A confirme à temps, B confirme en retard puis execute_trade → rien ne s’exécute', async () => {
		const id = await echangeValide();
		acceptee(await confirmerEnDirect(a, id, 'initiator'));
		await reculerPhase(id, 6);

		expect((await confirmerEnDirect(b, id, 'partner')).error?.code).toBe(REFUS);
		const { data, error } = await b.rpc('execute_trade', { p_trade_id: id });
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: false });
		const ligne = await lireEchange(id);
		expect(ligne.status).toBe('negotiating');
		expect(ligne.confirmed_by_partner).toBe(false);
	});

	it('contournement par remise à NULL : NULL, nouvelle phase + confirmation, execute_trade → rien ne s’exécute', async () => {
		const id = await echangeValide();
		// B confirme à temps, puis la phase expire.
		acceptee(await confirmerEnDirect(b, id, 'partner'));
		await reculerPhase(id, 6);

		// (1) A remet l'heure à NULL.
		const remise = await a
			.from('marketplace_trades')
			.update({ confirmation_started_at: null })
			.eq('id', id)
			.select('id');
		// Avant la garde de remise à zéro : refusée par la contrainte
		// validate_timestamps_consistency (23514). Depuis : acceptée, mais tout
		// repasse à false. Dans les deux cas, rien ne doit s'exécuter ensuite.
		expect([null, '23514']).toContain(remise.error?.code ?? null);

		// (2) A rouvre une phase et confirme dans la même écriture.
		const relance = await a
			.from('marketplace_trades')
			.update({ confirmation_started_at: new Date().toISOString(), confirmed_by_initiator: true })
			.eq('id', id)
			.select('id');
		// Refusée : heure expirée (avant) ou validations remises à false (depuis).
		expect(relance.error?.code).toBe(REFUS);

		const { data, error } = await a.rpc('execute_trade', { p_trade_id: id });
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: false });
		const ligne = await lireEchange(id);
		expect(ligne.status).toBe('negotiating');
		expect(ligne.confirmed_by_initiator && ligne.confirmed_by_partner).toBe(false);
	});

	it('remise à NULL d’une phase posée : validations et confirmations repassent à false', async () => {
		const id = await echangeValide();
		acceptee(await confirmerEnDirect(b, id, 'partner'));

		// Forme de refuseConfirmation (store) réduite à SA validation : la garde
		// doit remettre à false l'autre validation et les deux confirmations.
		const res = await a
			.from('marketplace_trades')
			.update({ confirmation_started_at: null, validated_by_initiator: false })
			.eq('id', id)
			.select('id');
		acceptee(res);
		const ligne = await lireEchange(id);
		expect(ligne.confirmation_started_at).toBeNull();
		expect(ligne.validated_by_initiator).toBe(false);
		expect(ligne.validated_by_partner).toBe(false);
		expect(ligne.confirmed_by_initiator).toBe(false);
		expect(ligne.confirmed_by_partner).toBe(false);
	});

	// ── Témoins ──────────────────────────────────────────────────────────────

	it('témoin : confirmation directe dans les temps (4 min écoulées) acceptée', async () => {
		const id = await echangeValide();
		await reculerPhase(id, 4);

		acceptee(await confirmerEnDirect(a, id, 'initiator'));
		acceptee(await confirmerEnDirect(b, id, 'partner'));
		const ligne = await lireEchange(id);
		expect(ligne.confirmed_by_initiator).toBe(true);
		expect(ligne.confirmed_by_partner).toBe(true);
	});

	it('témoin : flux nominal par la route /confirm, jusqu’à l’exécution', async () => {
		const id = await echangeValide();

		const premier = await appelerConfirm(a, aId, id);
		expect(premier.status).toBe(200);
		expect(premier.corps).toMatchObject({ confirmed: true, executed: false });

		const second = await appelerConfirm(b, bId, id);
		expect(second.status).toBe(200);
		expect(second.corps).toMatchObject({ executed: true });
		expect((await lireEchange(id)).status).toBe('completed');
	});

	it('témoin : expiration par la route /confirm → 410 et remise à zéro réelle', async () => {
		const id = await echangeValide();
		await reculerPhase(id, 6);

		const expire = await appelerConfirm(a, aId, id);
		expect(expire.status).toBe(410);
		const apres = await lireEchange(id);
		expect(apres.confirmation_started_at).toBeNull();
		expect(apres.validated_by_initiator).toBe(false);
		expect(apres.validated_by_partner).toBe(false);
		expect(apres.confirmed_by_initiator).toBe(false);
		expect(apres.status).toBe('negotiating');
	});

	it('témoin : flux marché (accept_proposal_atomic) exécuté, sans heure de confirmation', async () => {
		const vendeur = await TestData.profile().withRole('student').withGidouilles(50).create();
		const proposant = await TestData.profile().withRole('student').withGidouilles(50).create();
		for (const p of [vendeur, proposant]) {
			const { error } = await service
				.from('profiles')
				.update({ school_id: ecoleId })
				.eq('id', p.id);
			expect(error).toBeNull();
		}
		const { data: annonce, error: annonceError } = await service
			.from('marketplace_listings')
			.insert({
				creator_id: vendeur.id,
				school_id: ecoleId,
				listing_type: 'buy',
				status: 'active',
				offered_card_ids: [],
				offered_gidouilles: 5,
				wanted_card_template_ids: [],
				wanted_gidouilles: 1,
				expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
			})
			.select('id')
			.single();
		if (annonceError) throw new Error(annonceError.message);
		const { data: prop, error: propError } = await service
			.from('marketplace_proposals')
			.insert({
				listing_id: annonce.id,
				proposer_id: proposant.id,
				offered_card_ids: [],
				offered_gidouilles: 1,
				status: 'pending'
			})
			.select('id')
			.single();
		if (propError) throw new Error(propError.message);

		const client = await createAuthenticatedClient(vendeur.email);
		const { data, error } = await client.rpc('accept_proposal_atomic', {
			p_proposal_id: prop.id,
			p_user_id: vendeur.id
		});
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });

		const { data: echanges, error: echangesError } = await service
			.from('marketplace_trades')
			.select('status, confirmation_started_at')
			.eq('listing_id', annonce.id);
		expect(echangesError).toBeNull();
		expect(echanges).toEqual([{ status: 'completed', confirmation_started_at: null }]);

		await service.from('marketplace_trades').delete().eq('listing_id', annonce.id);
		await service.from('marketplace_proposals').delete().eq('listing_id', annonce.id);
		await service.from('marketplace_listings').delete().eq('id', annonce.id);
	}, 60_000);
});
