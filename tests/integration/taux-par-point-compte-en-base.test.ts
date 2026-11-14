/**
 * Taux de réussite par point : comptes par élève et par modèle, faits par la
 * base (chantier `taux-par-point`, décision T1 du 2026-11-14)
 * =====================================================================
 *
 * `class_template_success(p_class_id, p_first_day)` rend, par élève actif de
 * la classe et par modèle, depuis la rentrée (jour de Paris) :
 *   - `proved_done` / `proved_succeeded` : sources `auto` + `teacher`
 *     (contrôles compris : lieu `evaluation`, source `auto`) ;
 *   - `declared_done` : sources `srs` + `student_self`.
 *
 *   1. comptes exacts pour le prof : frontière de Paris de la rentrée
 *      (31 août 23 h 30 exclu, 1er septembre 0 h 30 compté), contrôle et prof
 *      dans le prouvé, déclaré à part, modèle seulement déclaré ;
 *   2. membre archivé de la classe : pas compté ;
 *   3. un élève ne compte que ses propres traces (RLS, security invoker) ;
 *   4. un élève hors de la classe n'obtient rien ;
 *   5. `anon` n'a pas l'exécution.
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
interface CountRow {
	student_id: string;
	template_id: string;
	proved_done: number;
	proved_succeeded: number;
	declared_done: number;
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
let templateOne: string;
let templateTwo: string;
let classId: string;
let teacherClient: SupabaseClient;
let studentA: { id: string; client: SupabaseClient };
let studentB: { id: string; client: SupabaseClient };
let archivedId: string;

// Functions
async function clientFor(email: string): Promise<SupabaseClient> {
	// Client non typé : la preuve rouge précède `db:types`
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

/** `count` traces du modèle à l'instant UTC `at` */
async function addTraces(
	studentId: string,
	templateId: string,
	at: string,
	count: number,
	options: { success?: boolean; source?: string; place?: string } = {}
) {
	const rows = Array.from({ length: count }, () => ({
		student_id: studentId,
		template_id: templateId,
		success: options.success ?? true,
		source: options.source ?? 'auto',
		place: options.place ?? 'typing',
		created_at: at
	}));
	const { error } = await service.from('skill_attempts').insert(rows);
	if (error) throw new Error(error.message);
}

function sorted(rows: CountRow[]): CountRow[] {
	return [...rows].sort((x, y) =>
		`${x.student_id}${x.template_id}`.localeCompare(`${y.student_id}${y.template_id}`)
	);
}

async function counts(client: SupabaseClient): Promise<CountRow[]> {
	const { data, error } = await client.rpc('class_template_success', {
		p_class_id: classId,
		p_first_day: FIRST_DAY
	});
	if (error) throw new Error(error.message);
	return sorted((data ?? []) as CountRow[]);
}

// Tests
describe('class_template_success (base locale)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		templateOne = await createFakeTemplate(service, teacher.id);
		templateTwo = await createFakeTemplate(service, teacher.id);
		teacherClient = await clientFor(teacher.email!);
		classId = (await TestData.class().create()).id;

		studentA = await newMember('active');
		studentB = await newMember('active');
		archivedId = (await newMember('archived')).id;

		// Élève A, modèle 1
		// 31 août 23 h 30 à Paris (UTC+2) : avant la rentrée, exclu
		await addTraces(studentA.id, templateOne, '2026-08-31T21:30:00Z', 1);
		// 1er septembre 0 h 30 à Paris : compté (faux)
		await addTraces(studentA.id, templateOne, '2026-08-31T22:30:00Z', 1, { success: false });
		// Saisie : 2 justes
		await addTraces(studentA.id, templateOne, '2026-10-06T10:00:00Z', 2);
		// Contrôle (écrit par le serveur, source auto) : 1 juste
		await addTraces(studentA.id, templateOne, '2026-10-06T10:00:00Z', 1, {
			place: 'evaluation'
		});
		// Jugement du prof : 1 juste
		await addTraces(studentA.id, templateOne, '2026-10-06T10:00:00Z', 1, { source: 'teacher' });
		// Déclaré : 2 révisions, 1 auto-évaluation
		await addTraces(studentA.id, templateOne, '2026-10-07T10:00:00Z', 2, {
			source: 'srs',
			place: 'review'
		});
		await addTraces(studentA.id, templateOne, '2026-10-07T10:00:00Z', 1, {
			source: 'student_self',
			success: false,
			place: 'review'
		});

		// Élève A, modèle 2 : seulement déclaré
		await addTraces(studentA.id, templateTwo, '2026-10-08T10:00:00Z', 2, {
			source: 'srs',
			place: 'review'
		});

		// Élève B, modèle 1 : 3 réponses, 1 juste
		await addTraces(studentB.id, templateOne, '2026-10-15T10:00:00Z', 1);
		await addTraces(studentB.id, templateOne, '2026-10-15T10:00:00Z', 2, { success: false });

		// Membre archivé : jamais compté
		await addTraces(archivedId, templateOne, '2026-10-15T10:00:00Z', 4);
	});

	afterAll(async () => {
		await service.from('class_members').delete().eq('class_id', classId);
		await service.from('classes').delete().eq('id', classId);
		await service.from('skill_attempts').delete().in('template_id', [templateOne, templateTwo]);
		await service.from('question_templates').delete().in('id', [templateOne, templateTwo]);
		await cleanupAllTestData();
	});

	it('compte prouvé et déclaré par élève et par modèle, depuis la rentrée (Paris)', async () => {
		expect(await counts(teacherClient)).toEqual(
			sorted([
				{
					student_id: studentA.id,
					template_id: templateOne,
					proved_done: 5,
					proved_succeeded: 4,
					declared_done: 3
				},
				{
					student_id: studentA.id,
					template_id: templateTwo,
					proved_done: 0,
					proved_succeeded: 0,
					declared_done: 2
				},
				{
					student_id: studentB.id,
					template_id: templateOne,
					proved_done: 3,
					proved_succeeded: 1,
					declared_done: 0
				}
			])
		);
	});

	it('ne compte pas un membre archivé de la classe', async () => {
		const rows = await counts(teacherClient);
		expect(rows.some((r) => r.student_id === archivedId)).toBe(false);
	});

	it('un élève ne compte que ses propres traces', async () => {
		expect(await counts(studentB.client)).toEqual([
			{
				student_id: studentB.id,
				template_id: templateOne,
				proved_done: 3,
				proved_succeeded: 1,
				declared_done: 0
			}
		]);
	});

	it("un élève hors de la classe n'obtient rien", async () => {
		const outsider = await TestData.profile().withRole('student').create();
		expect(await counts(await clientFor(outsider.email!))).toEqual([]);
	});

	it("anon n'a pas l'exécution", async () => {
		const anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error } = await anon.rpc('class_template_success', {
			p_class_id: classId,
			p_first_day: FIRST_DAY
		});
		expect(error?.code).toBe('42501');
	});
});
