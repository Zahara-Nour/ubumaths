/**
 * Integration Tests: Curriculum tracking — alimentation & coverage (Phase 1, brique 2)
 * ====================================================================================
 *
 * Exercises the tagging + cahier-de-texte alimentation endpoints:
 *   - /api/teacher/curriculum/exercise-tags             (GET, POST, DELETE)
 *   - /api/teacher/curriculum/activities                (GET, POST)
 *   - /api/teacher/curriculum/activities/[activityId]   (DELETE)
 *   - /api/teacher/curriculum/coverage                  (GET, POST, DELETE)
 *
 * Core behaviour: AUTO coverage is materialized from tagged exercise activities
 * (reconcileAutoCoverage) and coexists with the teacher's MANUAL checks.
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	GET as tagsGET,
	POST as tagsPOST,
	DELETE as tagsDELETE
} from '../../src/routes/api/teacher/curriculum/exercise-tags/+server';
import {
	GET as actGET,
	POST as actPOST
} from '../../src/routes/api/teacher/curriculum/activities/+server';
import { DELETE as actDELETE } from '../../src/routes/api/teacher/curriculum/activities/[activityId]/+server';
import {
	GET as covGET,
	POST as covPOST,
	DELETE as covDELETE
} from '../../src/routes/api/teacher/curriculum/coverage/+server';

import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Grade dédié aux fixtures : les seeds du programme peuplent la 6ᵉ et la 1ʳᵉ spé, donc
// poser les tests sur '5' les isole du référentiel réel (et de sa purge).
const TEST_GRADE = '5';

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
	// Ordre imposé par les clés étrangères : `question_template_points.point_id`
	// est ON DELETE RESTRICT, donc un point encore tagué par une question bloque
	// la purge du thème qui le porte. Les templates partent d'abord (leurs tags
	// tombent en cascade), les points ensuite.
	await service
		.from('assessments' as never)
		.delete()
		.eq('grade', TEST_GRADE);
	await service
		.from('question_templates' as never)
		.delete()
		.contains('grades', [TEST_GRADE]);
	await service
		.from('curriculum_themes' as never)
		.delete()
		.eq('grade', TEST_GRADE);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function svcPoint(objectiveId: string, name?: string): Promise<string> {
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
	return (data as { id: string }).id;
}

/** Theme → item, returns item id (point parent). */
async function makeItem(): Promise<string> {
	const { data: theme, error: tErr } = await service
		.from('curriculum_themes' as never)
		.insert({ grade: TEST_GRADE, name: `T ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id')
		.single();
	if (tErr) throw new Error(tErr.message);
	const { data: item, error: iErr } = await service
		.from('curriculum_objectives' as never)
		.insert({ theme_id: (theme as { id: string }).id, name: 'Fractions' } as never)
		.select('id')
		.single();
	if (iErr) throw new Error(iErr.message);
	return (item as { id: string }).id;
}

interface Ctx {
	teacher: { id: string; email: string };
	teacherUser: User;
	classId: string;
	entryId: string;
}

async function setup(): Promise<Ctx> {
	const teacher = await TestData.profile().withRole('teacher').create();
	const klass = await TestData.class().create();
	const { data: entry, error } = await service
		.from('class_journal_entries' as never)
		.insert({ class_id: (klass as { id: string }).id, entry_date: '2026-01-15' } as never)
		.select('id')
		.single();
	if (error) throw new Error(`journal entry: ${error.message}`);
	return {
		teacher,
		teacherUser: { id: teacher.id } as User,
		classId: (klass as { id: string }).id,
		entryId: (entry as { id: string }).id
	};
}

/** Create an exercise owned by `teacherId`, tagged with the given points. */
async function makeTaggedExercise(teacherId: string, pointIds: string[]): Promise<string> {
	const exercise = await TestData.exercise(teacherId).create();
	const exId = (exercise as { id: string }).id;
	if (pointIds.length > 0) {
		const { error } = await service
			.from('exercise_curriculum_points' as never)
			.insert(pointIds.map((p) => ({ exercise_id: exId, point_id: p })) as never);
		if (error) throw new Error(`tag exercise: ${error.message}`);
	}
	return exId;
}

/** Une catégorie de questions — le quadruplet qui identifie un template publié. */
interface Category {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}

/**
 * Un template de questions tagué sur les points donnés.
 *
 * Publié par défaut : c'est le statut qu'exige la résolution d'une évaluation,
 * qui ne référence pas ses templates par identifiant mais par catégorie.
 */
async function makeTaggedTemplate(
	pointIds: string[],
	opts?: { status?: 'draft' | 'published'; category?: Partial<Category> }
): Promise<{ id: string; category: Category }> {
	const category: Category = {
		theme: opts?.category?.theme ?? `Thème ${crypto.randomUUID().slice(0, 8)}`,
		domain: opts?.category?.domain ?? 'Domaine de test',
		subdomain: opts?.category?.subdomain ?? null,
		level: opts?.category?.level ?? 1
	};

	const { data, error } = await service
		.from('question_templates' as never)
		.insert({
			title: 'Question de test',
			status: opts?.status ?? 'published',
			type: 'fill_in_blanks',
			grades: [TEST_GRADE],
			...category,
			variations: [{ blanks: [{ expectedAnswer: '2' }], statement: 'Calculer $1 + 1 = ?$' }]
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(`template: ${error.message}`);

	const id = (data as { id: string }).id;
	if (pointIds.length > 0) {
		const { error: tagErr } = await service
			.from('question_template_points' as never)
			.insert(pointIds.map((point_id) => ({ template_id: id, point_id })) as never);
		if (tagErr) throw new Error(`tag template: ${tagErr.message}`);
	}
	return { id, category };
}

/** Une évaluation portant les catégories données (une par template attendu). */
async function makeAssessment(teacherId: string, categories: Category[]): Promise<string> {
	const { data, error } = await service
		.from('assessments' as never)
		.insert({
			title: 'Évaluation de test',
			grade: TEST_GRADE,
			created_by: teacherId,
			status: 'published',
			categories: categories.map((category) => ({ category, quantity: 1, delay: 20 }))
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(`assessment: ${error.message}`);
	return (data as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Locals / request helpers
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

function req(body: unknown, method: 'POST' = 'POST'): Request {
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

/** Read the coverage of an entry as Map<point_id, source>. */
async function coverageMap(ctx: Ctx): Promise<Map<string, string>> {
	const res = await covGET({
		url: urlWith({ entry_id: ctx.entryId }),
		locals: buildLocals(ctx.teacherUser)
	} as never);
	const data = await res.json();
	return new Map(
		(data.coverage as { point_id: string; source: string }[]).map((c) => [c.point_id, c.source])
	);
}

async function addExerciseActivity(ctx: Ctx, exerciseId: string): Promise<string> {
	const res = await actPOST({
		request: req({ entry_id: ctx.entryId, kind: 'exercise', exercise_id: exerciseId }),
		locals: buildLocals(ctx.teacherUser)
	} as never);
	const data = await res.json();
	return data.activity.id as string;
}

/** Ajoute une activité d'un type quelconque et renvoie la réponse brute. */
async function addActivity(ctx: Ctx, body: Record<string, unknown>): Promise<Response> {
	return actPOST({
		request: req({ entry_id: ctx.entryId, ...body }),
		locals: buildLocals(ctx.teacherUser)
	} as never);
}

/** Idem, mais renvoie directement l'identifiant de l'activité créée. */
async function addActivityId(ctx: Ctx, body: Record<string, unknown>): Promise<string> {
	const res = await addActivity(ctx, body);
	const data = await res.json();
	if (res.status !== 201) throw new Error(`activité refusée (${res.status}) : ${data.error}`);
	return data.activity.id as string;
}

// ============================================================================
// 1. Exercise tagging
// ============================================================================

describe('Exercise tagging', () => {
	it('tags an exercise with a point (201) and is idempotent', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		const exId = (await TestData.exercise(ctx.teacher.id).create()) as { id: string };

		const r1 = await tagsPOST({
			request: req({ exercise_id: exId.id, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(r1.status).toBe(201);

		const r2 = await tagsPOST({
			request: req({ exercise_id: exId.id, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(r2.status).toBe(200); // already tagged
	});

	it('lists and removes a tag', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		const exId = await makeTaggedExercise(ctx.teacher.id, [point]);

		const list = await tagsGET({
			url: urlWith({ exercise_id: exId }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect((await list.json()).tags).toHaveLength(1);

		await tagsDELETE({
			url: urlWith({ exercise_id: exId, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		const list2 = await tagsGET({
			url: urlWith({ exercise_id: exId }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect((await list2.json()).tags).toHaveLength(0);
	});

	it('returns 400 when tagging with an unknown exercise (FK)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		const res = await tagsPOST({
			request: req({ exercise_id: crypto.randomUUID(), point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(400);
	});

	it('rejects 403 for a student', async () => {
		expect.assertions(1);
		const s = await TestData.profile().withRole('student').create();
		const point = await svcPoint(await makeItem());
		await expect(
			tagsPOST({
				request: req({ exercise_id: crypto.randomUUID(), point_id: point }),
				locals: buildLocals({ id: s.id } as User)
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});

// ============================================================================
// 2. Activities
// ============================================================================

describe('Journal entry activities', () => {
	it('adds an exercise activity (201)', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const exId = await makeTaggedExercise(ctx.teacher.id, []);
		const res = await actPOST({
			request: req({ entry_id: ctx.entryId, kind: 'exercise', exercise_id: exId }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(201);
		expect((await res.json()).activity).toMatchObject({ kind: 'exercise', exercise_id: exId });
	});

	it('adds a course activity with a free label (201)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await actPOST({
			request: req({ entry_id: ctx.entryId, kind: 'course', label: 'Définition d’une fraction' }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(201);
	});

	it('returns 400 for a course activity without chapter nor label', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await actPOST({
			request: req({ entry_id: ctx.entryId, kind: 'course' }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(400);
	});

	it('adds a textbook activity with a reference (201)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await actPOST({
			request: req({
				entry_id: ctx.entryId,
				kind: 'textbook',
				textbook_ref: { label: 'Sésamath 6e p.42 n°12', page: '42', numero: '12' }
			}),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(201);
	});

	it('returns 400 for a textbook activity without a reference', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await actPOST({
			request: req({ entry_id: ctx.entryId, kind: 'textbook' }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(res.status).toBe(400);
	});

	it('lists activities of an entry', async () => {
		expect.assertions(1);
		const ctx = await setup();
		await actPOST({
			request: req({ entry_id: ctx.entryId, kind: 'course', label: 'A' }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		const res = await actGET({
			url: urlWith({ entry_id: ctx.entryId }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect((await res.json()).activities).toHaveLength(1);
	});

	it('returns 404 when deleting a missing activity', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await actDELETE({
			locals: buildLocals(ctx.teacherUser),
			params: { activityId: crypto.randomUUID() }
		} as never);
		expect(res.status).toBe(404);
	});
});

// ============================================================================
// 3. Auto coverage reconciliation (the core)
// ============================================================================

describe('Auto coverage reconciliation', () => {
	it('materializes auto coverage from tagged exercises and reconciles on add/remove', async () => {
		expect.assertions(8);
		const ctx = await setup();
		const item = await makeItem();
		const [p1, p2, p3, p4] = [
			await svcPoint(item, 'P1'),
			await svcPoint(item, 'P2'),
			await svcPoint(item, 'P3'),
			await svcPoint(item, 'P4')
		];

		const e1 = await makeTaggedExercise(ctx.teacher.id, [p1, p2]);
		const e2 = await makeTaggedExercise(ctx.teacher.id, [p2, p3]);

		// Add E1 → coverage {P1, P2} auto
		const a1 = await addExerciseActivity(ctx, e1);
		let cov = await coverageMap(ctx);
		expect(cov.size).toBe(2);
		expect(cov.get(p1)).toBe('auto');
		expect(cov.get(p2)).toBe('auto');

		// Add E2 → coverage {P1, P2, P3} (P2 deduped)
		await addExerciseActivity(ctx, e2);
		cov = await coverageMap(ctx);
		expect(cov.size).toBe(3);
		expect(cov.get(p3)).toBe('auto');

		// Remove E1 → P1 dropped (no longer backed), P2 kept (E2), P3 kept
		await actDELETE({ locals: buildLocals(ctx.teacherUser), params: { activityId: a1 } } as never);
		cov = await coverageMap(ctx);
		expect(cov.has(p1)).toBe(false);
		expect(cov.size).toBe(2);

		// Manual P4 + remove E2 → only P4 (manual) remains
		await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: p4 }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		const acts = await actGET({
			url: urlWith({ entry_id: ctx.entryId }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		const e2act = (await acts.json()).activities.find(
			(a: { exercise_id: string | null; id: string }) => a.exercise_id === e2
		);
		await actDELETE({
			locals: buildLocals(ctx.teacherUser),
			params: { activityId: e2act.id }
		} as never);
		cov = await coverageMap(ctx);
		expect([...cov.entries()]).toEqual([[p4, 'manual']]);
	});
});

// ============================================================================
// 4. Manual coverage
// ============================================================================

describe('Manual coverage', () => {
	it('checks a point manually (201, source manual) and is idempotent', async () => {
		expect.assertions(3);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());

		const r1 = await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(r1.status).toBe(201);
		expect((await r1.json()).coverage.source).toBe('manual');

		const r2 = await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect(r2.status).toBe(200); // already covered
	});

	it('unchecks a point', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		await covDELETE({
			url: urlWith({ entry_id: ctx.entryId, point_id: point }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		const cov = await coverageMap(ctx);
		expect(cov.size).toBe(0);
	});

	it('promotes an auto point to manual when checked, so it survives reconcile', async () => {
		expect.assertions(3);
		const ctx = await setup();
		const p1 = await svcPoint(await makeItem(), 'P1');
		const e1 = await makeTaggedExercise(ctx.teacher.id, [p1]);

		const a1 = await addExerciseActivity(ctx, e1);
		let cov = await coverageMap(ctx);
		expect(cov.get(p1)).toBe('auto');

		// Teacher manually checks the same point → promoted to manual.
		const res = await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: p1 }),
			locals: buildLocals(ctx.teacherUser)
		} as never);
		expect((await res.json()).coverage.source).toBe('manual');

		// Removing the backing exercise must NOT drop the now-manual point.
		await actDELETE({ locals: buildLocals(ctx.teacherUser), params: { activityId: a1 } } as never);
		cov = await coverageMap(ctx);
		expect(cov.get(p1)).toBe('manual');
	});
});

// ============================================================================
// 5. RLS & constraints (defense in depth)
// ============================================================================

describe('RLS & constraints', () => {
	it('forbids a student from inserting coverage (RLS 42501)', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;
		const { error } = await client.from('journal_entry_points' as never).insert({
			entry_id: crypto.randomUUID(),
			point_id: crypto.randomUUID(),
			source: 'manual'
		} as never);
		expect(error?.code).toBe('42501');
	});

	it('forbids a student from tagging exercises (RLS 42501)', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;
		const { error } = await client
			.from('exercise_curriculum_points' as never)
			.insert({ exercise_id: crypto.randomUUID(), point_id: crypto.randomUUID() } as never);
		expect(error?.code).toBe('42501');
	});

	it('rejects an activity with an inconsistent kind shape (CHECK)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		// kind='exercise' but no exercise_id → kind_shape CHECK violation
		const { error } = await service
			.from('journal_entry_activities' as never)
			.insert({ entry_id: ctx.entryId, kind: 'exercise', exercise_id: null } as never);
		expect(error?.code).toBe('23514');
	});

	it('rejects an invalid coverage source (CHECK)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		const { error } = await service
			.from('journal_entry_points' as never)
			.insert({ entry_id: ctx.entryId, point_id: point, source: 'bogus' } as never);
		expect(error?.code).toBe('23514');
	});
});

// ============================================================================
// 6. Questions comme activités
// ============================================================================

describe('Question activities', () => {
	it('materializes the question’s points and drops them on removal', async () => {
		expect.assertions(6);
		const ctx = await setup();
		const item = await makeItem();
		const [p1, p2] = [await svcPoint(item, 'P1'), await svcPoint(item, 'P2')];
		const { id: template } = await makeTaggedTemplate([p1, p2]);

		const activity = await addActivityId(ctx, {
			kind: 'question',
			question_template_id: template
		});
		let cov = await coverageMap(ctx);
		expect(cov.size).toBe(2);
		expect(cov.get(p1)).toBe('auto');
		expect(cov.get(p2)).toBe('auto');

		await actDELETE({
			locals: buildLocals(ctx.teacherUser),
			params: { activityId: activity }
		} as never);
		cov = await coverageMap(ctx);
		expect(cov.size).toBe(0);
		expect(cov.has(p1)).toBe(false);
		expect(cov.has(p2)).toBe(false);
	});

	it('accepts an untagged question without covering anything', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const { id: template } = await makeTaggedTemplate([]);

		const res = await addActivity(ctx, { kind: 'question', question_template_id: template });
		expect(res.status).toBe(201);
		expect((await coverageMap(ctx)).size).toBe(0);
	});

	it('counts a point once when the same question is added twice', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const point = await svcPoint(await makeItem());
		const { id: template } = await makeTaggedTemplate([point]);

		await addActivityId(ctx, { kind: 'question', question_template_id: template });
		await addActivityId(ctx, { kind: 'question', question_template_id: template });

		const cov = await coverageMap(ctx);
		expect(cov.size).toBe(1);
		expect(cov.get(point)).toBe('auto');
	});

	// Décision de spécification : on stocke tous les points tagués, y compris ceux
	// d'un autre niveau que la classe. L'information est vraie ; c'est l'arbre
	// affiché qui filtre, pas l'écriture.
	it('stores points from another referential than the class grade', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const own = await svcPoint(await makeItem(), 'Niveau de la classe');
		const { data: other, error } = await service
			.from('curriculum_points' as never)
			.select('id')
			.eq('code', '2-096')
			.single();
		if (error) throw new Error(`point de seconde absent : ${error.message}`);
		const foreign = (other as { id: string }).id;

		const { id: template } = await makeTaggedTemplate([own, foreign]);
		await addActivityId(ctx, { kind: 'question', question_template_id: template });

		const cov = await coverageMap(ctx);
		expect(cov.size).toBe(2);
		expect(cov.get(foreign)).toBe('auto');
	});

	it('rejects an unknown question template (400)', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const res = await addActivity(ctx, {
			kind: 'question',
			question_template_id: crypto.randomUUID()
		});
		expect(res.status).toBe(400);
		expect((await coverageMap(ctx)).size).toBe(0);
	});

	it('rejects kind=question without a template, at the database level (CHECK)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const { error } = await service
			.from('journal_entry_activities' as never)
			.insert({ entry_id: ctx.entryId, kind: 'question', question_template_id: null } as never);
		expect(error?.code).toBe('23514');
	});
});

// ============================================================================
// 7. Évaluations comme activités
// ============================================================================

describe('Assessment activities', () => {
	it('unions the points of every question its categories designate', async () => {
		expect.assertions(5);
		const ctx = await setup();
		const item = await makeItem();
		const [p1, p2, p3] = [
			await svcPoint(item, 'P1'),
			await svcPoint(item, 'P2'),
			await svcPoint(item, 'P3')
		];
		const t1 = await makeTaggedTemplate([p1, p2]);
		const t2 = await makeTaggedTemplate([p2, p3]);
		const assessment = await makeAssessment(ctx.teacher.id, [t1.category, t2.category]);

		const activity = await addActivityId(ctx, { kind: 'assessment', assessment_id: assessment });
		let cov = await coverageMap(ctx);
		expect(cov.size).toBe(3);
		expect(cov.get(p1)).toBe('auto');
		expect(cov.get(p3)).toBe('auto');

		await actDELETE({
			locals: buildLocals(ctx.teacherUser),
			params: { activityId: activity }
		} as never);
		cov = await coverageMap(ctx);
		expect(cov.size).toBe(0);
		expect(cov.has(p2)).toBe(false);
	});

	// Une catégorie ne désigne un template que par le quadruplet
	// (thème, domaine, sous-domaine, niveau) et seulement s'il est publié. Une
	// catégorie devenue muette ne doit pas emporter les autres avec elle.
	it('ignores a category matching no published template', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const item = await makeItem();
		const [p1, p2] = [await svcPoint(item, 'P1'), await svcPoint(item, 'P2')];
		const live = await makeTaggedTemplate([p1]);
		const draft = await makeTaggedTemplate([p2], { status: 'draft' });
		const assessment = await makeAssessment(ctx.teacher.id, [live.category, draft.category]);

		await addActivityId(ctx, { kind: 'assessment', assessment_id: assessment });
		const cov = await coverageMap(ctx);
		expect(cov.size).toBe(1);
		expect(cov.get(p1)).toBe('auto');
	});

	it('rejects an unknown assessment (400)', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const res = await addActivity(ctx, { kind: 'assessment', assessment_id: crypto.randomUUID() });
		expect(res.status).toBe(400);
	});
});

// ============================================================================
// 8. Les trois sources cohabitent
// ============================================================================

describe('Mixed sources', () => {
	it('unions exercise, question and assessment, and keeps the manual layer', async () => {
		expect.assertions(6);
		const ctx = await setup();
		const item = await makeItem();
		const [pe, pq, pa, pm] = [
			await svcPoint(item, 'Exercice'),
			await svcPoint(item, 'Question'),
			await svcPoint(item, 'Évaluation'),
			await svcPoint(item, 'Manuel')
		];

		const exercise = await makeTaggedExercise(ctx.teacher.id, [pe]);
		const question = await makeTaggedTemplate([pq]);
		const inAssessment = await makeTaggedTemplate([pa, pq]);
		const assessment = await makeAssessment(ctx.teacher.id, [inAssessment.category]);

		await addExerciseActivity(ctx, exercise);
		const qAct = await addActivityId(ctx, {
			kind: 'question',
			question_template_id: question.id
		});
		await addActivityId(ctx, { kind: 'assessment', assessment_id: assessment });
		await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: pm }),
			locals: buildLocals(ctx.teacherUser)
		} as never);

		let cov = await coverageMap(ctx);
		expect(cov.size).toBe(4);
		expect(cov.get(pm)).toBe('manual');

		// La question part, mais son point reste : l'évaluation le porte aussi.
		await actDELETE({
			locals: buildLocals(ctx.teacherUser),
			params: { activityId: qAct }
		} as never);
		cov = await coverageMap(ctx);
		expect(cov.size).toBe(4);
		expect(cov.get(pq)).toBe('auto');
		expect(cov.get(pe)).toBe('auto');
		expect(cov.get(pm)).toBe('manual');
	});
});
