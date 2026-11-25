/**
 * Versions d'un exercice : l'éditeur — (Supabase local requis)
 * =============================================================
 *
 * Migration `20261125183550_versions_exercices_editeur` (ADR 0044, chantier versions-exercices,
 * PR 2). Question d'accès tranchée par David : personne ne gagne d'accès ; les fonctions ont les
 * droits de l'appelant.
 *
 * Ce que le test prouve :
 * 1. `latest_exercise_versions` : la dernière version de chaque exercice, et seulement de ceux que
 *    l'appelant lit (anon : les publics).
 * 2. `create_exercise_version` : « Nouvelle version » recopie la DERNIÈRE, numéro suivant, note
 *    gardée ; un élève ne crée rien.
 * 3. `save_exercise_with_version` : identité et contenu écrits ensemble, ou pas du tout (version
 *    d'un autre exercice, colonne inconnue ou interdite) ; un élève n'écrit rien.
 * 4. Déclencheur : écrire une version rajeunit `exercises.updated_at` ; supprimer un exercice qui a
 *    des versions passe toujours.
 * 5. Routes : création, liste (avec les fiches qui utilisent chaque version), note, suppression
 *    (refusée si une fiche l'utilise ou si c'est la seule), modification d'une version précise.
 *
 * Chaque acteur passe par son client CONNECTÉ (RLS active) ; le décor et les vérifications passent
 * par le client service (hors RLS).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import {
	GET as listVersionsRoute,
	POST as createVersionRoute
} from '../../src/routes/api/exercises/[id]/versions/+server';
import {
	PATCH as patchVersionRoute,
	DELETE as deleteVersionRoute
} from '../../src/routes/api/exercises/[id]/versions/[versionId]/+server';
import { PUT as putExerciseRoute } from '../../src/routes/api/exercises/[id]/+server';
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

interface VersionListed {
	id: string;
	number: number;
	note: string | null;
	worksheets: { id: string; title: string; active_assignments: number }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const V1: Variation[] = [{ label: 'guidé', statement_md: 'Énoncé v1', solution_md: 'Corrigé v1' }];
const V2: Variation[] = [{ label: 'guidé', statement_md: 'Énoncé v2', solution_md: 'Corrigé v2' }];
const FICHE_TITLE = 'Fiche distribuée en v1';

const service = createServiceRoleClient();

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherLocals: App.Locals;
let teacher: SupabaseClient<Database>;
let student: SupabaseClient<Database>;
let visitor: SupabaseClient<Database>;
/** Privé, v1 (dans une fiche distribuée) puis v2 */
let exerciseId: string;
let v1Id: string;
let v2Id: string;
/** Public, une seule version */
let publicId: string;

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

function request(method: string, body?: unknown): Request {
	return new Request('http://localhost/test', {
		method,
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
}

/** Le statut HTTP d'un handler qui peut lever `error(…)` de SvelteKit */
async function statusOf(call: () => Promise<Response>): Promise<{ status: number; body: string }> {
	try {
		const response = await call();
		return { status: response.status, body: await response.text() };
	} catch (e) {
		const { status, body } = e as { status?: number; body?: { message?: string } };
		if (typeof status !== 'number') throw e;
		return { status, body: body?.message ?? '' };
	}
}

async function versionsOf(id: string) {
	const { data, error } = await service
		.from('exercise_versions')
		.select('id, number, note, variations')
		.eq('exercise_id', id)
		.order('number');
	if (error) throw new Error(error.message);
	return data ?? [];
}

async function titleOf(id: string): Promise<string> {
	const { data, error } = await service.from('exercises').select('title').eq('id', id).single();
	if (error) throw new Error(error.message);
	return data.title;
}

async function newExercise(): Promise<{ id: string; v1: string }> {
	const exercise = await TestData.exercise(teacherId).create();
	const [v1] = await versionsOf(exercise.id);
	return { id: exercise.id, v1: v1.id };
}

// ============================================================================
// DÉCOR
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	visitor = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const t = await TestData.profile().withRole('teacher').create();
	const s = await TestData.profile().withRole('student').create();
	teacherId = t.id;
	teacherLocals = await localsOf(t);
	teacher = teacherLocals.supabase as unknown as SupabaseClient<Database>;
	student = (await createAuthenticatedClient(s.email)) as unknown as SupabaseClient<Database>;

	const classId = ((await TestData.class().create()) as { id: string }).id;
	await service.from('class_members').insert({ class_id: classId, student_id: s.id });

	({ id: exerciseId, v1: v1Id } = await newExercise());
	await service
		.from('exercise_versions')
		.update({ variations: V1 as never })
		.eq('id', v1Id);

	const { data: ws, error: wsError } = await service
		.from('worksheets')
		.insert({ title: FICHE_TITLE, type: 'worksheet', status: 'published', created_by: teacherId })
		.select('id')
		.single();
	if (wsError) throw new Error(wsError.message);
	await service.from('worksheet_exercises').insert({
		worksheet_id: ws.id,
		exercise_id: exerciseId,
		exercise_version_id: v1Id,
		position: 1
	});
	const { data: assignment } = await service
		.from('worksheet_assignments')
		.insert({ worksheet_id: ws.id, status: 'active', created_by: teacherId })
		.select('id')
		.single();
	// L'élève lit l'exercice (fiche distribuée à sa classe) : il pourrait tenter d'écrire
	await service
		.from('worksheet_assignment_classes')
		.insert({ assignment_id: (assignment as { id: string }).id, class_id: classId });

	const { data: v2, error: v2Error } = await service
		.from('exercise_versions')
		.insert({ exercise_id: exerciseId, number: 2, created_by: teacherId, variations: V2 as never })
		.select('id')
		.single();
	if (v2Error) throw new Error(v2Error.message);
	v2Id = v2.id;

	({ id: publicId } = await newExercise());
	await service.from('exercises').update({ is_public: true }).eq('id', publicId);
});

afterAll(async () => {
	await service.from('worksheets').delete().eq('created_by', teacherId);
	await cleanupAllTestData();
});

// ============================================================================
// 1. DERNIÈRE VERSION
// ============================================================================

describe('latest_exercise_versions', () => {
	it('le prof : la dernière version de chacun de ses exercices', async () => {
		const { data, error } = await teacher.rpc('latest_exercise_versions', {
			p_exercise_ids: [exerciseId, publicId]
		});
		expect(error).toBeNull();
		const byExercise = Object.fromEntries((data ?? []).map((v) => [v.exercise_id, v.number]));
		expect(byExercise).toEqual({ [exerciseId]: 2, [publicId]: 1 });
	});

	it('un visiteur sans compte : seulement l’exercice public', async () => {
		const { data, error } = await visitor.rpc('latest_exercise_versions', {
			p_exercise_ids: [exerciseId, publicId]
		});
		expect(error).toBeNull();
		expect((data ?? []).map((v) => v.exercise_id)).toEqual([publicId]);
	});
});

// ============================================================================
// 2. NOUVELLE VERSION
// ============================================================================

describe('create_exercise_version', () => {
	it('recopie la dernière version, numéro suivant, note sans espaces autour', async () => {
		const { id } = await newExercise();
		await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId, variations: V2 as never });

		const { data, error } = await teacher.rpc('create_exercise_version', {
			p_exercise_id: id,
			p_note: '  question b) reformulée  '
		});
		expect(error).toBeNull();
		expect(data?.number).toBe(3);
		expect(data?.note).toBe('question b) reformulée');
		expect(data?.variations).toEqual(V2);
		expect((await versionsOf(id)).map((v) => v.number)).toEqual([1, 2, 3]);
	});

	it('un élève qui lit l’exercice ne crée aucune version', async () => {
		const { error } = await student.rpc('create_exercise_version', { p_exercise_id: exerciseId });
		expect(error).not.toBeNull();
		expect((await versionsOf(exerciseId)).map((v) => v.number)).toEqual([1, 2]);
	});
});

// ============================================================================
// 3. IDENTITÉ + CONTENU, ENSEMBLE
// ============================================================================

describe('save_exercise_with_version', () => {
	it('écrit le titre et le contenu de la version demandée, rien d’autre', async () => {
		const { id, v1 } = await newExercise();
		const { data: v2 } = await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId, variations: V2 as never })
			.select('id')
			.single();

		const { error } = await teacher.rpc('save_exercise_with_version', {
			p_exercise_id: id,
			p_identity: { title: 'Titre neuf', grades: ['6', '5'] },
			p_content: { variations: V1, generic_functions: ['f', 'g'] },
			p_version_id: v1
		});
		expect(error).toBeNull();
		expect(await titleOf(id)).toBe('Titre neuf');
		const versions = await versionsOf(id);
		expect(versions[0].variations).toEqual(V1);
		expect(versions[1].id).toBe((v2 as { id: string }).id);
		expect(versions[1].variations).toEqual(V2);
	});

	it('sans version : la dernière', async () => {
		const { id } = await newExercise();
		await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId, variations: V2 as never });
		const { error } = await teacher.rpc('save_exercise_with_version', {
			p_exercise_id: id,
			p_identity: {},
			p_content: { variations: V1 }
		});
		expect(error).toBeNull();
		const versions = await versionsOf(id);
		expect(versions[1].variations).toEqual(V1);
	});

	it('version d’un AUTRE exercice : rien n’est écrit, pas même le titre', async () => {
		const { id } = await newExercise();
		const before = await titleOf(id);
		const { error } = await teacher.rpc('save_exercise_with_version', {
			p_exercise_id: id,
			p_identity: { title: 'Ne doit pas rester' },
			p_content: { variations: V2 },
			p_version_id: v1Id
		});
		expect(error).not.toBeNull();
		expect(await titleOf(id)).toBe(before);
		expect((await versionsOf(exerciseId))[0].variations).toEqual(V1);
	});

	it('colonne inconnue ou interdite : refusée, rien n’est écrit', async () => {
		const { id } = await newExercise();
		const before = await titleOf(id);
		for (const identity of [
			{ title: 'x', pas_une_colonne: 1 },
			{ title: 'x', created_by: teacherId },
			{ title: 'x', variations: V2 }
		]) {
			const { error } = await teacher.rpc('save_exercise_with_version', {
				p_exercise_id: id,
				p_identity: identity,
				p_content: {}
			});
			expect(error?.code).toBe('22023');
		}
		expect(await titleOf(id)).toBe(before);
	});

	it('un élève qui lit l’exercice n’écrit rien', async () => {
		const before = await titleOf(exerciseId);
		const { error } = await student.rpc('save_exercise_with_version', {
			p_exercise_id: exerciseId,
			p_identity: { title: 'Piraté' },
			p_content: { variations: V2 }
		});
		expect(error).not.toBeNull();
		expect(await titleOf(exerciseId)).toBe(before);
		expect((await versionsOf(exerciseId))[0].variations).toEqual(V1);
	});
});

// ============================================================================
// 4. DÉCLENCHEUR
// ============================================================================

describe('une version écrite rajeunit l’exercice', () => {
	it('modifier une version met à jour exercises.updated_at', async () => {
		const { id, v1 } = await newExercise();
		// `exercises_updated_at` remet l'heure à toute mise à jour : on compare avant / après
		const { data: before } = await service
			.from('exercises')
			.select('updated_at')
			.eq('id', id)
			.single();
		await new Promise((r) => setTimeout(r, 20));

		const { data, error } = await teacher
			.from('exercise_versions')
			.update({ note: 'coquille corrigée' })
			.eq('id', v1)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const { data: after } = await service
			.from('exercises')
			.select('updated_at')
			.eq('id', id)
			.single();
		expect(new Date(after!.updated_at!).getTime()).toBeGreaterThan(
			new Date(before!.updated_at!).getTime()
		);
	});

	it('supprimer un exercice qui a deux versions passe toujours', async () => {
		const { id } = await newExercise();
		await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId, variations: V2 as never });
		const { data, error } = await teacher.from('exercises').delete().eq('id', id).select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await versionsOf(id)).toEqual([]);
	});
});

// ============================================================================
// 5. ROUTES
// ============================================================================

describe('routes de l’éditeur', () => {
	it('GET /versions : chaque version, avec les fiches qui l’utilisent', async () => {
		const response = await listVersionsRoute({
			locals: teacherLocals,
			params: { id: exerciseId }
		} as never);
		expect(response.status).toBe(200);
		const { versions } = (await response.json()) as { versions: VersionListed[] };
		expect(versions.map((v) => v.number)).toEqual([1, 2]);
		expect(versions[0].worksheets).toEqual([
			expect.objectContaining({ title: FICHE_TITLE, active_assignments: 1 })
		]);
		expect(versions[1].worksheets).toEqual([]);
	});

	it('POST /versions : nouvelle version avec sa note ; aucune fiche ne bouge', async () => {
		const { id } = await newExercise();
		const response = await createVersionRoute({
			locals: teacherLocals,
			params: { id },
			request: request('POST', { note: 'après le test en 2de 3' })
		} as never);
		expect(response.status).toBe(201);
		const { version } = (await response.json()) as { version: { number: number; note: string } };
		expect(version).toEqual(expect.objectContaining({ number: 2, note: 'après le test en 2de 3' }));
	});

	it('POST /versions : note trop longue refusée (400)', async () => {
		const { status } = await statusOf(() =>
			createVersionRoute({
				locals: teacherLocals,
				params: { id: exerciseId },
				request: request('POST', { note: 'x'.repeat(501) })
			} as never)
		);
		expect(status).toBe(400);
	});

	it('PATCH /versions/[v] : la note change, vide = pas de note', async () => {
		const { id, v1 } = await newExercise();
		for (const [note, stored] of [
			['coquille', 'coquille'],
			['', null]
		] as const) {
			const response = await patchVersionRoute({
				locals: teacherLocals,
				params: { id, versionId: v1 },
				request: request('PATCH', { note })
			} as never);
			expect(response.status).toBe(200);
			expect((await versionsOf(id))[0].note).toBe(stored);
		}
	});

	it('DELETE /versions/[v] : refusée si une fiche l’utilise, le refus nomme la fiche', async () => {
		const { status, body } = await statusOf(() =>
			deleteVersionRoute({
				locals: teacherLocals,
				params: { id: exerciseId, versionId: v1Id }
			} as never)
		);
		expect(status).toBe(409);
		expect(body).toContain(FICHE_TITLE);
		expect((await versionsOf(exerciseId)).map((v) => v.number)).toEqual([1, 2]);
	});

	it('DELETE /versions/[v] : refusée pour la seule version', async () => {
		const { id, v1 } = await newExercise();
		const { status } = await statusOf(() =>
			deleteVersionRoute({ locals: teacherLocals, params: { id, versionId: v1 } } as never)
		);
		expect(status).toBe(409);
		expect(await versionsOf(id)).toHaveLength(1);
	});

	it('DELETE /versions/[v] : version inutilisée supprimée', async () => {
		const { id } = await newExercise();
		const { data: v2 } = await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId })
			.select('id')
			.single();
		const response = await deleteVersionRoute({
			locals: teacherLocals,
			params: { id, versionId: (v2 as { id: string }).id }
		} as never);
		expect(response.status).toBe(200);
		expect((await versionsOf(id)).map((v) => v.number)).toEqual([1]);
	});

	it('DELETE /versions/[v] : version d’un autre exercice → 404', async () => {
		const { id } = await newExercise();
		const { status } = await statusOf(() =>
			deleteVersionRoute({ locals: teacherLocals, params: { id, versionId: v2Id } } as never)
		);
		expect(status).toBe(404);
		expect((await versionsOf(exerciseId)).map((v) => v.number)).toEqual([1, 2]);
	});

	it('PUT /api/exercises/[id] avec version_id : modifie CETTE version, la dernière reste', async () => {
		const { id, v1 } = await newExercise();
		await service
			.from('exercise_versions')
			.insert({ exercise_id: id, number: 2, created_by: teacherId, variations: V2 as never });
		const response = await putExerciseRoute({
			locals: teacherLocals,
			params: { id },
			request: request('PUT', { title: 'Retouché', variations: V1, version_id: v1 })
		} as never);
		expect(response.status).toBe(200);
		const versions = await versionsOf(id);
		expect(versions[0].variations).toEqual(V1);
		expect(versions[1].variations).toEqual(V2);
		expect(await titleOf(id)).toBe('Retouché');
	});
});
