/**
 * Integration Tests: Curriculum tracking — CRUD API (Phase 1)
 * ===========================================================
 *
 * Exercises the curriculum tree endpoints (Thème → Item → Point):
 *   - /api/teacher/curriculum/themes            (GET, POST)
 *   - /api/teacher/curriculum/themes/[themeId]  (PATCH, DELETE)
 *   - /api/teacher/curriculum/items             (GET, POST)
 *   - /api/teacher/curriculum/items/[objectiveId]    (PATCH, DELETE)
 *   - /api/teacher/curriculum/points            (GET, POST)
 *   - /api/teacher/curriculum/points/[pointId]  (PATCH, DELETE)
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	GET as themesGET,
	POST as themesPOST
} from '../../src/routes/api/teacher/curriculum/themes/+server';
import {
	PATCH as themePATCH,
	DELETE as themeDELETE
} from '../../src/routes/api/teacher/curriculum/themes/[themeId]/+server';
import {
	GET as itemsGET,
	POST as itemsPOST
} from '../../src/routes/api/teacher/curriculum/objectives/+server';
import {
	PATCH as itemPATCH,
	DELETE as itemDELETE
} from '../../src/routes/api/teacher/curriculum/objectives/[objectiveId]/+server';
import {
	GET as pointsGET,
	POST as pointsPOST
} from '../../src/routes/api/teacher/curriculum/points/+server';
import {
	PATCH as pointPATCH,
	DELETE as pointDELETE
} from '../../src/routes/api/teacher/curriculum/points/[pointId]/+server';
import { POST as reorderPOST } from '../../src/routes/api/teacher/curriculum/points/reorder/+server';

import {
	createServiceRoleClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Grade dédié aux fixtures : les seeds du programme peuplent la 6ᵉ et la 1ʳᵉ spé, donc
// poser les tests sur '5' les isole du référentiel réel (et de sa purge).
const TEST_GRADE = '5';
const TEST_GRADE_ALT = '4';

// ---------------------------------------------------------------------------
// Shared service client + cleanup
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCurriculum();
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCurriculum();
	await cleanupCompetenceTestData();
});

async function cleanupCurriculum() {
	await service
		.from('curriculum_themes' as never)
		.delete()
		.in('grade', [TEST_GRADE, TEST_GRADE_ALT]);
}

// ---------------------------------------------------------------------------
// Service-role fixtures (parents created directly to keep tests focused)
// ---------------------------------------------------------------------------

async function svcTheme(grade = TEST_GRADE, name?: string): Promise<{ id: string }> {
	const { data, error } = await service
		.from('curriculum_themes' as never)
		.insert({ grade, name: name ?? `Thème ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data as { id: string };
}

async function svcItem(themeId: string, name?: string): Promise<{ id: string }> {
	const { data, error } = await service
		.from('curriculum_objectives' as never)
		.insert({ theme_id: themeId, name: name ?? `Item ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data as { id: string };
}

async function svcPoint(objectiveId: string, name?: string): Promise<{ id: string }> {
	const { data, error } = await service
		.from('curriculum_points' as never)
		.insert({
			objective_id: objectiveId,
			name: name ?? `Point ${crypto.randomUUID().slice(0, 8)}`,
			kind: 'savoir_faire'
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data as { id: string };
}

// ---------------------------------------------------------------------------
// Locals + request/url helpers
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

function req(body: unknown, method: 'POST' | 'PATCH' = 'POST'): Request {
	return new Request('http://localhost/api/teacher/curriculum', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function urlWith(query: Record<string, string>): URL {
	const u = new URL('http://localhost/api/teacher/curriculum');
	for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
	return u;
}

async function teacherUser(): Promise<User> {
	const t = await TestData.profile().withRole('teacher').create();
	return { id: t.id } as User;
}

// ============================================================================
// Thèmes
// ============================================================================

describe('POST /api/teacher/curriculum/themes', () => {
	it('creates a theme and returns 201', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const res = await themesPOST({
			request: req({ grade: TEST_GRADE, name: 'Calcul' }),
			locals
		} as never);
		expect(res.status).toBe(201);
		const data = await res.json();
		expect(data.theme).toMatchObject({ grade: TEST_GRADE, name: 'Calcul', display_order: 0 });
	});

	it('returns 400 for an invalid grade code', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await themesPOST({ request: req({ grade: '6e', name: 'X' }), locals } as never);
		expect(res.status).toBe(400);
	});

	it('returns 400 for a blank name', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await themesPOST({
			request: req({ grade: TEST_GRADE, name: '   ' }),
			locals
		} as never);
		expect(res.status).toBe(400);
	});

	it('returns 409 for a duplicate (grade, name)', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		await themesPOST({ request: req({ grade: TEST_GRADE, name: 'Calcul' }), locals } as never);
		const res = await themesPOST({
			request: req({ grade: TEST_GRADE, name: 'Calcul' }),
			locals
		} as never);
		expect(res.status).toBe(409);
	});

	it('rejects 401 when unauthenticated', async () => {
		expect.assertions(1);
		const locals = buildLocals(null);
		await expect(
			themesPOST({ request: req({ grade: TEST_GRADE, name: 'X' }), locals } as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejects 403 for a student', async () => {
		expect.assertions(1);
		const s = await TestData.profile().withRole('student').create();
		const locals = buildLocals({ id: s.id } as User);
		await expect(
			themesPOST({ request: req({ grade: TEST_GRADE, name: 'X' }), locals } as never)
		).rejects.toMatchObject({ status: 403 });
	});
});

describe('GET /api/teacher/curriculum/themes', () => {
	it('lists themes of a grade sorted by display_order then name', async () => {
		expect.assertions(3);
		await svcTheme(TEST_GRADE, 'Beta');
		await svcTheme(TEST_GRADE, 'Alpha');
		await svcTheme(TEST_GRADE_ALT, 'Other grade');
		const locals = buildLocals(await teacherUser());

		const res = await themesGET({ url: urlWith({ grade: TEST_GRADE }), locals } as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.themes).toHaveLength(2);
		expect(data.themes.map((t: { name: string }) => t.name)).toEqual(['Alpha', 'Beta']);
	});

	it('returns 400 when grade query param is missing/invalid', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await themesGET({ url: urlWith({}), locals } as never);
		expect(res.status).toBe(400);
	});
});

describe('PATCH/DELETE /api/teacher/curriculum/themes/[themeId]', () => {
	it('renames a theme', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE, 'Old');
		const locals = buildLocals(await teacherUser());
		const res = await themePATCH({
			request: req({ name: 'New' }, 'PATCH'),
			locals,
			params: { themeId: theme.id }
		} as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.theme.name).toBe('New');
	});

	it('returns 404 when patching a missing theme', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await themePATCH({
			request: req({ name: 'X' }, 'PATCH'),
			locals,
			params: { themeId: crypto.randomUUID() }
		} as never);
		expect(res.status).toBe(404);
	});

	it('returns 400 when PATCH body has no updatable fields', async () => {
		expect.assertions(1);
		const theme = await svcTheme(TEST_GRADE);
		const locals = buildLocals(await teacherUser());
		const res = await themePATCH({
			request: req({}, 'PATCH'),
			locals,
			params: { themeId: theme.id }
		} as never);
		expect(res.status).toBe(400);
	});

	it('deletes a theme and cascades to items and points', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		const point = await svcPoint(item.id);
		const locals = buildLocals(await teacherUser());

		const res = await themeDELETE({ locals, params: { themeId: theme.id } } as never);
		expect(res.status).toBe(200);

		const { data: rows } = await service
			.from('curriculum_points' as never)
			.select('id')
			.eq('id', point.id);
		expect(rows ?? []).toHaveLength(0);
	});
});

// ============================================================================
// Items
// ============================================================================

describe('Items CRUD', () => {
	it('creates an item under a theme (201)', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		const locals = buildLocals(await teacherUser());
		const res = await itemsPOST({
			request: req({ theme_id: theme.id, name: 'Fractions' }),
			locals
		} as never);
		expect(res.status).toBe(201);
		const data = await res.json();
		expect(data.item).toMatchObject({ theme_id: theme.id, name: 'Fractions' });
	});

	it('returns 400 when theme_id does not exist (FK violation)', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await itemsPOST({
			request: req({ theme_id: crypto.randomUUID(), name: 'Orphan' }),
			locals
		} as never);
		expect(res.status).toBe(400);
	});

	it('returns 409 for a duplicate (theme_id, name)', async () => {
		expect.assertions(1);
		const theme = await svcTheme(TEST_GRADE);
		await svcItem(theme.id, 'Fractions');
		const locals = buildLocals(await teacherUser());
		const res = await itemsPOST({
			request: req({ theme_id: theme.id, name: 'Fractions' }),
			locals
		} as never);
		expect(res.status).toBe(409);
	});

	it('lists items of a theme', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		await svcItem(theme.id, 'Fractions');
		await svcItem(theme.id, 'Décimaux');
		const locals = buildLocals(await teacherUser());
		const res = await itemsGET({ url: urlWith({ theme_id: theme.id }), locals } as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.items).toHaveLength(2);
	});

	it('deletes an item', async () => {
		expect.assertions(1);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		const locals = buildLocals(await teacherUser());
		const res = await itemDELETE({ locals, params: { objectiveId: item.id } } as never);
		expect(res.status).toBe(200);
	});

	it('renames an item', async () => {
		expect.assertions(1);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id, 'Old');
		const locals = buildLocals(await teacherUser());
		const res = await itemPATCH({
			request: req({ name: 'New' }, 'PATCH'),
			locals,
			params: { objectiveId: item.id }
		} as never);
		const data = await res.json();
		expect(data.item.name).toBe('New');
	});
});

// ============================================================================
// Points
// ============================================================================

describe('Points CRUD', () => {
	it('creates a point with a kind (201)', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		const locals = buildLocals(await teacherUser());
		const res = await pointsPOST({
			request: req({
				objective_id: item.id,
				name: 'Additionner deux fractions',
				kind: 'savoir_faire'
			}),
			locals
		} as never);
		expect(res.status).toBe(201);
		const data = await res.json();
		expect(data.point).toMatchObject({ name: 'Additionner deux fractions', kind: 'savoir_faire' });
	});

	it('returns 400 for an invalid kind', async () => {
		expect.assertions(1);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		const locals = buildLocals(await teacherUser());
		const res = await pointsPOST({
			request: req({ objective_id: item.id, name: 'X', kind: 'competence' }),
			locals
		} as never);
		expect(res.status).toBe(400);
	});

	it('archives a point (sets archived_at)', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		const point = await svcPoint(item.id);
		const locals = buildLocals(await teacherUser());
		const res = await pointPATCH({
			request: req({ archived: true }, 'PATCH'),
			locals,
			params: { pointId: point.id }
		} as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.point.archived_at).not.toBeNull();
	});

	it('lists points of an item', async () => {
		expect.assertions(2);
		const theme = await svcTheme(TEST_GRADE);
		const item = await svcItem(theme.id);
		await svcPoint(item.id, 'A');
		await svcPoint(item.id, 'B');
		const locals = buildLocals(await teacherUser());
		const res = await pointsGET({ url: urlWith({ objective_id: item.id }), locals } as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.points).toHaveLength(2);
	});
});

// ============================================================================
// Code, déplacement, garde de suppression
// ============================================================================
// Depuis le 2026-08-31 la page Programme fait foi sur le référentiel : le
// markdown n'amorce plus qu'un niveau vide. Ces trois propriétés sont ce qui
// rend cette bascule sûre.

describe('Points — code attribué par la base', () => {
	it('donne au point créé un code de la série du niveau', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);

		const res = await pointsPOST({
			request: req({ objective_id: item.id, name: 'Premier point', kind: 'savoir_faire' }),
			locals
		} as never);
		const body = await res.json();

		expect(res.status).toBe(201);
		// Préfixe = le grade sans underscore ; TEST_GRADE vaut '5'.
		expect(body.point.code).toMatch(/^5-\d{3}$/);
	});

	it('donne au suivant le numéro d’après, sans trou ni collision', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);

		const first = await (
			await pointsPOST({
				request: req({ objective_id: item.id, name: 'Point A', kind: 'connaissance' }),
				locals
			} as never)
		).json();
		const second = await (
			await pointsPOST({
				request: req({ objective_id: item.id, name: 'Point B', kind: 'connaissance' }),
				locals
			} as never)
		).json();

		const n = (code: string) => Number(code.split('-')[1]);
		expect(n(second.point.code)).toBe(n(first.point.code) + 1);
	});

	it('honore exigence, régime et rang à la création', async () => {
		expect.assertions(3);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);

		const res = await pointsPOST({
			request: req({
				objective_id: item.id,
				name: 'Point paramétré',
				kind: 'savoir_faire',
				exigence: 'approfondissement',
				regime_acquisition: 'fluence',
				rang: 3
			}),
			locals
		} as never);
		const { point } = await res.json();

		expect(point.exigence).toBe('approfondissement');
		expect(point.regime_acquisition).toBe('fluence');
		expect(point.rang).toBe(3);
	});
});

describe('PATCH /points/[pointId] — déplacement', () => {
	it('déplace un point sous un autre objectif en lui gardant son code', async () => {
		expect.assertions(3);
		const locals = buildLocals(await teacherUser());
		const theme = await svcTheme();
		const from = await svcItem(theme.id, 'Objectif de départ');
		const to = await svcItem(theme.id, 'Objectif d’arrivée');

		const created = await (
			await pointsPOST({
				request: req({ objective_id: from.id, name: 'Point voyageur', kind: 'savoir_faire' }),
				locals
			} as never)
		).json();

		const res = await pointPATCH({
			params: { pointId: created.point.id },
			request: req({ objective_id: to.id }, 'PATCH'),
			locals
		} as never);
		const { point } = await res.json();

		expect(res.status).toBe(200);
		expect(point.objective_id).toBe(to.id);
		// Le code survit au déplacement : c'est l'identité du point, pas sa place.
		expect(point.code).toBe(created.point.code);
	});
});

describe('DELETE /points/[pointId] — garde de suppression', () => {
	it('supprime un point que rien ne référence', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const point = await svcPoint((await svcItem((await svcTheme()).id)).id);

		const res = await pointDELETE({ params: { pointId: point.id }, locals } as never);
		expect(res.status).toBe(200);

		const { data } = await service
			.from('curriculum_points' as never)
			.select('id')
			.eq('id', point.id)
			.maybeSingle();
		expect(data).toBeNull();
	});

	// Cinq des six clés étrangères vers curriculum_points sont en CASCADE : sans
	// cette garde, un clic sur « Supprimer » effacerait sans un mot la couverture
	// du cahier de texte et l'acquisition des élèves attachées au point.
	it('refuse 409 quand quelque chose y est accroché, et dit quoi', async () => {
		expect.assertions(4);
		const locals = buildLocals(await teacherUser());
		const point = await svcPoint((await svcItem((await svcTheme()).id)).id);

		// La référence la moins coûteuse à fabriquer ; la garde ne distingue pas.
		const { error: linkErr } = await service
			.from('curriculum_point_automatismes' as never)
			.insert({ point_id: point.id, grade: TEST_GRADE } as never);
		expect(linkErr).toBeNull();

		const res = await pointDELETE({ params: { pointId: point.id }, locals } as never);
		const body = await res.json();

		expect(res.status).toBe(409);
		expect(body.references).toEqual({ automatisme_lists: 1 });
		expect(body.error).toMatch(/archivez-le plutôt/);
	});
});

// ============================================================================
// Position d'affichage
// ============================================================================
// `display_order` est local à l'objectif et sans rapport avec le `code` : un
// point déplacé garde le sien. Si les deux séries coïncident sur le seed, c'est
// seulement qu'il a créé les points dans l'ordre du BO.

/** Les points d'un objectif, dans l'ordre affiché. */
async function orderOf(objectiveId: string) {
	const { data } = await service
		.from('curriculum_points' as never)
		.select('id, code, display_order')
		.eq('objective_id', objectiveId)
		.order('display_order', { ascending: true });
	return (data ?? []) as { id: string; code: string; display_order: number }[];
}

describe('Points — placement à la création', () => {
	it('place un nouveau point EN DERNIER, pas en premier', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);

		for (const name of ['Premier', 'Deuxième', 'Troisième']) {
			await pointsPOST({
				request: req({ objective_id: item.id, name, kind: 'savoir_faire' }),
				locals
			} as never);
		}

		const rows = await orderOf(item.id);
		// L'API posait `display_order = 0` faute de valeur, alors que les points
		// seedés commencent à 1 : chaque nouveau passait devant tout le monde.
		expect(rows.map((r) => r.display_order)).toEqual([1, 2, 3]);
		expect(rows).toHaveLength(3);
	});
});

describe('POST /points/reorder', () => {
	it('renumérote tout l’objectif en une requête', async () => {
		expect.assertions(3);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);
		for (const n of ['A', 'B', 'C', 'D']) await svcPoint(item.id, `Point ${n}`);

		const before = await orderOf(item.id);
		const reversed = [...before].reverse().map((r) => r.id);

		const res = await reorderPOST({
			request: req({ objective_id: item.id, point_ids: reversed }),
			locals
		} as never);
		expect(res.status).toBe(200);

		const after = await orderOf(item.id);
		expect(after.map((r) => r.id)).toEqual(reversed);
		// Toujours 1..N : ni trou, ni doublon, ni zéro.
		expect(after.map((r) => r.display_order)).toEqual([1, 2, 3, 4]);
	});

	it('garde les codes intacts : déplacer n’est pas renommer', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);
		for (const n of ['A', 'B', 'C']) await svcPoint(item.id, `Point ${n}`);

		const before = await orderOf(item.id);
		await reorderPOST({
			request: req({
				objective_id: item.id,
				point_ids: [...before].reverse().map((r) => r.id)
			}),
			locals
		} as never);

		const after = await orderOf(item.id);
		const codeById = new Map(after.map((r) => [r.id, r.code]));
		expect(before.every((r) => codeById.get(r.id) === r.code)).toBe(true);
	});

	// Une liste partielle renumèroterait une moitié en laissant l'autre sur ses
	// anciennes valeurs — donc des doublons et un ordre final imprévisible.
	it('refuse 400 une liste incomplète', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const item = await svcItem((await svcTheme()).id);
		for (const n of ['A', 'B', 'C']) await svcPoint(item.id, `Point ${n}`);

		const rows = await orderOf(item.id);
		const res = await reorderPOST({
			request: req({ objective_id: item.id, point_ids: [rows[0].id, rows[1].id] }),
			locals
		} as never);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/incomplète/);
	});

	it('refuse 400 un point étranger à l’objectif', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const theme = await svcTheme();
		const item = await svcItem(theme.id, 'Objectif cible');
		const other = await svcItem(theme.id, 'Autre objectif');
		const a = await svcPoint(item.id, 'Point A');
		const intrus = await svcPoint(other.id, 'Point intrus');

		const res = await reorderPOST({
			request: req({ objective_id: item.id, point_ids: [a.id, intrus.id] }),
			locals
		} as never);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toMatch(/étranger/);
	});

	it('rejette 403 un élève', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const item = await svcItem((await svcTheme()).id);
		const point = await svcPoint(item.id);

		await expect(
			reorderPOST({
				request: req({ objective_id: item.id, point_ids: [point.id] }),
				locals: buildLocals({ id: student.id } as User)
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});
