/**
 * Marché : acceptation, propositions et annonces verrouillées (base locale requise)
 * ============================================================================
 *
 * Migration 20261003170000_marche_verrou (et 20261003160000 pour la fonction
 * d'auto-acceptation qu'appelle la route).
 *
 * Q140 — un proposant forçait l'acceptation de sa propre proposition en passant
 *        l'id du vendeur à `accept_proposal_atomic`.
 * Q147 — une proposition faite ne se modifie plus en direct, sauf pour la retirer.
 * Audit — le vendeur changeait l'offre de son annonce active ; une proposition
 *        visait l'annonce d'une autre école.
 *
 * Vrais clients authentifiés (`auth.uid()` réel), recomptage au client service.
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
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Le client service des modules serveur lit process.env (qui peut viser la prod
// via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// Notifications hors sujet ; l'activation du marché dépend d'une configuration d'école.
vi.mock('$lib/server/marketplace/notifications', () => ({
	notifyNewProposal: vi.fn().mockResolvedValue(undefined),
	notifyProposalAccepted: vi.fn().mockResolvedValue(undefined),
	notifyProposalRejected: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/server/marketplace/helpers', async (importActual) => {
	const actual = await importActual<typeof import('$lib/server/marketplace/helpers')>();
	return { ...actual, isMarketplaceEnabled: vi.fn().mockResolvedValue(true) };
});

import { notifyProposalRejected } from '$lib/server/marketplace/notifications';
import { POST as proposer } from '../../src/routes/api/marketplace/listings/[id]/proposals/+server';
import {
	DELETE as retirer,
	PATCH as repondre
} from '../../src/routes/api/marketplace/proposals/[id]/+server';

type Client = SupabaseClient<Database>;

const service = createServiceRoleClient();
const MODELE_A = 'carte-test-verrou-a';
let ecoleId: string;
let autreEcoleId: string;

interface Eleve {
	id: string;
	client: Client;
}

async function eleve(ecole: string, cartes: Record<string, string> = {}): Promise<Eleve> {
	const profil = await TestData.profile().withRole('student').withGidouilles(50).create();
	const vipCards = Object.fromEntries(
		Object.entries(cartes).map(([instance, modele]) => [
			instance,
			{ cardId: modele, earnedAt: new Date().toISOString() }
		])
	);
	const { error } = await service
		.from('profiles')
		.update({ school_id: ecole, vip_cards: vipCards })
		.eq('id', profil.id);
	expect(error, 'le décor n’a pas pu être posé').toBeNull();
	return { id: profil.id, client: await createAuthenticatedClient(profil.email) };
}

/** Annonce « buy » : le vendeur offre 5 gidouilles et demande une carte A. */
async function annonce(vendeur: Eleve, ecole = ecoleId): Promise<string> {
	const { data, error } = await service
		.from('marketplace_listings')
		.insert({
			creator_id: vendeur.id,
			school_id: ecole,
			listing_type: 'buy',
			status: 'active',
			offered_card_ids: [],
			offered_gidouilles: 5,
			wanted_card_template_ids: [MODELE_A],
			wanted_gidouilles: 0,
			expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
		})
		.select('id')
		.single();
	expect(error, 'le décor n’a pas pu être posé').toBeNull();
	return data!.id;
}

async function proposition(
	listingId: string,
	proposant: Eleve,
	offre: { cartes?: string[]; gidouilles?: number }
): Promise<string> {
	const { data, error } = await service
		.from('marketplace_proposals')
		.insert({
			listing_id: listingId,
			proposer_id: proposant.id,
			offered_card_ids: offre.cartes ?? [],
			offered_gidouilles: offre.gidouilles ?? 0,
			status: 'pending'
		})
		.select('id')
		.single();
	expect(error, 'le décor n’a pas pu être posé').toBeNull();
	return data!.id;
}

/** Recomptage au client service : ce qui a bougé, ou pas. */
async function etat(listingId: string) {
	const [annonceLue, propositions, echanges] = await Promise.all([
		service
			.from('marketplace_listings')
			.select('status, offered_card_ids, offered_gidouilles')
			.eq('id', listingId)
			.single(),
		service
			.from('marketplace_proposals')
			.select('id, status, offered_card_ids, offered_gidouilles')
			.eq('listing_id', listingId)
			.order('id'),
		service.from('marketplace_trades').select('id').eq('listing_id', listingId)
	]);
	expect(annonceLue.error).toBeNull();
	expect(propositions.error).toBeNull();
	expect(echanges.error).toBeNull();
	return {
		annonce: annonceLue.data,
		propositions: propositions.data,
		echanges: echanges.data!.length
	};
}

function appelRoute(user: Eleve, listingId: string, body: Record<string, unknown>) {
	return proposer({
		params: { id: listingId },
		request: { json: async () => body } as unknown as Request,
		locals: {
			supabase: user.client as unknown as App.Locals['supabase'],
			user: { id: user.id } as User
		} as unknown as App.Locals
	} as unknown as Parameters<typeof proposer>[0]);
}

describe('marché verrouillé — Q140, Q147, offre d’annonce, école', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const { data: ecoles, error: ecolesError } = await service
			.from('schools')
			.insert([
				{ name: 'Collège verrou', city: 'Testville', country: 'France' },
				{ name: 'Collège voisin verrou', city: 'Testville', country: 'France' }
			])
			.select('id, name');
		expect(ecolesError, 'le décor n’a pas pu être posé').toBeNull();
		ecoleId = ecoles!.find((e) => e.name === 'Collège verrou')!.id;
		autreEcoleId = ecoles!.find((e) => e.name === 'Collège voisin verrou')!.id;

		const { error: modeleError } = await service.from('vip_card_templates').upsert({
			id: MODELE_A,
			name: 'Carte A verrou',
			description: 'Test.',
			image_path: 'cartes/a.webp',
			rarity: 'common'
		});
		expect(modeleError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await service.from('vip_card_templates').delete().eq('id', MODELE_A);
	});

	it('Q140 : le proposant force l’acceptation au nom du vendeur → refusé, rien ne bouge', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId, { b1: 'autre-modele' });
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });
		const avant = await etat(listingId);

		const { data, error } = await proposant.client.rpc('accept_proposal_atomic', {
			p_proposal_id: proposalId,
			p_user_id: vendeur.id
		});

		expect(error).toBeNull();
		expect(data).toMatchObject({ success: false });
		expect(await etat(listingId)).toEqual(avant);
	}, 60_000);

	it('Q147 : le proposant se met lui-même « accepted » en direct → refusé', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });
		const avant = await etat(listingId);

		const { data } = await proposant.client
			.from('marketplace_proposals')
			// responded_at : sans lui, la contrainte valid_response_timestamp refuserait
			// d'elle-même et le test passerait sans rien prouver.
			.update({ status: 'accepted', responded_at: new Date().toISOString() })
			.eq('id', proposalId)
			.select('id');

		expect(data ?? [], 'la proposition a été modifiée').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);
	}, 60_000);

	it('Q147 : le proposant modifie son offre en direct → refusé ; il peut la retirer', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });
		const avant = await etat(listingId);

		const { data: modifiee } = await proposant.client
			.from('marketplace_proposals')
			.update({ offered_gidouilles: 0, offered_card_ids: ['carte-du-voisin'] })
			.eq('id', proposalId)
			.select('id');

		expect(modifiee ?? [], 'l’offre a été modifiée').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);

		// Témoin : le retrait reste permis.
		const { data: retiree, error } = await proposant.client
			.from('marketplace_proposals')
			.update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
			.eq('id', proposalId)
			.select('id, status');

		expect(error).toBeNull();
		expect(retiree).toEqual([{ id: proposalId, status: 'withdrawn' }]);
	}, 60_000);

	it('le vendeur modifie l’offre de son annonce active → refusé, rien ne bouge', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		await proposition(listingId, proposant, { gidouilles: 1 });
		const avant = await etat(listingId);

		const { data } = await vendeur.client
			.from('marketplace_listings')
			.update({ offered_gidouilles: 0, offered_card_ids: ['carte-fantome'] })
			.eq('id', listingId)
			.select('id');

		expect(data ?? [], 'l’offre de l’annonce a été modifiée').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);
	}, 60_000);

	it('une proposition sur l’annonce d’une autre école → refusée (direct et route)', async () => {
		const vendeur = await eleve(autreEcoleId);
		const etranger = await eleve(ecoleId, { a9: MODELE_A });
		const listingId = await annonce(vendeur, autreEcoleId);
		const avant = await etat(listingId);

		// En direct : déjà refusé AVANT la migration (la policy lit l'annonce sous la
		// RLS du proposant, qui ne voit pas une annonce d'une autre école). La
		// clause d'école de la policy INSERT est une défense en profondeur.
		const { data } = await etranger.client
			.from('marketplace_proposals')
			.insert({ listing_id: listingId, proposer_id: etranger.id, offered_gidouilles: 1 })
			.select('id');

		expect(data ?? [], 'la proposition a été créée').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);

		// Par la route : un élève qui garde une ancienne proposition (retirée) sur
		// cette annonce la voit encore (policy select_proposer) ; c'est le contrôle
		// d'école de la route qui doit refuser la resoumission.
		const ancien = await eleve(ecoleId);
		const ancienneId = await proposition(listingId, ancien, { gidouilles: 1 });
		const { error: retraitError } = await service
			.from('marketplace_proposals')
			.update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
			.eq('id', ancienneId);
		expect(retraitError).toBeNull();
		const avantRoute = await etat(listingId);

		await expect(
			appelRoute(ancien, listingId, { offered_card_ids: [], offered_gidouilles: 2 })
		).rejects.toMatchObject({ status: 403 });
		expect(await etat(listingId)).toEqual(avantRoute);
	}, 60_000);

	it('témoin : le vrai vendeur accepte', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });

		const { data, error } = await vendeur.client.rpc('accept_proposal_atomic', {
			p_proposal_id: proposalId,
			p_user_id: vendeur.id
		});

		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
		const apres = await etat(listingId);
		expect(apres.annonce?.status).toBe('completed');
		expect(apres.echanges).toBe(1);
	}, 60_000);

	it('témoin : une offre exacte proposée par la route est acceptée aussitôt', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId, { [crypto.randomUUID()]: MODELE_A });
		const { data: profil } = await service
			.from('profiles')
			.select('vip_cards')
			.eq('id', proposant.id)
			.single();
		const instance = Object.keys(profil!.vip_cards as object)[0];
		const listingId = await annonce(vendeur);

		const response = await appelRoute(proposant, listingId, {
			offered_card_ids: [instance],
			offered_gidouilles: 0
		});

		expect(response.status).toBe(201);
		expect(await response.json()).toMatchObject({ auto_accepted: true, status: 'accepted' });
		const apres = await etat(listingId);
		expect(apres.annonce?.status).toBe('completed');
		expect(apres.propositions?.[0]?.status).toBe('accepted');
	}, 60_000);

	it('témoin : une proposition retirée se resoumet par la route', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });
		const { error: retraitError } = await service
			.from('marketplace_proposals')
			.update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
			.eq('id', proposalId);
		expect(retraitError).toBeNull();

		const response = await appelRoute(proposant, listingId, {
			offered_card_ids: [],
			offered_gidouilles: 3
		});

		expect(response.status).toBe(201);
		const apres = await etat(listingId);
		expect(apres.propositions).toEqual([
			{ id: proposalId, status: 'pending', offered_card_ids: [], offered_gidouilles: 3 }
		]);
		// Une proposition resoumise n'est plus « retirée » : withdrawn_at remis à NULL.
		const { data: relue, error } = await service
			.from('marketplace_proposals')
			.select('withdrawn_at, responded_at')
			.eq('id', proposalId)
			.single();
		expect(error).toBeNull();
		expect(relue).toEqual({ withdrawn_at: null, responded_at: null });
	}, 60_000);

	it('témoin : le proposant retire sa proposition par la route', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });

		const response = await retirer({
			params: { id: proposalId },
			locals: {
				supabase: proposant.client as unknown as App.Locals['supabase'],
				user: { id: proposant.id } as User
			} as unknown as App.Locals
		} as unknown as Parameters<typeof retirer>[0]);

		expect(response.status).toBe(200);
		expect((await etat(listingId)).propositions?.[0]?.status).toBe('withdrawn');
	}, 60_000);

	function localsDe(user: Eleve): App.Locals {
		return {
			supabase: user.client as unknown as App.Locals['supabase'],
			user: { id: user.id } as User
		} as unknown as App.Locals;
	}

	async function verrous(entite: string): Promise<string[]> {
		const { data, error } = await service
			.from('marketplace_locked_cards')
			.select('card_instance_id')
			.eq('locked_entity_id', entite);
		expect(error).toBeNull();
		return (data ?? []).map((v) => v.card_instance_id).sort();
	}

	it('Q149 : le vendeur réécrit les cartes ou les gidouilles offertes → refusé', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });
		const avant = await etat(listingId);

		const { data: cartes } = await vendeur.client
			.from('marketplace_proposals')
			.update({ offered_card_ids: ['carte-precieuse-du-proposant'] })
			.eq('id', proposalId)
			.select('id');
		const { data: gidouilles } = await vendeur.client
			.from('marketplace_proposals')
			.update({ offered_gidouilles: 50 })
			.eq('id', proposalId)
			.select('id');

		expect(cartes ?? [], 'le vendeur a réécrit les cartes offertes').toEqual([]);
		expect(gidouilles ?? [], 'le vendeur a réécrit les gidouilles offertes').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);
	}, 60_000);

	it('Q149 : le vendeur réécrit proposer_id → refusé', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const victime = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { gidouilles: 1 });

		const { data } = await vendeur.client
			.from('marketplace_proposals')
			.update({ proposer_id: victime.id })
			.eq('id', proposalId)
			.select('id');

		expect(data ?? [], 'le vendeur a changé le proposant').toEqual([]);
		const { data: relue, error } = await service
			.from('marketplace_proposals')
			.select('proposer_id, status')
			.eq('id', proposalId)
			.single();
		expect(error).toBeNull();
		expect(relue).toEqual({ proposer_id: proposant.id, status: 'pending' });
	}, 60_000);

	it('insertion directe d’une proposition « accepted » → refusée', async () => {
		const vendeur = await eleve(ecoleId);
		const proposant = await eleve(ecoleId);
		const listingId = await annonce(vendeur);
		const avant = await etat(listingId);

		// responded_at : sans lui, la contrainte valid_response_timestamp refuserait seule.
		const { data } = await proposant.client
			.from('marketplace_proposals')
			.insert({
				listing_id: listingId,
				proposer_id: proposant.id,
				offered_gidouilles: 1,
				status: 'accepted',
				responded_at: new Date().toISOString()
			})
			.select('id');

		expect(data ?? [], 'une proposition est née acceptée').toEqual([]);
		expect(await etat(listingId)).toEqual(avant);
	}, 60_000);

	it('témoin : le vendeur refuse par la route, les cartes du proposant sont libérées', async () => {
		const vendeur = await eleve(ecoleId);
		const instance = crypto.randomUUID();
		const proposant = await eleve(ecoleId, { [instance]: 'autre-modele' });
		const listingId = await annonce(vendeur);

		const cree = await appelRoute(proposant, listingId, {
			offered_card_ids: [instance],
			offered_gidouilles: 0
		});
		expect(cree.status).toBe(201);
		const { id: proposalId } = (await cree.json()) as { id: string };
		// Verrou posé sous l'id de la PROPOSITION, pas de l'annonce.
		expect(await verrous(proposalId)).toEqual([instance]);
		expect(await verrous(listingId)).toEqual([]);

		const response = await repondre({
			params: { id: proposalId },
			request: { json: async () => ({ status: 'rejected' }) } as unknown as Request,
			locals: localsDe(vendeur)
		} as unknown as Parameters<typeof repondre>[0]);

		expect(response.status).toBe(200);
		expect((await etat(listingId)).propositions?.[0]?.status).toBe('rejected');
		expect(await verrous(proposalId)).toEqual([]);
	}, 60_000);

	it('témoin : retrait par la route et acceptation libèrent les verrous de la proposition', async () => {
		const vendeur = await eleve(ecoleId);
		const i1 = crypto.randomUUID();
		const i2 = crypto.randomUUID();
		const proposant = await eleve(ecoleId, { [i1]: 'autre-modele', [i2]: 'autre-modele' });
		const listingId = await annonce(vendeur);

		// Retrait
		const r1 = await appelRoute(proposant, listingId, { offered_card_ids: [i1] });
		const { id: p1 } = (await r1.json()) as { id: string };
		expect(await verrous(p1)).toEqual([i1]);
		const retrait = await retirer({
			params: { id: p1 },
			locals: localsDe(proposant)
		} as unknown as Parameters<typeof retirer>[0]);
		expect(retrait.status).toBe(200);
		expect(await verrous(p1)).toEqual([]);

		// Resoumission avec l'autre carte, puis acceptation par le vendeur
		const r2 = await appelRoute(proposant, listingId, { offered_card_ids: [i2] });
		expect(r2.status).toBe(201);
		expect(await verrous(p1)).toEqual([i2]);
		const accepte = await repondre({
			params: { id: p1 },
			request: { json: async () => ({ status: 'accepted' }) } as unknown as Request,
			locals: localsDe(vendeur)
		} as unknown as Parameters<typeof repondre>[0]);
		expect(accepte.status).toBe(200);
		expect(await verrous(p1)).toEqual([]);
		expect((await etat(listingId)).annonce?.status).toBe('completed');
	}, 60_000);

	it('refus par le vendeur : l’ancien verrou du proposant (id d’annonce) part, celui du vendeur reste', async () => {
		const vendeur = await eleve(ecoleId, { s1: 'autre-modele' });
		const proposant = await eleve(ecoleId, { p1: 'autre-modele' });
		const listingId = await annonce(vendeur);
		const proposalId = await proposition(listingId, proposant, { cartes: ['p1'] });

		// Deux verrous sous l'id de l'ANNONCE : celui du vendeur (sa carte en vente)
		// et un ancien verrou du proposant (ancien code de la route).
		const { error: verrousError } = await service.from('marketplace_locked_cards').insert([
			{
				student_id: vendeur.id,
				card_instance_id: 's1',
				locked_for: 'listing',
				locked_entity_id: listingId
			},
			{
				student_id: proposant.id,
				card_instance_id: 'p1',
				locked_for: 'listing',
				locked_entity_id: listingId
			}
		]);
		expect(verrousError, 'le décor n’a pas pu être posé').toBeNull();

		const response = await repondre({
			params: { id: proposalId },
			request: { json: async () => ({ status: 'rejected' }) } as unknown as Request,
			locals: localsDe(vendeur)
		} as unknown as Parameters<typeof repondre>[0]);

		expect(response.status).toBe(200);
		expect(await verrous(listingId), 'seul le verrou du vendeur doit rester').toEqual(['s1']);
	}, 60_000);

	it('« autre proposition acceptée » : seuls les refusés PAR cette acceptation sont prévenus (PATCH et POST)', async () => {
		const notifie = vi.mocked(notifyProposalRejected);

		for (const voie of ['PATCH', 'POST'] as const) {
			const vendeur = await eleve(ecoleId);
			const instance = crypto.randomUUID();
			const gagnant = await eleve(ecoleId, { [instance]: MODELE_A });
			const enAttente = await eleve(ecoleId);
			const refuseAvant = await eleve(ecoleId);
			const listingId = await annonce(vendeur);

			const ancienne = await proposition(listingId, refuseAvant, { gidouilles: 1 });
			const { error: refusError } = await service
				.from('marketplace_proposals')
				.update({
					status: 'rejected',
					responded_at: new Date(Date.now() - 3_600_000).toISOString()
				})
				.eq('id', ancienne);
			expect(refusError).toBeNull();
			await proposition(listingId, enAttente, { gidouilles: 1 });

			notifie.mockClear();
			if (voie === 'PATCH') {
				const gagnante = await proposition(listingId, gagnant, { gidouilles: 1 });
				const response = await repondre({
					params: { id: gagnante },
					request: { json: async () => ({ status: 'accepted' }) } as unknown as Request,
					locals: localsDe(vendeur)
				} as unknown as Parameters<typeof repondre>[0]);
				expect(response.status).toBe(200);
			} else {
				const response = await appelRoute(gagnant, listingId, { offered_card_ids: [instance] });
				expect(await response.json()).toMatchObject({ auto_accepted: true });
			}

			const prevenus = notifie.mock.calls.map((appel) => appel[0]);
			expect(prevenus, voie).toEqual([enAttente.id]);
		}
	}, 120_000);
});
