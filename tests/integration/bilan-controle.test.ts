/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6) — intégration
 * ===========================================================================================
 *
 * `getEvaluationBreakdown` lu avec le client du PROFESSEUR, sous la RLS réelle :
 * copies (`test_sessions`), réponses (`test_answers`, policy
 * `test_answers_select_teacher`), modèles, points et notions du programme. Un
 * refus RLS rendrait zéro ligne sans erreur : on vérifie donc les NOMBRES, pas
 * l'absence d'erreur (Q5 : aucune migration, personne ne lit rien de plus).
 *
 * `pnpm test:integration tests/integration/bilan-controle.test.ts`
 *
 * @vitest-environment node
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getEvaluationBreakdown } from '$lib/server/evaluation-breakdown';

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
const T_FRACTIONS = '0a11f0e0-0000-4000-8000-0000000b1c01';
const T_RELATIFS = '0a11f0e0-0000-4000-8000-0000000b1c02';
const POINT_CODE = 'TST-BILAN-CONTROLE';
const BRANCH_NAME = 'Branche bilan ZZ';
const NOTION_NAME = 'Notion bilan ZZ';

// Variables
const service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let ada: Person;
let bob: Person;
let evaluationId: string;
let branchId: string;
let notionId: string;

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

/** Copie rendue, et ses réponses (écrites au service, comme le serveur de correction) */
async function copy(
	student: Person,
	grade: number,
	completedAt: string,
	answers: Array<{ templateId: string; status: string; points: number }>
): Promise<void> {
	const sessionId = await insertId('test_sessions', {
		user_id: student.id,
		evaluation_id: evaluationId,
		mode: 'interactive',
		items: [],
		total_questions: 3,
		grade,
		points_earned: answers.reduce((s, a) => s + a.points, 0),
		completed_at: completedAt
	});
	if (answers.length === 0) return;
	const { error } = await service.from('test_answers').insert(
		answers.map((a, position) => ({
			test_session_id: sessionId,
			template_id: a.templateId,
			question_instance: { __position: position },
			status: a.status,
			points: a.points,
			is_correct: a.status === 'correct'
		}))
	);
	if (error) throw new Error(`décor test_answers : ${error.message}`);
}

/** Décor propre au test, retiré avant (restes d'un essai interrompu) et après */
async function removeDecor(): Promise<void> {
	await service
		.from('question_template_points')
		.delete()
		.in('template_id', [T_FRACTIONS, T_RELATIFS]);
	await service.from('question_templates').delete().in('id', [T_FRACTIONS, T_RELATIFS]);
	await service.from('curriculum_points').delete().eq('code', POINT_CODE);
	await service.from('classification_nodes').delete().eq('name', NOTION_NAME);
	await service.from('classification_nodes').delete().eq('name', BRANCH_NAME);
}

describe('bilan d’un contrôle lu par le professeur (RLS réelle)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		await removeDecor();
		teacher = await person('teacher');
		ada = await person('student');
		bob = await person('student');

		const k = await TestData.class().withName('6e bilan ZZ').create();
		const { error: memberError } = await service.from('class_members').insert([
			{ class_id: k.id, student_id: ada.id, status: 'active' },
			{ class_id: k.id, student_id: bob.id, status: 'active' }
		]);
		expect(memberError, 'décor : inscriptions').toBeNull();

		// Programme : branche › notion ; seul le modèle « fractions » y est rattaché
		branchId = await insertId('classification_nodes', {
			kind: 'branch',
			name: BRANCH_NAME,
			parent_id: null,
			position: 901
		});
		notionId = await insertId('classification_nodes', {
			kind: 'notion',
			name: NOTION_NAME,
			parent_id: branchId,
			position: 0
		});
		const pointId = await insertId('curriculum_points', {
			code: POINT_CODE,
			name: 'Point bilan ZZ',
			kind: 'savoir_faire',
			grade: '6',
			display_order: 0,
			node_id: notionId
		});
		for (const [id, title] of [
			[T_FRACTIONS, 'Fractions bilan ZZ'],
			[T_RELATIFS, 'Relatifs bilan ZZ']
		]) {
			await insertId('question_templates', {
				id,
				type: 'numerical_exact',
				title,
				level: 1,
				grades: ['6'],
				// Un modèle tagué d'un point doit être rangé dans l'arbre
				classification_node_id: notionId,
				status: 'published',
				variations: [{}],
				created_by: teacher.id
			});
		}
		const { error: linkError } = await service
			.from('question_template_points')
			.insert({ template_id: T_FRACTIONS, point_id: pointId });
		expect(linkError, 'décor : point du modèle').toBeNull();

		const seriesId = await insertId('series', {
			title: 'Bilan ZZ',
			grade: '6',
			items: [
				{ templateId: T_FRACTIONS, quantity: 2, delay: 20 },
				{ templateId: T_RELATIFS, quantity: 1, delay: 20 }
			],
			created_by: teacher.id
		});
		evaluationId = await insertId('evaluations', {
			series_id: seriesId,
			form: 'interactive',
			status: 'published',
			created_by: teacher.id
		});
		await insertId('evaluation_assignments', {
			evaluation_id: evaluationId,
			assigned_by: teacher.id,
			class_id: k.id
		});

		// Ada : deux copies, la meilleure (15) compte ; Bob : une copie en retard
		await copy(ada, 15, '2026-11-10T10:00:00Z', [
			{ templateId: T_FRACTIONS, status: 'correct', points: 1 },
			{ templateId: T_FRACTIONS, status: 'unoptimal_form', points: 0.5 },
			{ templateId: T_RELATIFS, status: 'incorrect', points: 0 }
		]);
		await copy(ada, 5, '2026-11-11T10:00:00Z', [
			{ templateId: T_FRACTIONS, status: 'incorrect', points: 0 },
			{ templateId: T_FRACTIONS, status: 'incorrect', points: 0 },
			{ templateId: T_RELATIFS, status: 'correct', points: 1 }
		]);
		await copy(bob, 0, '2026-11-12T10:00:00Z', []);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await removeDecor();
	});

	it('le professeur lit copies, réponses, modèles et notions : les nombres sont justes', async () => {
		const items = [
			{ templateId: T_FRACTIONS, quantity: 2, delay: 20 },
			{ templateId: T_RELATIFS, quantity: 1, delay: 20 }
		];
		const result = await getEvaluationBreakdown(
			teacher.client,
			{ id: evaluationId, series: { items } },
			[ada.id, bob.id]
		);

		expect(result).toMatchObject({ status: 'ok', copies: 1, lateCopies: 1 });
		if (result.status !== 'ok') return;
		expect(result.questions.map((q) => [q.title, q.answers, q.successRate])).toEqual([
			['Fractions bilan ZZ', 2, 75],
			['Relatifs bilan ZZ', 1, 0]
		]);
		expect(result.questions[0]).toMatchObject({ correct: 1, partial: 1 });
		expect(result.notions.map((n) => [n.branch, n.notion, n.answers, n.successRate])).toEqual([
			[BRANCH_NAME, NOTION_NAME, 2, 75],
			[null, 'Sans notion', 1, 0]
		]);
	});

	it('un élève ne lit pas les copies des autres : son bilan ne compte que la sienne', async () => {
		const result = await getEvaluationBreakdown(
			ada.client,
			{ id: evaluationId, series: { items: [] } },
			[ada.id, bob.id]
		);
		// Bob (retard) est invisible pour Ada ; sa propre meilleure copie seule
		expect(result).toMatchObject({ status: 'ok', copies: 1, lateCopies: 0 });
	});
});
