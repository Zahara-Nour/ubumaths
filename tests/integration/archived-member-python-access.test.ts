/**
 * L'élève archivé perd le Python de la classe qu'il a quittée
 * ===========================================================
 *
 * Troisième et dernière surface de la série ouverte par 20260912090000 (les
 * fiches) puis 20260912150000 (les exercices). Le domaine Python portait le
 * même trou, entier — lecture ET écriture — sur six objets :
 *
 *   - `python_exercise_assignments_select_student`  (voir sa distribution)
 *   - `python_exercises_select_assigned`            (ouvrir l'exercice)
 *   - `python_exercise_submissions_insert`          (rendre son travail)
 *   - `is_student_in_class(uuid)`                   (notebooks ET fichiers)
 *   - `is_notebook_assigned_to_student(uuid)`
 *   - `is_file_assigned_to_student(uuid)`
 *
 * Restent ouverts, comme partout ailleurs : l'exercice PUBLIC et la
 * distribution NOMINALE, qui ne passent par aucune classe.
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
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
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

describe('élève archivé — le domaine Python', () => {
	let classId: string;
	let teacherId: string;
	let teacherEmail: string;
	let classExerciseId: string;
	let publicExerciseId: string;
	let namedExerciseId: string;
	let classAssignmentId: string;
	let namedAssignmentId: string;
	let notebookId: string;
	let fileId: string;
	let activeStudentId: string;
	let activeStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	let archivedStudent: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
		teacherEmail = teacher.email;
		const klass = await TestData.class().withName('1re A python ZZ').create();
		classId = klass.id;

		const mk = async (status: string) => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profile.id, status });
			expect(error).toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};
		const active = await mk('active');
		activeStudentId = active.id;
		activeStudent = active.client;
		const archived = await mk('archived');
		archivedStudentId = archived.id;
		archivedStudent = archived.client;

		const mkExercise = async (title: string, isPublic: boolean) =>
			insert('python_exercises', {
				title,
				solution_code: 'print(1)',
				validation_config: {},
				author_id: teacherId,
				is_public: isPublic
			});
		classExerciseId = await mkExercise('Exo classe ZZ', false);
		publicExerciseId = await mkExercise('Exo public ZZ', true);
		namedExerciseId = await mkExercise('Exo nominatif ZZ', false);

		classAssignmentId = await insert('python_exercise_assignments', {
			exercise_id: classExerciseId,
			class_id: classId,
			assigned_by: teacherId
		});
		namedAssignmentId = await insert('python_exercise_assignments', {
			exercise_id: namedExerciseId,
			student_id: archivedStudentId,
			assigned_by: teacherId
		});

		notebookId = await insert('python_notebooks', {
			title: 'Carnet ZZ',
			// `valid_content_structure` exige version, metadata et cells (tableau).
			content: { version: '1.0', metadata: {}, cells: [] },
			author_id: teacherId
		});
		await insert('python_notebook_assignments', {
			notebook_id: notebookId,
			class_id: classId,
			shared_by: teacherId
		});

		fileId = await insert('python_files', {
			title: 'Fichier ZZ',
			code: 'print(2)',
			owner_id: teacherId
		});
		await insert('python_file_assignments', {
			file_id: fileId,
			class_id: classId,
			assigned_by: teacherId
		});
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function countVisible(
		client: SupabaseClient<Database>,
		table: string,
		column: string,
		value: string
	): Promise<number> {
		const { data, error } = await client
			.from(table as never)
			.select('id')
			.eq(column, value);
		expect(error).toBeNull();
		return (data ?? []).length;
	}

	// ── Exercices Python ───────────────────────────────────────────────────

	it('le témoin — l’élève actif voit la distribution et l’exercice', async () => {
		expect(
			await countVisible(activeStudent, 'python_exercise_assignments', 'id', classAssignmentId)
		).toBe(1);
		expect(await countVisible(activeStudent, 'python_exercises', 'id', classExerciseId)).toBe(1);
	});

	it('l’élève archivé ne voit plus la distribution de la classe', async () => {
		expect(
			await countVisible(archivedStudent, 'python_exercise_assignments', 'id', classAssignmentId)
		).toBe(0);
	});

	it('ni l’exercice lui-même', async () => {
		expect(await countVisible(archivedStudent, 'python_exercises', 'id', classExerciseId)).toBe(0);
	});

	it('et il ne peut plus y rendre de travail', async () => {
		// ⚠️ Le refus doit venir de `python_exercise_submissions`, la policy visée
		// ici — PAS de `python_exercise_mastery`, qui refuse TOUTE soumission de
		// TOUT élève (aucune policy INSERT, et le trigger qui l'alimente est
		// SECURITY INVOKER ; zéro soumission en production depuis toujours). Sans
		// cette distinction, le test serait vert sans rien prouver de la policy.
		const { error: insertError } = await archivedStudent
			.from('python_exercise_submissions')
			.insert({
				exercise_id: classExerciseId,
				assignment_id: classAssignmentId,
				student_id: archivedStudentId,
				code: 'print(3)',
				validation_result: {},
				is_correct: false,
				attempt_number: 1
			});
		expect(insertError?.code).toBe('42501');
		// Message EXACT : `toContain('python_exercise_submissions')` seul matcherait
		// aussi `permission denied for table …`, même SQLSTATE — une perte de GRANT
		// ferait alors passer ce test sans rien prouver de la policy.
		expect(insertError?.message).toContain(
			'row-level security policy for table "python_exercise_submissions"'
		);
	});

	it('l’exercice PUBLIC lui reste lisible, et sa soumission passe la policy', async () => {
		expect(await countVisible(archivedStudent, 'python_exercises', 'id', publicExerciseId)).toBe(1);

		const { error: insertError } = await archivedStudent
			.from('python_exercise_submissions')
			.insert({
				exercise_id: publicExerciseId,
				student_id: archivedStudentId,
				code: 'print(4)',
				validation_result: {},
				is_correct: true,
				attempt_number: 1
			});

		// La policy laisse passer : ce qui bloque ensuite est le défaut décrit
		// ci-dessus, commun à tous les élèves et sans rapport avec l'archivage.
		// TODO: ces deux assertions `python_exercise_mastery` deviendront rouges le
		// jour où ce défaut sera réparé (policy INSERT manquante sur la table, et
		// trigger `update_python_mastery_on_submission` en SECURITY INVOKER). Elles
		// devront alors attendre `insertError === null`.
		expect(insertError?.code).toBe('42501');
		expect(insertError?.message).toContain('python_exercise_mastery');
	});

	it('et l’exercice qui lui est distribué NOMINALEMENT', async () => {
		expect(
			await countVisible(archivedStudent, 'python_exercise_assignments', 'id', namedAssignmentId)
		).toBe(1);
		expect(await countVisible(archivedStudent, 'python_exercises', 'id', namedExerciseId)).toBe(1);
	});

	it('le témoin — l’élève ACTIF passe la policy de soumission', async () => {
		// Il bute sur le MÊME défaut `python_exercise_mastery` que l'élève
		// archivé : c'est la preuve que ce défaut est étranger à l'archivage, et
		// donc que le refus opposé plus haut à l'élève archivé vient bien de la
		// policy corrigée ici.
		const { error: insertError } = await activeStudent.from('python_exercise_submissions').insert({
			exercise_id: classExerciseId,
			assignment_id: classAssignmentId,
			student_id: activeStudentId,
			code: 'print(5)',
			validation_result: {},
			is_correct: true,
			attempt_number: 1
		});
		expect(insertError?.code).toBe('42501');
		expect(insertError?.message).toContain('python_exercise_mastery');
	});

	// ── Notebooks et fichiers ──────────────────────────────────────────────

	it('le témoin — l’élève actif lit le carnet et le fichier de la classe', async () => {
		expect(await countVisible(activeStudent, 'python_notebooks', 'id', notebookId)).toBe(1);
		expect(await countVisible(activeStudent, 'python_files', 'id', fileId)).toBe(1);
		expect(
			await countVisible(activeStudent, 'python_notebook_assignments', 'notebook_id', notebookId)
		).toBe(1);
		expect(await countVisible(activeStudent, 'python_file_assignments', 'file_id', fileId)).toBe(1);
	});

	it('l’élève archivé ne lit plus le carnet de la classe', async () => {
		// `is_notebook_assigned_to_student` pour le carnet, `is_student_in_class`
		// pour sa ligne de partage : deux objets distincts, deux portes.
		expect(await countVisible(archivedStudent, 'python_notebooks', 'id', notebookId)).toBe(0);
		expect(
			await countVisible(archivedStudent, 'python_notebook_assignments', 'notebook_id', notebookId)
		).toBe(0);
	});

	it('ni les points de contrôle du carnet de la classe', async () => {
		// 7ᵉ surface, fermée par effet de bord : la policy « Students can upsert own
		// checkpoint runs » appelle `is_notebook_assigned_to_student`. Sans ce test,
		// une régression y passerait inaperçue — elle n'apparaît ni dans le nom des
		// objets corrigés, ni dans l'en-tête de la migration.
		const { error: insertError } = await archivedStudent
			.from('python_notebook_checkpoint_runs')
			.insert({
				notebook_id: notebookId,
				user_id: archivedStudentId,
				cell_id: 'cell-zz',
				status: 'passed'
			});
		expect(insertError?.code).toBe('42501');

		const { error: activeError } = await activeStudent
			.from('python_notebook_checkpoint_runs')
			.insert({
				notebook_id: notebookId,
				user_id: activeStudentId,
				cell_id: 'cell-zz',
				status: 'passed'
			});
		expect(activeError).toBeNull();
	});

	it('le témoin — le professeur voit tout de sa classe', async () => {
		// La non-régression du professeur fait partie de la promesse : l'inscrire
		// ici plutôt que de la vérifier une fois à la main.
		const teacher = await clientFor(teacherEmail);
		expect(await countVisible(teacher, 'python_exercises', 'id', classExerciseId)).toBe(1);
		expect(await countVisible(teacher, 'python_notebooks', 'id', notebookId)).toBe(1);
		expect(await countVisible(teacher, 'python_files', 'id', fileId)).toBe(1);
	});

	it('ni le fichier Python de la classe', async () => {
		expect(await countVisible(archivedStudent, 'python_files', 'id', fileId)).toBe(0);
		expect(await countVisible(archivedStudent, 'python_file_assignments', 'file_id', fileId)).toBe(
			0
		);
	});
});
