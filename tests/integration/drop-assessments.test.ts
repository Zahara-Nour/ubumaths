/**
 * Suppression des anciennes tables d'évaluation (chantier 4, PR 3) — intégration
 * ==============================================================================
 *
 * Migration `20260930150000_drop_assessments.sql` (DESTRUCTIVE, approuvée par
 * David). Ce qu'on prouve :
 *   · les tables, colonnes, vue et fonctions supprimées n'existent plus ;
 *   · les contraintes recréées ne citent plus les colonnes supprimées ;
 *   · `admin_content_stats.total_assessments` compte désormais les ÉVALUATIONS ;
 *   · question d'accès : AUCUNE lecture nouvelle sur `admin_content_stats`
 *     (vue `security_invoker`, mêmes droits) — l'élève ne compte que les
 *     évaluations publiées qui lui sont assignées, anon reste refusé.
 *
 * DOIT échouer sans la migration (catalogue, compte des évaluations).
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/drop-assessments.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Person = { id: string; client: SupabaseClient };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [{ category: 'entiers/1', quantity: 2, delay: 20 }];
const DROPPED_RELATIONS = ['assessments', 'assessment_assignments', 'assessment_results'];
const DROPPED_COLUMNS: [table: string, column: string][] = [
	['test_sessions', 'assignment_id'],
	['evaluation_tasks', 'assessment_id'],
	['journal_entry_activities', 'assessment_id']
];
const DROPPED_FUNCTIONS = [
	'get_assessment_results_for_admin',
	'get_assessment_results_for_student',
	'get_assessment_results_for_teacher',
	'assessment_curriculum_points',
	'is_assessment_owner',
	'student_has_assignment_for_assessment',
	'link_existing_assessments_to_periods',
	'update_assessments_updated_at',
	'copy_legacy_assessments'
];

// Variables
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
/** Destinataire (nommément) d'UNE évaluation publiée ; pas du brouillon. */
let student: Person;

// Functions
async function signIn(email: string): Promise<SupabaseClient> {
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

async function person(role: 'student' | 'teacher' | 'admin'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

/** Série + évaluation au nom du prof ; assignée à `studentId` s'il est fourni. */
async function createEvaluation(status: 'draft' | 'published', studentId?: string) {
	const { data: series, error: seriesError } = await service
		.from('series')
		.insert({ title: `Drop ${status}`, grade: '6', categories: CATEGORIES, created_by: teacher.id })
		.select('id')
		.single();
	expect(seriesError, 'décor : série').toBeNull();
	const { data: evaluation, error: evaluationError } = await service
		.from('evaluations')
		.insert({ series_id: series!.id, form: 'interactive', status, created_by: teacher.id })
		.select('id')
		.single();
	expect(evaluationError, 'décor : évaluation').toBeNull();
	if (studentId) {
		const { error } = await service.from('evaluation_assignments').insert({
			evaluation_id: evaluation!.id,
			assigned_by: teacher.id,
			student_id: studentId
		});
		expect(error, 'décor : assignation').toBeNull();
	}
}

async function totalAssessments(client: SupabaseClient): Promise<number> {
	const { data, error } = await client
		.from('admin_content_stats')
		.select('total_assessments')
		.single();
	expect(error).toBeNull();
	return Number((data as { total_assessments: number }).total_assessments);
}

async function catalogValue(sql: string, params: unknown[] = []): Promise<unknown> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(sql, params);
	return rows[0]?.value;
}

describe('suppression des anciennes tables assessments (20260930150000)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		admin = await person('admin');
		student = await person('student');

		await createEvaluation('published', student.id);
		await createEvaluation('draft', student.id);
		await createEvaluation('published');
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('catalogue', () => {
		it.each(DROPPED_RELATIONS)('la relation public.%s n’existe plus', async (name) => {
			expect(await catalogValue(`select to_regclass($1)::text as value`, [`public.${name}`])).toBe(
				null
			);
		});

		it.each(DROPPED_COLUMNS)('la colonne %s.%s n’existe plus', async (table, column) => {
			const count = await catalogValue(
				`select count(*)::int as value from information_schema.columns
				 where table_schema = 'public' and table_name = $1 and column_name = $2`,
				[table, column]
			);
			expect(count).toBe(0);
		});

		it('aucune des fonctions supprimées n’existe plus', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
				 where n.nspname = 'public' and p.proname = any($1::text[])`,
				[DROPPED_FUNCTIONS]
			);
			expect(rows.map((row: { proname: string }) => row.proname)).toEqual([]);
		});

		it('evaluations.legacy_assessment_id est GARDÉE (anciens liens prof)', async () => {
			const count = await catalogValue(
				`select count(*)::int as value from information_schema.columns
				 where table_schema = 'public' and table_name = 'evaluations'
				   and column_name = 'legacy_assessment_id'`
			);
			expect(count).toBe(1);
		});

		it('les contraintes recréées ne citent plus que evaluation_id', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select conname, pg_get_constraintdef(oid) as def from pg_constraint
				 where conname in ('chk_evaluation_task_source', 'journal_entry_activities_kind_shape',
				                   'test_sessions_flash_sans_assignation', 'test_sessions_flash_sans_evaluation')
				 order by conname`
			);
			const defs = Object.fromEntries(
				rows.map((row: { conname: string; def: string }) => [row.conname, row.def])
			);
			expect(Object.keys(defs).sort()).toEqual([
				'chk_evaluation_task_source',
				'journal_entry_activities_kind_shape',
				'test_sessions_flash_sans_evaluation'
			]);
			expect(defs.chk_evaluation_task_source).toMatch(/evaluation_id IS NOT NULL/);
			expect(defs.chk_evaluation_task_source).toMatch(/exercise_id IS NOT NULL/);
			expect(defs.chk_evaluation_task_source).toMatch(/worksheet_id IS NOT NULL/);
			expect(defs.journal_entry_activities_kind_shape).toMatch(
				/kind = 'assessment'::text\) AND \(evaluation_id IS NOT NULL\)/
			);
			for (const def of Object.values(defs)) {
				expect(def).not.toMatch(/assessment_id|assignment_id/);
			}
		});
	});

	describe('admin_content_stats', () => {
		it('garde security_invoker et ses droits (aucun GRANT nouveau)', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select c.reloptions::text as options,
				        has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
				        has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select
				 from pg_class c where c.oid = 'public.admin_content_stats'::regclass`
			);
			expect(rows[0]).toEqual({
				options: '{security_invoker=true}',
				anon_select: true,
				auth_select: true
			});
		});

		it('total_assessments compte les évaluations (admin : toutes)', async () => {
			const { count, error } = await service
				.from('evaluations')
				.select('id', { count: 'exact', head: true });
			expect(error).toBeNull();
			expect(count).toBeGreaterThanOrEqual(3);
			expect(await totalAssessments(admin.client)).toBe(count);
		});

		it('le prof ne compte que ses évaluations', async () => {
			expect(await totalAssessments(teacher.client)).toBe(3);
		});

		it('l’élève ne compte que l’évaluation publiée qui lui est assignée', async () => {
			expect(await totalAssessments(student.client)).toBe(1);
		});

		it('anon reste refusé', async () => {
			const { data, error } = await anon.from('admin_content_stats').select('total_assessments');
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});
	});
});
