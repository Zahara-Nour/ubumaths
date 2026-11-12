/**
 * Grille de régularité comptée dans la base (chantier `regularite-sql`,
 * outils-manquants n° 28)
 * =====================================================================
 *
 * `class_regularity_weeks(p_class_id, p_first_day, p_min_traces)` rend les jours
 * actifs par élève actif de la classe et par semaine (lundi), jour de Paris :
 *   1. comptes exacts pour le prof : jour à 5 traces actif, à 4 non ; contrôle
 *      exclu, trace sans lieu comptée, `srs` et `student_self` comptées ;
 *      frontière de Paris (dimanche 23 h 30 / lundi 0 h 30) ; avant la rentrée
 *      exclu ;
 *   2. membre archivé de la classe : pas compté ;
 *   3. un élève ne compte que ses propres traces (RLS, security invoker) ;
 *   4. `anon` n'a pas l'exécution.
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
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';

// Types
interface WeekRow {
	student_id: string;
	week_start: string;
	active_days: number;
}

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
/** Rentrée de test : mardi 1er septembre 2026 */
const FIRST_DAY = '2026-09-01';
const service = createServiceRoleClient();

// Variables
let templateId: string;
let classId: string;
let teacherClient: SupabaseClient;
let studentA: { id: string; client: SupabaseClient };
let studentB: { id: string; client: SupabaseClient };
let archivedId: string;

// Functions
async function clientFor(email: string): Promise<SupabaseClient> {
	// Client non typé : la fonction n'est dans `database.ts` qu'après `db:types`
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

async function newMember(status: 'active' | 'archived'): Promise<{
	id: string;
	client: SupabaseClient;
}> {
	const student = await TestData.profile().withRole('student').create();
	const { error } = await service
		.from('class_members')
		.insert({ class_id: classId, student_id: student.id, status });
	if (error) throw new Error(error.message);
	return { id: student.id, client: await clientFor(student.email!) };
}

/** `count` traces à l'instant UTC `at` */
async function addTraces(
	studentId: string,
	at: string,
	count: number,
	options: { source?: string; place?: string | null } = {}
) {
	const rows = Array.from({ length: count }, () => ({
		student_id: studentId,
		template_id: templateId,
		success: true,
		source: options.source ?? 'auto',
		place: options.place === undefined ? 'typing' : options.place,
		created_at: at
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

async function weeks(client: SupabaseClient): Promise<WeekRow[]> {
	const { data, error } = await client.rpc('class_regularity_weeks', {
		p_class_id: classId,
		p_first_day: FIRST_DAY,
		p_min_traces: 5
	});
	if (error) throw new Error(error.message);
	return [...((data ?? []) as WeekRow[])].sort((x, y) =>
		`${x.student_id}${x.week_start}`.localeCompare(`${y.student_id}${y.week_start}`)
	);
}

// Tests
describe('class_regularity_weeks (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		templateId = await createFakeTemplate(service, teacher.id);
		teacherClient = await clientFor(teacher.email!);
		classId = (await TestData.class().create()).id;

		studentA = await newMember('active');
		studentB = await newMember('active');
		archivedId = (await newMember('archived')).id;

		// Avant la rentrée (lundi 31 août, Paris) : exclu
		await addTraces(studentA.id, '2026-08-31T10:00:00Z', 5);
		// Dimanche 4 octobre (Paris, UTC+2) : 3 traces à midi + 2 à 23 h 30 → actif
		await addTraces(studentA.id, '2026-10-04T10:00:00Z', 3);
		await addTraces(studentA.id, '2026-10-04T21:30:00Z', 2);
		// Lundi 5 octobre 0 h 30 à Paris (dimanche 22 h 30 UTC) : 5 traces → lundi actif
		await addTraces(studentA.id, '2026-10-04T22:30:00Z', 5);
		// Mardi 6 : 4 traces + 1 contrôle → pas actif
		await addTraces(studentA.id, '2026-10-06T10:00:00Z', 4);
		await addTraces(studentA.id, '2026-10-06T10:00:00Z', 1, { place: 'evaluation' });
		// Mercredi 7 : 2 auto + 1 sans lieu + 1 srs + 1 student_self → actif
		await addTraces(studentA.id, '2026-10-07T10:00:00Z', 2);
		await addTraces(studentA.id, '2026-10-07T10:00:00Z', 1, { place: null });
		await addTraces(studentA.id, '2026-10-07T10:00:00Z', 1, {
			source: 'srs',
			place: 'review'
		});
		await addTraces(studentA.id, '2026-10-07T10:00:00Z', 1, {
			source: 'student_self',
			place: 'review'
		});

		// Élève B : un jour actif le jeudi 15 octobre
		await addTraces(studentB.id, '2026-10-15T10:00:00Z', 6);
		// Membre archivé : un jour plein, jamais compté
		await addTraces(archivedId, '2026-10-15T10:00:00Z', 8);
	});

	afterAll(async () => {
		await service.from('class_members').delete().eq('class_id', classId);
		await service.from('classes').delete().eq('id', classId);
		await service.from('skill_attempts').delete().eq('template_id', templateId);
		await service.from('question_templates').delete().eq('id', templateId);
		await cleanupAllTestData();
	});

	it('compte les jours actifs par semaine, jour de Paris, pour le prof', async () => {
		const expected: WeekRow[] = [
			{ student_id: studentA.id, week_start: '2026-09-28', active_days: 1 },
			{ student_id: studentA.id, week_start: '2026-10-05', active_days: 2 },
			{ student_id: studentB.id, week_start: '2026-10-12', active_days: 1 }
		].sort((x, y) =>
			`${x.student_id}${x.week_start}`.localeCompare(`${y.student_id}${y.week_start}`)
		);
		expect(await weeks(teacherClient)).toEqual(expected);
	});

	it('ne compte pas un membre archivé de la classe', async () => {
		const rows = await weeks(teacherClient);
		expect(rows.some((r) => r.student_id === archivedId)).toBe(false);
	});

	it('un élève ne compte que ses propres traces', async () => {
		expect(await weeks(studentB.client)).toEqual([
			{ student_id: studentB.id, week_start: '2026-10-12', active_days: 1 }
		]);
	});

	it("anon n'a pas l'exécution", async () => {
		const anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error } = await anon.rpc('class_regularity_weeks', {
			p_class_id: classId,
			p_first_day: FIRST_DAY,
			p_min_traces: 5
		});
		expect(error?.code).toBe('42501');
	});
});
