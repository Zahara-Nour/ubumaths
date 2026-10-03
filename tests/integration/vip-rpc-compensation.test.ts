/**
 * Cartes VIP : fonctions de compensation, serveur seul
 * =====================================================
 *
 * Migration `20261003140000_vip_rpc_compensation` (décision Q137 b).
 *
 * Ce que le fichier prouve :
 *   (0) droits : ni authenticated ni anon n'exécutent les deux fonctions ; un
 *       élève connecté qui les appelle est refusé, rien ne bouge ;
 *   (a) `grant_vip_cards_after_action` : défausse + attribution en une
 *       transaction, TOUT OU RIEN — refus (et rien ne bouge) si une défausse ou
 *       la carte d'action est engagée sur le marché, ou si une cible est
 *       désactivée ;
 *   (b) `restore_vip_card_instance` : rend la carte d'action si elle est
 *       EXACTEMENT dans l'état laissé par `use_vip_card`, et refuse sinon
 *       (défausse concurrente d'une carte à plusieurs usages).
 *
 * ⚠️ Un refus ne se mesure pas par l'échec d'une relecture : on recompte avec
 * le client service (inventaire, journal, verrous).
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database, Json } from '$lib/types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const MARQUE = 'ZZ-vip-compensation';
const SUFFIXE = crypto.randomUUID().slice(0, 8);

const T_COMMUNE = `zz-compens-commune-${SUFFIXE}`;
const T_CIBLE = `zz-compens-cible-${SUFFIXE}`;
const T_DOUBLE = `zz-compens-double-${SUFFIXE}`;
const T_DESACTIVEE = `zz-compens-desactivee-${SUFFIXE}`;
const MODELES = [T_COMMUNE, T_CIBLE, T_DOUBLE, T_DESACTIVEE];

const GRANT = 'public.grant_vip_cards_after_action(uuid,text,text[],text[],text,jsonb,jsonb)';
const RESTORE = 'public.restore_vip_card_instance(uuid,text,jsonb,text)';

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

type Instance = {
	cardId: string;
	earnedAt: string;
	usedAt?: string | null;
	usesRemaining?: number;
};
type Inventaire = Record<string, Instance>;
type RpcResult = { data: unknown; error: { message: string } | null };

/** Les deux fonctions n'existent dans `database.ts` qu'après `db:types`. */
function rpc(
	client: SupabaseClient<Database>,
	fn: string,
	args: Record<string, unknown>
): PromiseLike<RpcResult> {
	return client.rpc(fn as never, args as never) as unknown as PromiseLike<RpcResult>;
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
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

function instance(cardId: string, extra: Partial<Instance> = {}): Instance {
	return { cardId, earnedAt: new Date().toISOString(), usedAt: null, ...extra };
}

async function poserInventaire(id: string, cartes: Inventaire): Promise<void> {
	await service.from('marketplace_locked_cards').delete().eq('student_id', id);
	const { error } = await service
		.from('profiles')
		.update({ vip_cards: cartes as unknown as Json, vip_cards_history: {} })
		.eq('id', id);
	if (error) throw new Error(error.message);
}

async function lireCartes(id: string): Promise<Inventaire> {
	const { data, error } = await service.from('profiles').select('vip_cards').eq('id', id).single();
	if (error) throw new Error(error.message);
	return (data.vip_cards ?? {}) as unknown as Inventaire;
}

async function compter(table: 'vip_cards_activity' | 'marketplace_locked_cards', id: string) {
	const { count, error } = await service
		.from(table)
		.select('id', { count: 'exact', head: true })
		.eq('student_id', id);
	if (error) throw new Error(error.message);
	return count ?? 0;
}

/** Tout ce qu'un refus ne doit pas toucher, recompté par le client service. */
async function etat(id: string) {
	return {
		cartes: await lireCartes(id),
		activite: await compter('vip_cards_activity', id),
		verrous: await compter('marketplace_locked_cards', id)
	};
}

/** `lock_cards` exige une entité réelle (trigger) : une annonce. */
async function verrouiller(studentId: string, instances: string[]): Promise<void> {
	const entite = await insert('marketplace_listings', {
		creator_id: studentId,
		school_id: ecoleId,
		listing_type: 'buy',
		wanted_gidouilles: 1,
		expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
	});
	const { error } = await service.rpc('lock_cards', {
		p_student_id: studentId,
		p_card_ids: instances,
		p_entity_id: entite,
		p_lock_type: 'listing'
	});
	if (error) throw new Error(error.message);
}

async function privilege(role: string, fn: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(`select has_function_privilege($1, $2, 'EXECUTE') as ok`, [
		role,
		fn
	]);
	return rows[0].ok as boolean;
}

/** Consomme une carte comme la route : `use_vip_card` avec le client de l'élève. */
async function utiliser(instanceId: string): Promise<{ usedAt: string | null }> {
	const { data, error } = await eleve.rpc('use_vip_card', {
		p_student_id: eleveId,
		p_instance_id: instanceId
	});
	if (error) throw new Error(error.message);
	const result = data as { success: boolean; error?: string; usedAt?: string | null };
	if (!result.success) throw new Error(result.error);
	return { usedAt: result.usedAt ?? null };
}

function grant(args: {
	action: string;
	discard: string[];
	award: Array<string | null>;
}): PromiseLike<RpcResult> {
	return rpc(service, 'grant_vip_cards_after_action', {
		p_student_id: eleveId,
		p_action_instance_id: args.action,
		p_discard_ids: args.discard,
		p_award_card_ids: args.award,
		p_source: 'exchange'
	});
}

// ============================================================================
// DÉCOR
// ============================================================================

let eleveId: string;
let eleve: SupabaseClient<Database>;
let ecoleId: string;

beforeAll(async () => {
	await cleanupAllTestData();

	const profilEleve = await TestData.profile().withRole('student').create();
	eleveId = profilEleve.id;
	ecoleId = await insert('schools', {
		name: `Lycée ${MARQUE}`,
		city: 'Testville',
		country: 'France'
	});

	const base = {
		description: 'pour le test',
		image_path: 'test/zz.png',
		category: 'bonus',
		rarity: 'common',
		base_price: 0,
		is_purchasable: false,
		action: null,
		uses_total: 1
	};
	const { error: modelesError } = await service.from('vip_card_templates').insert([
		{ ...base, id: T_COMMUNE, name: 'Commune ZZ' },
		{ ...base, id: T_CIBLE, name: 'Cible ZZ' },
		{ ...base, id: T_DOUBLE, name: 'Double usage ZZ', uses_total: 2 },
		{ ...base, id: T_DESACTIVEE, name: 'Désactivée ZZ' }
	]);
	expect(modelesError).toBeNull();
	const { error: desactivationError } = await service
		.from('vip_card_templates')
		.update({ is_enabled: false })
		.eq('id', T_DESACTIVEE);
	expect(desactivationError).toBeNull();

	eleve = await clientFor(profilEleve.email);
}, 120_000);

afterAll(async () => {
	await service.from('marketplace_locked_cards').delete().eq('student_id', eleveId);
	await service.from('marketplace_listings').delete().eq('creator_id', eleveId);
	await service.from('vip_cards_activity').delete().eq('student_id', eleveId);
	await service.from('vip_card_templates').delete().in('id', MODELES);
	await service.from('schools').delete().eq('id', ecoleId);
	await cleanupAllTestData();
});

// ============================================================================
// (0) Droits
// ============================================================================

describe('(0) droits EXECUTE : serveur seul', () => {
	it.each([GRANT, RESTORE])('%s : ni authenticated, ni anon ; service_role oui', async (fn) => {
		expect(await privilege('authenticated', fn)).toBe(false);
		expect(await privilege('anon', fn)).toBe(false);
		expect(await privilege('service_role', fn)).toBe(true);
	});

	it('un élève connecté qui les appelle est refusé, rien ne bouge', async () => {
		const action = crypto.randomUUID();
		const usee = instance(T_COMMUNE, { usedAt: new Date().toISOString(), usesRemaining: 0 });
		await poserInventaire(eleveId, { [action]: usee });
		const avant = await etat(eleveId);

		const { error: grantError } = await rpc(eleve, 'grant_vip_cards_after_action', {
			p_student_id: eleveId,
			p_action_instance_id: action,
			p_discard_ids: [],
			p_award_card_ids: [T_CIBLE],
			p_source: 'choose'
		});
		expect(grantError?.message).toMatch(/permission denied/);

		const { error: restoreError } = await rpc(eleve, 'restore_vip_card_instance', {
			p_student_id: eleveId,
			p_instance_id: action,
			p_snapshot: instance(T_COMMUNE),
			p_expected_used_at: usee.usedAt
		});
		expect(restoreError?.message).toMatch(/permission denied/);

		expect(await etat(eleveId)).toEqual(avant);
	});
});

// ============================================================================
// (a) grant_vip_cards_after_action : tout ou rien
// ============================================================================

describe('(a) grant_vip_cards_after_action', () => {
	it('nominal : défausse les cartes et attribue cible + tirage au hasard', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		const d2 = crypto.randomUUID();
		await poserInventaire(eleveId, {
			[action]: instance(T_COMMUNE),
			[d1]: instance(T_COMMUNE),
			[d2]: instance(T_COMMUNE)
		});

		const { data, error } = await grant({ action, discard: [d1, d2], award: [T_CIBLE, null] });
		expect(error).toBeNull();
		const awarded = (data as { awarded: Array<{ card_id: string; instance_id: string }> }).awarded;
		expect(awarded).toHaveLength(2);
		expect(awarded[0].card_id).toBe(T_CIBLE);

		const cartes = await lireCartes(eleveId);
		expect(cartes[d1].usedAt).toBeTruthy();
		expect(cartes[d2].usedAt).toBeTruthy();
		expect(cartes[awarded[0].instance_id].cardId).toBe(T_CIBLE);
		expect(cartes[awarded[1].instance_id].cardId).toBe(awarded[1].card_id);
		expect(Object.keys(cartes)).toHaveLength(5);
	});

	it('tout ou rien : une cible désactivée annule la défausse et la 1re attribution', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		await poserInventaire(eleveId, {
			[action]: instance(T_COMMUNE),
			[d1]: instance(T_COMMUNE)
		});
		const avant = await etat(eleveId);

		const { error } = await grant({ action, discard: [d1], award: [T_CIBLE, T_DESACTIVEE] });
		expect(error?.message).toMatch(/Carte indisponible/);
		expect(await etat(eleveId)).toEqual(avant);
	});

	it('refus : une carte à défausser engagée sur le marché', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		await poserInventaire(eleveId, {
			[action]: instance(T_COMMUNE),
			[d1]: instance(T_COMMUNE)
		});
		await verrouiller(eleveId, [d1]);
		const avant = await etat(eleveId);

		const { error } = await grant({ action, discard: [d1], award: [T_CIBLE] });
		expect(error?.message).toMatch(/défausser est engagée sur le marché/);
		expect(await etat(eleveId)).toEqual(avant);
	});

	it('refus : la carte d’action engagée sur le marché', async () => {
		const action = crypto.randomUUID();
		await poserInventaire(eleveId, { [action]: instance(T_COMMUNE) });
		await verrouiller(eleveId, [action]);
		const avant = await etat(eleveId);

		const { error } = await grant({ action, discard: [], award: [T_CIBLE] });
		expect(error?.message).toMatch(/carte d'action est engagée sur le marché/);
		expect(await etat(eleveId)).toEqual(avant);
	});
});

// ============================================================================
// (b) restore_vip_card_instance
// ============================================================================

describe('(b) restore_vip_card_instance', () => {
	it('nominal (un usage) : la carte consommée retrouve son état d’avant', async () => {
		const action = crypto.randomUUID();
		const inventaire = { [action]: instance(T_COMMUNE) };
		await poserInventaire(eleveId, inventaire);

		const { usedAt } = await utiliser(action);
		expect(usedAt).toBeTruthy();

		const { data, error } = await rpc(service, 'restore_vip_card_instance', {
			p_student_id: eleveId,
			p_instance_id: action,
			p_snapshot: inventaire[action],
			p_expected_used_at: usedAt
		});
		expect(error).toBeNull();
		expect(data).toBe(true);
		expect(await lireCartes(eleveId)).toEqual(inventaire);
	});

	it('nominal (deux usages) : un usage consommé est rendu', async () => {
		const action = crypto.randomUUID();
		const inventaire = { [action]: instance(T_DOUBLE, { usesRemaining: 2 }) };
		await poserInventaire(eleveId, inventaire);

		const { usedAt } = await utiliser(action);
		expect(usedAt).toBeNull();

		const { data, error } = await rpc(service, 'restore_vip_card_instance', {
			p_student_id: eleveId,
			p_instance_id: action,
			p_snapshot: inventaire[action],
			p_expected_used_at: usedAt
		});
		expect(error).toBeNull();
		expect(data).toBe(true);
		expect(await lireCartes(eleveId)).toEqual(inventaire);
	});

	it('refus : carte à 2 usages consommée par A, défaussée par B, A restaure → carte inchangée', async () => {
		const action = crypto.randomUUID();
		const inventaire = { [action]: instance(T_DOUBLE, { usesRemaining: 2 }) };
		await poserInventaire(eleveId, inventaire);

		// A consomme un usage : usesRemaining 2 → 1, usedAt reste NULL.
		const { usedAt } = await utiliser(action);
		expect(usedAt).toBeNull();

		// B défausse la même carte : usedAt rempli, usesRemaining toujours 1.
		const { data: defausse, error: defausseError } = await service.rpc('discard_vip_cards', {
			p_student_id: eleveId,
			p_instance_ids: [action]
		});
		expect(defausseError).toBeNull();
		expect((defausse as { discarded_count: number }).discarded_count).toBe(1);
		const apresDefausse = await lireCartes(eleveId);
		expect(apresDefausse[action].usedAt).toBeTruthy();
		expect(apresDefausse[action].usesRemaining).toBe(1);

		// A restaure : la défausse de B ne doit pas être effacée.
		const { data, error } = await rpc(service, 'restore_vip_card_instance', {
			p_student_id: eleveId,
			p_instance_id: action,
			p_snapshot: inventaire[action],
			p_expected_used_at: usedAt
		});
		expect(error).toBeNull();
		expect(data).toBe(false);
		expect(await lireCartes(eleveId)).toEqual(apresDefausse);
	});
});
