/**
 * Durées trop courtes, modèle × durée (chantier `durees-trop-courtes`, PR 2) — intégration
 * =====================================================================================
 *
 * `getDurationSignals` lu avec le client du PROFESSEUR, sous la RLS réelle :
 * traces de Contrôle blanc (`skill_attempts`, policy `skill_attempts_select_teacher`),
 * contrôles, séries, copies et réponses. Un refus RLS rendrait zéro ligne sans
 * erreur : on vérifie les NOMBRES. Aucune migration : un élève ne lit que ses
 * propres traces, comme avant.
 *
 * `pnpm test:integration tests/integration/durees-trop-courtes.test.ts`
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getDurationSignals } from '$lib/server/stats/duration-signals';

// Types
type Client = SupabaseClient<Database>;
type Person = { id: string; client: Client };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const T_TABLES = '0a11f0e0-0000-4000-8000-0000000d7c01';
const T_CARTE = '0a11f0e0-0000-4000-8000-0000000d7c02';
/** Dernière modification des modèles : les traces d'avant ne comptent pas (Q8) */
const TEMPLATE_UPDATED_AT = '2026-01-01T00:00:00Z';
const BEFORE_UPDATE = '2025-06-01T00:00:00Z';

// Variables
const service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let students: Person[];
let testStudent: Person;
let evaluationId: string;

// Functions
async function signIn(email: string): Promise<Client> {
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

async function person(role: 'student' | 'teacher'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

async function insertId(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`décor ${table} : ${error.message}`);
	return (data as { id: string }).id;
}

/** Trace de Contrôle blanc (écrite au service, comme la route) */
async function mockTrace(
	student: Person,
	templateId: string,
	delaySeconds: number,
	outcome: 'missed' | 'started' | 'validated',
	createdAt?: string
): Promise<void> {
	const typed = outcome === 'missed' ? null : ['12'];
	const { error } = await service.from('skill_attempts').insert({
		student_id: student.id,
		template_id: templateId,
		source: 'auto',
		success: false,
		place: 'mock_test',
		allotted_ms: delaySeconds * 1000,
		response_ms: outcome === 'validated' ? 3000 : delaySeconds * 1000,
		end_reason: outcome === 'validated' ? 'validated' : 'timeout',
		answer_parts: typed,
		part_verdicts: typed ? [false] : null,
		...(createdAt ? { created_at: createdAt } : {})
	});
	if (error) throw new Error(`décor skill_attempts : ${error.message}`);
}

/** Copie rendue d'un contrôle, une réponse au modèle des tables */
async function controlCopy(
	student: Person,
	status: string | null,
	timeSpent: number
): Promise<void> {
	const sessionId = await insertId('test_sessions', {
		user_id: student.id,
		evaluation_id: evaluationId,
		mode: 'interactive',
		items: [],
		total_questions: 1,
		grade: status === 'correct' ? 20 : 0,
		points_earned: status === 'correct' ? 1 : 0,
		completed_at: new Date().toISOString()
	});
	const { error } = await service.from('test_answers').insert({
		test_session_id: sessionId,
		template_id: T_TABLES,
		question_instance: { __position: 0 },
		status,
		points: status === 'correct' ? 1 : 0,
		is_correct: status === 'correct',
		time_spent: timeSpent
	});
	if (error) throw new Error(`décor test_answers : ${error.message}`);
}

async function removeDecor(): Promise<void> {
	await service.from('skill_attempts').delete().in('template_id', [T_TABLES, T_CARTE]);
	await service.from('question_templates').delete().in('id', [T_TABLES, T_CARTE]);
}

describe('durées trop courtes lues par le professeur (RLS réelle)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await removeDecor();
		teacher = await person('teacher');
		students = [];
		for (let i = 0; i < 5; i++) students.push(await person('student'));
		testStudent = await person('student');
		const { error: testError } = await service
			.from('profiles')
			.update({ is_test: true })
			.eq('id', testStudent.id);
		expect(testError, 'décor : élève de test').toBeNull();

		for (const [id, title, options] of [
			[T_TABLES, 'Tables durée ZZ', null],
			[T_CARTE, 'Carte durée ZZ', { courseCard: true }]
		] as const) {
			await insertId('question_templates', {
				id,
				type: 'numerical_exact',
				title,
				level: 1,
				grades: ['6'],
				status: 'published',
				variations: [{}],
				options,
				created_by: teacher.id,
				updated_at: TEMPLATE_UPDATED_AT
			});
		}

		const seriesId = await insertId('series', {
			title: 'Durées ZZ',
			grade: '6',
			items: [{ templateId: T_TABLES, quantity: 1, delay: 10 }],
			created_by: teacher.id
		});
		evaluationId = await insertId('evaluations', {
			series_id: seriesId,
			form: 'interactive',
			status: 'published',
			created_by: teacher.id
		});

		// 10 s : élèves 0 à 2 manquent en Contrôle blanc ; l'élève 3 manque au contrôle ;
		// l'élève 4 répond juste au contrôle → 4 sur 5
		for (const s of students.slice(0, 3)) await mockTrace(s, T_TABLES, 10, 'missed');
		await controlCopy(students[3], null, 10);
		await controlCopy(students[4], 'correct', 6);
		// L'élève 0 a aussi commencé une réponse une fois : il n'est plus « rien répondu »
		await mockTrace(students[0], T_TABLES, 10, 'started');
		// 40 s : personne ne manque
		for (const s of students) await mockTrace(s, T_TABLES, 40, 'validated');
		// 30 s : traces antérieures à la modification du modèle → ignorées (Q8)
		for (const s of students) await mockTrace(s, T_TABLES, 30, 'missed', BEFORE_UPDATE);
		// Élève de test : compte seulement en mode test
		await mockTrace(testStudent, T_TABLES, 10, 'missed');
		// Le prof s'essaie au Contrôle blanc : ses traces ne comptent pas
		await mockTrace(teacher, T_TABLES, 40, 'missed');
		// Carte de cours : jamais de case, jamais de signal
		for (const s of students) await mockTrace(s, T_CARTE, 10, 'missed');
	});

	afterAll(async () => {
		await removeDecor();
		await cleanupAllTestData();
	});

	it('décor : la date de modification des modèles est bien posée', async () => {
		const { data } = await service
			.from('question_templates')
			.select('updated_at')
			.eq('id', T_TABLES)
			.single();
		expect(new Date(data?.updated_at ?? '').toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});

	it('fusionne Contrôles blancs et contrôles, par élève et par durée', async () => {
		const result = await getDurationSignals(teacher.client, [T_TABLES, T_CARTE], false);
		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		expect(result.signals[T_TABLES]).toEqual([
			// élèves 1, 2 (Contrôle blanc) et 3 (contrôle) ; 0 a commencé une fois, 4 a répondu
			{ delaySeconds: 10, students: 5, unansweredInTime: 3, tooShort: true },
			{ delaySeconds: 40, students: 5, unansweredInTime: 0, tooShort: false }
		]);
		expect(result.signals[T_CARTE]).toBeUndefined();
	});

	it('mode test : seuls les élèves de test comptent', async () => {
		const result = await getDurationSignals(teacher.client, [T_TABLES], true);
		expect(result).toEqual({
			status: 'ok',
			signals: {
				[T_TABLES]: [{ delaySeconds: 10, students: 1, unansweredInTime: 1, tooShort: false }]
			}
		});
	});

	it('aucun accès nouveau : un élève ne lit que ses propres traces', async () => {
		const result = await getDurationSignals(students[1].client, [T_TABLES], false);
		expect(result.status).toBe('ok');
		if (result.status !== 'ok') return;
		// Ses deux durées (10 s manquée, 40 s validée), lui seul à chacune
		expect(result.signals[T_TABLES]?.map((t) => [t.delaySeconds, t.students])).toEqual([
			[10, 1],
			[40, 1]
		]);
	});
});
