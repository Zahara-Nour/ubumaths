/**
 * Évaluations : tentatives (B14), séances d'un élève et résultats du professeur
 * lus par `test_sessions.evaluation_id`, jamais par l'assignation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	computeEvaluationStatistics,
	countAttempts,
	createEvaluation,
	getEvaluationResults,
	getStudentAssignments,
	validateAttempt
} from '../evaluations';
import { resolveSessionEvaluation, FORM_MISMATCH_MESSAGE } from '../evaluation-session';
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
		const fake = createFakeSupabase(() => ({ data: evaluationRow({ series: undefined }) }));
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

	it('contrainte forme/temps violée (23514) : 400', async () => {
		const fake = createFakeSupabase(() => ({ error: { code: '23514', message: 'check' } }));
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
					{ evaluation_id: EVALUATION, score: 6, completed_at: '2026-09-30T11:00:00Z' },
					{ evaluation_id: EVALUATION, score: 8, completed_at: '2026-09-30T12:00:00Z' }
				]
			}
		};
		const fake = createFakeSupabase((table) => responses[table]);

		const [assignment] = await getStudentAssignments(fake.client, STUDENT);

		expect(assignment).toMatchObject({
			id: ASSIGNMENT,
			attempts_count: 2,
			best_score: 8,
			status: 'completed'
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
					{ user_id: STUDENT, score: 9, completed_at: '2026-09-30T12:00:00Z', total_questions: 4 },
					{ user_id: STUDENT, score: 5, completed_at: '2026-09-30T11:00:00Z', total_questions: 4 }
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
			attempts_count: 2,
			best_score: 9,
			title: 'Tables de 7'
		});
		expect(called(fake.on('test_sessions')[0], 'eq', 'evaluation_id', EVALUATION)).toBe(true);

		const stats = computeEvaluationStatistics(EVALUATION, results);
		expect(stats).toMatchObject({ total_assigned: 1, completed: 1, average_score: 9 });
	});
});

describe('resolveSessionEvaluation (B16)', () => {
	function fakeFor(options: { form: 'interactive' | 'course'; recipient: boolean }) {
		return createFakeSupabase((table) => {
			if (table === 'evaluation_assignments') {
				return {
					data: {
						id: ASSIGNMENT,
						evaluation_id: EVALUATION,
						class_id: CLASS_ID,
						student_id: null,
						assigned_by: TEACHER,
						assigned_at: '2026-09-30T10:00:00Z',
						evaluation: evaluationRow({ form: options.form })
					}
				};
			}
			if (table === 'class_members') {
				return { data: options.recipient ? { id: 'membre' } : null };
			}
			return {};
		});
	}

	it('sans assignation : entraînement libre, aucune requête', async () => {
		const fake = createFakeSupabase(() => ({}));
		expect(await resolveSessionEvaluation(fake.client, undefined, 'interactive', STUDENT)).toEqual({
			ok: true,
			evaluationId: null
		});
		expect(fake.queries).toHaveLength(0);
	});

	it('destinataire, même forme : rattachée à l’ÉVALUATION', async () => {
		const fake = fakeFor({ form: 'course', recipient: true });
		expect(await resolveSessionEvaluation(fake.client, ASSIGNMENT, 'course', STUDENT)).toEqual({
			ok: true,
			evaluationId: EVALUATION
		});
	});

	it('forme différente de celle de l’évaluation : 400', async () => {
		const fake = fakeFor({ form: 'course', recipient: true });
		expect(await resolveSessionEvaluation(fake.client, ASSIGNMENT, 'interactive', STUDENT)).toEqual(
			{ ok: false, status: 400, error: FORM_MISMATCH_MESSAGE }
		);
	});

	it('flash ou « En classe » avec une assignation : 400', async () => {
		const fake = fakeFor({ form: 'interactive', recipient: true });
		for (const mode of ['flash', 'display']) {
			const result = await resolveSessionEvaluation(fake.client, ASSIGNMENT, mode, STUDENT);
			expect(result).toMatchObject({ ok: false, status: 400 });
		}
	});

	it('aperçu du prof (non destinataire) : JAMAIS rattaché', async () => {
		const fake = fakeFor({ form: 'interactive', recipient: false });
		expect(await resolveSessionEvaluation(fake.client, ASSIGNMENT, 'interactive', TEACHER)).toEqual(
			{ ok: true, evaluationId: null }
		);
	});

	it('assignation invisible (RLS) : 404', async () => {
		const fake = createFakeSupabase(() => ({ data: null }));
		expect(
			await resolveSessionEvaluation(fake.client, ASSIGNMENT, 'interactive', STUDENT)
		).toMatchObject({ ok: false, status: 404 });
	});
});
