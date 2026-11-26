/**
 * Versions d'un exercice : la fiche choisit la sienne — (Supabase local requis)
 * ==============================================================================
 *
 * ADR 0044 (points 5 et 6), chantier versions-exercices, PR 3. Aucune migration : la policy
 * « Teachers can manage own worksheet exercises » laisse déjà l'auteur de la fiche modifier une
 * ligne, quel que soit l'état de la fiche. Personne ne gagne d'accès.
 *
 * Ce que le test prouve :
 * 1. `loadWorksheetVersionChoices` : seules les lignes dont l'exercice a plusieurs versions, leurs
 *    versions par numéro croissant, et le nombre d'affectations EN COURS de la fiche.
 * 2. Route `PUT …/exercises/[ligne]/version` : passer à la v2 sur une fiche publiée et distribuée,
 *    revenir à la v1 ; refusé sur une fiche archivée, pour la version d'un autre exercice, pour un
 *    élève (mono-professeur : il n'y a pas d'autre prof) ; hors route, la RLS refuse l'élève et la
 *    clé étrangère composée refuse la version d'un autre exercice ; la ligne ne bouge pas quand c'est refusé.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';

import { PUT as setLineVersionRoute } from '../../src/routes/api/worksheets/[id]/exercises/[exerciseId]/version/+server';
import { loadWorksheetVersionChoices } from '#lib/server/exercise-versions.ts';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const service = createServiceRoleClient();

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherLocals: App.Locals;
let studentLocals: App.Locals;
/** Fiche publiée, une affectation en cours, une terminée */
let worksheetId: string;
let archivedId: string;
/** Ligne de la fiche : exercice à deux versions, en v1 */
let lineId: string;
let archivedLineId: string;
let exerciseId: string;
let v1Id: string;
let v2Id: string;
/** Ligne de la fiche : exercice à une seule version */
let singleLineId: string;
let singleV1Id: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function localsOf(account: { id: string; email: string }): Promise<App.Locals> {
	const user = { id: account.id } as User;
	return {
		supabase: (await createAuthenticatedClient(account.email)) as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Le statut HTTP d'un handler qui peut lever `error(…)` de SvelteKit */
async function statusOf(
	call: () => Response | Promise<Response>
): Promise<{ status: number; body: string }> {
	try {
		const response = await call();
		return { status: response.status, body: await response.text() };
	} catch (e) {
		const { status, body } = e as { status?: number; body?: { message?: string } };
		if (typeof status !== 'number') throw e;
		return { status, body: body?.message ?? '' };
	}
}

function setVersion(locals: App.Locals, wsId: string, line: string, versionId: string) {
	return statusOf(() =>
		setLineVersionRoute({
			locals,
			params: { id: wsId, exerciseId: line },
			request: new Request('http://localhost/test', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ exercise_version_id: versionId })
			})
		} as unknown as Parameters<typeof setLineVersionRoute>[0])
	);
}

async function lineVersion(id: string): Promise<string> {
	const { data, error } = await service
		.from('worksheet_exercises')
		.select('exercise_version_id')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data.exercise_version_id;
}

async function firstVersion(id: string): Promise<string> {
	const { data, error } = await service
		.from('exercise_versions')
		.select('id')
		.eq('exercise_id', id)
		.eq('number', 1)
		.single();
	if (error) throw new Error(error.message);
	return data.id;
}

async function newWorksheet(status: 'published' | 'archived'): Promise<string> {
	const { data, error } = await service
		.from('worksheets')
		.insert({ title: `Fiche ${status}`, type: 'worksheet', status, created_by: teacherId })
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data.id;
}

async function addLine(wsId: string, exId: string, versionId: string, position: number) {
	const { data, error } = await service
		.from('worksheet_exercises')
		.insert({
			worksheet_id: wsId,
			exercise_id: exId,
			exercise_version_id: versionId,
			position
		})
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data.id;
}

// ============================================================================
// DÉCOR
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const t = await TestData.profile().withRole('teacher').create();
	const student = await TestData.profile().withRole('student').create();
	teacherId = t.id;
	teacherLocals = await localsOf(t);
	studentLocals = await localsOf(student);

	exerciseId = (await TestData.exercise(teacherId).create()).id;
	v1Id = await firstVersion(exerciseId);
	const { data: v2, error: v2Error } = await service
		.from('exercise_versions')
		.insert({ exercise_id: exerciseId, number: 2, created_by: teacherId, note: 'b) reformulée' })
		.select('id')
		.single();
	if (v2Error) throw new Error(v2Error.message);
	v2Id = v2.id;

	const singleId = (await TestData.exercise(teacherId).create()).id;
	singleV1Id = await firstVersion(singleId);

	worksheetId = await newWorksheet('published');
	lineId = await addLine(worksheetId, exerciseId, v1Id, 1);
	singleLineId = await addLine(worksheetId, singleId, singleV1Id, 2);
	const { error: aError } = await service.from('worksheet_assignments').insert([
		{ worksheet_id: worksheetId, status: 'active', created_by: teacherId },
		{ worksheet_id: worksheetId, status: 'completed', created_by: teacherId }
	]);
	if (aError) throw new Error(aError.message);

	archivedId = await newWorksheet('archived');
	archivedLineId = await addLine(archivedId, exerciseId, v1Id, 1);
});

afterAll(async () => {
	await service.from('worksheets').delete().eq('created_by', teacherId);
	await cleanupAllTestData();
});

// ============================================================================
// 1. CE QUE LA FICHE MONTRE
// ============================================================================

describe('loadWorksheetVersionChoices', () => {
	it('seules les lignes à plusieurs versions, par numéro, et les affectations en cours', async () => {
		const choices = await loadWorksheetVersionChoices(
			teacherLocals.supabase as unknown as SupabaseClient<Database>,
			worksheetId
		);
		expect(choices.active_assignments).toBe(1);
		expect(Object.keys(choices.lines)).toEqual([lineId]);
		expect(choices.lines[lineId].current_version_id).toBe(v1Id);
		expect(choices.lines[lineId].versions.map((v) => [v.id, v.number, v.note])).toEqual([
			[v1Id, 1, null],
			[v2Id, 2, 'b) reformulée']
		]);
		expect(singleLineId in choices.lines).toBe(false);
	});
});

// ============================================================================
// 2. CHANGER LA VERSION D'UNE LIGNE
// ============================================================================

describe('PUT /api/worksheets/[id]/exercises/[ligne]/version', () => {
	it('fiche publiée et distribuée : passe à la v2, puis revient à la v1', async () => {
		const toV2 = await setVersion(teacherLocals, worksheetId, lineId, v2Id);
		expect(toV2.status).toBe(200);
		expect(JSON.parse(toV2.body)).toEqual({ exercise_version_id: v2Id, number: 2 });
		expect(await lineVersion(lineId)).toBe(v2Id);

		const back = await setVersion(teacherLocals, worksheetId, lineId, v1Id);
		expect(back.status).toBe(200);
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('version d’un autre exercice : 400, la ligne ne bouge pas', async () => {
		const result = await setVersion(teacherLocals, worksheetId, lineId, singleV1Id);
		expect(result.status).toBe(400);
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('version inexistante (supprimée entre-temps) : 400', async () => {
		const result = await setVersion(teacherLocals, worksheetId, lineId, crypto.randomUUID());
		expect(result.status).toBe(400);
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('fiche archivée : 400, la ligne ne bouge pas', async () => {
		const result = await setVersion(teacherLocals, archivedId, archivedLineId, v2Id);
		expect(result.status).toBe(400);
		expect(await lineVersion(archivedLineId)).toBe(v1Id);
	});

	it('un élève : refusé, la ligne ne bouge pas', async () => {
		const result = await setVersion(studentLocals, worksheetId, lineId, v2Id);
		expect([403, 404]).toContain(result.status);
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('hors route, la base tient aussi : l’élève n’écrit rien (RLS, 0 ligne)', async () => {
		const studentClient = studentLocals.supabase as unknown as SupabaseClient<Database>;
		const { data, error } = await studentClient
			.from('worksheet_exercises')
			.update({ exercise_version_id: v2Id })
			.eq('id', lineId)
			.select('id');
		expect(error).toBeNull();
		expect(data ?? []).toEqual([]);
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('hors route, la base tient aussi : version d’un autre exercice refusée (23503)', async () => {
		const teacherClient = teacherLocals.supabase as unknown as SupabaseClient<Database>;
		const { error } = await teacherClient
			.from('worksheet_exercises')
			.update({ exercise_version_id: singleV1Id })
			.eq('id', lineId)
			.select('id');
		expect(error?.code).toBe('23503');
		expect(await lineVersion(lineId)).toBe(v1Id);
	});

	it('corps invalide (identifiant qui n’est pas un UUID) : 400', async () => {
		const result = await setVersion(teacherLocals, worksheetId, lineId, 'v2');
		expect(result.status).toBe(400);
	});
});
