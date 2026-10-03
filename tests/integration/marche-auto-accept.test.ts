/**
 * Marché : auto-acceptation d'une offre exacte, vérifiée sous verrou (base locale requise)
 * ============================================================================
 *
 * Migration 20261003160000_marche_rpc_auto_accept.
 *
 * La route comparait l'offre puis laissait `accept_proposal_atomic` relire la
 * proposition : le proposant pouvait la modifier entre les deux (TOCTOU). Et la
 * comparaison se faisait en ENSEMBLE : [A, A] demandé se contentait d'un A.
 *
 * `auto_accept_exact_proposal` refait la comparaison sur les lignes
 * verrouillées, en multiensemble, et n'est exécutable que par le serveur.
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

type Client = SupabaseClient<Database>;

// La fonction n'existe pas encore dans database.ts (généré depuis la production).
type RpcLoose = (
	fn: string,
	args: Record<string, unknown>
) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;

function rpc(client: Client): RpcLoose {
	return (client.rpc as unknown as RpcLoose).bind(client);
}

const service = createServiceRoleClient();
const MODELE_A = 'carte-test-auto-a';
const MODELE_B = 'carte-test-auto-b';
let ecoleId: string;
let autreEcoleId: string;

interface Decor {
	proposalId: string;
	listingId: string;
	vendeurId: string;
	proposantId: string;
	proposantEmail: string;
}

/** Un vendeur et un proposant neufs (aucun quota journalier entamé), même école. */
async function decor(options: {
	wanted: string[];
	wantedGidouilles?: number;
	proposantCartes: Record<string, string>;
	offered: string[];
	offeredGidouilles?: number;
	/** École du proposant : celle de l'annonce par défaut ; `null` = sans école. */
	proposantEcole?: string | null;
	/** Instances déjà consommées (pouvoir utilisé : `usedAt` renseigné). */
	consommees?: string[];
}): Promise<Decor> {
	const eleve = async (gidouilles: number) => {
		const profil = await TestData.profile().withRole('student').withGidouilles(gidouilles).create();
		const { error } = await service
			.from('profiles')
			.update({ school_id: ecoleId })
			.eq('id', profil.id);
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
		return profil;
	};

	const vendeur = await eleve(50);
	const proposant = await eleve(50);

	const cartes = Object.fromEntries(
		Object.entries(options.proposantCartes).map(([instance, modele]) => [
			instance,
			{
				cardId: modele,
				earnedAt: new Date().toISOString(),
				...(options.consommees?.includes(instance) ? { usedAt: new Date().toISOString() } : {})
			}
		])
	);
	const { error: cartesError } = await service
		.from('profiles')
		.update({
			vip_cards: cartes,
			...(options.proposantEcole !== undefined ? { school_id: options.proposantEcole } : {})
		})
		.eq('id', proposant.id);
	expect(cartesError, 'le décor n’a pas pu être posé').toBeNull();

	const { data: annonce, error: annonceError } = await service
		.from('marketplace_listings')
		.insert({
			creator_id: vendeur.id,
			school_id: ecoleId,
			listing_type: 'buy',
			status: 'active',
			offered_card_ids: [],
			offered_gidouilles: 5,
			wanted_card_template_ids: options.wanted,
			wanted_gidouilles: options.wantedGidouilles ?? 0,
			expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
		})
		.select('id')
		.single();
	expect(annonceError, 'le décor n’a pas pu être posé').toBeNull();

	const { data: proposition, error: propositionError } = await service
		.from('marketplace_proposals')
		.insert({
			listing_id: annonce!.id,
			proposer_id: proposant.id,
			offered_card_ids: options.offered,
			offered_gidouilles: options.offeredGidouilles ?? 0,
			status: 'pending'
		})
		.select('id')
		.single();
	expect(propositionError, 'le décor n’a pas pu être posé').toBeNull();

	return {
		proposalId: proposition!.id,
		listingId: annonce!.id,
		vendeurId: vendeur.id,
		proposantId: proposant.id,
		proposantEmail: proposant.email
	};
}

/** État recompté au client service : ce qui a bougé, ou pas. */
async function etat(d: Decor) {
	const [prop, annonce, echanges, vendeur, proposant] = await Promise.all([
		service.from('marketplace_proposals').select('status').eq('id', d.proposalId).single(),
		service.from('marketplace_listings').select('status').eq('id', d.listingId).single(),
		service.from('marketplace_trades').select('id').eq('proposal_id', d.proposalId),
		service.from('profiles').select('vip_cards, gidouilles').eq('id', d.vendeurId).single(),
		service.from('profiles').select('vip_cards, gidouilles').eq('id', d.proposantId).single()
	]);
	for (const r of [prop, annonce, echanges, vendeur, proposant]) {
		expect(r.error, 'relecture impossible').toBeNull();
	}
	return {
		proposition: prop.data!.status,
		annonce: annonce.data!.status,
		echanges: echanges.data!.length,
		cartesVendeur: Object.keys((vendeur.data!.vip_cards ?? {}) as object).sort(),
		cartesProposant: Object.keys((proposant.data!.vip_cards ?? {}) as object).sort(),
		gidouillesVendeur: vendeur.data!.gidouilles,
		gidouillesProposant: proposant.data!.gidouilles
	};
}

describe('auto_accept_exact_proposal — offre exacte vérifiée sous verrou', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const { data: ecole, error: ecoleError } = await service
			.from('schools')
			.insert({ name: 'Collège auto-acceptation', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(ecoleError, 'le décor n’a pas pu être posé').toBeNull();
		ecoleId = ecole!.id;

		const { data: autre, error: autreError } = await service
			.from('schools')
			.insert({ name: 'Collège voisin auto-acceptation', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		expect(autreError, 'le décor n’a pas pu être posé').toBeNull();
		autreEcoleId = autre!.id;

		// `upsert` : le catalogue survit au nettoyage générique.
		const { error: modelesError } = await service.from('vip_card_templates').upsert([
			{
				id: MODELE_A,
				name: 'Carte A test',
				description: 'Test.',
				image_path: 'cartes/a.webp',
				rarity: 'common'
			},
			{
				id: MODELE_B,
				name: 'Carte B test',
				description: 'Test.',
				image_path: 'cartes/b.webp',
				rarity: 'common'
			}
		]);
		expect(modelesError, 'le décor n’a pas pu être posé').toBeNull();
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await service.from('vip_card_templates').delete().in('id', [MODELE_A, MODELE_B]);
	});

	it('droits : un élève connecté ne peut pas l’appeler, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1']
		});
		const avant = await etat(d);

		const proposant = await createAuthenticatedClient(d.proposantEmail);
		const { data, error } = await rpc(proposant)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(data).toBeNull();
		expect(error?.code, 'l’élève a pu appeler la fonction').toBe('42501');
		expect(await etat(d)).toEqual(avant);
	}, 60_000);

	it('nominal : une offre exacte est acceptée et l’échange exécuté', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1']
		});

		const { data, error } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
		const apres = await etat(d);
		expect(apres.proposition).toBe('accepted');
		expect(apres.annonce).toBe('completed');
		expect(apres.echanges).toBe(1);
		expect(apres.cartesVendeur).toEqual(['a1']);
		expect(apres.cartesProposant).toEqual([]);
		expect(apres.gidouillesProposant).toBe(55);
	}, 60_000);

	it('offre non exacte : reste en attente, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { b1: MODELE_B },
			offered: ['b1']
		});
		const avant = await etat(d);

		const { data, error } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(error).toBeNull();
		expect(data).toEqual({ success: false, reason: 'not_exact' });
		expect(await etat(d)).toEqual(avant);
		expect(avant.proposition).toBe('pending');
	}, 60_000);

	it('offre modifiée en base juste avant l’appel : la fonction juge la ligne relue, refus', async () => {
		// La route a vu une offre exacte (a1)…
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A, b1: MODELE_B },
			offered: ['a1']
		});
		// … puis le proposant l'a remplacée avant l'exécution.
		const { error: modifError } = await service
			.from('marketplace_proposals')
			.update({ offered_card_ids: ['b1'] })
			.eq('id', d.proposalId);
		expect(modifError).toBeNull();
		const avant = await etat(d);

		const { data, error } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(error).toBeNull();
		expect(data).toEqual({ success: false, reason: 'not_exact' });
		expect(await etat(d)).toEqual(avant);
	}, 60_000);

	it('doublons : [A, A] demandé, un seul A offert → refus', async () => {
		const d = await decor({
			wanted: [MODELE_A, MODELE_A],
			proposantCartes: { a1: MODELE_A, a2: MODELE_A },
			offered: ['a1']
		});
		const avant = await etat(d);

		const { data } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(data).toEqual({ success: false, reason: 'not_exact' });
		expect(await etat(d)).toEqual(avant);
	}, 60_000);

	it('doublons : la même carte A citée deux fois ne vaut qu’un A → refus', async () => {
		const d = await decor({
			wanted: [MODELE_A, MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1', 'a1']
		});
		const avant = await etat(d);

		const { data } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(data).toEqual({ success: false, reason: 'not_exact' });
		expect(await etat(d)).toEqual(avant);
	}, 60_000);

	it('doublons : deux cartes A distinctes pour [A, A] → acceptée', async () => {
		const d = await decor({
			wanted: [MODELE_A, MODELE_A],
			proposantCartes: { a1: MODELE_A, a2: MODELE_A },
			offered: ['a1', 'a2']
		});

		const { data } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(data).toMatchObject({ success: true });
		const apres = await etat(d);
		expect(apres.proposition).toBe('accepted');
		expect(apres.cartesVendeur).toEqual(['a1', 'a2']);
	}, 60_000);

	it('annonce de gidouilles seules : montant atteint et aucune carte → acceptée', async () => {
		const d = await decor({
			wanted: [],
			wantedGidouilles: 10,
			proposantCartes: {},
			offered: [],
			offeredGidouilles: 10
		});

		const { data } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});

		expect(data).toMatchObject({ success: true });
		expect((await etat(d)).gidouillesVendeur).toBe(55);
	}, 60_000);

	/** Appel du serveur dont on attend un refus, et rien qui bouge. */
	async function refuse(d: Decor, raison: string) {
		const avant = await etat(d);
		const { data, error } = await rpc(service)('auto_accept_exact_proposal', {
			p_proposal_id: d.proposalId
		});
		expect(error).toBeNull();
		expect(data).toEqual({ success: false, reason: raison });
		expect(await etat(d)).toEqual(avant);
		expect(avant.proposition).toBe('pending');
	}

	it('autre école : un proposant d’une autre école → refus, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1'],
			proposantEcole: autreEcoleId
		});
		await refuse(d, 'other_school');
	}, 60_000);

	it('sans école : un proposant sans école → refus, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1'],
			proposantEcole: null
		});
		await refuse(d, 'other_school');
	}, 60_000);

	it('carte consommée : usedAt renseigné → refus, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1'],
			consommees: ['a1']
		});
		await refuse(d, 'cards_unavailable');
	}, 60_000);

	it('carte verrouillée ailleurs (une autre annonce) → refus, rien ne bouge', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1']
		});
		// Le proposant a mis la même carte en vente dans sa propre annonce.
		const { data: sienne, error: annonceError } = await service
			.from('marketplace_listings')
			.insert({
				creator_id: d.proposantId,
				school_id: ecoleId,
				listing_type: 'sell',
				status: 'active',
				offered_card_ids: ['a1'],
				wanted_gidouilles: 3,
				expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
			})
			.select('id')
			.single();
		expect(annonceError, 'le décor n’a pas pu être posé').toBeNull();
		const { error: verrouError } = await service.from('marketplace_locked_cards').insert({
			student_id: d.proposantId,
			card_instance_id: 'a1',
			locked_for: 'listing',
			locked_entity_id: sienne!.id
		});
		expect(verrouError, 'le décor n’a pas pu être posé').toBeNull();

		await refuse(d, 'cards_unavailable');
	}, 60_000);

	it('busy : l’annonce est verrouillée par une autre transaction → refus immédiat', async () => {
		const d = await decor({
			wanted: [MODELE_A],
			proposantCartes: { a1: MODELE_A },
			offered: ['a1']
		});
		const avant = await etat(d);
		const pg = await getPostgresClient();
		await pg.query('BEGIN');
		try {
			await pg.query('SELECT 1 FROM public.marketplace_listings WHERE id = $1 FOR UPDATE', [
				d.listingId
			]);
			const { data, error } = await rpc(service)('auto_accept_exact_proposal', {
				p_proposal_id: d.proposalId
			});
			expect(error).toBeNull();
			expect(data).toEqual({ success: false, reason: 'busy' });
		} finally {
			await pg.query('ROLLBACK');
		}
		expect(await etat(d)).toEqual(avant);
	}, 60_000);
});
