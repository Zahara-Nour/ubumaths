/**
 * Palotin « tu m'as manqué » : jour du retour à fêter, lisible par le serveur seul
 * ================================================================================
 *
 * Migration 20261022100000. Question d'accès tranchée par David le 2026-10-21 :
 * personne de plus. `welcome_back_on` vit dans `student_last_visits`, que seul
 * le serveur (client service) lit et écrit ; le navigateur n'en reçoit que
 * « retour à fêter oui/non ».
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

async function recordVisit(studentId: string, today: string): Promise<void> {
	const { error } = await service.rpc('record_student_visit', {
		p_student_id: studentId,
		p_today: today
	});
	if (error) throw new Error(`record_student_visit : ${error.message}`);
}

/** Le jour du retour à fêter, relu HORS RLS. */
async function storedWelcomeBack(studentId: string): Promise<string | null> {
	const { data, error } = await service
		.from(TABLE)
		.select('welcome_back_on')
		.eq('student_id', studentId)
		.single();
	expect(error).toBeNull();
	return (data as { welcome_back_on: string | null }).welcome_back_on;
}

async function setWelcomeBack(studentId: string, day: string | null): Promise<void> {
	const { data, error } = await service
		.from(TABLE)
		.update({ welcome_back_on: day })
		.eq('student_id', studentId)
		.select('student_id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
}

// Tests
describe('Palotin : jour du retour à fêter, serveur seulement', () => {
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
			expect(await storedWelcomeBack(student.id)).toBeNull();
		});

		it('le serveur écrit le jour du retour et le relit', async () => {
			await setWelcomeBack(student.id, DAY_22);
			expect(await storedWelcomeBack(student.id)).toBe(DAY_22);
		});

		it('un passage enregistré ne touche pas le retour à fêter', async () => {
			await recordVisit(student.id, DAY_22);
			expect(await storedWelcomeBack(student.id)).toBe(DAY_22);
		});

		it('le serveur l’efface (retour fêté)', async () => {
			await setWelcomeBack(student.id, null);
			expect(await storedWelcomeBack(student.id)).toBeNull();
			await setWelcomeBack(student.id, DAY_22);
		});
	});

	describe('personne d’autre que le serveur', () => {
		it('l’élève ne lit ni n’efface son retour à fêter', async () => {
			const client = await clientFor(student.email);
			const read = await client.from(TABLE).select('welcome_back_on').eq('student_id', student.id);
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			expect(read.data).toBeNull();
			const insert = await client
				.from(TABLE)
				.insert({ student_id: student.id, last_visit_date: DAY_1, welcome_back_on: DAY_1 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);
			const update = await client
				.from(TABLE)
				.update({ welcome_back_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWelcomeBack(student.id)).toBe(DAY_22);
		});

		it.each([
			['le prof', () => teacher],
			['l’admin', () => admin]
		])('%s ne lit ni n’écrit le retour à fêter', async (_name, who) => {
			const client = await clientFor(who().email);
			const read = await client.from(TABLE).select('welcome_back_on');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const update = await client
				.from(TABLE)
				.update({ welcome_back_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWelcomeBack(student.id)).toBe(DAY_22);
		});

		it('anon ne lit ni n’écrit le retour à fêter', async () => {
			const anon = createClient(SUPABASE_URL, ANON_KEY, {
				auth: { persistSession: false, autoRefreshToken: false }
			});
			const read = await anon.from(TABLE).select('welcome_back_on');
			expect(read.error?.code).toBe(PERMISSION_DENIED);
			const update = await anon
				.from(TABLE)
				.update({ welcome_back_on: null })
				.eq('student_id', student.id)
				.select();
			expect(update.error?.code).toBe(PERMISSION_DENIED);
			expect(await storedWelcomeBack(student.id)).toBe(DAY_22);
		});
	});
});
