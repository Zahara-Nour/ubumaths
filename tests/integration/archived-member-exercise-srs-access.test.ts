/**
 * L'élève archivé perd les exercices et les paquets SRS de la classe quittée
 * ===========================================================================
 *
 * Suite de la décision prise pour les fiches (20260912090000), étendue aux
 * deux surfaces voisines qui portaient le même trou :
 *
 *   - les EXERCICES distribués hors fiche, via `exercise_assignments`. Trois
 *     fonctions et trois policies lisaient `class_members` sans regarder
 *     `status`. ⚠️ Les policies permissives se combinent en OU : en corriger
 *     une sur deux ne ferme rien ;
 *   - les PAQUETS SRS, où le trou n'est pas dans la base mais dans le code qui
 *     attribue un paquet à une classe. Là, l'effet est ponctuel : un élève
 *     archivé était inscrit lors d'une NOUVELLE attribution.
 *
 * Ce qui ne bouge pas : l'exercice public, la distribution nominale, et
 * l'élève actif.
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

describe('élève archivé — exercices distribués hors fiche', () => {
	let classId: string;
	let teacherId: string;
	let classExerciseId: string;
	let publicExerciseId: string;
	let namedExerciseId: string;
	let activeStudentId: string;
	let activeStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	let archivedStudent: SupabaseClient<Database>;
	const createdTagIds: string[] = [];

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
		const klass = await TestData.class().withName('1re A exos ZZ').create();
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

		classExerciseId = ((await TestData.exercise(teacherId).create()) as { id: string }).id;
		publicExerciseId = ((await TestData.exercise(teacherId).create()) as { id: string }).id;
		namedExerciseId = ((await TestData.exercise(teacherId).create()) as { id: string }).id;

		const { error: publicError } = await service
			.from('exercises')
			.update({ is_public: true })
			.eq('id', publicExerciseId);
		expect(publicError).toBeNull();

		const { error: assignError } = await service.from('exercise_assignments').insert([
			{
				exercise_id: classExerciseId,
				assigned_by: teacherId,
				assigned_to_type: 'class',
				class_id: classId,
				is_active: true
			},
			{
				exercise_id: namedExerciseId,
				assigned_by: teacherId,
				assigned_to_type: 'student',
				student_id: archivedStudentId,
				is_active: true
			}
		]);
		expect(assignError).toBeNull();
	});

	afterAll(async () => {
		// `tags` n'est pas couverte par le nettoyage général : on retire les nôtres.
		if (createdTagIds.length > 0) {
			await service.from('tags').delete().in('id', createdTagIds);
		}
		await cleanupAllTestData();
	});

	async function hasExerciseAccess(
		client: SupabaseClient<Database>,
		studentId: string,
		exerciseId: string
	): Promise<boolean> {
		const { data, error } = await client.rpc(
			'student_has_exercise_access' as never,
			{
				p_exercise_id: exerciseId,
				p_student_id: studentId
			} as never
		);
		expect(error).toBeNull();
		return data === true;
	}

	/** Ce que la RLS de l'élève laisse voir de `exercise_assignments`. */
	async function visibleAssignments(
		client: SupabaseClient<Database>,
		exerciseId: string
	): Promise<number> {
		const { data, error } = await client
			.from('exercise_assignments')
			.select('id')
			.eq('exercise_id', exerciseId);
		expect(error).toBeNull();
		return (data ?? []).length;
	}

	it('le témoin — l’élève actif garde l’exercice de la classe', async () => {
		expect(await hasExerciseAccess(activeStudent, activeStudentId, classExerciseId)).toBe(true);
		expect(await visibleAssignments(activeStudent, classExerciseId)).toBe(1);
	});

	it('l’élève archivé n’a plus accès à l’exercice de la classe', async () => {
		expect(await hasExerciseAccess(archivedStudent, archivedStudentId, classExerciseId)).toBe(
			false
		);
	});

	it('et il ne voit plus la ligne de distribution', async () => {
		// Deux policies SELECT permissives couvrent cette table, et elles se
		// combinent en OU : en laisser une seule non corrigée suffirait à tout
		// rouvrir.
		expect(await visibleAssignments(archivedStudent, classExerciseId)).toBe(0);
	});

	it('un exercice PUBLIC lui reste ouvert', async () => {
		expect(await hasExerciseAccess(archivedStudent, archivedStudentId, publicExerciseId)).toBe(
			true
		);
	});

	it('un exercice qui lui est nommément distribué lui reste ouvert', async () => {
		// La distribution nominale ne passe par aucune classe.
		expect(await hasExerciseAccess(archivedStudent, archivedStudentId, namedExerciseId)).toBe(true);
		expect(await visibleAssignments(archivedStudent, namedExerciseId)).toBe(1);
	});

	it('la liste « mes exercices » ne contient plus celui de la classe', async () => {
		const { data, error } = await archivedStudent.rpc('get_my_exercise_assignments' as never);
		expect(error).toBeNull();
		const ids = ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
		expect(ids).not.toContain(classExerciseId);
		expect(ids).toContain(namedExerciseId);
	});

	it('mais la liste de l’élève ACTIF le contient toujours', async () => {
		const { data, error } = await activeStudent.rpc('get_my_exercise_assignments' as never);
		expect(error).toBeNull();
		const ids = ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
		expect(ids).toContain(classExerciseId);
	});

	// ========================================================================
	// L'ÉCRITURE — trois policies permissives, combinées en OU
	// ========================================================================

	it('l’élève archivé ne peut plus enregistrer de travail sur l’exercice de la classe', async () => {
		// Sans ce test, le trou restait invisible : `exercise_completions_insert`
		// se réduisait à `auth.uid() = student_id` et, combinée en OU, annulait
		// entièrement la policy d'accès. Un élève archivé qui connaît l'UUID de
		// l'exercice — il l'a forcément vu avant — continuait d'y écrire.
		const { error: insertError } = await archivedStudent
			.from('exercise_completions')
			.insert({ exercise_id: classExerciseId, student_id: archivedStudentId });

		expect(insertError).not.toBeNull();
		expect(insertError?.code).toBe('42501');
	});

	it('mais il peut toujours en enregistrer sur un exercice PUBLIC', async () => {
		const { error: insertError } = await archivedStudent
			.from('exercise_completions')
			.insert({ exercise_id: publicExerciseId, student_id: archivedStudentId });
		expect(insertError).toBeNull();
	});

	it('et sur celui qui lui est nommément distribué', async () => {
		const { error: insertError } = await archivedStudent
			.from('exercise_completions')
			.insert({ exercise_id: namedExerciseId, student_id: archivedStudentId });
		expect(insertError).toBeNull();
	});

	it('le témoin — l’élève actif enregistre bien son travail', async () => {
		const { error: insertError } = await activeStudent
			.from('exercise_completions')
			.insert({ exercise_id: classExerciseId, student_id: activeStudentId });
		expect(insertError).toBeNull();
	});

	it('une complétion existante ne peut plus être avancée après archivage', async () => {
		// L'UPDATE avait le même trou, sur DEUX policies : `_update` (sans
		// `with_check`, donc le `using` sert aussi au contrôle d'écriture) et
		// « Students can update their own completions », qui ne vérifiait que
		// l'identité.
		const { data: existing, error: seedError } = await service
			.from('exercise_completions')
			.insert({ exercise_id: classExerciseId, student_id: archivedStudentId })
			.select('id')
			.single();
		expect(seedError).toBeNull();

		const { data: updated, error: updateError } = await archivedStudent
			.from('exercise_completions')
			.update({ view_count: 42 })
			.eq('id', (existing as { id: string }).id)
			.select('id');

		// La RLS ne lève pas sur un UPDATE sans ligne visible : elle n'en met
		// simplement aucune à jour. C'est l'absence d'effet qu'il faut constater.
		expect(updateError).toBeNull();
		expect(updated ?? []).toHaveLength(0);

		const { data: after, error: afterError } = await service
			.from('exercise_completions')
			.select('view_count')
			.eq('id', (existing as { id: string }).id)
			.single();
		expect(afterError).toBeNull();
		expect((after as { view_count: number | null }).view_count).not.toBe(42);
	});

	// ========================================================================
	// La fonction morte depuis septembre
	// ========================================================================

	it('`get_student_exercises` ne lève plus 42P01', async () => {
		// Elle lisait `exercise_tags`, table supprimée en septembre au profit de
		// `resource_tags`. Elle levait donc à CHAQUE appel, et les trois appelants
		// de `exercise-assignments.ts` journalisaient l'erreur puis renvoyaient une
		// liste vide : trois écrans d'exercices élève affichaient « aucun exercice »
		// sans que rien ne le signale.
		const { error } = await service.rpc(
			'get_student_exercises' as never,
			{
				p_student_id: activeStudentId
			} as never
		);
		expect(error).toBeNull();
	});

	it('et elle rend bien les tags, désormais lus dans resource_tags', async () => {
		// Sans cette assertion, remplacer le bloc par un tableau vide constant
		// passerait le test précédent sans rien réparer.
		// Nom unique par exécution : `cleanupAllTestData` ne couvre pas `tags`, et
		// un nom fixe faisait échouer le second run sur une violation d'unicité.
		const tagName = `zz-tag-exos-${crypto.randomUUID().slice(0, 8)}`;
		const { data: tag, error: tagError } = await service
			.from('tags')
			.insert({ name: tagName })
			.select('id')
			.single();
		expect(tagError).toBeNull();
		createdTagIds.push((tag as { id: string }).id);

		const { error: linkError } = await service.from('resource_tags').insert({
			resource_kind: 'exercise',
			resource_id: classExerciseId,
			tag_id: (tag as { id: string }).id
		});
		expect(linkError).toBeNull();

		const { data, error } = await service.rpc(
			'get_student_exercises' as never,
			{
				p_student_id: activeStudentId
			} as never
		);
		expect(error).toBeNull();
		const row = ((data ?? []) as { exercise_id: string; tags: string[] }[]).find(
			(r) => r.exercise_id === classExerciseId
		);
		expect(row?.tags).toContain(tagName);
	});
});
