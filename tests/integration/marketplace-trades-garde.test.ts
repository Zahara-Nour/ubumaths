/**
 * Échanges de cartes : la base garde l'échange (base locale requise)
 * =================================================================
 *
 * Faille du 2026-10-04 : un élève A pouvait voler les cartes et les gidouilles
 * d'un élève B. Il créait un échange avec B, écrivait lui-même la moitié
 * `from_partner` de l'offre (les biens de B), puis appelait
 * `rpc/execute_trade`, qui ne regardait ni validations ni confirmations.
 *
 * Migration : 20261004190000_echanges_garde_base.sql. Ce fichier prouve :
 *   - les refus (vol, drapeaux de l'autre, offre de l'autre, colonnes figées,
 *     création hors règles, DELETE, contournement de la confiance) ;
 *   - les flux NOMINAUX, écrits comme le font le store
 *     (src/lib/stores/tradeRealtime.svelte.ts) et les routes
 *     (src/routes/api/marketplace/trades/**), plus le marché via
 *     `accept_proposal_atomic`.
 *
 * ⚠️ La RLS refuse en silence (zéro ligne) : chaque écriture refusée est
 * relue par le client service pour prouver que rien n'a bougé.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database, Json } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type Moitie = { cards: string[]; gidouilles: number };
type Offre = { from_initiator?: Moitie; from_partner?: Moitie };
type Role = 'initiator' | 'partner';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const VIDE: Moitie = { cards: [], gidouilles: 0 };

const service = createServiceRoleClient();

// ============================================================================
// FONCTIONS
// ============================================================================

async function clientFor(email: string): Promise<Client> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
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

/** La ligne telle qu'elle est en base (client service, hors RLS). */
async function lireEchange(id: string) {
	const { data, error } = await service
		.from('marketplace_trades')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data;
}

async function lireBiens(id: string): Promise<{ gidouilles: number; cartes: string[] }> {
	const { data, error } = await service
		.from('profiles')
		.select('gidouilles, vip_cards')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return {
		gidouilles: data.gidouilles ?? 0,
		cartes: Object.keys((data.vip_cards as Record<string, unknown>) ?? {}).sort()
	};
}

async function donnerBiens(id: string, cartes: string[], gidouilles: number): Promise<void> {
	const vip: Record<string, Json> = {};
	for (const c of cartes) vip[c] = { cardId: 'carte-test', obtainedAt: '2026-10-04' };
	const { error } = await service
		.from('profiles')
		.update({ vip_cards: vip, gidouilles })
		.eq('id', id);
	if (error) throw new Error(error.message);
}

/** Comme POST /api/marketplace/trades : un échange 'friend' vierge. */
async function creerEchange(client: Client, initiateur: string, partenaire: string) {
	const { data, error } = await client
		.from('marketplace_trades')
		.insert({
			initiator_id: initiateur,
			partner_id: partenaire,
			trade_type: 'friend',
			status: 'negotiating',
			current_offer: null
		})
		.select('id')
		.single();
	if (error) throw new Error(`création refusée : ${error.message}`);
	return data.id;
}

/** Comme saveOfferToDatabase : relit l'offre, ne remplace que sa moitié. */
async function ecrireMonOffre(client: Client, tradeId: string, role: Role, moi: Moitie) {
	const { data: lu, error: luErr } = await client
		.from('marketplace_trades')
		.select('current_offer')
		.eq('id', tradeId)
		.single();
	if (luErr) throw new Error(luErr.message);
	const existante = (lu.current_offer as Offre | null) ?? {};
	const offre =
		role === 'initiator'
			? { from_initiator: moi, from_partner: existante.from_partner || VIDE }
			: { from_initiator: existante.from_initiator || VIDE, from_partner: moi };
	return client
		.from('marketplace_trades')
		.update({ current_offer: offre, updated_at: new Date().toISOString() })
		.eq('id', tradeId)
		.select('id');
}

/** Comme toggleValidation : sa validation + l'offre entière tirée de l'état local. */
async function basculerValidation(
	client: Client,
	tradeId: string,
	role: Role,
	valeur: boolean,
	moi: Moitie,
	autre: Moitie
) {
	const offre =
		role === 'initiator'
			? { from_initiator: moi, from_partner: autre }
			: { from_initiator: autre, from_partner: moi };
	const maintenant = new Date().toISOString();
	return role === 'initiator'
		? client
				.from('marketplace_trades')
				.update({ validated_by_initiator: valeur, current_offer: offre, updated_at: maintenant })
				.eq('id', tradeId)
				.select('id')
		: client
				.from('marketplace_trades')
				.update({ validated_by_partner: valeur, current_offer: offre, updated_at: maintenant })
				.eq('id', tradeId)
				.select('id');
}

/** Comme startConfirmationPhase. */
async function demarrerConfirmation(client: Client, tradeId: string) {
	return client
		.from('marketplace_trades')
		.update({
			confirmation_started_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.select('id');
}

/** Comme la route /confirm : sa confirmation, tant que l'échange négocie. */
async function confirmer(client: Client, tradeId: string, role: Role) {
	const maintenant = new Date().toISOString();
	return role === 'initiator'
		? client
				.from('marketplace_trades')
				.update({ confirmed_by_initiator: true, updated_at: maintenant })
				.eq('id', tradeId)
				.eq('status', 'negotiating')
				.select('id')
		: client
				.from('marketplace_trades')
				.update({ confirmed_by_partner: true, updated_at: maintenant })
				.eq('id', tradeId)
				.eq('status', 'negotiating')
				.select('id');
}

/** Comme refuseConfirmation (store) : remet les DEUX validations à false. */
async function refuserConfirmation(client: Client, tradeId: string) {
	return client
		.from('marketplace_trades')
		.update({
			validated_by_initiator: false,
			validated_by_partner: false,
			confirmation_started_at: null,
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.select('id');
}

/** Comme la route /confirm à l'expiration : les 4 drapeaux à false. */
async function expirer(client: Client, tradeId: string) {
	return client
		.from('marketplace_trades')
		.update({
			validated_by_initiator: false,
			validated_by_partner: false,
			confirmed_by_initiator: false,
			confirmed_by_partner: false,
			confirmation_started_at: null,
			updated_at: new Date().toISOString()
		})
		.eq('id', tradeId)
		.select('id');
}

async function executer(client: Client, tradeId: string) {
	const { data, error } = await client.rpc('execute_trade', { p_trade_id: tradeId });
	expect(error).toBeNull();
	return data as { success: boolean; error?: string };
}

/** Écriture qui doit avoir été REFUSÉE : erreur, ou zéro ligne. */
function refusee(res: { error: unknown; data: unknown[] | null }) {
	const refus = res.error !== null || !res.data || res.data.length === 0;
	expect(refus, 'écriture acceptée alors qu’elle devait être refusée').toBe(true);
}

function acceptee(res: { error: { message: string } | null; data: unknown[] | null }) {
	expect(res.error?.message ?? null).toBeNull();
	expect(res.data?.length).toBe(1);
}

// ============================================================================
// TESTS
// ============================================================================

describe('échanges de cartes : garde en base', () => {
	let a: Client;
	let b: Client;
	let aId: string;
	let bId: string;
	/** Même école que A, pas ami. */
	let horsAmitieId: string;
	/** Ami de A, autre école. */
	let horsEcoleId: string;
	let ecoleId: string;
	let autreEcoleId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();

		// Noms uniques : un run interrompu ne bloque pas le suivant (unique_school).
		const suffixe = crypto.randomUUID().slice(0, 8);
		ecoleId = await insert('schools', {
			name: `Lycée échanges ${suffixe}`,
			city: 'T',
			country: 'France'
		});
		autreEcoleId = await insert('schools', {
			name: `Lycée voisin ${suffixe}`,
			city: 'T',
			country: 'France'
		});

		const eleve = async (ecole: string) => {
			const p = await TestData.profile().withRole('student').create();
			const { error } = await service.from('profiles').update({ school_id: ecole }).eq('id', p.id);
			expect(error).toBeNull();
			return p;
		};

		const pa = await eleve(ecoleId);
		const pb = await eleve(ecoleId);
		aId = pa.id;
		bId = pb.id;
		horsAmitieId = (await eleve(ecoleId)).id;
		horsEcoleId = (await eleve(autreEcoleId)).id;

		// Amitiés acceptées (posées hors API) : A–B, et A–élève d'une autre école.
		for (const autre of [bId, horsEcoleId]) {
			await insert('friendships', {
				requester_id: aId,
				addressee_id: autre,
				status: 'accepted',
				friendship_type: 'friend'
			});
		}

		a = await clientFor(pa.email);
		b = await clientFor(pb.email);
	}, 120_000);

	afterAll(async () => {
		// Échanges d'abord : listing_id passe à NULL si l'annonce disparaît, ce que
		// valid_trade_relations refuse pour un échange 'marketplace'.
		await service.from('marketplace_trades').delete().in('initiator_id', [aId, bId]);
		await service.from('marketplace_proposals').delete().in('proposer_id', [aId, bId]);
		await service.from('marketplace_listings').delete().in('creator_id', [aId, bId]);
		await cleanupAllTestData();
		await service.from('schools').delete().in('id', [ecoleId, autreEcoleId]);
	});

	// ── Le vol ──────────────────────────────────────────────────────────────

	it('le vol complet est refusé : forger la moitié de B puis exécuter', async () => {
		await donnerBiens(aId, [], 0);
		await donnerBiens(bId, ['b-vol-1', 'b-vol-2'], 50);
		const id = await creerEchange(a, aId, bId);

		const forge = await a
			.from('marketplace_trades')
			.update({
				current_offer: {
					from_initiator: VIDE,
					from_partner: { cards: ['b-vol-1', 'b-vol-2'], gidouilles: 50 }
				}
			})
			.eq('id', id)
			.select('id');
		refusee(forge);

		// Même en forgeant les 4 drapeaux en une écriture.
		const forgeTotale = await a
			.from('marketplace_trades')
			.update({
				current_offer: {
					from_initiator: VIDE,
					from_partner: { cards: ['b-vol-1', 'b-vol-2'], gidouilles: 50 }
				},
				validated_by_initiator: true,
				validated_by_partner: true,
				confirmed_by_initiator: true,
				confirmed_by_partner: true
			})
			.eq('id', id)
			.select('id');
		refusee(forgeTotale);

		const res = await executer(a, id);
		expect(res.success).toBe(false);

		expect(await lireBiens(bId)).toEqual({ gidouilles: 50, cartes: ['b-vol-1', 'b-vol-2'] });
		expect(await lireBiens(aId)).toEqual({ gidouilles: 0, cartes: [] });
		expect((await lireEchange(id))?.status).toBe('negotiating');
	});

	it('execute_trade refuse un échange sans les 4 drapeaux', async () => {
		await donnerBiens(aId, ['a-x'], 0);
		await donnerBiens(bId, ['b-x'], 0);
		const id = await creerEchange(a, aId, bId);
		acceptee(await ecrireMonOffre(a, id, 'initiator', { cards: ['a-x'], gidouilles: 0 }));
		acceptee(await ecrireMonOffre(b, id, 'partner', { cards: ['b-x'], gidouilles: 0 }));

		// Offres posées, rien de validé.
		expect((await executer(a, id)).success).toBe(false);

		// Validé des deux côtés, pas confirmé.
		acceptee(
			await basculerValidation(
				a,
				id,
				'initiator',
				true,
				{ cards: ['a-x'], gidouilles: 0 },
				{ cards: ['b-x'], gidouilles: 0 }
			)
		);
		acceptee(
			await basculerValidation(
				b,
				id,
				'partner',
				true,
				{ cards: ['b-x'], gidouilles: 0 },
				{ cards: ['a-x'], gidouilles: 0 }
			)
		);
		expect((await executer(a, id)).success).toBe(false);

		// Une seule confirmation.
		acceptee(await confirmer(a, id, 'initiator'));
		const res = await executer(a, id);
		expect(res.success).toBe(false);
		expect(res.error).toMatch(/valider puis confirmer/);

		expect(await lireBiens(aId)).toEqual({ gidouilles: 0, cartes: ['a-x'] });
		expect(await lireBiens(bId)).toEqual({ gidouilles: 0, cartes: ['b-x'] });
	});

	// ── Les drapeaux et l'offre de l'autre ─────────────────────────────────

	it('A ne peut forger ni la validation, ni la confirmation, ni l’offre de B', async () => {
		const id = await creerEchange(a, aId, bId);

		refusee(
			await a
				.from('marketplace_trades')
				.update({ validated_by_partner: true })
				.eq('id', id)
				.select('id')
		);
		refusee(
			await a
				.from('marketplace_trades')
				.update({ confirmed_by_partner: true })
				.eq('id', id)
				.select('id')
		);
		// Sa propre confirmation sans double validation : refusée aussi.
		refusee(
			await a
				.from('marketplace_trades')
				.update({ confirmed_by_initiator: true })
				.eq('id', id)
				.select('id')
		);
		// L'écriture du store, mais avec une moitié de B périmée/forgée.
		refusee(
			await basculerValidation(a, id, 'initiator', true, VIDE, {
				cards: ['b-forge'],
				gidouilles: 9
			})
		);

		const ligne = await lireEchange(id);
		expect(ligne?.validated_by_partner).toBe(false);
		expect(ligne?.confirmed_by_partner).toBe(false);
		expect(ligne?.confirmed_by_initiator).toBe(false);
		expect(ligne?.validated_by_initiator).toBe(false);
		expect(ligne?.current_offer).toBeNull();
	});

	it('une offre dont la moitié de l’autre change est refusée, même si elle existait', async () => {
		const id = await creerEchange(a, aId, bId);
		acceptee(await ecrireMonOffre(b, id, 'partner', { cards: ['b-y'], gidouilles: 2 }));

		const res = await a
			.from('marketplace_trades')
			.update({
				current_offer: {
					from_initiator: VIDE,
					from_partner: { cards: ['b-y'], gidouilles: 20 }
				}
			})
			.eq('id', id)
			.select('id');
		expect(res.error?.message).toMatch(/votre propre offre/);
		expect((await lireEchange(id))?.current_offer).toEqual({
			from_initiator: VIDE,
			from_partner: { cards: ['b-y'], gidouilles: 2 }
		});

		// Gidouilles négatives dans SA moitié : refusées (sinon B paierait).
		refusee(await ecrireMonOffre(a, id, 'initiator', { cards: [], gidouilles: -10 }));
	});

	it('vider la moitié de l’autre, clé en trop, moitié JSON null : refusés', async () => {
		const id = await creerEchange(a, aId, bId);
		const mb = { cards: ['b-v'], gidouilles: 3 };
		acceptee(await ecrireMonOffre(b, id, 'partner', mb));
		const avant = (await lireEchange(id))?.current_offer;

		const essais: Json[] = [
			// moitié de B vidée
			{ from_initiator: VIDE, from_partner: VIDE },
			// moitié de B qui vaut JSON null
			{ from_initiator: VIDE, from_partner: null },
			// clé de premier niveau en trop
			{ from_initiator: VIDE, from_partner: mb, bonus: { gidouilles: 100 } },
			// SA moitié qui vaut JSON null
			{ from_initiator: null, from_partner: mb }
		];
		for (const offre of essais) {
			refusee(
				await a
					.from('marketplace_trades')
					.update({ current_offer: offre })
					.eq('id', id)
					.select('id')
			);
		}
		// current_offer passée à NULL : vide aussi la moitié de B.
		refusee(
			await a.from('marketplace_trades').update({ current_offer: null }).eq('id', id).select('id')
		);
		expect((await lireEchange(id))?.current_offer).toEqual(avant);

		// Moitié de l'autre absente en base : la mettre à JSON null est refusé aussi.
		const id2 = await creerEchange(a, aId, bId);
		refusee(
			await a
				.from('marketplace_trades')
				.update({ current_offer: { from_initiator: VIDE, from_partner: null } })
				.eq('id', id2)
				.select('id')
		);
		expect((await lireEchange(id2))?.current_offer).toBeNull();
	});

	it('gidouilles : seul un entier écrit sans point passe (« 5.0 » casserait ::INTEGER)', async () => {
		const id = await creerEchange(a, aId, bId);
		const { data: session } = await a.auth.getSession();
		const jeton = session.session!.access_token;

		// supabase-js sérialise 5.0 en « 5 » : corps JSON écrit à la main.
		const patchBrut = (gidouilles: string) =>
			fetch(`${SUPABASE_URL}/rest/v1/marketplace_trades?id=eq.${id}`, {
				method: 'PATCH',
				headers: {
					apikey: ANON_KEY,
					Authorization: `Bearer ${jeton}`,
					'Content-Type': 'application/json',
					Prefer: 'return=representation'
				},
				body: `{"current_offer":{"from_initiator":{"cards":[],"gidouilles":${gidouilles}},"from_partner":{"cards":[],"gidouilles":0}}}`
			});

		// (« 5e0 » n'y figure pas : jsonb le range en « 5 », que ::INTEGER lit.)
		for (const valeur of ['5.0', '5.5', '-1', '"5"', '10000000000']) {
			const res = await patchBrut(valeur);
			const corps = (await res.json()) as unknown;
			const refus = !res.ok || (Array.isArray(corps) && corps.length === 0);
			expect(refus, `gidouilles ${valeur} accepté`).toBe(true);
		}
		expect((await lireEchange(id))?.current_offer).toBeNull();

		// Témoin : l'entier 5 passe, et execute_trade saurait le lire.
		const ok = await patchBrut('5');
		expect(ok.status).toBe(200);
		expect((await lireEchange(id))?.current_offer).toEqual({
			from_initiator: { cards: [], gidouilles: 5 },
			from_partner: VIDE
		});
	});

	it('execute_trade est refusé à un appel anonyme', async () => {
		const id = await creerEchange(a, aId, bId);
		const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { data, error } = await anon.rpc('execute_trade', { p_trade_id: id });
		expect(error, 'anon a pu appeler execute_trade').not.toBeNull();
		expect(data).toBeNull();
		expect((await lireEchange(id))?.status).toBe('negotiating');
	});

	it('A ne peut changer ni partner_id, ni status (sauf cancelled), ni trade_type, ni listing_id', async () => {
		const id = await creerEchange(a, aId, bId);
		const essais: Database['public']['Tables']['marketplace_trades']['Update'][] = [
			{ partner_id: horsAmitieId },
			{ initiator_id: horsAmitieId },
			{ status: 'completed', completed_at: new Date().toISOString(), final_trade: {} },
			{ trade_type: 'marketplace' },
			{ listing_id: crypto.randomUUID() },
			{ proposal_id: crypto.randomUUID() },
			{ validated_at: new Date().toISOString() },
			{ final_trade: {} }
		];
		for (const patch of essais) {
			refusee(await a.from('marketplace_trades').update(patch).eq('id', id).select('id'));
		}
		const ligne = await lireEchange(id);
		expect(ligne?.partner_id).toBe(bId);
		expect(ligne?.initiator_id).toBe(aId);
		expect(ligne?.status).toBe('negotiating');
		expect(ligne?.trade_type).toBe('friend');
		expect(ligne?.listing_id).toBeNull();

		// L'annulation, elle, passe (comme la route /cancel).
		acceptee(
			await b
				.from('marketplace_trades')
				.update({
					status: 'cancelled',
					cancelled_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', id)
				.select('id')
		);
		// Et plus rien ne bouge ensuite.
		refusee(
			await a
				.from('marketplace_trades')
				.update({ status: 'negotiating', cancelled_at: null })
				.eq('id', id)
				.select('id')
		);
		expect((await lireEchange(id))?.status).toBe('cancelled');
	});

	// ── Remises à zéro ─────────────────────────────────────────────────────

	it('un changement d’offre remet à false la validation de l’autre et toutes les confirmations', async () => {
		const id = await creerEchange(a, aId, bId);
		const ma = { cards: ['a-r'], gidouilles: 1 };
		const mb = { cards: ['b-r'], gidouilles: 0 };
		acceptee(await ecrireMonOffre(a, id, 'initiator', ma));
		acceptee(await ecrireMonOffre(b, id, 'partner', mb));
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await demarrerConfirmation(b, id));
		acceptee(await confirmer(a, id, 'initiator'));

		let ligne = await lireEchange(id);
		expect(ligne?.validated_at).not.toBeNull();
		expect(ligne?.confirmed_by_initiator).toBe(true);

		// B change sa moitié (et garde sa validation, comme le permet la décision c).
		acceptee(await ecrireMonOffre(b, id, 'partner', { cards: ['b-r'], gidouilles: 3 }));
		ligne = await lireEchange(id);
		expect(ligne?.validated_by_initiator).toBe(false);
		expect(ligne?.validated_by_partner).toBe(true);
		expect(ligne?.confirmed_by_initiator).toBe(false);
		expect(ligne?.confirmed_by_partner).toBe(false);
		expect(ligne?.validated_at).toBeNull();
		expect(ligne?.confirmation_started_at).toBeNull();
	});

	it('remettre à FALSE la validation et la confirmation de l’autre est permis (refus, expiration)', async () => {
		const id = await creerEchange(a, aId, bId);
		const ma = { cards: ['a-f'], gidouilles: 0 };
		const mb = { cards: [], gidouilles: 4 };
		acceptee(await ecrireMonOffre(a, id, 'initiator', ma));
		acceptee(await ecrireMonOffre(b, id, 'partner', mb));
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await confirmer(a, id, 'initiator'));

		// B refuse : il remet aussi la validation de A à false.
		acceptee(await refuserConfirmation(b, id));
		let ligne = await lireEchange(id);
		expect(ligne?.validated_by_initiator).toBe(false);
		expect(ligne?.validated_by_partner).toBe(false);
		// La confirmation de A ne survit pas au refus.
		expect(ligne?.confirmed_by_initiator).toBe(false);

		// Nouveau tour, puis expiration écrite par A (route /confirm).
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await confirmer(b, id, 'partner'));
		acceptee(await expirer(a, id));
		ligne = await lireEchange(id);
		expect(ligne?.validated_by_partner).toBe(false);
		expect(ligne?.confirmed_by_partner).toBe(false);
		expect(ligne?.confirmation_started_at).toBeNull();
	});

	// ── Création ───────────────────────────────────────────────────────────

	it('la création hors règles est refusée', async () => {
		const tentatives: Database['public']['Tables']['marketplace_trades']['Insert'][] = [
			// pas ami (même école)
			{ initiator_id: aId, partner_id: horsAmitieId, trade_type: 'friend', status: 'negotiating' },
			// ami, autre école
			{ initiator_id: aId, partner_id: horsEcoleId, trade_type: 'friend', status: 'negotiating' },
			// drapeaux pré-posés
			{
				initiator_id: aId,
				partner_id: bId,
				trade_type: 'friend',
				status: 'negotiating',
				validated_by_partner: true,
				confirmed_by_partner: true
			},
			// offre pré-remplie
			{
				initiator_id: aId,
				partner_id: bId,
				trade_type: 'friend',
				status: 'negotiating',
				current_offer: { from_initiator: VIDE, from_partner: { cards: ['b-z'], gidouilles: 5 } }
			},
			// déjà terminé
			{
				initiator_id: aId,
				partner_id: bId,
				trade_type: 'friend',
				status: 'completed',
				completed_at: new Date().toISOString(),
				final_trade: {}
			}
		];
		for (const row of tentatives) {
			const res = await a.from('marketplace_trades').insert(row).select('id');
			refusee(res);
		}
		const { count } = await service
			.from('marketplace_trades')
			.select('id', { count: 'exact', head: true })
			.in('partner_id', [horsAmitieId, horsEcoleId]);
		expect(count).toBe(0);
	});

	// ── Suppression ────────────────────────────────────────────────────────

	it('DELETE est refusé : la ligne existe toujours', async () => {
		const id = await creerEchange(a, aId, bId);
		for (const c of [a, b]) {
			const res = await c.from('marketplace_trades').delete().eq('id', id).select('id');
			// Refus RLS = zéro ligne, sans erreur.
			expect(res.data ?? []).toHaveLength(0);
		}
		expect(await lireEchange(id)).not.toBeNull();
		const { data: vu } = await a.from('marketplace_trades').select('id').eq('id', id);
		expect(vu).toHaveLength(1);
	});

	// ── Mécanisme de confiance ─────────────────────────────────────────────

	it('un élève ne peut pas se faire passer pour une fonction de confiance', async () => {
		const id = await creerEchange(a, aId, bId);

		// set_config n'est pas exposé par l'API (schéma pg_catalog)…
		const { error: cfgErr } = await a.rpc(
			'set_config' as never,
			{
				setting_name: 'app.trusted_trade_write',
				new_value: 'on',
				is_local: false
			} as never
		);
		expect(cfgErr).not.toBeNull();

		// …et le trigger ne lit aucun réglage de session : la forge reste refusée,
		// y compris avec un en-tête qui finirait dans request.headers.
		const avecEntete = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { headers: { 'x-trusted-trade-write': 'on', Role: 'postgres' } }
		});
		const { data: session } = await a.auth.getSession();
		await avecEntete.auth.setSession({
			access_token: session.session!.access_token,
			refresh_token: session.session!.refresh_token
		});
		for (const c of [a, avecEntete]) {
			refusee(
				await c
					.from('marketplace_trades')
					.update({ validated_by_partner: true })
					.eq('id', id)
					.select('id')
			);
		}
		expect((await lireEchange(id))?.validated_by_partner).toBe(false);
	});

	// ── Flux nominaux ──────────────────────────────────────────────────────

	it('flux friend complet (store + routes) : offres, refus, expiration, confirmation, transfert', async () => {
		await donnerBiens(aId, ['a-n1', 'a-n2'], 30);
		await donnerBiens(bId, ['b-n1'], 10);
		const id = await creerEchange(a, aId, bId);

		const ma = { cards: ['a-n1'], gidouilles: 5 };
		const mb = { cards: ['b-n1'], gidouilles: 0 };
		acceptee(await ecrireMonOffre(a, id, 'initiator', ma));
		acceptee(await ecrireMonOffre(b, id, 'partner', mb));

		// Tour 1 : validations, phase de confirmation, refus de B.
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await demarrerConfirmation(a, id));
		acceptee(await refuserConfirmation(b, id));

		// Tour 2 : validations, confirmation de A, puis expiration.
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await demarrerConfirmation(b, id));
		acceptee(await confirmer(a, id, 'initiator'));
		acceptee(await expirer(b, id));

		// Tour 3 : jusqu'au bout. B exécute (route /confirm, second confirmant).
		acceptee(await basculerValidation(a, id, 'initiator', true, ma, mb));
		acceptee(await basculerValidation(b, id, 'partner', true, mb, ma));
		acceptee(await demarrerConfirmation(a, id));
		acceptee(await confirmer(a, id, 'initiator'));
		acceptee(await confirmer(b, id, 'partner'));
		const res = await executer(b, id);
		expect(res).toMatchObject({ success: true });

		const ligne = await lireEchange(id);
		expect(ligne?.status).toBe('completed');
		expect(ligne?.final_trade).toEqual({ from_initiator: ma, from_partner: mb });
		expect(await lireBiens(aId)).toEqual({ gidouilles: 25, cartes: ['a-n2', 'b-n1'] });
		expect(await lireBiens(bId)).toEqual({ gidouilles: 15, cartes: ['a-n1'] });

		// Une fois terminé, plus rien ne bouge.
		refusee(await ecrireMonOffre(a, id, 'initiator', VIDE));
		expect((await executer(a, id)).success).toBe(false);
	});

	it('flux marché : accept_proposal_atomic exécute l’échange (4 drapeaux posés)', async () => {
		await donnerBiens(aId, ['a-m1'], 0);
		await donnerBiens(bId, [], 12);
		const listing = await insert('marketplace_listings', {
			creator_id: aId,
			school_id: ecoleId,
			listing_type: 'sell',
			offered_card_ids: ['a-m1'],
			offered_gidouilles: 0,
			wanted_gidouilles: 8,
			expires_at: new Date(Date.now() + 86_400_000).toISOString()
		});
		const proposal = await insert('marketplace_proposals', {
			listing_id: listing,
			proposer_id: bId,
			offered_card_ids: [],
			offered_gidouilles: 8
		});

		const { data, error } = await a.rpc('accept_proposal_atomic', {
			p_proposal_id: proposal,
			p_user_id: aId
		});
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: true });
		const tradeId = (data as { trade_id: string }).trade_id;

		const ligne = await lireEchange(tradeId);
		expect(ligne?.status).toBe('completed');
		expect(ligne?.trade_type).toBe('marketplace');
		expect(await lireBiens(aId)).toEqual({ gidouilles: 8, cartes: [] });
		expect(await lireBiens(bId)).toEqual({ gidouilles: 4, cartes: ['a-m1'] });
	});

	it('flux marché en échec : le DELETE de rollback interne passe toujours', async () => {
		await donnerBiens(aId, ['a-m2'], 0);
		await donnerBiens(bId, [], 1);
		const listing = await insert('marketplace_listings', {
			creator_id: aId,
			school_id: ecoleId,
			listing_type: 'sell',
			offered_card_ids: ['a-m2'],
			offered_gidouilles: 0,
			wanted_gidouilles: 8,
			expires_at: new Date(Date.now() + 86_400_000).toISOString()
		});
		// B propose plus qu'il n'a : execute_trade échoue (solde insuffisant).
		const proposal = await insert('marketplace_proposals', {
			listing_id: listing,
			proposer_id: bId,
			offered_card_ids: [],
			offered_gidouilles: 8
		});

		const { data, error } = await a.rpc('accept_proposal_atomic', {
			p_proposal_id: proposal,
			p_user_id: aId
		});
		expect(error).toBeNull();
		expect(data).toMatchObject({ success: false });

		const { count } = await service
			.from('marketplace_trades')
			.select('id', { count: 'exact', head: true })
			.eq('proposal_id', proposal);
		expect(count).toBe(0);
		expect(await lireBiens(aId)).toEqual({ gidouilles: 0, cartes: ['a-m2'] });
	});
});
