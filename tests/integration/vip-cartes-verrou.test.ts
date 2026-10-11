/**
 * Cartes VIP : attribution, défausse, verrous et journal réservés au serveur
 * ==========================================================================
 *
 * Migration `20261003150000_vip_cartes_verrou` (décisions Q131 à Q134, Q132 a),
 * sur une base qui a déjà `20261003140000_vip_rpc_compensation` (Q137 b).
 *
 * Ce que le fichier prouve, avec de VRAIS clients connectés :
 *   (a) un élève ne peut appeler ni `award_vip_card_no_cost` (2 surcharges), ni
 *       `discard_vip_cards`, ni `lock_cards`, ni `unlock_cards` — sur lui-même
 *       comme sur un autre élève ; l'état recompté par le client service est
 *       inchangé ;
 *   (b) personne (élève, prof, admin) ne modifie directement `vip_cards` ni
 *       `vip_cards_history` d'un profil ;
 *   (c) un élève n'insère pas dans `vip_cards_activity` ;
 *   (d) un élève n'appelle ni `run_weekly_rewards`, ni `run_daily_summaries`,
 *       ni `count_student_active_cards`, ni `resolve_card_instances` ;
 *   (e) témoins : le prof modifie toujours les gidouilles d'un élève, l'élève
 *       modifie son prénom, l'achat `purchase_vip_card` marche, et les routes
 *       exchange / choose attribuent et défaussent bien (client service).
 *
 * ⚠️ Un refus ne se mesure JAMAIS par l'échec d'une relecture : la RLS rend
 * zéro ligne sans erreur. On recompte avec le client service.
 *
 *   (f) Q137 (b) : si l'attribution échoue APRÈS la consommation de la carte
 *       d'action, l'élève retrouve sa carte d'action et ses cartes défaussées ;
 *   (g) refus des routes : rien ne bouge (inventaire, journal, verrous).
 *
 * Les cas (0), (a) à (d) et (f) ÉCHOUENT sur une base sans la migration (vérifié).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database, Json } from '$lib/types/database';

// Les routes appellent `createServiceRoleClient()` de `$lib` : on lui substitue
// le client service de la base LOCALE, jamais celui de l'environnement.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

// « Carte désactivée ENTRE la lecture de la route et l'attribution » : quand
// le drapeau est levé, la route lit le modèle comme activé alors que la base
// le sait désactivé. Seule la base peut alors refuser — après `use_vip_card`.
const lectureObsolete = vi.hoisted(() => ({ active: false }));
vi.mock('$lib/server/vip-card-queries', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/vip-card-queries')>();
	const activer = <T extends { is_enabled?: boolean | null }>(t: T): T =>
		lectureObsolete.active ? { ...t, is_enabled: true } : t;
	return {
		...original,
		getTemplateById: async (...args: Parameters<typeof original.getTemplateById>) => {
			const t = await original.getTemplateById(...args);
			return t ? activer(t) : t;
		},
		getTemplatesByIds: async (...args: Parameters<typeof original.getTemplatesByIds>) =>
			(await original.getTemplatesByIds(...args)).map(activer)
	};
});

import { POST as exchangePOST } from '../../src/routes/api/vip-cards/exchange/+server';
import { POST as choosePOST } from '../../src/routes/api/vip-cards/choose/+server';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const MARQUE = 'ZZ-vip-verrou';
const SUFFIXE = crypto.randomUUID().slice(0, 8);

/** Modèles de cartes du décor (slugs texte, comme en production). */
const T_COMMUNE = `zz-verrou-commune-${SUFFIXE}`;
const T_CIBLE = `zz-verrou-cible-${SUFFIXE}`;
const T_ALCHIMIE = `zz-verrou-alchimie-${SUFFIXE}`;
const T_CHOIX = `zz-verrou-choix-${SUFFIXE}`;
const T_CHOIX_LIBRE = `zz-verrou-choix-libre-${SUFFIXE}`;
const T_CHOIX_DOUBLE = `zz-verrou-choix-double-${SUFFIXE}`;
const T_TROC_FIXE = `zz-verrou-troc-fixe-${SUFFIXE}`;
const T_TROC_LIBRE = `zz-verrou-troc-libre-${SUFFIXE}`;
const T_DESACTIVEE = `zz-verrou-desactivee-${SUFFIXE}`;
const MODELES = [
	T_COMMUNE,
	T_CIBLE,
	T_ALCHIMIE,
	T_CHOIX,
	T_CHOIX_LIBRE,
	T_CHOIX_DOUBLE,
	T_TROC_FIXE,
	T_TROC_LIBRE,
	T_DESACTIVEE
];

/** Fonctions réservées au serveur, signatures exactes (relevées en prod). */
const FONCTIONS_SERVEUR = [
	'public.award_vip_card_no_cost(uuid,text)',
	'public.award_vip_card_no_cost(uuid,text,text,jsonb)',
	'public.discard_vip_cards(uuid,text[],jsonb)',
	'public.lock_cards(uuid,text[],uuid,text)',
	'public.unlock_cards(uuid)',
	'public.run_weekly_rewards()',
	'public.run_daily_summaries()',
	'public.count_student_active_cards(uuid,text,boolean)',
	'public.resolve_card_instances(text[])',
	'public.unlock_specific_cards(uuid,text[])',
	'public.grant_vip_cards_after_action(uuid,text,text[],text[],text,jsonb,jsonb)',
	'public.restore_vip_card_instance(uuid,text,jsonb,text)'
] as const;

/** Client de service : ensemencement et constats. */
const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

type Instance = {
	cardId: string;
	earnedAt: string;
	usedAt?: string | null;
	activationApprovedAt?: string;
};
type Inventaire = Record<string, Instance>;

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

/** Pose l'inventaire (et vide l'historique) par le client service. */
async function poserInventaire(id: string, cartes: Inventaire): Promise<void> {
	const { error } = await service
		.from('profiles')
		.update({ vip_cards: cartes as unknown as Json, vip_cards_history: {} })
		.eq('id', id);
	if (error) throw new Error(error.message);
}

async function lireProfil(id: string) {
	const { data, error } = await service
		.from('profiles')
		.select('vip_cards, vip_cards_history, gidouilles, firstname')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return {
		cartes: (data.vip_cards ?? {}) as unknown as Inventaire,
		historique: (data.vip_cards_history ?? {}) as Record<string, string>,
		gidouilles: Number(data.gidouilles),
		firstname: data.firstname
	};
}

async function compterActivite(studentId: string): Promise<number> {
	const { count, error } = await service
		.from('vip_cards_activity')
		.select('id', { count: 'exact', head: true })
		.eq('student_id', studentId);
	if (error) throw new Error(error.message);
	return count ?? 0;
}

/**
 * `lock_cards` exige une entité existante (annonce ou échange) : un trigger
 * refuse sinon. Sans annonce réelle, le refus mesuré ne serait pas celui des
 * droits.
 */
async function creerAnnonce(creatorId: string): Promise<string> {
	return insert('marketplace_listings', {
		creator_id: creatorId,
		school_id: ecoleId,
		listing_type: 'buy',
		wanted_gidouilles: 1,
		expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString()
	});
}

async function compterVerrous(studentId: string): Promise<number> {
	const { count, error } = await service
		.from('marketplace_locked_cards')
		.select('id', { count: 'exact', head: true })
		.eq('student_id', studentId);
	if (error) throw new Error(error.message);
	return count ?? 0;
}

/** Tout ce qu'un refus ne doit pas toucher, recompté par le client service. */
async function etat(studentId: string) {
	return {
		cartes: (await lireProfil(studentId)).cartes,
		activite: await compterActivite(studentId),
		verrous: await compterVerrous(studentId)
	};
}

async function verrouiller(studentId: string, instances: string[]): Promise<string> {
	const entite = await creerAnnonce(studentId);
	const { error } = await service.rpc('lock_cards', {
		p_student_id: studentId,
		p_card_ids: instances,
		p_entity_id: entite,
		p_lock_type: 'listing'
	});
	if (error) throw new Error(error.message);
	return entite;
}

const approuvee = () => ({ activationApprovedAt: new Date().toISOString() });

async function scalar(sql: string, params: unknown[]): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(sql, params);
	return rows[0].ok as boolean;
}

function buildLocals(client: SupabaseClient<Database>, userId: string): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		profile: null,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function buildRequest(url: string, body: unknown): Request {
	return new Request(`http://localhost${url}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

// ============================================================================
// DÉCOR
// ============================================================================

let eleveId: string;
let autreId: string;
let eleve: SupabaseClient<Database>;
let enseignant: SupabaseClient<Database>;
let admin: SupabaseClient<Database>;
let enseignantId: string;
let classeId: string;
let ecoleId: string;

beforeAll(async () => {
	await cleanupAllTestData();

	const profilEleve = await TestData.profile().withRole('student').create();
	const profilAutre = await TestData.profile().withRole('student').create();
	const profilProf = await TestData.profile().withRole('teacher').create();
	const profilAdmin = await TestData.profile().withRole('admin').create();
	eleveId = profilEleve.id;
	autreId = profilAutre.id;
	enseignantId = profilProf.id;

	const ecole = await insert('schools', {
		name: `Lycée ${MARQUE}`,
		city: 'Testville',
		country: 'France'
	});
	ecoleId = ecole;
	const annee = await insert('school_years', {
		school_id: ecole,
		name: `Année ${MARQUE}`,
		start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
		end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
		is_active: true
	});
	classeId = await insert('classes', {
		name: `2nde ${MARQUE}`,
		school_id: ecole,
		school_year_id: annee,
		join_code: 'ZZVV01',
		is_active: true
	});
	for (const studentId of [eleveId, autreId]) {
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classeId, student_id: studentId, status: 'active' });
		expect(error).toBeNull();
	}

	// Un insert multiple complète les clés absentes par NULL : chaque ligne porte
	// donc toutes les colonnes NOT NULL.
	const base = {
		description: 'pour le test',
		image_path: 'test/zz.png',
		category: 'bonus',
		base_price: 0,
		is_purchasable: false,
		action: null
	};
	const { error: modelesError } = await service.from('vip_card_templates').insert([
		{
			...base,
			id: T_COMMUNE,
			name: 'Commune ZZ',
			rarity: 'common',
			base_price: 5,
			is_purchasable: true
		},
		{ ...base, id: T_CIBLE, name: 'Cible ZZ', rarity: 'rare' },
		{
			...base,
			id: T_ALCHIMIE,
			name: 'Alchimie ZZ',
			rarity: 'rare',
			action: {
				type: 'exchange_cards',
				exchange: { mode: 'discard_for_specific', discardCount: 2, targetCardId: T_CIBLE }
			}
		},
		{
			...base,
			id: T_CHOIX,
			name: 'Choix ZZ',
			rarity: 'rare',
			action: { type: 'choose_card', count: 1, possibleCardIds: [T_CIBLE] }
		},
		{
			...base,
			id: T_CHOIX_LIBRE,
			name: 'Choix libre ZZ',
			rarity: 'rare',
			action: { type: 'choose_card', count: 1 }
		},
		{
			...base,
			id: T_CHOIX_DOUBLE,
			name: 'Choix double ZZ',
			rarity: 'rare',
			action: { type: 'choose_card', count: 2 }
		},
		{
			...base,
			id: T_TROC_FIXE,
			name: 'Troc fixe ZZ',
			rarity: 'rare',
			action: { type: 'exchange_cards', exchange: { mode: 'replace_random', count: 2 } }
		},
		{
			...base,
			id: T_TROC_LIBRE,
			name: 'Troc libre ZZ',
			rarity: 'rare',
			action: { type: 'exchange_cards', exchange: { mode: 'replace_random', maxCount: 2 } }
		},
		{ ...base, id: T_DESACTIVEE, name: 'Désactivée ZZ', rarity: 'common' }
	]);
	expect(modelesError).toBeNull();
	const { error: desactivationError } = await service
		.from('vip_card_templates')
		.update({ is_enabled: false })
		.eq('id', T_DESACTIVEE);
	expect(desactivationError).toBeNull();

	eleve = await clientFor(profilEleve.email);
	enseignant = await clientFor(profilProf.email);
	admin = await clientFor(profilAdmin.email);
}, 120_000);

afterAll(async () => {
	for (const id of [eleveId, autreId]) {
		await service.from('marketplace_locked_cards').delete().eq('student_id', id);
		await service.from('marketplace_listings').delete().eq('creator_id', id);
		await service.from('vip_cards_activity').delete().eq('student_id', id);
	}
	await service.from('vip_card_templates').delete().in('id', MODELES);
	await cleanupAllTestData();
});

// ============================================================================
// (0) Droits : les 9 signatures
// ============================================================================

describe('droits EXECUTE des fonctions réservées au serveur', () => {
	it.each(FONCTIONS_SERVEUR)('%s : ni authenticated, ni anon ; service_role oui', async (fn) => {
		expect(
			await scalar(`select has_function_privilege('authenticated', $1, 'EXECUTE') as ok`, [fn])
		).toBe(false);
		expect(await scalar(`select has_function_privilege('anon', $1, 'EXECUTE') as ok`, [fn])).toBe(
			false
		);
		expect(
			await scalar(`select has_function_privilege('service_role', $1, 'EXECUTE') as ok`, [fn])
		).toBe(true);
	});
});

// ============================================================================
// (a) Q131 : l'élève n'appelle pas les fonctions de cartes
// ============================================================================

describe('(a) un élève ne peut ni s’attribuer, ni défausser, ni verrouiller', () => {
	it.each([
		['lui-même', () => eleveId],
		['un autre élève', () => autreId]
	])(
		'award_vip_card_no_cost (4 arguments) sur %s : refusé, inventaire inchangé',
		async (_, cible) => {
			const id = cible();
			await poserInventaire(id, {});
			const { error } = await eleve.rpc(
				'award_vip_card_no_cost' as never,
				{
					p_student_id: id,
					p_card_id: T_CIBLE,
					p_source: 'exchange',
					p_extra_metadata: {}
				} as never
			);
			expect(error).not.toBeNull();
			expect(Object.keys((await lireProfil(id)).cartes)).toHaveLength(0);
		}
	);

	// La surcharge à 2 arguments n'est appelable par AUCUN chemin : avec deux
	// arguments (ou un), les deux surcharges conviennent grâce à leurs valeurs
	// par défaut, et Postgres répond 42725 (« function is not unique ») avant
	// même de vérifier le droit — en REST comme en SQL, avec ou sans migration.
	// Seul le contrôle de droit (bloc « droits EXECUTE ») la couvre.

	it.each([
		['lui-même', () => eleveId],
		['un autre élève', () => autreId]
	])('discard_vip_cards sur %s : refusé, cartes toujours inutilisées', async (_, cible) => {
		const id = cible();
		const inst = crypto.randomUUID();
		await poserInventaire(id, { [inst]: instance(T_COMMUNE) });
		const { error } = await eleve.rpc(
			'discard_vip_cards' as never,
			{
				p_student_id: id,
				p_instance_ids: [inst],
				p_metadata: {}
			} as never
		);
		expect(error).not.toBeNull();
		expect((await lireProfil(id)).cartes[inst].usedAt ?? null).toBeNull();
	});

	it.each([
		['lui-même', () => eleveId],
		['un autre élève', () => autreId]
	])('lock_cards sur %s : refusé, aucun verrou posé', async (_, cible) => {
		const id = cible();
		const inst = crypto.randomUUID();
		await poserInventaire(id, { [inst]: instance(T_COMMUNE) });
		await service.from('marketplace_locked_cards').delete().eq('student_id', id);
		const { error } = await eleve.rpc('lock_cards', {
			p_student_id: id,
			p_card_ids: [inst],
			p_entity_id: await creerAnnonce(id),
			p_lock_type: 'listing'
		});
		expect(error).not.toBeNull();
		expect(await compterVerrous(id)).toBe(0);
	});

	it('unlock_cards sur le verrou d’un autre élève : refusé, verrou toujours là', async () => {
		const inst = crypto.randomUUID();
		const entite = await creerAnnonce(autreId);
		await poserInventaire(autreId, { [inst]: instance(T_COMMUNE) });
		await service.from('marketplace_locked_cards').delete().eq('student_id', autreId);
		const { error: lockError } = await service.rpc('lock_cards', {
			p_student_id: autreId,
			p_card_ids: [inst],
			p_entity_id: entite,
			p_lock_type: 'listing'
		});
		expect(lockError).toBeNull();
		expect(await compterVerrous(autreId)).toBe(1);

		const { error } = await eleve.rpc('unlock_cards', { p_entity_id: entite });
		expect(error).not.toBeNull();
		expect(await compterVerrous(autreId)).toBe(1);

		await service.rpc('unlock_cards', { p_entity_id: entite });
	});

	it('unlock_specific_cards sur le verrou d’un autre élève : refusé, verrou toujours là', async () => {
		const inst = crypto.randomUUID();
		await poserInventaire(autreId, { [inst]: instance(T_COMMUNE) });
		await service.from('marketplace_locked_cards').delete().eq('student_id', autreId);
		const entite = await verrouiller(autreId, [inst]);
		expect(await compterVerrous(autreId)).toBe(1);

		const { error } = await eleve.rpc('unlock_specific_cards', {
			p_entity_id: entite,
			p_card_ids: [inst]
		});
		expect(error).not.toBeNull();
		expect(await compterVerrous(autreId)).toBe(1);

		await service.rpc('unlock_cards', { p_entity_id: entite });
	});

	it('grant_vip_cards_after_action et restore_vip_card_instance : refusées à l’élève', async () => {
		const inst = crypto.randomUUID();
		const usee = { ...instance(T_COMMUNE), usedAt: new Date().toISOString(), usesRemaining: 0 };
		await poserInventaire(eleveId, { [inst]: usee });
		const avant = await etat(eleveId);

		const { error: grantError } = await eleve.rpc(
			'grant_vip_cards_after_action' as never,
			{
				p_student_id: eleveId,
				p_action_instance_id: inst,
				p_discard_ids: [],
				p_award_card_ids: [T_CIBLE],
				p_source: 'choose'
			} as never
		);
		expect(grantError).not.toBeNull();

		const { error: restoreError } = await eleve.rpc(
			'restore_vip_card_instance' as never,
			{
				p_student_id: eleveId,
				p_instance_id: inst,
				p_snapshot: instance(T_COMMUNE),
				p_expected_used_at: usee.usedAt
			} as never
		);
		expect(restoreError).not.toBeNull();

		expect(await etat(eleveId)).toEqual(avant);
	});
});

// ============================================================================
// (b) Q132 a : personne n'écrit directement l'inventaire ni l'historique
// ============================================================================

describe('(b) vip_cards et vip_cards_history non modifiables directement', () => {
	const acteurs = [
		['l’élève, sur son propre profil', () => eleve],
		['le professeur, sur son élève', () => enseignant],
		['l’admin, sur un élève', () => admin]
	] as const;

	it.each(acteurs)('%s : vip_cards refusé (42501), cartes inchangées', async (_, acteur) => {
		const inst = crypto.randomUUID();
		await poserInventaire(eleveId, { [inst]: instance(T_COMMUNE) });
		const forge = { [crypto.randomUUID()]: instance(T_CIBLE) };
		const { error } = await acteur()
			.from('profiles')
			.update({ vip_cards: forge as unknown as Json })
			.eq('id', eleveId);
		expect(error?.code).toBe('42501');
		expect(Object.keys((await lireProfil(eleveId)).cartes)).toEqual([inst]);
	});

	it.each(acteurs)(
		'%s : vip_cards_history refusé (42501), historique inchangé',
		async (_, acteur) => {
			await poserInventaire(eleveId, {});
			const { error } = await acteur()
				.from('profiles')
				.update({ vip_cards_history: { [T_CIBLE]: new Date().toISOString() } })
				.eq('id', eleveId);
			expect(error?.code).toBe('42501');
			expect((await lireProfil(eleveId)).historique).toEqual({});
		}
	);
});

// ============================================================================
// (c) Q133 : le journal est écrit par le serveur
// ============================================================================

describe('(c) vip_cards_activity', () => {
	it('un élève ne peut pas insérer dans son propre journal', async () => {
		const avant = await compterActivite(eleveId);
		const { error } = await eleve.from('vip_cards_activity').insert({
			student_id: eleveId,
			card_instance_id: crypto.randomUUID(),
			card_template_id: T_CIBLE,
			action: 'gained',
			metadata: {}
		});
		expect(error).not.toBeNull();
		expect(await compterActivite(eleveId)).toBe(avant);
	});
});

// ============================================================================
// (d) Q134 : tâches planifiées et utilitaires réservés au serveur
// ============================================================================

describe('(d) fonctions planifiées et utilitaires', () => {
	it.each(['run_weekly_rewards', 'run_daily_summaries'])('%s : refusé à l’élève', async (fn) => {
		const { error } = await eleve.rpc(fn as never);
		expect(error).not.toBeNull();
		expect(error?.code).toBe('42501');
	});

	it('count_student_active_cards : refusé à l’élève (sur un autre élève)', async () => {
		const { error } = await eleve.rpc(
			'count_student_active_cards' as never,
			{
				p_student_id: autreId,
				p_card_id: T_COMMUNE,
				p_lock_row: false
			} as never
		);
		expect(error?.code).toBe('42501');
	});

	it('resolve_card_instances : refusé à l’élève', async () => {
		const { error } = await eleve.rpc('resolve_card_instances', {
			p_instance_ids: [crypto.randomUUID()]
		});
		expect(error?.code).toBe('42501');
	});
});

// ============================================================================
// (e) Témoins : ce qui doit continuer de marcher
// ============================================================================

describe('(e) témoins', () => {
	it('le professeur modifie toujours les gidouilles d’un élève (RPC)', async () => {
		const avant = (await lireProfil(eleveId)).gidouilles;
		const { error } = await enseignant.rpc('update_student_gidouilles', {
			p_student_id: eleveId,
			p_class_id: classeId,
			p_delta: 3,
			p_reason: MARQUE,
			p_created_by: enseignantId
		});
		expect(error).toBeNull();
		expect((await lireProfil(eleveId)).gidouilles).toBe(avant + 3);
	});

	it('l’élève modifie toujours son prénom : le garde ne bloque pas un autre champ', async () => {
		await poserInventaire(eleveId, { [crypto.randomUUID()]: instance(T_COMMUNE) });
		const { data, error } = await eleve
			.from('profiles')
			.update({ firstname: 'Prénom ZZ' })
			.eq('id', eleveId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((await lireProfil(eleveId)).firstname).toBe('Prénom ZZ');
	});

	it('l’achat purchase_vip_card par l’élève marche toujours', async () => {
		await poserInventaire(eleveId, {});
		await service.from('profiles').update({ gidouilles: 50 }).eq('id', eleveId);
		const { data, error } = await eleve.rpc('purchase_vip_card', {
			p_student_id: eleveId,
			p_card_id: T_COMMUNE
		});
		expect(error).toBeNull();
		expect((data as { success: boolean }).success).toBe(true);
		const apres = await lireProfil(eleveId);
		expect(Object.values(apres.cartes).map((c) => c.cardId)).toEqual([T_COMMUNE]);
		expect(apres.gidouilles).toBe(45);
		// L'historique est toujours tenu par le trigger, après le garde.
		expect(Object.keys(apres.historique)).toEqual([T_COMMUNE]);
	});

	it('route exchange (élève, carte approuvée) : défausse et attribue par le serveur', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		const d2 = crypto.randomUUID();
		await poserInventaire(eleveId, {
			[action]: instance(T_ALCHIMIE, { activationApprovedAt: new Date().toISOString() }),
			[d1]: instance(T_COMMUNE),
			[d2]: instance(T_COMMUNE)
		});

		const response = await exchangePOST({
			request: buildRequest('/api/vip-cards/exchange', {
				studentId: eleveId,
				mode: 'discard_for_specific',
				cardsToDiscard: [d1, d2],
				actionCardInstanceId: action,
				targetCardId: T_CIBLE
			}),
			locals: buildLocals(eleve, eleveId)
		} as never);
		expect(response.status).toBe(200);

		const { cartes } = await lireProfil(eleveId);
		expect(cartes[action].usedAt).toBeTruthy();
		expect(cartes[d1].usedAt).toBeTruthy();
		expect(cartes[d2].usedAt).toBeTruthy();
		const consommees: string[] = [action, d1, d2];
		const recues = Object.entries(cartes).filter(([id]) => !consommees.includes(id));
		expect(recues.map(([, c]) => c.cardId)).toEqual([T_CIBLE]);
	});

	it('route exchange : une cible autre que celle de la carte est refusée, rien ne bouge', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		const d2 = crypto.randomUUID();
		const inventaire = {
			[action]: instance(T_ALCHIMIE, { activationApprovedAt: new Date().toISOString() }),
			[d1]: instance(T_COMMUNE),
			[d2]: instance(T_COMMUNE)
		};
		await poserInventaire(eleveId, inventaire);

		await expect(
			exchangePOST({
				request: buildRequest('/api/vip-cards/exchange', {
					studentId: eleveId,
					mode: 'discard_for_specific',
					cardsToDiscard: [d1, d2],
					actionCardInstanceId: action,
					targetCardId: T_CHOIX
				}),
				locals: buildLocals(eleve, eleveId)
			} as never)
		).rejects.toMatchObject({ status: 400 });

		const { cartes } = await lireProfil(eleveId);
		expect(Object.keys(cartes).sort()).toEqual(Object.keys(inventaire).sort());
		expect(Object.values(cartes).every((c) => !c.usedAt)).toBe(true);
	});

	it('route exchange : un élève ne vise pas le compte d’un autre (403), rien ne bouge', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		const d2 = crypto.randomUUID();
		await poserInventaire(autreId, {
			[action]: instance(T_ALCHIMIE, { activationApprovedAt: new Date().toISOString() }),
			[d1]: instance(T_COMMUNE),
			[d2]: instance(T_COMMUNE)
		});

		await expect(
			exchangePOST({
				request: buildRequest('/api/vip-cards/exchange', {
					studentId: autreId,
					mode: 'discard_for_specific',
					cardsToDiscard: [d1, d2],
					actionCardInstanceId: action,
					targetCardId: T_CIBLE
				}),
				locals: buildLocals(eleve, eleveId)
			} as never)
		).rejects.toMatchObject({ status: 403 });

		expect(Object.keys((await lireProfil(autreId)).cartes)).toHaveLength(3);
	});

	it('route choose (professeur pour son élève) : attribue par le serveur', async () => {
		const action = crypto.randomUUID();
		await poserInventaire(eleveId, { [action]: instance(T_CHOIX) });

		const response = await choosePOST({
			request: buildRequest('/api/vip-cards/choose', {
				studentId: eleveId,
				actionCardInstanceId: action,
				chosenCardIds: [T_CIBLE]
			}),
			locals: buildLocals(enseignant, enseignantId)
		} as never);
		expect(response.status).toBe(200);

		const { cartes } = await lireProfil(eleveId);
		expect(cartes[action].usedAt).toBeTruthy();
		const recues = Object.entries(cartes).filter(([id]) => id !== action);
		expect(recues.map(([, c]) => c.cardId)).toEqual([T_CIBLE]);
	});
});

// ============================================================================
// (e bis) Témoins ajoutés : instances distinctes, nettoyage de lock_cards
// ============================================================================

describe('(e bis) témoins', () => {
	it('route choose : la même carte choisie deux fois donne deux instances réelles distinctes', async () => {
		const action = crypto.randomUUID();
		await poserInventaire(eleveId, { [action]: instance(T_CHOIX_DOUBLE) });

		const response = await choosePOST({
			request: buildRequest('/api/vip-cards/choose', {
				studentId: eleveId,
				actionCardInstanceId: action,
				chosenCardIds: [T_CIBLE, T_CIBLE]
			}),
			locals: buildLocals(enseignant, enseignantId)
		} as never);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { cardsReceived: { instanceId: string }[] };

		const { cartes } = await lireProfil(eleveId);
		const recues = Object.keys(cartes).filter((id) => id !== action);
		expect(recues).toHaveLength(2);
		expect(body.cardsReceived.map((c) => c.instanceId).sort()).toEqual(recues.sort());
	});

	// ⚠️ Témoin, pas preuve : le DELETE du bloc EXCEPTION de `lock_cards` est
	// toujours annulé par Postgres (l'exception relancée annule la transaction,
	// ou le point de sauvegarde de l'appelant qui l'intercepte). Ce test passe
	// donc avec ou sans le filtre `student_id` ajouté par la migration.
	it('lock_cards en échec ne retire pas le verrou d’un autre élève sur la même entité', async () => {
		const instAutre = crypto.randomUUID();
		const instEleve = crypto.randomUUID();
		await poserInventaire(autreId, { [instAutre]: instance(T_COMMUNE) });
		await poserInventaire(eleveId, { [instEleve]: instance(T_COMMUNE) });
		await service.from('marketplace_locked_cards').delete().in('student_id', [eleveId, autreId]);
		const entite = await verrouiller(autreId, [instAutre]);

		const { error } = await service.rpc('lock_cards', {
			p_student_id: eleveId,
			p_card_ids: [instEleve, crypto.randomUUID()],
			p_entity_id: entite,
			p_lock_type: 'listing'
		});
		expect(error).not.toBeNull();
		expect(await compterVerrous(autreId)).toBe(1);
		expect(await compterVerrous(eleveId)).toBe(0);

		await service.rpc('unlock_cards', { p_entity_id: entite });
	});
});

// ============================================================================
// (f) Q137 (b) : un échec après la consommation ne coûte rien
// ============================================================================

describe('(f) attribution en échec après use_vip_card : l’élève retrouve ses cartes', () => {
	async function desactiverCible(desactivee: boolean) {
		const { error } = await service
			.from('vip_card_templates')
			.update({ is_enabled: !desactivee })
			.eq('id', T_CIBLE);
		if (error) throw new Error(error.message);
		lectureObsolete.active = desactivee;
	}

	it('exchange : cible désactivée entre-temps → 409, carte d’action et défausses rendues', async () => {
		const action = crypto.randomUUID();
		const d1 = crypto.randomUUID();
		const d2 = crypto.randomUUID();
		const inventaire = {
			[action]: instance(T_ALCHIMIE, approuvee()),
			[d1]: instance(T_COMMUNE),
			[d2]: instance(T_COMMUNE)
		};
		await poserInventaire(eleveId, inventaire);

		await desactiverCible(true);
		try {
			await expect(
				exchangePOST({
					request: buildRequest('/api/vip-cards/exchange', {
						studentId: eleveId,
						mode: 'discard_for_specific',
						cardsToDiscard: [d1, d2],
						actionCardInstanceId: action,
						targetCardId: T_CIBLE
					}),
					locals: buildLocals(eleve, eleveId)
				} as never)
			).rejects.toMatchObject({ status: 409 });
		} finally {
			await desactiverCible(false);
		}

		// Même inventaire qu'avant, approbation comprise : rien n'est perdu.
		expect((await lireProfil(eleveId)).cartes).toEqual(inventaire);
	});

	it('choose : carte désactivée entre-temps → 409, carte d’action rendue, rien attribué', async () => {
		const action = crypto.randomUUID();
		const inventaire = { [action]: instance(T_CHOIX) };
		await poserInventaire(eleveId, inventaire);

		await desactiverCible(true);
		try {
			await expect(
				choosePOST({
					request: buildRequest('/api/vip-cards/choose', {
						studentId: eleveId,
						actionCardInstanceId: action,
						chosenCardIds: [T_CIBLE]
					}),
					locals: buildLocals(enseignant, enseignantId)
				} as never)
			).rejects.toMatchObject({ status: 409 });
		} finally {
			await desactiverCible(false);
		}

		expect((await lireProfil(eleveId)).cartes).toEqual(inventaire);
	});
});

// ============================================================================
// (g) Refus des routes : rien ne bouge
// ============================================================================

describe('(g) refus des routes : inventaire, journal et verrous inchangés', () => {
	async function refuseExchange(
		inventaire: Inventaire,
		corps: Record<string, unknown>,
		status: number,
		options: { prof?: boolean; avant?: () => Promise<void> } = {}
	) {
		await service.from('marketplace_locked_cards').delete().eq('student_id', eleveId);
		await poserInventaire(eleveId, inventaire);
		await options.avant?.();
		const avant = await etat(eleveId);
		await expect(
			exchangePOST({
				request: buildRequest('/api/vip-cards/exchange', { studentId: eleveId, ...corps }),
				locals: options.prof ? buildLocals(enseignant, enseignantId) : buildLocals(eleve, eleveId)
			} as never)
		).rejects.toMatchObject({ status });
		expect(await etat(eleveId)).toEqual(avant);
		await service.from('marketplace_locked_cards').delete().eq('student_id', eleveId);
	}

	async function refuseChoose(
		inventaire: Inventaire,
		corps: Record<string, unknown>,
		status: number,
		avantRequete?: () => Promise<void>
	) {
		await service.from('marketplace_locked_cards').delete().eq('student_id', eleveId);
		await poserInventaire(eleveId, inventaire);
		await avantRequete?.();
		const avant = await etat(eleveId);
		await expect(
			choosePOST({
				request: buildRequest('/api/vip-cards/choose', { studentId: eleveId, ...corps }),
				locals: buildLocals(enseignant, enseignantId)
			} as never)
		).rejects.toMatchObject({ status });
		expect(await etat(eleveId)).toEqual(avant);
		await service.from('marketplace_locked_cards').delete().eq('student_id', eleveId);
	}

	const A = crypto.randomUUID();
	const D1 = crypto.randomUUID();
	const D2 = crypto.randomUUID();
	const D3 = crypto.randomUUID();
	const communes = () => ({
		[D1]: instance(T_COMMUNE),
		[D2]: instance(T_COMMUNE),
		[D3]: instance(T_COMMUNE)
	});

	it('exchange : mode différent de celui de la carte', async () => {
		await refuseExchange(
			{ [A]: instance(T_ALCHIMIE, approuvee()), ...communes() },
			{ mode: 'replace_random', cardsToDiscard: [D1, D2], actionCardInstanceId: A },
			400
		);
	});

	it('exchange : nombre de défausses ≠ discardCount', async () => {
		await refuseExchange(
			{ [A]: instance(T_ALCHIMIE, approuvee()), ...communes() },
			{
				mode: 'discard_for_specific',
				cardsToDiscard: [D1],
				actionCardInstanceId: A,
				targetCardId: T_CIBLE
			},
			400
		);
	});

	it('exchange : nombre de défausses ≠ count', async () => {
		await refuseExchange(
			{ [A]: instance(T_TROC_FIXE, approuvee()), ...communes() },
			{ mode: 'replace_random', cardsToDiscard: [D1, D2, D3], actionCardInstanceId: A },
			400
		);
	});

	it('exchange : nombre de défausses > maxCount', async () => {
		await refuseExchange(
			{ [A]: instance(T_TROC_LIBRE, approuvee()), ...communes() },
			{ mode: 'replace_random', cardsToDiscard: [D1, D2, D3], actionCardInstanceId: A },
			400
		);
	});

	it('exchange : la même carte défaussée deux fois', async () => {
		await refuseExchange(
			{ [A]: instance(T_ALCHIMIE, approuvee()), ...communes() },
			{
				mode: 'discard_for_specific',
				cardsToDiscard: [D1, D1],
				actionCardInstanceId: A,
				targetCardId: T_CIBLE
			},
			400
		);
	});

	it('exchange : la carte d’action parmi les défausses', async () => {
		await refuseExchange(
			{ [A]: instance(T_ALCHIMIE, approuvee()), ...communes() },
			{
				mode: 'discard_for_specific',
				cardsToDiscard: [A, D1],
				actionCardInstanceId: A,
				targetCardId: T_CIBLE
			},
			400
		);
	});

	it('exchange (professeur) : une défausse engagée sur le marché', async () => {
		await refuseExchange(
			{ [A]: instance(T_ALCHIMIE), ...communes() },
			{
				mode: 'discard_for_specific',
				cardsToDiscard: [D1, D2],
				actionCardInstanceId: A,
				targetCardId: T_CIBLE
			},
			400,
			{
				prof: true,
				avant: async () => {
					await verrouiller(eleveId, [D1]);
				}
			}
		);
	});

	it('exchange : une carte sans action exchange_cards', async () => {
		await refuseExchange(
			{ [A]: instance(T_COMMUNE, approuvee()), ...communes() },
			{ mode: 'replace_random', cardsToDiscard: [D1, D2], actionCardInstanceId: A },
			400
		);
	});

	it('exchange : une cible désactivée (Q138)', async () => {
		await service
			.from('vip_card_templates')
			.update({
				action: {
					type: 'exchange_cards',
					exchange: { mode: 'discard_for_specific', discardCount: 2, targetCardId: T_DESACTIVEE }
				}
			})
			.eq('id', T_TROC_FIXE);
		try {
			await refuseExchange(
				{ [A]: instance(T_TROC_FIXE, approuvee()), ...communes() },
				{
					mode: 'discard_for_specific',
					cardsToDiscard: [D1, D2],
					actionCardInstanceId: A,
					targetCardId: T_DESACTIVEE
				},
				400
			);
		} finally {
			await service
				.from('vip_card_templates')
				.update({
					action: { type: 'exchange_cards', exchange: { mode: 'replace_random', count: 2 } }
				})
				.eq('id', T_TROC_FIXE);
		}
	});

	it('choose : une carte désactivée', async () => {
		await refuseChoose(
			{ [A]: instance(T_CHOIX_LIBRE) },
			{ actionCardInstanceId: A, chosenCardIds: [T_DESACTIVEE] },
			400
		);
	});

	it('choose : une carte inconnue', async () => {
		await refuseChoose(
			{ [A]: instance(T_CHOIX_LIBRE) },
			{ actionCardInstanceId: A, chosenCardIds: [`zz-inconnue-${SUFFIXE}`] },
			404
		);
	});

	it('choose (professeur) : une carte d’action engagée sur le marché', async () => {
		await refuseChoose(
			{ [A]: instance(T_CHOIX_LIBRE) },
			{ actionCardInstanceId: A, chosenCardIds: [T_CIBLE] },
			400,
			async () => {
				await verrouiller(eleveId, [A]);
			}
		);
	});
});
