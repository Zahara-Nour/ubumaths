/**
 * Succès : gidouilles versées, succès rejoué ignoré, copie d'un modèle
 * ===================================================================
 *
 * Migration `20261003200000_succes_gidouilles_copie_modele.sql`.
 *
 * Q146 (a) : les gidouilles annoncées par un succès sont VERSÉES par le
 * serveur, dans la transaction qui enregistre le succès, avec une trace
 * `gidouilles_activity` (→ `reward_events`) comme les autres gains.
 * Q153 : un second événement identique ne plante plus sur l'index unique ;
 * le succès déjà obtenu est ignoré, sans second versement.
 * Q154 (a) : `duplicate_template` crée un modèle PERSONNEL (scope 'class',
 * sans classe) au lieu d'échouer sur `message_templates_check`.
 *
 * Chaque affirmation est relue AU CLIENT SERVICE (la RLS échoue en silence).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// Le client service des modules serveur lit process.env (qui peut viser la prod
// via .env) : on le branche explicitement sur la base LOCALE de test.
vi.mock('$lib/server/serviceRoleClient', async () => {
	const helpers = await import('../helpers/database/trigger-test-helpers');
	return { createServiceRoleClient: helpers.createServiceRoleClient };
});

import { processEvent } from '$lib/server/achievements/service';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

/** Code Postgres d'un refus (garde `RAISE … 42501` ou EXECUTE retiré). */
const REFUS = '42501';

/** Succès à gidouilles : déverrouillé par `sg_evenement_gid`. */
const SUCCES_GID = 'sg_test_succes_gid';
const EVENEMENT_GID = 'sg_evenement_gid';
const MONTANT = 7;
/** Succès sans gidouilles : déverrouillé par `sg_evenement_sans`. */
const SUCCES_SANS = 'sg_test_succes_sans';
const EVENEMENT_SANS = 'sg_evenement_sans';

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

async function rpc(
	client: SupabaseClient<Database>,
	name: string,
	args: Record<string, unknown> = {}
): Promise<RpcResult> {
	return (await client.rpc(name as never, args as never)) as unknown as RpcResult;
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

/** Solde réel, relu au client service. */
async function solde(studentId: string): Promise<number> {
	const { data, error } = await service
		.from('profiles')
		.select('gidouilles')
		.eq('id', studentId)
		.single();
	expect(error).toBeNull();
	return Number(data?.gidouilles ?? 0);
}

type Activite = { delta: number; reason: string | null; class_id: string | null };

async function activites(studentId: string): Promise<Activite[]> {
	const { data, error } = await service
		.from('gidouilles_activity')
		.select('delta, reason, class_id')
		.eq('student_id', studentId);
	expect(error).toBeNull();
	return (data ?? []).map((r) => ({ ...r, delta: Number(r.delta) }));
}

async function compteSucces(studentId: string, achievementId: string): Promise<number> {
	const { count, error } = await service
		.from('student_achievements')
		.select('*', { count: 'exact', head: true })
		.eq('student_id', studentId)
		.eq('achievement_id', achievementId);
	expect(error).toBeNull();
	return count ?? 0;
}

describe('Succès : gidouilles versées une seule fois (Q146, Q153)', () => {
	let eleve: SupabaseClient<Database>;
	let eleveId: string;
	let classe: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await service.from('achievements').delete().in('id', [SUCCES_GID, SUCCES_SANS]);

		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;
		// La création d'une classe ouvre sa conversation au nom du prof unique.
		await TestData.profile().withRole('teacher').create();

		classe = await insert('classes', {
			name: 'Classe succès gidouilles',
			join_code: `SG${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
			grade: '2'
		});
		const { error: membreError } = await service
			.from('class_members')
			.insert({ class_id: classe, student_id: eleveId, status: 'active' });
		expect(membreError).toBeNull();

		const succes = (id: string, type: string, name: string, metadata: Record<string, unknown>) => ({
			id,
			context: 'meta',
			category: 'special',
			name,
			description: 'Succès de test',
			icon: '🧪',
			unlock_type: 'event_based',
			metadata: { unlock_conditions: { type }, ...metadata },
			is_active: true,
			display_order: 9999
		});
		const { error: succesError } = await service.from('achievements').insert([
			succes(SUCCES_GID, EVENEMENT_GID, 'Succès à gidouilles', {
				points: 1,
				gidouilles_reward: MONTANT
			}),
			succes(SUCCES_SANS, EVENEMENT_SANS, 'Succès sans gidouilles', { points: 1 })
		]);
		expect(succesError).toBeNull();

		eleve = await clientFor(e.email);
	}, 120_000);

	afterAll(async () => {
		await service.from('student_achievements').delete().eq('student_id', eleveId);
		await service.from('achievement_events').delete().eq('student_id', eleveId);
		await service.from('reward_events').delete().eq('student_id', eleveId);
		await service.from('gidouilles_activity').delete().eq('student_id', eleveId);
		await service.from('achievements').delete().in('id', [SUCCES_GID, SUCCES_SANS]);
		await service.from('class_members').delete().eq('class_id', classe);
		await service.from('classes').delete().eq('id', classe);
		await cleanupAllTestData();
	});

	it('Q146 : un succès à N gidouilles crédite le profil de N, avec une trace', async () => {
		const avant = await solde(eleveId);

		const res = await processEvent(EVENEMENT_GID, eleveId, { reference_id: 'sg-1' });

		expect(res.count).toBe(1);
		expect(res.unlockedAchievements[0]?.gidouilles).toBe(MONTANT);
		expect(await solde(eleveId)).toBe(avant + MONTANT);

		// Une trace, comme les autres gains : gidouilles_activity → reward_events.
		expect(await activites(eleveId)).toEqual([
			{ delta: MONTANT, reason: 'Succès : Succès à gidouilles', class_id: classe }
		]);
		const { data: journal, error } = await service
			.from('reward_events')
			.select('event_type, amount, source_table')
			.eq('student_id', eleveId)
			.eq('reward_type', 'gidouilles');
		expect(error).toBeNull();
		expect(journal).toEqual([
			{ event_type: 'earned', amount: MONTANT, source_table: 'gidouilles_activity' }
		]);
	});

	it('Q153 : le même événement rejoué ne plante pas et ne verse rien de plus', async () => {
		const avant = await solde(eleveId);

		const res = await processEvent(EVENEMENT_GID, eleveId, { reference_id: 'sg-2' });

		expect(res.count).toBe(0);
		expect(await solde(eleveId)).toBe(avant);
		expect(await compteSucces(eleveId, SUCCES_GID)).toBe(1);
		expect((await activites(eleveId)).length).toBe(1);
	});

	it('un succès sans gidouilles laisse le solde inchangé, sans trace', async () => {
		const avant = await solde(eleveId);

		const res = await processEvent(EVENEMENT_SANS, eleveId, { reference_id: 'sg-3' });

		expect(res.count).toBe(1);
		expect(await compteSucces(eleveId, SUCCES_SANS)).toBe(1);
		expect(await solde(eleveId)).toBe(avant);
		expect((await activites(eleveId)).length).toBe(1);
	});

	it('un élève ne peut toujours pas appeler process_achievement_event', async () => {
		const avant = await solde(eleveId);
		await service.from('student_achievements').delete().eq('student_id', eleveId);

		const { error } = await rpc(eleve, 'process_achievement_event', {
			p_event_type: EVENEMENT_GID,
			p_student_id: eleveId,
			p_event_data: {}
		});

		expect(error?.code).toBe(REFUS);
		expect(await compteSucces(eleveId, SUCCES_GID)).toBe(0);
		expect(await solde(eleveId)).toBe(avant);
	});
});

describe('duplicate_template : la copie est un modèle personnel (Q154)', () => {
	let prof: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let profId: string;
	let eleveId: string;
	let modele: string;
	const modelesCrees: string[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();
		const p = await TestData.profile().withRole('teacher').create();
		profId = p.id;
		const e = await TestData.profile().withRole('student').create();
		eleveId = e.id;

		modele = await insert('message_templates', {
			title: 'Modèle succès-gidouilles',
			subject_template: 'Sujet',
			body_template: 'Corps',
			trigger_type: 'general',
			scope: 'system',
			created_by: profId
		});
		modelesCrees.push(modele);

		prof = await clientFor(p.email);
		eleve = await clientFor(e.email);
	}, 120_000);

	afterAll(async () => {
		const { data } = await service
			.from('message_templates')
			.select('id')
			.like('title', 'SG copie%');
		for (const r of data ?? []) modelesCrees.push(r.id);
		// ⚠️ Échoue aujourd'hui (prod comprise) : le trigger AFTER DELETE
		// auto_log_template_changes journalise le modèle supprimé dans
		// template_audit_log, dont la FK template_id refuse alors la ligne. Défaut
		// hors de ce lot ; le nettoyage reprendra seul une fois corrigé.
		await service.from('message_templates').delete().in('id', modelesCrees);
		await service.from('template_audit_log').delete().in('performed_by', [profId, eleveId]);
		await cleanupAllTestData();
	});

	it('le prof duplique : un modèle personnel, sans classe, à son nom', async () => {
		const { data, error } = await rpc(prof, 'duplicate_template', {
			p_template_id: modele,
			p_user_id: profId,
			p_new_title: 'SG copie prof'
		});
		expect(error).toBeNull();
		const copie = data as string;
		modelesCrees.push(copie);

		const { data: ligne, error: lectureError } = await service
			.from('message_templates')
			.select('title, scope, class_id, created_by')
			.eq('id', copie)
			.single();
		expect(lectureError).toBeNull();
		expect(ligne).toEqual({
			title: 'SG copie prof',
			scope: 'class',
			class_id: null,
			created_by: profId
		});

		// Le prof la voit (RLS), l'élève non.
		const { data: vueProf } = await prof.from('message_templates').select('id').eq('id', copie);
		expect(vueProf).toHaveLength(1);
		const { data: vueEleve } = await eleve.from('message_templates').select('id').eq('id', copie);
		expect(vueEleve).toHaveLength(0);
	});

	it("l'élève est refusé et aucun modèle n'est créé", async () => {
		const { error } = await rpc(eleve, 'duplicate_template', {
			p_template_id: modele,
			p_user_id: eleveId,
			p_new_title: 'SG copie élève'
		});
		expect(error?.code).toBe(REFUS);
		const { count } = await service
			.from('message_templates')
			.select('*', { count: 'exact', head: true })
			.eq('title', 'SG copie élève');
		expect(count).toBe(0);
	});
});
