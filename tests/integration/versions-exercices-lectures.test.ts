/**
 * Versions d'un exercice : quelle version chaque route lit et écrit — (Supabase local requis)
 * ==========================================================================================
 *
 * ADR 0044, chantier versions-exercices, PR 1. Les jointures PostgREST sont des CHAÎNES, invisibles
 * au typecheck, et les tests unitaires les simulent : seul un appel réel les prouve. Chaque route
 * est appelée avec le client CONNECTÉ du prof ou de l'élève (RLS active).
 *
 * Décor : un exercice en v1, mis dans une fiche distribuée, PUIS passé en v2 (la fiche reste en v1).
 * - dans la fiche (éditeur, copie de l'élève, aperçu, signalement, tuteur, copie de la fiche) : v1 ;
 * - hors fiche (getExercise, getExercises, liste du prof, page publique, nouvelle ligne de fiche) : v2 ;
 * - écritures : création → v1, modification → la dernière, import → v1, import « remplacer » →
 *   la dernière, correction après signalement → la version de la fiche signalée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { GET as getWorksheet } from '../../src/routes/api/worksheets/[id]/+server';
import {
	GET as getWorksheetLines,
	POST as addWorksheetLine
} from '../../src/routes/api/worksheets/[id]/exercises/+server';
import { POST as duplicateWorksheet } from '../../src/routes/api/worksheets/[id]/duplicate/+server';
import { GET as getStudentWorksheet } from '../../src/routes/api/student/worksheets/[assignmentId]/+server';
import { GET as getPreview } from '../../src/routes/api/worksheets/assignments/[assignmentId]/preview/+server';
import { GET as getCorrection } from '../../src/routes/api/worksheets/assignments/[assignmentId]/correction/+server';
import {
	GET as getReport,
	PUT as reviewReport
} from '../../src/routes/api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]/+server';
import { POST as startTutor } from '../../src/routes/api/tutor/conversations/+server';
import {
	createExercise,
	getExercise,
	getExerciseBySlug,
	getTeacherExercises,
	updateExercise
} from '../../src/lib/server/exercises';
import { importExerciseFromJSON } from '../../src/lib/server/exercise-import-export';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// TYPES
// ============================================================================

interface Variation {
	label: string;
	statement_md: string;
	solution_md: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const V1: Variation[] = [{ label: 'guidé', statement_md: 'Énoncé v1', solution_md: 'Corrigé v1' }];
const V2: Variation[] = [{ label: 'guidé', statement_md: 'Énoncé v2', solution_md: 'Corrigé v2' }];

const service = createServiceRoleClient();

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherLocals: App.Locals;
let teacherClient: SupabaseClient<Database>;
let studentId: string;
let studentLocals: App.Locals;
let exerciseId: string;
let exerciseSlug: string;
let v1Id: string;
let v2Id: string;
let worksheetId: string;
let lineId: string;
let assignmentId: string;
let classId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Les `locals` d'un compte CONNECTÉ : son propre client, RLS active. */
async function localsOf(account: { id: string; email: string }): Promise<App.Locals> {
	const user = { id: account.id } as User;
	return {
		supabase: (await createAuthenticatedClient(account.email)) as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function jsonRequest(body: unknown): Request {
	return new Request('http://localhost/test', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function json<T>(response: Response): Promise<T> {
	expect(response.status).toBeLessThan(300);
	return (await response.json()) as T;
}

/** Énoncés de toutes les versions de l'exercice, par numéro */
async function statementsByVersion(id: string): Promise<Record<number, string>> {
	const { data, error } = await service
		.from('exercise_versions')
		.select('number, variations')
		.eq('exercise_id', id);
	if (error) throw new Error(error.message);
	return Object.fromEntries(
		(data ?? []).map((v) => [v.number, (v.variations as unknown as Variation[])[0]?.statement_md])
	);
}

// ============================================================================
// DÉCOR
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();

	const teacher = await TestData.profile().withRole('teacher').create();
	const student = await TestData.profile().withRole('student').create();
	teacherId = teacher.id;
	studentId = student.id;
	teacherLocals = await localsOf(teacher);
	teacherClient = teacherLocals.supabase as unknown as SupabaseClient<Database>;
	studentLocals = await localsOf(student);

	classId = ((await TestData.class().create()) as { id: string }).id;
	await service.from('class_members').insert({ class_id: classId, student_id: studentId });

	// Exercice v1, public (page publique), dans une fiche distribuée
	const exercise = await TestData.exercise(teacherId).create();
	exerciseId = exercise.id;
	exerciseSlug = `itest-versions-${Date.now().toString(36)}`;
	await service
		.from('exercises')
		.update({ is_public: true, slug: exerciseSlug, title: 'Exercice versionné' })
		.eq('id', exerciseId);
	const { data: v1 } = await service
		.from('exercise_versions')
		.update({ variations: V1 as never })
		.eq('exercise_id', exerciseId)
		.eq('number', 1)
		.select('id')
		.single();
	v1Id = (v1 as { id: string }).id;

	const { data: ws, error: wsError } = await service
		.from('worksheets')
		.insert({ title: 'Fiche en v1', type: 'worksheet', status: 'published', created_by: teacherId })
		.select('id')
		.single();
	if (wsError) throw new Error(`fiche : ${wsError.message}`);
	worksheetId = ws.id;
	const { data: line, error: lineError } = await service
		.from('worksheet_exercises')
		.insert({
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			exercise_version_id: v1Id,
			position: 1
		})
		.select('id')
		.single();
	if (lineError) throw new Error(`ligne : ${lineError.message}`);
	lineId = line.id;

	const { data: assignment, error: aError } = await service
		.from('worksheet_assignments')
		.insert({ worksheet_id: worksheetId, status: 'active', created_by: teacherId })
		.select('id')
		.single();
	if (aError) throw new Error(`affectation : ${aError.message}`);
	assignmentId = assignment.id;
	await service
		.from('worksheet_assignment_classes')
		.insert({ assignment_id: assignmentId, class_id: classId });

	// v2 : la fiche reste en v1
	const { data: v2, error: v2Error } = await service
		.from('exercise_versions')
		.insert({
			exercise_id: exerciseId,
			number: 2,
			created_by: teacherId,
			variations: V2 as never
		})
		.select('id')
		.single();
	if (v2Error) throw new Error(`v2 : ${v2Error.message}`);
	v2Id = v2.id;
});

afterAll(async () => {
	await service.from('worksheets').delete().eq('created_by', teacherId);
	await cleanupAllTestData();
});

// ============================================================================
// DANS LA FICHE : la v1
// ============================================================================

describe('dans la fiche restée en v1', () => {
	it('éditeur de fiche (GET /api/worksheets/[id]) : v1, et la ligne dit sa version', async () => {
		const body = await json<{
			worksheet: {
				exercises: { exercise_version_id?: string; exercise: { variations: Variation[] } }[];
			};
		}>(await getWorksheet({ locals: teacherLocals, params: { id: worksheetId } } as never));
		expect(body.worksheet.exercises).toHaveLength(1);
		expect(body.worksheet.exercises[0].exercise.variations).toEqual(V1);
		expect(body.worksheet.exercises[0].exercise_version_id).toBe(v1Id);
	});

	it('lignes de la fiche (GET /api/worksheets/[id]/exercises) : v1', async () => {
		const body = await json<{ exercises: { exercise: { variations: Variation[] } }[] }>(
			await getWorksheetLines({ locals: teacherLocals, params: { id: worksheetId } } as never)
		);
		expect(body.exercises[0].exercise.variations).toEqual(V1);
	});

	it('copie de l’élève (GET /api/student/worksheets/[assignmentId]) : v1', async () => {
		const body = await json<{ exercises?: { statement: string }[]; data?: unknown }>(
			await getStudentWorksheet({
				locals: studentLocals,
				params: { assignmentId },
				url: new URL('http://localhost/test')
			} as never)
		);
		const text = JSON.stringify(body);
		expect(text).toContain('Énoncé v1');
		expect(text).not.toContain('Énoncé v2');
	});

	it('aperçu du prof (GET …/preview) : v1', async () => {
		const text = JSON.stringify(
			await json(
				await getPreview({
					locals: teacherLocals,
					params: { assignmentId },
					url: new URL('http://localhost/test')
				} as never)
			)
		);
		expect(text).toContain('Énoncé v1');
		expect(text).not.toContain('Énoncé v2');
	});

	it('corrigé de la classe (GET …/correction) : v1', async () => {
		const text = JSON.stringify(
			await json(
				await getCorrection({
					locals: teacherLocals,
					params: { assignmentId },
					url: new URL('http://localhost/test?format=json')
				} as never)
			)
		);
		expect(text).toContain('Corrigé v1');
		expect(text).not.toContain('Corrigé v2');
	});

	it('tuteur : le corrigé est celui de la version de la fiche', async () => {
		const response = await startTutor({
			locals: studentLocals,
			request: jsonRequest({ exerciseId, assignmentId, statement: 'Énoncé v1', classId })
		} as never);
		expect(response.status).toBeLessThan(300);
		const { data } = await service
			.from('tutor_conversations')
			.select('exercise_correction')
			.eq('student_id', studentId)
			.eq('assignment_id', assignmentId)
			.single();
		expect(data?.exercise_correction).toBe('Corrigé v1');
	});

	it('signalement : le prof lit la v1, sa correction modifie la v1 et pas la v2', async () => {
		const { data: report, error } = await service
			.from('worksheet_error_reports')
			.insert({
				assignment_id: assignmentId,
				worksheet_exercise_id: lineId,
				student_id: studentId,
				description: 'Il manque une parenthèse'
			})
			.select('id')
			.single();
		if (error) throw new Error(`signalement : ${error.message}`);
		const params = { id: worksheetId, assignmentId, reportId: report.id };

		const detail = await json<{ exercise: { variations: Variation[] } }>(
			await getReport({ locals: teacherLocals, params } as never)
		);
		expect(detail.exercise.variations[0].statement_md).toBe('Énoncé v1');

		const corrige = [{ ...V1[0], statement_md: 'Énoncé v1 corrigé' }];
		const reviewed = await reviewReport({
			locals: teacherLocals,
			params,
			request: jsonRequest({ status: 'fixed', response: 'Merci !', variations: corrige })
		} as never);
		expect(reviewed.status).toBeLessThan(300);
		expect(await statementsByVersion(exerciseId)).toEqual({
			1: 'Énoncé v1 corrigé',
			2: 'Énoncé v2'
		});
		// Remise en état pour les tests suivants
		await service
			.from('exercise_versions')
			.update({ variations: V1 as never })
			.eq('id', v1Id);
	});

	it('copie de la fiche (POST …/duplicate) : la copie garde la v1', async () => {
		const body = await json<{ worksheet?: { id: string }; id?: string; data?: { id: string } }>(
			await duplicateWorksheet({
				locals: teacherLocals,
				params: { id: worksheetId },
				request: jsonRequest({})
			} as never)
		);
		const copyId = body.worksheet?.id ?? body.data?.id ?? body.id;
		expect(copyId).toBeTruthy();
		const { data } = await service
			.from('worksheet_exercises')
			.select('exercise_version_id')
			.eq('worksheet_id', copyId as string);
		expect(data).toEqual([{ exercise_version_id: v1Id }]);
	});
});

// ============================================================================
// HORS FICHE : la dernière version
// ============================================================================

describe('hors fiche : la dernière version', () => {
	it('getExercise, getExerciseBySlug (page publique), liste du prof : v2', async () => {
		const one = await getExercise(teacherClient, exerciseId);
		expect(one.data?.variations).toEqual(V2);
		const bySlug = await getExerciseBySlug(teacherClient, exerciseSlug);
		expect(bySlug.data?.variations).toEqual(V2);
		const list = await getTeacherExercises(teacherClient, teacherId);
		const row = (list.data ?? []).find((e) => (e as { id: string }).id === exerciseId) as
			{ variations: unknown } | undefined;
		expect(row?.variations).toEqual(V2);
	});

	it('ajouter l’exercice à un brouillon de fiche (POST …/exercises) : la ligne prend la v2', async () => {
		// Seul un brouillon reçoit des exercices
		const { data: draft, error: draftError } = await service
			.from('worksheets')
			.insert({ title: 'Brouillon', type: 'worksheet', status: 'draft', created_by: teacherId })
			.select('id')
			.single();
		if (draftError) throw new Error(`brouillon : ${draftError.message}`);
		const response = await addWorksheetLine({
			locals: teacherLocals,
			params: { id: draft.id },
			request: jsonRequest({ exercise_id: exerciseId, position: 1 })
		} as never);
		expect(response.status).toBeLessThan(300);
		const { data } = await service
			.from('worksheet_exercises')
			.select('exercise_version_id')
			.eq('worksheet_id', draft.id);
		expect(data).toEqual([{ exercise_version_id: v2Id }]);
	});
});

// ============================================================================
// ÉCRITURES
// ============================================================================

describe('écritures', () => {
	it('création → v1 avec le contenu ; la ligne d’exercises ne le porte pas', async () => {
		const created = await createExercise(
			teacherClient,
			{ title: 'Créé en test', category: 'automatisme', variations: V1 as never } as never,
			teacherId
		);
		expect(created.error).toBeNull();
		const id = created.data?.id as string;
		expect(created.data?.variations).toEqual(V1);
		expect(await statementsByVersion(id)).toEqual({ 1: 'Énoncé v1' });
	});

	it('modification → la dernière version, l’ancienne intacte', async () => {
		const updated = await updateExercise(
			teacherClient,
			exerciseId,
			{ variations: [{ ...V2[0], statement_md: 'Énoncé v2 retouché' }] as never },
			teacherId
		);
		expect(updated.error).toBeNull();
		expect(await statementsByVersion(exerciseId)).toEqual({
			1: 'Énoncé v1',
			2: 'Énoncé v2 retouché'
		});
		await service
			.from('exercise_versions')
			.update({ variations: V2 as never })
			.eq('id', v2Id);
	});

	it('modification de la fiche d’identité seule : aucune version touchée', async () => {
		const before = await service
			.from('exercise_versions')
			.select('updated_at')
			.eq('id', v2Id)
			.single();
		const updated = await updateExercise(
			teacherClient,
			exerciseId,
			{ title: 'Renommé' },
			teacherId
		);
		expect(updated.error).toBeNull();
		expect(updated.data?.variations).toEqual(V2);
		const after = await service
			.from('exercise_versions')
			.select('updated_at')
			.eq('id', v2Id)
			.single();
		expect(after.data?.updated_at).toBe(before.data?.updated_at);
	});

	it('import → v1 ; import « remplacer » → la dernière version', async () => {
		const file = {
			version: '2.0',
			title: 'Importé en test',
			category: 'automatisme',
			statement_md: 'Énoncé importé',
			solution_md: 'Corrigé importé',
			variations: [
				{ label: 'guidé', statement_md: 'Énoncé importé', solution_md: 'Corrigé importé' }
			]
		};
		const first = await importExerciseFromJSON(teacherClient, file, teacherId);
		expect(first.error).toBeUndefined();
		const id = first.exerciseId as string;
		expect(await statementsByVersion(id)).toEqual({ 1: 'Énoncé importé' });

		// Une v2, puis le même fichier, corrigé, en « remplacer »
		await service.from('exercise_versions').insert({
			exercise_id: id,
			number: 2,
			created_by: teacherId,
			variations: file.variations as never
		});
		const replaced = await importExerciseFromJSON(
			teacherClient,
			{
				...file,
				variations: [{ ...file.variations[0], solution_md: 'Corrigé remplacé' }]
			},
			teacherId,
			{ onDuplicate: 'replace', validate: true }
		);
		expect(replaced.error).toBeUndefined();
		expect(replaced.exerciseId).toBe(id);
		const { data } = await service
			.from('exercise_versions')
			.select('number, variations')
			.eq('exercise_id', id)
			.order('number');
		expect(
			(data ?? []).map((v) => (v.variations as unknown as Variation[])[0].solution_md)
		).toEqual(['Corrigé importé', 'Corrigé remplacé']);
	});
});
