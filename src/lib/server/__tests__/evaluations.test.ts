/**
 * Évaluations : tentatives (B14), séances d'un élève et résultats du professeur
 * lus par `test_sessions.evaluation_id`, jamais par l'assignation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	computeEvaluationStatistics,
	countAttempts,
	createEvaluation,
	assignEvaluation,
	getEvaluation,
	getEvaluationResults,
	getStudentAssignments,
	validateAttempt
} from '../evaluations';
import { called, createFakeSupabase, type Result } from './helpers/fake-supabase';
import type { DbSeries } from '$lib/types/evaluation';

const TEACHER = '1a2b3c4d-1111-4111-8111-111111111111';
const STUDENT = '7a8b9c0d-7777-4777-8777-777777777777';
const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const ASSIGNMENT = '9c0d1e2f-9999-4999-8999-999999999999';
const CLASS_ID = 'a0b1c2d3-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SERIES_ID = '2b3c4d5e-2222-4222-8222-222222222222';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

const SERIES: DbSeries = {
	id: SERIES_ID,
	title: 'Tables de 7',
	description: null,
	grade: '6',
	categories: [ITEM],
	created_by: TEACHER,
	created_at: '2026-09-30T10:00:00Z',
	updated_at: '2026-09-30T10:00:00Z'
};

function evaluationRow(overrides: Record<string, unknown> = {}) {
	return {
		id: EVALUATION,
		series_id: SERIES_ID,
		form: 'course',
		time_limit: 420,
		max_attempts: 2,
		deadline: null,
		shuffle_questions: true,
		academic_period_id: null,
		status: 'published',
		created_by: TEACHER,
		created_at: '2026-09-30T10:00:00Z',
		updated_at: '2026-09-30T10:00:00Z',
		legacy_assessment_id: null,
		series: { ...SERIES },
		...overrides
	};
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('countAttempts / validateAttempt (B14)', () => {
	const published = {
		id: EVALUATION,
		status: 'published' as const,
		deadline: null,
		max_attempts: 2
	};

	it('compte les séances par evaluation_id ET élève', async () => {
		const fake = createFakeSupabase(() => ({ count: 1 }));
		expect(await countAttempts(fake.client, EVALUATION, STUDENT)).toBe(1);

		const [query] = fake.on('test_sessions');
		expect(called(query, 'eq', 'evaluation_id', EVALUATION)).toBe(true);
		expect(called(query, 'eq', 'user_id', STUDENT)).toBe(true);
		expect(query.calls.some((c) => JSON.stringify(c.args).includes('assignment_id'))).toBe(false);
	});

	it('tentatives restantes = max_attempts de l’évaluation − séances', async () => {
		const fake = createFakeSupabase(() => ({ count: 1 }));
		expect(await validateAttempt(fake.client, published, STUDENT)).toEqual({
			can_attempt: true,
			attempts_remaining: 1,
			deadline_passed: false,
			current_attempts: 1
		});
	});

	it('max_attempts atteint : refusé', async () => {
		const fake = createFakeSupabase(() => ({ count: 2 }));
		const result = await validateAttempt(fake.client, published, STUDENT);
		expect(result.can_attempt).toBe(false);
		expect(result.reason).toBe('Nombre maximal de tentatives atteint');
	});

	it('max_attempts nul : illimité', async () => {
		const fake = createFakeSupabase(() => ({ count: 9 }));
		const result = await validateAttempt(
			fake.client,
			{ ...published, max_attempts: null },
			STUDENT
		);
		expect(result).toMatchObject({ can_attempt: true, attempts_remaining: null });
	});

	it('date limite de l’évaluation dépassée : refusé sans compter', async () => {
		const fake = createFakeSupabase(() => ({ count: 0 }));
		const result = await validateAttempt(
			fake.client,
			{ ...published, deadline: '2020-01-01T00:00:00Z' },
			STUDENT
		);
		expect(result).toMatchObject({ can_attempt: false, deadline_passed: true });
		expect(fake.on('test_sessions')).toHaveLength(0);
	});

	it('comptage en panne : refusé (on n’accorde pas une tentative injustifiable)', async () => {
		const fake = createFakeSupabase(() => ({ error: { message: 'réseau' } }));
		const result = await validateAttempt(fake.client, published, STUDENT);
		expect(result.can_attempt).toBe(false);
	});

	it('évaluation non publiée : refusé', async () => {
		const fake = createFakeSupabase(() => ({ count: 0 }));
		const result = await validateAttempt(fake.client, { ...published, status: 'draft' }, STUDENT);
		expect(result.can_attempt).toBe(false);
	});
});

describe('createEvaluation (B13)', () => {
	it('écrit forme et temps limite (secondes) de la Course aux nombres', async () => {
		const fake = createFakeSupabase((table) =>
			table === 'series'
				? { data: { categories: SERIES.categories } }
				: { data: evaluationRow({ series: undefined }) }
		);
		await createEvaluation(
			fake.client,
			{
				series_id: SERIES_ID,
				settings: {
					form: 'course',
					time_limit: 420,
					max_attempts: 2,
					deadline: null,
					shuffle_questions: true
				},
				status: 'published'
			},
			TEACHER
		);
		const insert = fake.on('evaluations')[0].calls.find((c) => c.method === 'insert')!;
		expect(insert.args[0]).toMatchObject({
			series_id: SERIES_ID,
			form: 'course',
			time_limit: 420,
			status: 'published',
			created_by: TEACHER
		});
	});

	it('série de plus de 500 questions : 400 avec message clair, rien d’inséré', async () => {
		const big = Array.from({ length: 6 }, () => ({
			category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
			quantity: 99,
			delay: 20
		}));
		const fake = createFakeSupabase((table) =>
			table === 'series' ? { data: { categories: big } } : { data: evaluationRow() }
		);
		await expect(
			createEvaluation(
				fake.client,
				{
					series_id: SERIES_ID,
					settings: {
						form: 'interactive',
						time_limit: null,
						max_attempts: null,
						deadline: null,
						shuffle_questions: true
					},
					status: 'draft'
				},
				TEACHER
			)
		).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/500 au plus/) });
		expect(fake.on('evaluations')).toHaveLength(0);
	});

	it('contrainte forme/temps violée (23514) : 400', async () => {
		const fake = createFakeSupabase((table) =>
			table === 'series'
				? { data: { categories: SERIES.categories } }
				: { error: { code: '23514', message: 'check' } }
		);
		await expect(
			createEvaluation(
				fake.client,
				{
					series_id: SERIES_ID,
					settings: {
						form: 'interactive',
						time_limit: 60,
						max_attempts: null,
						deadline: null,
						shuffle_questions: true
					},
					status: 'draft'
				},
				TEACHER
			)
		).rejects.toMatchObject({ status: 400 });
	});
});

describe('getStudentAssignments', () => {
	it('tentatives de l’élève lues par evaluation_id', async () => {
		const responses: Record<string, Result> = {
			class_members: { data: [{ class_id: CLASS_ID }] },
			evaluation_assignments: {
				data: [
					{
						id: ASSIGNMENT,
						evaluation_id: EVALUATION,
						class_id: CLASS_ID,
						student_id: null,
						assigned_by: TEACHER,
						assigned_at: '2026-09-30T10:00:00Z',
						evaluation: evaluationRow()
					}
				]
			},
			test_sessions: {
				data: [
					{ evaluation_id: EVALUATION, grade: 16, completed_at: '2026-09-30T11:00:00Z' },
					{ evaluation_id: EVALUATION, grade: 12.5, completed_at: '2026-09-30T12:00:00Z' },
					// Tentative en cours : pas de note
					{ evaluation_id: EVALUATION, grade: null, completed_at: null }
				]
			}
		};
		const fake = createFakeSupabase((table) => responses[table]);

		const [assignment] = await getStudentAssignments(fake.client, STUDENT);

		expect(assignment).toMatchObject({
			id: ASSIGNMENT,
			attempts_count: 3,
			// C13 : la MEILLEURE note, pas la dernière
			best_grade: 16,
			// Une tentative terminée suffit : la 3ᵉ, ouverte puis abandonnée, n'en fait
			// pas un « en cours » perpétuel
			status: 'completed',
			last_attempt_at: '2026-09-30T12:00:00Z'
		});
		expect(assignment.evaluation).toMatchObject({ form: 'course', time_limit: 420 });
		expect(assignment.evaluation.series.title).toBe('Tables de 7');
		expect(called(fake.on('test_sessions')[0], 'in', 'evaluation_id', [EVALUATION])).toBe(true);
	});

	it('une évaluation non publiée est écartée', async () => {
		const responses: Record<string, Result> = {
			class_members: { data: [] },
			evaluation_assignments: {
				data: [
					{
						id: ASSIGNMENT,
						evaluation_id: EVALUATION,
						class_id: null,
						student_id: STUDENT,
						assigned_by: TEACHER,
						assigned_at: '2026-09-30T10:00:00Z',
						evaluation: evaluationRow({ status: 'draft' })
					}
				]
			}
		};
		const fake = createFakeSupabase((table) => responses[table]);
		expect(await getStudentAssignments(fake.client, STUDENT)).toEqual([]);
	});
});

describe('getEvaluationResults', () => {
	it('séances lues par evaluation_id ; un élève compté une fois (classe + nominatif)', async () => {
		const responses: Record<string, Result> = {
			evaluation_assignments: {
				data: [
					{ id: ASSIGNMENT, class_id: CLASS_ID, student_id: null },
					{ id: 'b1c2d3e4-bbbb-4bbb-8bbb-bbbbbbbbbbbb', class_id: null, student_id: STUDENT }
				]
			},
			class_members: { data: [{ student_id: STUDENT, class_id: CLASS_ID }] },
			profiles: { data: [{ id: STUDENT, firstname: 'Ada', lastname: 'L', is_test: false }] },
			classes: { data: [{ id: CLASS_ID, name: '6e A' }] },
			test_sessions: {
				data: [
					// Tri completed_at DESC : Postgres met les NULL EN PREMIER
					{
						user_id: STUDENT,
						grade: null,
						points_earned: null,
						created_at: '2026-10-01T09:00:00Z',
						completed_at: null,
						total_questions: 4
					},
					{
						user_id: STUDENT,
						grade: 9.5,
						points_earned: 2,
						created_at: '2026-09-30T11:50:00Z',
						completed_at: '2026-09-30T12:00:00Z',
						total_questions: 4
					},
					{
						user_id: STUDENT,
						grade: 15,
						points_earned: 3,
						created_at: '2026-09-30T10:50:00Z',
						completed_at: '2026-09-30T11:00:00Z',
						total_questions: 4
					}
				]
			}
		};
		const fake = createFakeSupabase((table) => responses[table]);

		const results = await getEvaluationResults(
			fake.client,
			{ id: EVALUATION, series: SERIES, deadline: null },
			false
		);

		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			student_id: STUDENT,
			class_name: '6e A',
			// C13 : la MEILLEURE note (15), pas la dernière (9,5)
			best_grade: 15,
			attempts_count: 3,
			status: 'completed',
			last_attempt_at: '2026-09-30T12:00:00Z',
			title: 'Tables de 7'
		});
		// E21 : détail des tentatives
		expect(results[0].attempts).toEqual([
			{
				grade: null,
				points_earned: null,
				total_questions: 4,
				created_at: '2026-10-01T09:00:00Z',
				completed_at: null
			},
			{
				grade: 9.5,
				points_earned: 2,
				total_questions: 4,
				created_at: '2026-09-30T11:50:00Z',
				completed_at: '2026-09-30T12:00:00Z'
			},
			{
				grade: 15,
				points_earned: 3,
				total_questions: 4,
				created_at: '2026-09-30T10:50:00Z',
				completed_at: '2026-09-30T11:00:00Z'
			}
		]);
		expect(called(fake.on('test_sessions')[0], 'eq', 'evaluation_id', EVALUATION)).toBe(true);

		const stats = computeEvaluationStatistics(EVALUATION, results);
		expect(stats).toMatchObject({ total_assigned: 1, completed: 1, average_grade: 15 });
	});
});

describe('getEvaluation — anciens liens (legacy_assessment_id)', () => {
	const LEGACY = 'c1d2e3f4-cccc-4ccc-8ccc-cccccccccccc';

	it('id d’évaluation : trouvé directement, une seule requête', async () => {
		const fake = createFakeSupabase(() => ({ data: evaluationRow() }));
		expect((await getEvaluation(fake.client, EVALUATION))?.id).toBe(EVALUATION);
		expect(fake.on('evaluations')).toHaveLength(1);
	});

	it('ancien id d’assessment : retombe sur legacy_assessment_id', async () => {
		const fake = createFakeSupabase((_table, calls) =>
			called({ table: 'evaluations', calls }, 'eq', 'legacy_assessment_id', LEGACY)
				? { data: evaluationRow({ legacy_assessment_id: LEGACY }) }
				: { data: null }
		);
		const evaluation = await getEvaluation(fake.client, LEGACY);
		expect(evaluation?.id).toBe(EVALUATION);
	});

	it('introuvable des deux façons : null', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		expect(await getEvaluation(fake.client, LEGACY)).toBeNull();
		expect(fake.on('evaluations')).toHaveLength(2);
	});
});

describe('assignEvaluation — propriétaire ou admin (comme la RLS)', () => {
	const ADMIN = 'd1e2f3a4-dddd-4ddd-8ddd-dddddddddddd';
	const OTHER = 'e1f2a3b4-eeee-4eee-8eee-eeeeeeeeeeee';
	const LEGACY = 'c1d2e3f4-cccc-4ccc-8ccc-cccccccccccc';

	function fake() {
		return createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				const byLegacy = called({ table, calls }, 'eq', 'legacy_assessment_id', LEGACY);
				const byId = called({ table, calls }, 'eq', 'id', EVALUATION);
				return { data: byLegacy || byId ? evaluationRow() : null };
			}
			const insert = calls.find((c) => c.method === 'insert');
			return { data: insert ? (insert.args[0] as unknown[]) : [] };
		});
	}

	it('admin non propriétaire : assigne, assigned_by = l’admin', async () => {
		const f = fake();
		const rows = await assignEvaluation(
			f.client,
			EVALUATION,
			{ class_ids: [CLASS_ID] },
			{ id: ADMIN, isAdmin: true }
		);
		expect(rows).toHaveLength(1);
		const insert = f.on('evaluation_assignments')[0].calls.find((c) => c.method === 'insert')!;
		expect((insert.args[0] as Record<string, unknown>[])[0]).toMatchObject({
			evaluation_id: EVALUATION,
			assigned_by: ADMIN
		});
	});

	it('prof non propriétaire : 403', async () => {
		await expect(
			assignEvaluation(
				fake().client,
				EVALUATION,
				{ class_ids: [CLASS_ID] },
				{
					id: OTHER,
					isAdmin: false
				}
			)
		).rejects.toMatchObject({ status: 403 });
	});

	it('ancien id dans l’URL : l’assignation porte l’id de l’ÉVALUATION', async () => {
		const f = fake();
		await assignEvaluation(
			f.client,
			LEGACY,
			{ class_ids: [CLASS_ID] },
			{
				id: TEACHER,
				isAdmin: false
			}
		);
		const insert = f.on('evaluation_assignments')[0].calls.find((c) => c.method === 'insert')!;
		expect((insert.args[0] as Record<string, unknown>[])[0].evaluation_id).toBe(EVALUATION);
	});
});
