/**
 * Statistiques d'un paquet SRS et délai de confirmation d'un échange
 * ==================================================================
 *
 * Migration : 20261004230000_srs_stats_echanges_delai.sql (base locale requise).
 *
 * 1. `get_deck_stats` : le paquet doit être lisible par l'appelant, selon les
 *    policies SELECT de `srs_decks` (son paquet ; ou, pour le prof, la copie
 *    d'un élève qu'il a assignée). Refus = 42501.
 * 2. `marketplace_trades.confirmation_started_at` : posée par la base (now()),
 *    figée une fois posée, remise à NULL permise. Le flux nominal (store +
 *    route /confirm RÉELLE, expiration comprise) passe toujours.
 *
 * Chaque refus a son témoin légitime : une migration qui refuserait TOUT
 * passerait les refus.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database, Json } from '$lib/types/database';

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
type Stats = { total_cards: number; new_count: number };

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Code Postgres d'un refus de garde. */
const REFUS = '42501';
const VIDE: Moitie = { cards: [], gidouilles: 0 };
/** Tolérance entre l'horloge du test et celle de la base. */
const TOLERANCE_MS = 60_000;
const INEXISTANT = '00000000-0000-4000-8000-0000000000d9';

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

async function stats(client: Client, userId: string, deckId: string) {
	const { data, error } = await client.rpc('get_deck_stats', {
		p_user_id: userId,
		p_deck_id: deckId
	});
	return { stats: (data?.[0] ?? null) as Stats | null, error };
}

async function lireEchange(id: string) {
	const { data, error } = await service
		.from('marketplace_trades')
		.select('*')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

/** Écart entre une heure lue en base et maintenant (horloge du test). */
function ecartAMaintenant(iso: string | null): number {
	if (!iso) throw new Error('confirmation_started_at attendue, NULL lue');
	return Math.abs(new Date(iso).getTime() - Date.now());
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

/**
 * Comme toggleValidation (store) : sa validation + l'offre entière. `heure`
 * ajoute une confirmation_started_at forgée à la même écriture.
 */
async function valider(
	client: Client,
	tradeId: string,
	role: Role,
	offre: { from_initiator: Moitie; from_partner: Moitie },
	heure?: string
) {
	const maintenant = new Date().toISOString();
	const forge = heure ? { confirmation_started_at: heure } : {};
	return role === 'initiator'
		? client
				.from('marketplace_trades')
				.update({
					validated_by_initiator: true,
					current_offer: offre,
					updated_at: maintenant,
					...forge
				})
				.eq('id', tradeId)
				.select('id')
		: client
				.from('marketplace_trades')
				.update({
					validated_by_partner: true,
					current_offer: offre,
					updated_at: maintenant,
					...forge
				})
				.eq('id', tradeId)
				.select('id');
}

/** Comme startConfirmationPhase (store), avec l'heure envoyée au choix. */
async function demarrerConfirmation(client: Client, tradeId: string, heure: string) {
	return client
		.from('marketplace_trades')
		.update({ confirmation_started_at: heure, updated_at: new Date().toISOString() })
		.eq('id', tradeId)
		.select('id');
}

/** Comme refuseConfirmation (store). */
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

describe('statistiques de paquet et délai de confirmation', () => {
	let prof: Client;
	let profId: string;
	let a: Client;
	let aId: string;
	let b: Client;
	let bId: string;
	let ecoleId: string;
	/** Paquet personnel de B, une carte. */
	let paquetB: string;
	/** Copie de B d'un paquet du prof, assignée par le prof, une carte. */
	let copieB: string;
	/** Paquet personnel de A. */
	let paquetA: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const suffixe = crypto.randomUUID().slice(0, 8);

		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		ecoleId = await insert('schools', {
			name: `Lycée délai ${suffixe}`,
			city: 'T',
			country: 'France'
		});
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
		await insert('friendships', {
			requester_id: aId,
			addressee_id: bId,
			status: 'accepted',
			friendship_type: 'friend'
		});

		// Paquets posés hors API, comme le fait le serveur.
		paquetA = await insert('srs_decks', {
			owner_id: aId,
			name: `Paquet A ${suffixe}`,
			deck_type: 'personal'
		});
		paquetB = await insert('srs_decks', {
			owner_id: bId,
			name: `Paquet B ${suffixe}`,
			deck_type: 'personal'
		});
		const source = await insert('srs_decks', {
			owner_id: profId,
			name: `Source prof ${suffixe}`,
			deck_type: 'personal'
		});
		// Comme api/srs/decks/[id]/assign : copie is_assigned + assignation du prof.
		copieB = await insert('srs_decks', {
			owner_id: bId,
			name: `Source prof ${suffixe}`,
			deck_type: 'personal',
			is_assigned: true,
			source_deck_id: source
		});
		await insert('srs_deck_assignments', {
			source_deck_id: source,
			assigned_by: profId,
			assigned_to: bId,
			assignment_type: 'student'
		});
		for (const deck of [paquetB, copieB]) {
			await insert('srs_cards', {
				deck_id: deck,
				card_type: 'custom',
				front_content: 'recto',
				back_content: 'verso'
			});
		}

		prof = await clientFor(p.email);
		a = await clientFor(pa.email);
		b = await clientFor(pb.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('marketplace_trades').delete().in('initiator_id', [aId, bId]);
		await service.from('srs_deck_assignments').delete().eq('assigned_by', profId);
		await service.from('srs_decks').delete().in('owner_id', [aId, bId, profId]);
		await cleanupAllTestData();
		await service.from('schools').delete().eq('id', ecoleId);
	});

	// ── 1. get_deck_stats ────────────────────────────────────────────────────

	describe('get_deck_stats : le paquet doit être lisible', () => {
		it('un élève sur le paquet d’un autre est refusé (son compte en p_user_id)', async () => {
			for (const deck of [paquetB, copieB]) {
				const res = await stats(a, aId, deck);
				expect(res.error?.code, `paquet ${deck} accepté à A`).toBe(REFUS);
				expect(res.stats).toBeNull();
			}
		});

		it('un identifiant de paquet inexistant est refusé', async () => {
			expect((await stats(a, aId, INEXISTANT)).error?.code).toBe(REFUS);
		});

		it('le prof est refusé sur un paquet personnel d’élève qu’il n’a pas assigné', async () => {
			expect((await stats(prof, bId, paquetB)).error?.code).toBe(REFUS);
		});

		it('témoin : le propriétaire lit ses compteurs (valeurs)', async () => {
			for (const deck of [paquetB, copieB]) {
				const res = await stats(b, bId, deck);
				expect(res.error).toBeNull();
				expect(res.stats).toMatchObject({ total_cards: 1, new_count: 1 });
			}
			const vide = await stats(a, aId, paquetA);
			expect(vide.error).toBeNull();
			expect(vide.stats).toMatchObject({ total_cards: 0 });
		});

		it('témoin : le prof lit la copie de son élève (écran des assignations)', async () => {
			// La copie est d'abord visible par la policy SELECT, comme findAssignedDeckCopy.
			const { data: visible, error } = await prof.from('srs_decks').select('id').eq('id', copieB);
			expect(error).toBeNull();
			expect(visible).toHaveLength(1);

			const res = await stats(prof, bId, copieB);
			expect(res.error).toBeNull();
			expect(res.stats).toMatchObject({ total_cards: 1, new_count: 1 });
		});
	});

	// ── 2. confirmation_started_at ───────────────────────────────────────────

	describe('confirmation_started_at : posée par la base', () => {
		const offre = { from_initiator: { cards: [], gidouilles: 5 }, from_partner: VIDE };

		/** Échange A→B, validé des deux côtés : la phase de confirmation a commencé. */
		async function echangeValide(heureForgee?: string): Promise<string> {
			await donnerBiens(aId, [], 100);
			await donnerBiens(bId, [], 0);
			const id = await creerEchange(a, aId, bId);
			acceptee(await valider(a, id, 'initiator', offre));
			acceptee(await valider(b, id, 'partner', offre, heureForgee));
			return id;
		}

		it.each([
			['future', '2099-01-01T00:00:00.000Z'],
			['passée', '2000-01-01T00:00:00.000Z']
		])('une heure %s envoyée au début de la phase est remplacée par now()', async (_n, heure) => {
			const id = await echangeValide(heure);
			const ligne = await lireEchange(id);
			expect(ecartAMaintenant(ligne.confirmation_started_at)).toBeLessThan(TOLERANCE_MS);
		});

		it.each([
			['future', '2099-01-01T00:00:00.000Z'],
			['passée', '2000-01-01T00:00:00.000Z']
		])('une heure posée ne se modifie plus (heure %s envoyée)', async (_n, heure) => {
			const id = await echangeValide();
			const avant = (await lireEchange(id)).confirmation_started_at;
			expect(avant).not.toBeNull();

			// Écriture acceptée (le store ne doit pas échouer), valeur écrasée.
			for (const client of [a, b]) {
				acceptee(await demarrerConfirmation(client, id, heure));
				expect((await lireEchange(id)).confirmation_started_at).toBe(avant);
			}
		});

		it('la remise à NULL est permise (refus de confirmation)', async () => {
			const id = await echangeValide();
			acceptee(await refuserConfirmation(b, id));
			const ligne = await lireEchange(id);
			expect(ligne.confirmation_started_at).toBeNull();
			expect(ligne.validated_by_initiator).toBe(false);
			expect(ligne.validated_by_partner).toBe(false);
		});

		it('flux nominal : store + route /confirm, jusqu’à l’exécution', async () => {
			const id = await echangeValide();
			// startConfirmationPhase, côté de chaque élève, avec son heure locale.
			acceptee(await demarrerConfirmation(a, id, new Date().toISOString()));
			acceptee(await demarrerConfirmation(b, id, new Date().toISOString()));

			const premier = await appelerConfirm(a, aId, id);
			expect(premier.status).toBe(200);
			expect(premier.corps).toMatchObject({ confirmed: true, executed: false });

			const second = await appelerConfirm(b, bId, id);
			expect(second.status).toBe(200);
			expect(second.corps).toMatchObject({ executed: true });
			expect((await lireEchange(id)).status).toBe('completed');
		});

		it('flux nominal : expiration par /confirm, puis nouvelle phase à now()', async () => {
			const id = await echangeValide();
			// Six minutes écoulées : posé par le client service, hors garde.
			const ilYa6Min = new Date(Date.now() - 6 * 60_000).toISOString();
			const { error } = await service
				.from('marketplace_trades')
				.update({ confirmation_started_at: ilYa6Min })
				.eq('id', id);
			expect(error).toBeNull();

			const expire = await appelerConfirm(a, aId, id);
			expect(expire.status).toBe(410);
			const apres = await lireEchange(id);
			expect(apres.confirmation_started_at).toBeNull();
			expect(apres.validated_by_initiator).toBe(false);
			expect(apres.validated_by_partner).toBe(false);
			expect(apres.status).toBe('negotiating');

			// Revalidation : nouvelle phase, à l'heure de la base.
			acceptee(await valider(a, id, 'initiator', offre));
			acceptee(await valider(b, id, 'partner', offre));
			expect(ecartAMaintenant((await lireEchange(id)).confirmation_started_at)).toBeLessThan(
				TOLERANCE_MS
			);
		});
	});
});
