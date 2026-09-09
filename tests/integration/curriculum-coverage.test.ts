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

import { reconcileAutoCoverage } from '$lib/server/curriculum-coverage';
import { fetchWorksheetCitations } from '$lib/server/worksheets/citations';
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
// 3bis. Références citées DANS LE CONTENU de la séance
// ============================================================================

/**
 * Ce que le prof écrit vaut désignation.
 *
 * Le sujet de ces tests : demander la même information deux fois — une fois dans
 * le texte, une fois dans une carte « activités » — est la friction qui fait que
 * le suivi n'est pas rempli. Citer `[[exercice]]` dans la séance doit donc suffire
 * à faire remonter les points travaillés.
 */
describe('Références dans le contenu de la séance', () => {
	/** Écrit le contenu de la séance, puis réconcilie comme le fait l'action de sauvegarde. */
	async function writeLesson(ctx: Ctx, html: string): Promise<void> {
		const { error } = await service
			.from('class_journal_entries' as never)
			.update({ lesson_content: html } as never)
			.eq('id', ctx.entryId);
		if (error) throw new Error(`écriture du contenu : ${error.message}`);
		await reconcileAutoCoverage(service, ctx.entryId);
	}

	/** Une fiche vide, prête à recevoir des exercices. */
	async function makeWorksheet(teacherId: string): Promise<string> {
		const { data, error } = await service
			.from('worksheets' as never)
			.insert({
				title: `Fiche ${crypto.randomUUID().slice(0, 8)}`,
				type: 'worksheet',
				status: 'published',
				created_by: teacherId
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(`fiche : ${error.message}`);
		return (data as { id: string }).id;
	}

	/** Ajoute un exercice à la fin d'une fiche. */
	async function addToWorksheet(worksheetId: string, exerciseId: string): Promise<void> {
		const { count } = await service
			.from('worksheet_exercises' as never)
			.select('id', { count: 'exact', head: true })
			.eq('worksheet_id', worksheetId);
		const { error } = await service.from('worksheet_exercises' as never).insert({
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			position: (count ?? 0) + 1
		} as never);
		if (error) throw new Error(`jonction : ${error.message}`);
	}

	/** Place un exercice dans une fiche et renvoie l'identifiant de la JONCTION. */
	async function putInWorksheet(teacherId: string, exerciseId: string): Promise<string> {
		const { data: ws, error: wsError } = await service
			.from('worksheets' as never)
			.insert({
				title: `Fiche ${crypto.randomUUID().slice(0, 8)}`,
				type: 'worksheet',
				status: 'published',
				created_by: teacherId
			} as never)
			.select('id')
			.single();
		if (wsError) throw new Error(`fiche : ${wsError.message}`);

		const { data: link, error: linkError } = await service
			.from('worksheet_exercises' as never)
			.insert({
				worksheet_id: (ws as { id: string }).id,
				exercise_id: exerciseId,
				position: 3
			} as never)
			.select('id')
			.single();
		if (linkError) throw new Error(`jonction : ${linkError.message}`);
		return (link as { id: string }).id;
	}

	it('un exercice cité dans le contenu apporte ses points, sans aucune activité', async () => {
		expect.assertions(3);
		const ctx = await setup();
		const item = await makeItem();
		const point = await svcPoint(item, 'P-contenu');
		const exercise = await makeTaggedExercise(ctx.teacher.id, [point]);

		await writeLesson(ctx, `<p>Faire [[exercise:${exercise}|Fractions]] en classe.</p>`);

		const cov = await coverageMap(ctx);
		expect(cov.size).toBe(1);
		expect(cov.has(point)).toBe(true);
		expect(cov.get(point)).toBe('auto');
	});

	it('un EXERCICE DE FICHE cité apporte les points de l’exercice sous-jacent', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const item = await makeItem();
		const point = await svcPoint(item, 'P-fiche');
		const exercise = await makeTaggedExercise(ctx.teacher.id, [point]);
		// La citation porte l'identifiant de la JONCTION, pas celui de l'exercice :
		// c'est ce qui permet à l'élève de savoir quelle fiche ouvrir.
		const junction = await putInWorksheet(ctx.teacher.id, exercise);
		expect(junction).not.toBe(exercise);

		await writeLesson(ctx, `<p>Exercice 3 : [[worksheet_exercise:${junction}|Exercice 3]]</p>`);

		expect((await coverageMap(ctx)).get(point)).toBe('auto');
	});

	it('une FICHE citée avec `#3,4` apporte les points de ces exercices', async () => {
		expect.assertions(3);
		const ctx = await setup();
		const item = await makeItem();
		const [p3, p4, p5] = [
			await svcPoint(item, 'P3'),
			await svcPoint(item, 'P4'),
			await svcPoint(item, 'P5')
		];

		// Trois exercices dans une fiche, un point chacun.
		const fiche = await makeWorksheet(ctx.teacher.id);
		for (const point of [p3, p4, p5]) {
			await addToWorksheet(fiche, await makeTaggedExercise(ctx.teacher.id, [point]));
		}

		await writeLesson(ctx, `<p>[[worksheet:${fiche}#1,2|Fiche — ex. 1 et 2]]</p>`);

		const cov = await coverageMap(ctx);
		expect(cov.has(p3)).toBe(true);
		expect(cov.has(p4)).toBe(true);
		// Le troisième n'est PAS cité : il ne doit rien apporter.
		expect(cov.has(p5)).toBe(false);
	});

	it('une fiche citée SANS sélection n’apporte aucun point', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const point = await svcPoint(await makeItem(), 'P-fiche-entiere');
		const fiche = await makeWorksheet(ctx.teacher.id);
		await addToWorksheet(fiche, await makeTaggedExercise(ctx.teacher.id, [point]));

		await writeLesson(ctx, `<p>[[worksheet:${fiche}|La fiche entière]]</p>`);

		// Rien ne dit lesquels de ses exercices ont été faits.
		expect((await coverageMap(ctx)).size).toBe(0);
	});

	it('une plage `#1-3` prend les bornes incluses', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const item = await makeItem();
		const points = [
			await svcPoint(item, 'A'),
			await svcPoint(item, 'B'),
			await svcPoint(item, 'C')
		];
		const fiche = await makeWorksheet(ctx.teacher.id);
		for (const point of points) {
			await addToWorksheet(fiche, await makeTaggedExercise(ctx.teacher.id, [point]));
		}

		await writeLesson(ctx, `<p>[[worksheet:${fiche}#1-3|Fiche — ex. 1 à 3]]</p>`);

		expect([...(await coverageMap(ctx)).keys()].sort()).toEqual([...points].sort());
	});

	it('signale un numéro qui n’existe pas, sans perdre les autres', async () => {
		expect.assertions(3);
		const ctx = await setup();
		const point = await svcPoint(await makeItem(), 'P-unique');
		const fiche = await makeWorksheet(ctx.teacher.id);
		await addToWorksheet(fiche, await makeTaggedExercise(ctx.teacher.id, [point]));

		// La fiche n'a qu'un exercice : `#1,7` cite un numéro inexistant.
		await service
			.from('class_journal_entries' as never)
			.update({ lesson_content: `<p>[[worksheet:${fiche}#1,7|Fiche]]</p>` } as never)
			.eq('id', ctx.entryId);
		const rapport = await reconcileAutoCoverage(service, ctx.entryId);

		// Le numéro valide compte quand même : une coquille ne doit pas tout perdre.
		expect((await coverageMap(ctx)).has(point)).toBe(true);
		expect(rapport.numerosIntrouvables).toHaveLength(1);
		expect(rapport.numerosIntrouvables[0].numeros).toEqual([7]);
	});

	it('retirer la citation du texte retire le point', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const item = await makeItem();
		const point = await svcPoint(item, 'P-retire');
		const exercise = await makeTaggedExercise(ctx.teacher.id, [point]);

		await writeLesson(ctx, `<p>[[exercise:${exercise}|Fractions]]</p>`);
		expect((await coverageMap(ctx)).has(point)).toBe(true);

		// Une référence `[[…]]` n'est pas de la prose : la retirer est un geste
		// aussi explicite que décocher une case.
		await writeLesson(ctx, '<p>Finalement, cours magistral.</p>');
		expect((await coverageMap(ctx)).has(point)).toBe(false);
	});

	it('ne touche jamais un point coché à la main', async () => {
		expect.assertions(2);
		const ctx = await setup();
		const item = await makeItem();
		const manual = await svcPoint(item, 'P-manuel');

		await covPOST({
			request: req({ entry_id: ctx.entryId, point_id: manual }),
			locals: buildLocals(ctx.teacherUser)
		} as never);

		await writeLesson(ctx, '<p>Aucune citation ici.</p>');

		const cov = await coverageMap(ctx);
		expect(cov.get(manual)).toBe('manual');
		expect(cov.size).toBe(1);
	});

	it('dédoublonne un exercice cité deux fois, et cité en plus comme activité', async () => {
		expect.assertions(1);
		const ctx = await setup();
		const item = await makeItem();
		const point = await svcPoint(item, 'P-doublon');
		const exercise = await makeTaggedExercise(ctx.teacher.id, [point]);

		await addExerciseActivity(ctx, exercise);
		await writeLesson(
			ctx,
			`<p>[[exercise:${exercise}|Une fois]] puis [[exercise:${exercise}|deux fois]]</p>`
		);

		// La couverture dit qu'un point a été travaillé, pas combien de fois il a
		// été mentionné.
		expect([...(await coverageMap(ctx)).keys()]).toEqual([point]);
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

// ============================================================================
// 3ter. Quelles séances citent une fiche PAR NUMÉRO
// ============================================================================

/**
 * La contrepartie visible du choix « la référence porte des numéros ».
 *
 * Réordonner une fiche change ce que les séances qui la citent désignent. Le
 * professeur ne peut l'accepter que s'il le voit AU MOMENT où il réorganise :
 * ces tests vérifient que la liste affichée sur la page de la fiche est exacte,
 * et surtout qu'elle ne signale QUE ce qui peut casser.
 */
describe('fetchWorksheetCitations', () => {
	/**
	 * Une école de test.
	 *
	 * Nommée `TEST-…` pour être purgeable : la purge générale efface les classes,
	 * pas les écoles.
	 */
	async function makeSchool(): Promise<string> {
		const { data, error } = await service
			.from('schools' as never)
			.insert({
				name: `TEST-${crypto.randomUUID().slice(0, 8)}`,
				city: 'Doha',
				country: 'QA'
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(`école : ${error.message}`);
		return (data as { id: string }).id;
	}

	afterAll(async () => {
		await service
			.from('schools' as never)
			.delete()
			.like('name', 'TEST-%');
	});

	/**
	 * Une fiche vide, rattachée à une école.
	 *
	 * L'école n'est pas un détail de fixture : c'est elle qui délimite les séances
	 * que la garde a le droit de montrer.
	 */
	async function makeWorksheet(teacherId: string, schoolId: string): Promise<string> {
		const { data, error } = await service
			.from('worksheets' as never)
			.insert({
				title: `Fiche ${crypto.randomUUID().slice(0, 8)}`,
				type: 'worksheet',
				status: 'published',
				created_by: teacherId,
				school_id: schoolId
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(`fiche : ${error.message}`);
		return (data as { id: string }).id;
	}

	/** Une séance dans une classe nommée d'une école donnée, à une date donnée. */
	async function makeEntry(
		className: string,
		entryDate: string,
		contents: { lesson?: string; homework?: string },
		schoolId: string
	): Promise<{ classId: string; entryId: string }> {
		const klass = await TestData.class().withName(className).create();
		const { error: rattachement } = await service
			.from('classes' as never)
			.update({ school_id: schoolId } as never)
			.eq('id', klass.id);
		if (rattachement) throw new Error(`rattachement : ${rattachement.message}`);

		const { data, error } = await service
			.from('class_journal_entries' as never)
			.insert({
				class_id: klass.id,
				entry_date: entryDate,
				lesson_content: contents.lesson ?? null,
				homework_content: contents.homework ?? null
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(`séance : ${error.message}`);
		return { classId: klass.id, entryId: (data as { id: string }).id };
	}

	it('liste la séance qui cite la fiche par numéro, avec sa classe et sa date', async () => {
		expect.assertions(4);
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		const { classId } = await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}#3,5-7|Produit scalaire — ex. 3 et 5 à 7]]</p>`
			},
			ecole
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations).toHaveLength(1);
		expect(citations[0].classId).toBe(classId);
		expect(citations[0].entryDate).toBe('2026-03-12');
		// Le libellé est reconstruit depuis les NUMÉROS, pas recopié du texte :
		// c'est ce qui rend la liste juste même si le libellé écrit était faux.
		expect(citations[0].selections).toEqual(['ex. 3 et 5 à 7']);
	});

	it('ignore une fiche citée SANS sélection — rien ne peut y casser', async () => {
		expect.assertions(1);
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}|La fiche entière]]</p>`
			},
			ecole
		);

		expect((await fetchWorksheetCitations(service, fiche)).citations).toEqual([]);
	});

	it('n’attribue pas à cette fiche les numéros d’une AUTRE citée dans la même séance', async () => {
		expect.assertions(2);
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const [fiche, autre] = [
			await makeWorksheet(teacher.id, ecole),
			await makeWorksheet(teacher.id, ecole)
		];

		// La séance cite les deux fiches : la présélection SQL la retient donc, et
		// c'est le tri par identifiant qui doit faire le partage. Une séance ne
		// citant QUE l'autre fiche ne prouverait rien — le SQL l'écarterait déjà.
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}#2|Celle-ci]] et [[worksheet:${autre}#9|L'autre]]</p>`
			},
			ecole
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations).toHaveLength(1);
		expect(citations[0].selections).toEqual(['ex. 2']);
	});

	it('trouve une fiche citée UNIQUEMENT dans les devoirs', async () => {
		expect.assertions(2);
		// C'est le cas le plus fréquent — « pour jeudi, les exercices 4 à 6 » — et
		// il dépend d'une présélection SQL qui interroge les DEUX colonnes. Une
		// séance citant la fiche dans le cours ne le prouverait pas.
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: '<p>Correction du contrôle.</p>',
				homework: `<p>Pour jeudi : [[worksheet:${fiche}#4-6|Fiche — ex. 4 à 6]]</p>`
			},
			ecole
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations).toHaveLength(1);
		expect(citations[0].selections).toEqual(['ex. 4 à 6']);
	});

	it('réunit les deux citations d’une même séance — en classe ET en devoirs', async () => {
		expect.assertions(2);
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}#1|Fiche — ex. 1]]</p>`,
				homework: `<p>[[worksheet:${fiche}#4-6|Fiche — ex. 4 à 6]]</p>`
			},
			ecole
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		// Une séance, une ligne : le professeur veut savoir QUELLES séances rompre,
		// pas combien de fois chacune cite la fiche.
		expect(citations).toHaveLength(1);
		expect(citations[0].selections.sort()).toEqual(['ex. 1', 'ex. 4 à 6']);
	});

	it('trouve la fiche même si l’identifiant est écrit en MAJUSCULES', async () => {
		expect.assertions(1);
		// L'identifiant vient de l'URL, où un uuid peut s'écrire dans les deux
		// casses, tandis que l'extracteur rend toujours des minuscules. Comparer
		// sans normaliser rendrait une liste vide — un avertissement muet, la pire
		// des pannes pour une garde.
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}#2|Fiche — ex. 2]]</p>`
			},
			ecole
		);

		expect((await fetchWorksheetCitations(service, fiche.toUpperCase())).citations).toHaveLength(1);
	});

	it('n’est pas noyée par les citations de la fiche ENTIÈRE, même bien plus récentes', async () => {
		expect.assertions(2);
		// LE cas que la garde existe pour couvrir. Une fiche liée en entier chaque
		// semaine — un cahier d'exercices de trimestre — produit des dizaines de
		// citations sans sélection. Si la fenêtre SQL les retient, la troncature
		// s'applique avant le tri : les récentes remplissent la fenêtre et la seule
		// séance citant par numéro tombe dehors. Le panneau se tairait.
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);

		const { classId } = await makeEntry(
			'5ᵉ B',
			'2026-01-05',
			{
				lesson: `<p>[[worksheet:${fiche}#3|Fiche — ex. 3]]</p>`
			},
			ecole
		);

		// 60 séances POSTÉRIEURES citant la fiche entière : plus que `MAX_CITATIONS`.
		const bruit = Array.from({ length: 60 }, (_, i) => {
			// Deux mois de 30 jours : le cahier a une contrainte d'unicité par
			// (classe, date), et `2026-03-32` n'est pas une date.
			const jour = new Date(2026, 2, 1 + i);
			return {
				class_id: classId,
				entry_date: `${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, '0')}-${String(jour.getDate()).padStart(2, '0')}`,
				lesson_content: `<p>[[worksheet:${fiche}|La fiche entière]]</p>`
			};
		});
		const { error: bruitError } = await service
			.from('class_journal_entries' as never)
			.insert(bruit as never);
		if (bruitError) throw new Error(`bruit : ${bruitError.message}`);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations).toHaveLength(1);
		expect(citations[0].entryDate).toBe('2026-01-05');
	});

	it('n’affiche pas deux fois la même sélection écrite de deux façons', async () => {
		expect.assertions(1);
		// `#3-5` et `#3,4,5` sont deux écritures du même ensemble : l'extracteur en
		// garde deux (son dédoublonnage porte sur la forme brute), mais la ligne ne
		// doit pas afficher « ex. 3 à 5 · ex. 3 à 5 ».
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);
		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{
				lesson: `<p>[[worksheet:${fiche}#3-5|En classe]]</p>`,
				homework: `<p>[[worksheet:${fiche}#3,4,5|À refaire]]</p>`
			},
			ecole
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations[0].selections).toEqual(['ex. 3 à 5']);
	});

	it('distingue « rien à signaler » de « je n’ai pas pu lire le cahier »', async () => {
		expect.assertions(3);
		// Les deux états rendaient la même liste vide, donc le même écran muet — au
		// moment précis où le professeur s'apprête à réordonner. Une garde qui ne
		// sait pas doit le dire.
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const fiche = await makeWorksheet(teacher.id, ecole);

		const saine = await fetchWorksheetCitations(service, fiche);
		expect(saine.citations).toEqual([]);
		expect(saine.verifie).toBe(true);

		// Un client dont la lecture DU CAHIER échoue — la fiche, elle, se lit :
		// c'est bien la panne du cahier qu'on veut voir ressortir, pas une fiche
		// introuvable, qui a déjà son propre chemin.
		const silencieux = vi.spyOn(console, 'error').mockImplementation(() => {});
		const cassé = {
			from: (table: string) =>
				table === 'worksheets'
					? {
							select: () => ({
								eq: () => ({
									maybeSingle: () => Promise.resolve({ data: { school_id: ecole }, error: null })
								})
							})
						}
					: {
							select: () => ({
								eq: () => ({
									or: () => ({
										order: () => ({
											limit: () =>
												Promise.resolve({ data: null, error: { message: 'cahier indisponible' } })
										})
									})
								})
							})
						}
		} as unknown as typeof service;

		expect((await fetchWorksheetCitations(cassé, fiche)).verifie).toBe(false);
		silencieux.mockRestore();
	});

	it('ne montre PAS la séance d’une classe d’une autre école', async () => {
		expect.assertions(2);
		// L'école est la frontière sociale de l'application. Nommer la classe et la
		// date d'une séance de l'autre école, fût-ce pour avertir, la franchirait.
		const teacher = await TestData.profile().withRole('teacher').create();
		const [ecole, ailleurs] = [await makeSchool(), await makeSchool()];
		const fiche = await makeWorksheet(teacher.id, ecole);

		await makeEntry(
			'1SPE 1',
			'2026-03-12',
			{ lesson: `<p>[[worksheet:${fiche}#3|Fiche — ex. 3]]</p>` },
			ecole
		);
		await makeEntry(
			'Terminale ailleurs',
			'2026-03-13',
			{ lesson: `<p>[[worksheet:${fiche}#5|Fiche — ex. 5]]</p>` },
			ailleurs
		);

		const { citations } = await fetchWorksheetCitations(service, fiche);

		expect(citations).toHaveLength(1);
		expect(citations[0].className).toBe('1SPE 1');
	});

	it('dit qu’il n’a pas pu vérifier quand la fiche n’a aucune école', async () => {
		expect.assertions(2);
		// Sans école, le périmètre n'a pas de sens — et on ne le remplace surtout
		// pas par « toutes les écoles ». Se taire laisserait croire que personne ne
		// cite la fiche.
		const teacher = await TestData.profile().withRole('teacher').create();
		const ecole = await makeSchool();
		const { data, error } = await service
			.from('worksheets' as never)
			.insert({
				title: 'Fiche sans école',
				type: 'worksheet',
				status: 'published',
				created_by: teacher.id
			} as never)
			.select('id')
			.single();
		if (error) throw new Error(`fiche : ${error.message}`);
		const fiche = (data as { id: string }).id;

		await makeEntry(
			'5ᵉ B',
			'2026-03-12',
			{ lesson: `<p>[[worksheet:${fiche}#3|Fiche — ex. 3]]</p>` },
			ecole
		);

		const rapport = await fetchWorksheetCitations(service, fiche);

		expect(rapport.citations).toEqual([]);
		expect(rapport.verifie).toBe(false);
	});

	it('un identifiant mal formé ne descend JAMAIS jusqu’à la base', async () => {
		expect.assertions(2);
		// Le filtre PostgREST est construit par concaténation : une valeur portant
		// une virgule en sortirait et ajouterait ses propres conditions — ici
		// `id.not.is.null`, qui ferait remonter TOUTES les séances du cahier.
		//
		// L'assertion porte sur l'absence de requête, pas sur le résultat : le
		// filtrage par identifiant qui suit masquerait l'injection dans la valeur
		// de retour, et le test passerait sur du code cassé.
		const spy = vi.spyOn(service, 'from');

		const { citations } = await fetchWorksheetCitations(service, '%,id.not.is.null');

		expect(spy).not.toHaveBeenCalled();
		expect(citations).toEqual([]);
		spy.mockRestore();
	});
});
