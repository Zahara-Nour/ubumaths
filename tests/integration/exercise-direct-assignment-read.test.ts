/**
 * Un élève LIT l'exercice qui lui est assigné hors fiche (E78)
 * ============================================================
 *
 * `student_has_exercise_access(uuid)` garde la policy de lecture d'`exercises` et
 * ne regardait que les fiches : un exercice assigné directement (`exercise_assignments`)
 * restait masqué, la page de l'élève répondait 404 alors que la route d'accès disait oui.
 *
 * Question d'accès tranchée par David (2026-11-25 et 2026-11-26) :
 *   - assigné à un élève → cet élève le lit, son camarade de classe non ;
 *   - assigné à une classe → ses membres ACTIFS le lisent ; ni l'élève archivé,
 *     ni l'élève d'une autre classe ;
 *   - assignation « public » (onglet « Rendre public », retiré) → n'ouvre RIEN ;
 *   - assignation désactivée → n'ouvre rien ;
 *   - assignation posée par un autre que l'auteur de l'exercice → n'ouvre rien
 *     (personne ne lit l'exercice privé d'un autre en se l'assignant : essayé avec l'admin,
 *     seul autre compte capable d'assigner dans une base mono-professeur).
 *
 * On lit la TABLE avec le client de l'élève (ce que la RLS laisse voir), jamais
 * la fonction seule : c'est la ligne masquée qui faisait le 404. Les versions
 * (`exercise_versions`) suivent la lecture de l'exercice.
 *
 * Le chemin « fiche » de la même fonction (inchangé) est tenu par
 * `worksheet-assignment-voies.test.ts` et `archived-member-worksheet-access.test.ts`.
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
import type { Database } from '#lib/types/database.ts';

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

/** Nombre de lignes d'`exercises` que la RLS laisse lire à ce client pour cet exercice */
async function readableExercises(
	client: SupabaseClient<Database>,
	exerciseId: string
): Promise<number> {
	const { data, error } = await client.from('exercises').select('id').eq('id', exerciseId);
	expect(error).toBeNull();
	return (data ?? []).length;
}

/** Nombre de versions de cet exercice que la RLS laisse lire à ce client */
async function readableVersions(
	client: SupabaseClient<Database>,
	exerciseId: string
): Promise<number> {
	const { data, error } = await client
		.from('exercise_versions')
		.select('id')
		.eq('exercise_id', exerciseId);
	expect(error).toBeNull();
	return (data ?? []).length;
}

describe('E78 — lecture d’un exercice assigné hors fiche', () => {
	let namedExerciseId: string;
	let classExerciseId: string;
	let inactiveExerciseId: string;
	let publicAssignmentExerciseId: string;
	let unassignedExerciseId: string;
	let archivedNamedExerciseId: string;
	let named: SupabaseClient<Database>;
	let classmate: SupabaseClient<Database>;
	let archived: SupabaseClient<Database>;
	let outsider: SupabaseClient<Database>;
	let anonymous: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;
	let adminId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		// Un seul professeur par base (invariant mono-professeur) : l'autre compte capable
		// d'assigner est l'admin.
		const colleague = await TestData.profile().withRole('admin').create();
		adminId = colleague.id;
		admin = await clientFor(colleague.email);
		const klass = await TestData.class().withName('1re A lecture ZZ').create();
		const otherClass = await TestData.class().withName('1re B lecture ZZ').create();

		const mk = async (classId: string, status: string) => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profile.id, status });
			expect(error).toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};
		const namedStudent = await mk(klass.id, 'active');
		named = namedStudent.client;
		classmate = (await mk(klass.id, 'active')).client;
		const archivedStudent = await mk(klass.id, 'archived');
		archived = archivedStudent.client;
		outsider = (await mk(otherClass.id, 'active')).client;
		anonymous = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		const mkExercise = async () =>
			((await TestData.exercise(teacher.id).create()) as { id: string }).id;
		namedExerciseId = await mkExercise();
		classExerciseId = await mkExercise();
		inactiveExerciseId = await mkExercise();
		publicAssignmentExerciseId = await mkExercise();
		unassignedExerciseId = await mkExercise();
		archivedNamedExerciseId = await mkExercise();

		const { error: assignError } = await service.from('exercise_assignments').insert([
			{
				exercise_id: namedExerciseId,
				assigned_by: teacher.id,
				assigned_to_type: 'student',
				student_id: namedStudent.id,
				is_active: true
			},
			{
				exercise_id: classExerciseId,
				assigned_by: teacher.id,
				assigned_to_type: 'class',
				class_id: klass.id,
				is_active: true
			},
			{
				exercise_id: inactiveExerciseId,
				assigned_by: teacher.id,
				assigned_to_type: 'student',
				student_id: namedStudent.id,
				is_active: false
			},
			{
				exercise_id: archivedNamedExerciseId,
				assigned_by: teacher.id,
				assigned_to_type: 'student',
				student_id: archivedStudent.id,
				is_active: true
			},
			{
				exercise_id: publicAssignmentExerciseId,
				assigned_by: teacher.id,
				assigned_to_type: 'public',
				is_active: true
			}
		]);
		expect(assignError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// ========================================================================
	// ASSIGNÉ À UN ÉLÈVE
	// ========================================================================

	it('l’élève désigné lit l’exercice et sa version', async () => {
		expect(await readableExercises(named, namedExerciseId)).toBe(1);
		expect(await readableVersions(named, namedExerciseId)).toBeGreaterThan(0);
	});

	it('son camarade de classe ne le lit pas', async () => {
		expect(await readableExercises(classmate, namedExerciseId)).toBe(0);
		expect(await readableVersions(classmate, namedExerciseId)).toBe(0);
	});

	it('une assignation désactivée n’ouvre rien', async () => {
		expect(await readableExercises(named, inactiveExerciseId)).toBe(0);
	});

	// ========================================================================
	// ASSIGNÉ À UNE CLASSE
	// ========================================================================

	it('les membres actifs de la classe lisent l’exercice et sa version', async () => {
		expect(await readableExercises(named, classExerciseId)).toBe(1);
		expect(await readableExercises(classmate, classExerciseId)).toBe(1);
		expect(await readableVersions(classmate, classExerciseId)).toBeGreaterThan(0);
	});

	it('l’élève archivé de la classe ne le lit pas', async () => {
		expect(await readableExercises(archived, classExerciseId)).toBe(0);
	});

	it('mais il lit l’exercice qui lui est assigné en propre (aucune classe en jeu)', async () => {
		expect(await readableExercises(archived, archivedNamedExerciseId)).toBe(1);
		expect(await readableExercises(classmate, archivedNamedExerciseId)).toBe(0);
	});

	it('l’élève d’une autre classe ne le lit pas', async () => {
		expect(await readableExercises(outsider, classExerciseId)).toBe(0);
	});

	// ========================================================================
	// CE QUI N'OUVRE RIEN
	// ========================================================================

	it('une assignation « public » n’ouvre l’exercice à aucun élève', async () => {
		expect(await readableExercises(named, publicAssignmentExerciseId)).toBe(0);
		expect(await readableExercises(outsider, publicAssignmentExerciseId)).toBe(0);
	});

	it('l’admin ne lit pas l’exercice du prof en se l’assignant à lui-même', async () => {
		expect(await readableExercises(admin, unassignedExerciseId), 'avant').toBe(0);
		// L'insertion passe par SON client : la policy `exercise_assignments_insert` ne regarde pas
		// à qui est l'exercice. C'est la fonction de lecture qui doit refuser.
		const { error } = await admin.from('exercise_assignments').insert({
			exercise_id: unassignedExerciseId,
			assigned_by: adminId,
			assigned_to_type: 'student',
			student_id: adminId,
			is_active: true
		});
		expect(error).toBeNull();
		expect(await readableExercises(admin, unassignedExerciseId)).toBe(0);
		expect(await readableVersions(admin, unassignedExerciseId)).toBe(0);
	});

	it('un élève ne peut pas s’assigner un exercice', async () => {
		const { data: me } = await named.auth.getUser();
		const { error } = await named.from('exercise_assignments').insert({
			exercise_id: unassignedExerciseId,
			assigned_by: me.user?.id ?? '',
			assigned_to_type: 'student',
			student_id: me.user?.id ?? '',
			is_active: true
		});
		expect(error?.code).toBe('42501');
	});

	it('un exercice sans assignation reste masqué', async () => {
		expect(await readableExercises(named, unassignedExerciseId)).toBe(0);
	});

	it('le visiteur non connecté ne lit aucun de ces exercices', async () => {
		for (const id of [namedExerciseId, classExerciseId, publicAssignmentExerciseId]) {
			expect(await readableExercises(anonymous, id)).toBe(0);
		}
	});
});
