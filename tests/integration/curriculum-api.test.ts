/**
 * Integration Tests: Programme — génération neuve des points (C5, étape 3)
 * =======================================================================
 *
 * Ce qui reste de l'API d'édition du programme après la bascule :
 *   - getProgrammeTree (lecture branche > notion > points d'un niveau) ;
 *   - load de la page Programme (rôles) ;
 *   - PATCH /api/teacher/curriculum/points/[pointId] : renommer, archiver.
 *
 * Les routes thèmes / objectifs, la création, la suppression et le
 * réordonnancement des points ont été retirés : leurs tests avec.
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import { PATCH as pointPATCH } from '../../src/routes/api/teacher/curriculum/points/[pointId]/+server';
import { load as programmeLoad } from '../../src/routes/(protected)/dashboard/teacher/programme/+page.server';
import { getProgrammeTree } from '$lib/server/programme-tree';

import {
	createServiceRoleClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Les seeds peuplent déjà la 5ᵉ en points neufs : les fixtures vivent dans des
// branches à elles (nom aléatoire, position haute) et les assertions s'y
// restreignent.
const TEST_GRADE = '5';

// ---------------------------------------------------------------------------
// Shared service client + cleanup
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;
const createdNodeIds: string[] = [];

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanup();
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanup();
	await cleanupCompetenceTestData();
});

async function cleanup() {
	// Anciens points : la cascade depuis le thème les emporte.
	await service.from('curriculum_themes').delete().eq('grade', TEST_GRADE).like('name', 'TEST %');
	if (createdNodeIds.length === 0) return;
	await service.from('curriculum_points').delete().in('node_id', createdNodeIds);
	// Enfants d'abord : parent_id est en RESTRICT.
	for (const kind of ['subnotion', 'notion', 'branch']) {
		await service.from('classification_nodes').delete().in('id', createdNodeIds).eq('kind', kind);
	}
	createdNodeIds.length = 0;
}

// ---------------------------------------------------------------------------
// Service-role fixtures
// ---------------------------------------------------------------------------

function suffix(): string {
	return crypto.randomUUID().slice(0, 8);
}

async function svcNode(
	kind: 'branch' | 'notion' | 'subnotion',
	name: string,
	parentId: string | null,
	position = 0
): Promise<string> {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind, name: `${name} ${suffix()}`, parent_id: parentId, position })
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	createdNodeIds.push(data.id);
	return data.id;
}

async function svcNewPoint(
	nodeId: string,
	displayOrder: number,
	extra: { name?: string; archived?: boolean } = {}
): Promise<{ id: string; code: string }> {
	const code = `TST-${suffix()}`;
	const { data, error } = await service
		.from('curriculum_points')
		.insert({
			code,
			name: extra.name ?? `Point ${code}`,
			kind: 'savoir_faire',
			grade: TEST_GRADE,
			display_order: displayOrder,
			node_id: nodeId,
			archived_at: extra.archived ? new Date().toISOString() : null
		})
		.select('id, code')
		.single();
	if (error) throw new Error(error.message);
	return data;
}

/** Un point de l'ANCIENNE génération (thème → objectif → point). */
async function svcOldPoint(): Promise<{ id: string; name: string; code: string }> {
	const { data: theme, error: themeErr } = await service
		.from('curriculum_themes')
		.insert({ grade: TEST_GRADE, name: `TEST ${suffix()}` })
		.select('id')
		.single();
	if (themeErr) throw new Error(themeErr.message);
	const { data: objective, error: objErr } = await service
		.from('curriculum_objectives')
		.insert({ theme_id: theme.id, name: `Objectif ${suffix()}` })
		.select('id')
		.single();
	if (objErr) throw new Error(objErr.message);
	// `code` est attribué par le trigger pour un ancien point.
	const { data: point, error: pointErr } = await service
		.from('curriculum_points')
		.insert({ objective_id: objective.id, name: 'Ancien point', kind: 'savoir_faire' } as never)
		.select('id, name, code')
		.single();
	if (pointErr) throw new Error(pointErr.message);
	return point as { id: string; name: string; code: string };
}

// ---------------------------------------------------------------------------
// Locals + request helpers
// ---------------------------------------------------------------------------

function buildLocals(userOrNull: User | null): App.Locals {
	return {
		supabase: service as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: userOrNull }),
		user: userOrNull,
		profile: null,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function patch(pointId: string, body: unknown, locals: App.Locals) {
	return pointPATCH({
		params: { pointId },
		request: new Request('http://localhost/api/teacher/curriculum/points', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals
	} as never);
}

async function teacherUser(): Promise<User> {
	const t = await TestData.profile().withRole('teacher').create();
	return { id: t.id } as User;
}

async function readPoint(id: string) {
	const { data, error } = await service
		.from('curriculum_points')
		.select('name, code, archived_at')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data;
}

// ============================================================================
// Lecture : getProgrammeTree
// ============================================================================

describe('getProgrammeTree — génération neuve', () => {
	it('range branche > notion > points dans l’ordre de l’arbre et du BO', async () => {
		const b1 = await svcNode('branch', 'TEST Algèbre', null, 9001);
		const b2 = await svcNode('branch', 'TEST Analyse', null, 9000);
		const nA = await svcNode('notion', 'Équations', b1, 2);
		const nB = await svcNode('notion', 'Inéquations', b1, 1);
		const sub = await svcNode('subnotion', 'résoudre', nA, 0);
		const nC = await svcNode('notion', 'Suites', b2, 0);

		const p3 = await svcNewPoint(nA, 30);
		const p1 = await svcNewPoint(sub, 10);
		const p2 = await svcNewPoint(nB, 20);
		const p4 = await svcNewPoint(nC, 5);

		const tree = (await getProgrammeTree(service as never, TEST_GRADE)).filter(
			(b) => b.id === b1 || b.id === b2
		);

		expect(tree.map((b) => b.id)).toEqual([b2, b1]);
		const algebre = tree[1];
		expect(algebre.notions.map((n) => n.id)).toEqual([nB, nA]);
		expect(algebre.notions[1].points.map((p) => p.id)).toEqual([p1.id, p3.id]);
		expect(algebre.notions[1].points[0].subnotionName).toMatch(/^résoudre /);
		expect(algebre.notions[0].points.map((p) => p.id)).toEqual([p2.id]);
		expect(tree[0].notions[0].points.map((p) => p.id)).toEqual([p4.id]);
	});

	it('n’affiche jamais un ancien point', async () => {
		const old = await svcOldPoint();
		const tree = await getProgrammeTree(service as never, TEST_GRADE, { includeArchived: true });

		const ids = tree.flatMap((b) => b.notions.flatMap((n) => n.points.map((p) => p.id)));
		expect(ids.length).toBeGreaterThan(0);
		expect(ids).not.toContain(old.id);
	});

	it('exclut les archivés par défaut, les rend sur demande', async () => {
		const branch = await svcNode('branch', 'TEST Archives', null, 9002);
		const notion = await svcNode('notion', 'Notion', branch, 0);
		const visible = await svcNewPoint(notion, 1);
		const archived = await svcNewPoint(notion, 2, { archived: true });

		const pointsOf = async (includeArchived: boolean) =>
			(await getProgrammeTree(service as never, TEST_GRADE, { includeArchived }))
				.filter((b) => b.id === branch)
				.flatMap((b) => b.notions.flatMap((n) => n.points.map((p) => p.id)));

		expect(await pointsOf(false)).toEqual([visible.id]);
		expect(await pointsOf(true)).toEqual([visible.id, archived.id]);
	});
});

// ============================================================================
// Page Programme : rôles
// ============================================================================

describe('load de la page Programme', () => {
	it('refuse un élève (403)', async () => {
		const s = await TestData.profile().withRole('student').create();
		await expect(
			programmeLoad({
				locals: buildLocals({ id: s.id } as User),
				url: new URL('http://localhost/dashboard/teacher/programme?grade=5')
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});

// ============================================================================
// PATCH /api/teacher/curriculum/points/[pointId]
// ============================================================================

describe('PATCH /points/[pointId] — génération neuve', () => {
	it('renomme : le libellé change, jamais le code', async () => {
		const branch = await svcNode('branch', 'TEST Renommer', null, 9003);
		const notion = await svcNode('notion', 'Notion', branch, 0);
		const point = await svcNewPoint(notion, 1);
		const locals = buildLocals(await teacherUser());

		const res = await patch(point.id, { name: 'Nouveau libellé' }, locals);

		expect(res.status).toBe(200);
		expect(await readPoint(point.id)).toMatchObject({ name: 'Nouveau libellé', code: point.code });
	});

	it('archive puis restaure', async () => {
		const branch = await svcNode('branch', 'TEST Archiver', null, 9004);
		const notion = await svcNode('notion', 'Notion', branch, 0);
		const point = await svcNewPoint(notion, 1);
		const locals = buildLocals(await teacherUser());

		expect((await patch(point.id, { archived: true }, locals)).status).toBe(200);
		expect((await readPoint(point.id)).archived_at).not.toBeNull();

		expect((await patch(point.id, { archived: false }, locals)).status).toBe(200);
		expect((await readPoint(point.id)).archived_at).toBeNull();
	});

	it('refuse 409 un ANCIEN point, sans rien écrire', async () => {
		const old = await svcOldPoint();
		const locals = buildLocals(await teacherUser());

		const renamed = await patch(old.id, { name: 'Piraté' }, locals);
		const archived = await patch(old.id, { archived: true }, locals);

		expect(renamed.status).toBe(409);
		expect(archived.status).toBe(409);
		expect(await readPoint(old.id)).toMatchObject({ name: old.name, archived_at: null });
	});

	it('404 pour un point inconnu', async () => {
		const locals = buildLocals(await teacherUser());
		const res = await patch(crypto.randomUUID(), { name: 'X' }, locals);
		expect(res.status).toBe(404);
	});

	it('400 pour un libellé vide ou un champ retiré', async () => {
		const branch = await svcNode('branch', 'TEST Refus', null, 9005);
		const notion = await svcNode('notion', 'Notion', branch, 0);
		const point = await svcNewPoint(notion, 1, { name: 'Intact' });
		const locals = buildLocals(await teacherUser());

		expect((await patch(point.id, { name: '  ' }, locals)).status).toBe(400);
		expect((await patch(point.id, { display_order: 3 }, locals)).status).toBe(400);
		expect(await readPoint(point.id)).toMatchObject({ name: 'Intact' });
	});

	it('rejette 403 un élève', async () => {
		const branch = await svcNode('branch', 'TEST Élève', null, 9006);
		const notion = await svcNode('notion', 'Notion', branch, 0);
		const point = await svcNewPoint(notion, 1);
		const s = await TestData.profile().withRole('student').create();

		await expect(
			patch(point.id, { name: 'X' }, buildLocals({ id: s.id } as User))
		).rejects.toMatchObject({ status: 403 });
	});
});
