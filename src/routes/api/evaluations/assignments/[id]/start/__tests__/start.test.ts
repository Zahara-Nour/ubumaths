/**
 * POST /api/evaluations/assignments/[id]/start (B14, B15)
 *
 * La forme et le temps limite viennent de l'ÉVALUATION ; date limite et
 * tentatives sont vérifiées pour un destinataire ; le prof propriétaire n'a
 * qu'un aperçu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { createFakeSupabase, called } from '$lib/server/__tests__/helpers/fake-supabase';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const OTHER_TEACHER = '77777777-7777-4777-8777-777777777777';
const ASSIGNMENT = '44444444-4444-4444-8444-444444444444';
const EVALUATION = '55555555-5555-4555-8555-555555555555';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

function setup(options: {
	role: 'student' | 'teacher' | 'admin';
	userId: string;
	recipient: boolean;
	attempts?: number;
	maxAttempts?: number | null;
	deadline?: string | null;
}) {
	const fake = createFakeSupabase((table) => {
		if (table === 'profiles') return { data: { id: options.userId, role: options.role } };
		if (table === 'evaluation_assignments') {
			return {
				data: {
					id: ASSIGNMENT,
					evaluation_id: EVALUATION,
					class_id: null,
					student_id: options.recipient ? options.userId : STUDENT,
					assigned_by: TEACHER,
					assigned_at: '2026-09-30T10:00:00Z',
					evaluation: {
						id: EVALUATION,
						series_id: 'serie',
						form: 'course',
						time_limit: 420,
						max_attempts: options.maxAttempts ?? null,
						deadline: options.deadline ?? null,
						shuffle_questions: true,
						academic_period_id: null,
						status: 'published',
						created_by: TEACHER,
						created_at: '2026-09-30T10:00:00Z',
						updated_at: '2026-09-30T10:00:00Z',
						series: {
							id: 'serie',
							title: 'Tables de 7',
							description: null,
							grade: '6',
							categories: [ITEM],
							created_by: TEACHER,
							created_at: '2026-09-30T10:00:00Z',
							updated_at: '2026-09-30T10:00:00Z'
						}
					}
				}
			};
		}
		if (table === 'test_sessions') return { count: options.attempts ?? 0 };
		return {};
	});
	const call = (id = ASSIGNMENT) =>
		POST({
			params: { id },
			locals: {
				supabase: fake.client,
				safeGetSession: async () => ({ user: { id: options.userId }, session: {} })
			}
		} as never);
	return { fake, call };
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/evaluations/assignments/[id]/start', () => {
	it('B15 : rend la forme et le temps limite de l’évaluation (Course, 420 s)', async () => {
		const { call } = setup({ role: 'student', userId: STUDENT, recipient: true });
		const response = await call();
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			preview: false,
			validation: { can_attempt: true },
			evaluation: { id: EVALUATION, form: 'course', time_limit: 420, title: 'Tables de 7' }
		});
		expect(body.evaluation.categories).toEqual([ITEM]);
	});

	it('B14 : tentatives comptées par evaluation_id + élève, max atteint → refus', async () => {
		const { call, fake } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			attempts: 2,
			maxAttempts: 2
		});
		const body = await (await call()).json();
		expect(body.validation).toMatchObject({ can_attempt: false, current_attempts: 2 });

		const [count] = fake.on('test_sessions');
		expect(called(count, 'eq', 'evaluation_id', EVALUATION)).toBe(true);
		expect(called(count, 'eq', 'user_id', STUDENT)).toBe(true);
	});

	it('B14 : date limite de l’évaluation dépassée → refus', async () => {
		const { call } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			deadline: '2020-01-01T00:00:00Z'
		});
		const body = await (await call()).json();
		expect(body.validation).toMatchObject({ can_attempt: false, deadline_passed: true });
	});

	it('prof propriétaire, non destinataire : aperçu, sans compter de tentative', async () => {
		const { call, fake } = setup({ role: 'teacher', userId: TEACHER, recipient: false });
		const body = await (await call()).json();
		expect(body).toMatchObject({ preview: true, validation: { can_attempt: true } });
		expect(fake.on('test_sessions')).toHaveLength(0);
	});

	it('autre prof, non destinataire : 403', async () => {
		const { call } = setup({ role: 'teacher', userId: OTHER_TEACHER, recipient: false });
		expect((await call()).status).toBe(403);
	});

	it('identifiant invalide : 400', async () => {
		const { call } = setup({ role: 'student', userId: STUDENT, recipient: true });
		expect((await call('pas-un-uuid')).status).toBe(400);
	});
});
