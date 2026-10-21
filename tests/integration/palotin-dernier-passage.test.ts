/**
 * Palotin triste : jour du dernier passage, lisible par le serveur seul
 * ======================================================================
 *
 * Migration 20261021210000. Question d'accès tranchée par David le 2026-10-21
 * (option B) : le jour du dernier passage de l'élève n'est lisible par PERSONNE
 * d'autre que le serveur (client service). Le serveur n'en transmet que
 * « triste oui/non ».
 *
 * Ce que le fichier prouve :
 *   1. `record_student_visit` rend NULL au premier passage, le jour précédent
 *      ensuite, et enregistre le jour même ;
 *   2. deux passages simultanés le même jour ne rendent l'ancien jour qu'une fois ;
 *   3. le jour enregistré ne recule jamais ;
 *   4. ni l'élève (même sur sa ligne), ni le prof, ni l'admin, ni anon ne lisent,
 *      n'écrivent la table ou n'appellent la fonction ;
 *   5. la ligne part avec le profil (suppression de compte).
 *
 * Client non typé : la table et la fonction ne sont pas encore dans `database.ts`
 * (généré depuis la prod, après `db:migrate`).
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

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PERMISSION_DENIED = '42501';
const TABLE = 'student_last_visits';
const RPC = 'record_student_visit';
const DAY_1 = '2026-09-01';
/** 21 jours après DAY_1 */
const DAY_22 = '2026-09-22';

// Variables
const service = createServiceRoleClient() as unknown as SupabaseClient;

// Functions
async function clientFor(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Passage enregistré par le serveur : rend le jour du passage précédent. */
async function recordVisit(studentId: string, today: string): Promise<string | null> {
	const { data, error } = await service.rpc(RPC, { p_student_id: studentId, p_today: today });
	if (error) throw new Error(`${RPC} : ${error.message}`);
	return data as string | null;
}

/** Le jour enregistré, relu HORS RLS. */
async function storedDay(studentId: string): Promise<string | null> {
	const { data, error } = await service
		.from(TABLE)
		.select('last_visit_date')
		.eq('student_id', studentId)
		.maybeSingle();
	expect(error).toBeNull();
	return (data as { last_visit_date: string } | null)?.last_visit_date ?? null;
}

// Tests
describe('Palotin : jour du dernier passage, serveur seulement', () => {
	let student: { id: string; email: string };
	let other: { id: string; email: string };
	let teacher: { id: string; email: string };
	let admin: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		student = await TestData.profile().withRole('student').create();
		other = await TestData.profile().withRole('student').create();
		teacher = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('record_student_visit (client service)', () => {
		it('rend NULL au premier passage et enregistre le jour', async () => {
			expect(await recordVisit(student.id, DAY_1)).toBeNull();
			expect(await storedDay(student.id)).toBe(DAY_1);
		});

		it('le même jour : rend le jour même, rien ne change', async () => {
			expect(await recordVisit(student.id, DAY_1)).toBe(DAY_1);
			expect(await storedDay(student.id)).toBe(DAY_1);
		});

		it('21 jours plus tard : rend l’ancien jour une fois, puis le nouveau', async () => {
			expect(await recordVisit(student.id, DAY_22)).toBe(DAY_1);
			expect(await storedDay(student.id)).toBe(DAY_22);
			expect(await recordVisit(student.id, DAY_22)).toBe(DAY_22);
		});

		it('un jour antérieur ne fait pas reculer le jour enregistré', async () => {
			expect(await recordVisit(student.id, DAY_1)).toBe(DAY_22);
			expect(await storedDay(student.id)).toBe(DAY_22);
		});

		it('deux passages simultanés ne rendent l’ancien jour qu’une fois', async () => {
			await recordVisit(other.id, DAY_1);
			const results = await Promise.all([
				recordVisit(other.id, DAY_22),
				recordVisit(other.id, DAY_22),
				recordVisit(other.id, DAY_22)
			]);
			expect(results.filter((day) => day === DAY_1)).toHaveLength(1);
			expect(results.filter((day) => day === DAY_22)).toHaveLength(2);
		});

		it('refuse un élève ou un jour absent', async () => {
			const noDay = await service.rpc(RPC, { p_student_id: student.id, p_today: null });
			expect(noDay.error?.message).toContain('élève et jour obligatoires');
			const noStudent = await service.rpc(RPC, { p_student_id: null, p_today: DAY_1 });
			expect(noStudent.error?.message).toContain('élève et jour obligatoires');
		});
	});

	describe('personne d’autre que le serveur', () => {
		it('l’élève ne lit pas sa propre ligne', async () => {
			const client = await clientFor(student.email);
			const { data, error } = await client.from(TABLE).select('*').eq('student_id', student.id);
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
		});

		it('l’élève n’écrit ni n’efface sa ligne', async () => {
			const client = await clientFor(student.email);
			const insert = await client
				.from(TABLE)
				.insert({ student_id: student.id, last_visit_date: DAY_1 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);
			const update = await client
				.from(TABLE)
				.update({ last_visit_date: DAY_1 })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			const remove = await client.from(TABLE).delete().eq('student_id', student.id).select();
			expect(remove.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedDay(student.id)).toBe(DAY_22);
		});

		it('l’élève n’appelle pas la fonction', async () => {
			const client = await clientFor(student.email);
			const { error } = await client.rpc(RPC, { p_student_id: student.id, p_today: '2026-12-01' });
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(await storedDay(student.id)).toBe(DAY_22);
		});

		it.each([
			['le prof', () => teacher],
			['l’admin', () => admin]
		])('%s ne lit pas la table ni n’appelle la fonction', async (_name, who) => {
			const client = await clientFor(who().email);
			const read = await client.from(TABLE).select('*');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const call = await client.rpc(RPC, { p_student_id: student.id, p_today: '2026-12-01' });
			expect(call.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedDay(student.id)).toBe(DAY_22);
		});

		it('anon ne lit pas la table ni n’appelle la fonction', async () => {
			const anon = createClient(SUPABASE_URL, ANON_KEY, {
				auth: { persistSession: false, autoRefreshToken: false }
			});
			const read = await anon.from(TABLE).select('*');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const call = await anon.rpc(RPC, { p_student_id: student.id, p_today: '2026-12-01' });
			expect(call.error?.code).toBe(PERMISSION_DENIED);
		});

		it('RLS activée, sans aucune policy', async () => {
			const pg = await getPostgresClient();
			const rls = await pg.query<{ relrowsecurity: boolean }>(
				`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.student_last_visits'::regclass`
			);
			expect(rls.rows[0]?.relrowsecurity).toBe(true);
			const policies = await pg.query(
				`SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`,
				[TABLE]
			);
			expect(policies.rows).toHaveLength(0);
		});
	});

	it('la ligne part avec le profil (suppression de compte)', async () => {
		const leaving = await TestData.profile().withRole('student').create();
		await recordVisit(leaving.id, DAY_1);
		expect(await storedDay(leaving.id)).toBe(DAY_1);
		const { error } = await service.auth.admin.deleteUser(leaving.id);
		expect(error).toBeNull();
		expect(await storedDay(leaving.id)).toBeNull();
	});
});
