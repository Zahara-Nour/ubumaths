/**
 * Palotin : semaine déjà fêtée, lisible par le serveur seul
 * =========================================================
 *
 * Migration 20261112131750 (chantier `regularite`, PR B2). Question d'accès
 * tranchée par David le 2026-11-12 : personne de plus. `week_celebrated_on`
 * vit dans `student_last_visits`, que seul le serveur (client service) lit et
 * écrit ; le navigateur n'en reçoit que le moment à fêter.
 *
 * Ce que le fichier prouve :
 *   1. la colonne est NULL par défaut, le serveur l'écrit, la relit et l'efface ;
 *   2. un passage enregistré par `record_student_visit` ne la touche pas ;
 *   3. ni l'élève (même sur sa ligne), ni le prof, ni l'admin, ni anon ne la
 *      lisent ni ne l'écrivent.
 *
 * Client non typé : la colonne n'est pas encore dans `database.ts` (généré
 * depuis la prod, après `db:migrate`).
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

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PERMISSION_DENIED = '42501';
const TABLE = 'student_last_visits';
const DAY_1 = '2026-09-01';
/** Un lundi */
const WEEK = '2026-09-21';

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

async function recordVisit(studentId: string, today: string): Promise<void> {
	const { error } = await service.rpc('record_student_visit', {
		p_student_id: studentId,
		p_today: today
	});
	if (error) throw new Error(`record_student_visit : ${error.message}`);
}

/** La semaine fêtée, relue HORS RLS. */
async function storedWeek(studentId: string): Promise<string | null> {
	const { data, error } = await service
		.from(TABLE)
		.select('week_celebrated_on')
		.eq('student_id', studentId)
		.single();
	expect(error).toBeNull();
	return (data as { week_celebrated_on: string | null }).week_celebrated_on;
}

async function setWeek(studentId: string, day: string | null): Promise<void> {
	const { data, error } = await service
		.from(TABLE)
		.update({ week_celebrated_on: day })
		.eq('student_id', studentId)
		.select('student_id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
}

// Tests
describe('Palotin : semaine fêtée, serveur seulement', () => {
	let student: { id: string; email: string };
	let teacher: { id: string; email: string };
	let admin: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		student = await TestData.profile().withRole('student').create();
		teacher = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		await recordVisit(student.id, DAY_1);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('client service', () => {
		it('NULL au premier passage', async () => {
			expect(await storedWeek(student.id)).toBeNull();
		});

		it('le serveur écrit le lundi de la semaine et le relit', async () => {
			await setWeek(student.id, WEEK);
			expect(await storedWeek(student.id)).toBe(WEEK);
		});

		it('un passage enregistré ne touche pas la semaine fêtée', async () => {
			await recordVisit(student.id, '2026-09-22');
			expect(await storedWeek(student.id)).toBe(WEEK);
		});

		it('le serveur l’efface (semaine oubliée)', async () => {
			await setWeek(student.id, null);
			expect(await storedWeek(student.id)).toBeNull();
			await setWeek(student.id, WEEK);
		});
	});

	describe('personne d’autre que le serveur', () => {
		it('l’élève ne lit ni n’efface sa semaine fêtée', async () => {
			const client = await clientFor(student.email);
			const read = await client
				.from(TABLE)
				.select('week_celebrated_on')
				.eq('student_id', student.id);
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			expect(read.data).toBeNull();
			const insert = await client
				.from(TABLE)
				.insert({ student_id: student.id, last_visit_date: DAY_1, week_celebrated_on: DAY_1 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);
			const update = await client
				.from(TABLE)
				.update({ week_celebrated_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWeek(student.id)).toBe(WEEK);
		});

		it.each([
			['le prof', () => teacher],
			['l’admin', () => admin]
		])('%s ne lit ni n’écrit la semaine fêtée', async (_name, who) => {
			const client = await clientFor(who().email);
			const read = await client.from(TABLE).select('week_celebrated_on');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const update = await client
				.from(TABLE)
				.update({ week_celebrated_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWeek(student.id)).toBe(WEEK);
		});

		it('anon ne lit ni n’écrit la semaine fêtée', async () => {
			const anon = createClient(SUPABASE_URL, ANON_KEY, {
				auth: { persistSession: false, autoRefreshToken: false }
			});
			const read = await anon.from(TABLE).select('week_celebrated_on');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const update = await anon
				.from(TABLE)
				.update({ week_celebrated_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWeek(student.id)).toBe(WEEK);
		});
	});
});
