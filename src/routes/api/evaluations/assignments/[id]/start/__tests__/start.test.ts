/**
 * POST /api/evaluations/assignments/[id]/start (chantier 5, B6-B9)
 *
 * Refus AVANT toute écriture : date limite, tentatives (403), non destinataire
 * (404). Le prof propriétaire n'a qu'un aperçu. Le parcours complet (création,
 * reprise, questions publiques) tourne contre la vraie base :
 * `tests/integration/evaluation-notee-serveur.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le client service_role ne doit JAMAIS écrire dans ces cas : on compte ses appels
const serviceFrom = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: serviceFrom })
}));

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
	const fake = createFakeSupabase((table, calls) => {
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
		if (table === 'test_sessions') {
			// Comptage des tentatives (head + count) ; sinon : tentative en cours (aucune)
			if (calls.some((c) => JSON.stringify(c.args).includes('exact'))) {
				return { count: options.attempts ?? 0 };
			}
			return { data: [] };
		}
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
	serviceFrom.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/evaluations/assignments/[id]/start', () => {
	it('B7 : tentatives épuisées (comptées par evaluation_id + élève) → 403, rien d’écrit', async () => {
		const { call, fake } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			attempts: 2,
			maxAttempts: 2
		});
		const response = await call();
		expect(response.status).toBe(403);
		expect((await response.json()).error).toMatch(/tentatives/);

		const count = fake
			.on('test_sessions')
			.find((q) => q.calls.some((c) => JSON.stringify(c.args).includes('exact')));
		expect(count && called(count, 'eq', 'evaluation_id', EVALUATION)).toBe(true);
		expect(count && called(count, 'eq', 'user_id', STUDENT)).toBe(true);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('B7 : date limite dépassée → 403, rien d’écrit', async () => {
		const { call } = setup({
			role: 'student',
			userId: STUDENT,
			recipient: true,
			deadline: '2020-01-01T00:00:00Z'
		});
		const response = await call();
		expect(response.status).toBe(403);
		expect((await response.json()).error).toMatch(/date limite/);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('prof propriétaire, non destinataire : aperçu (catégories), aucune tentative', async () => {
		const { call, fake } = setup({ role: 'teacher', userId: TEACHER, recipient: false });
		const body = await (await call()).json();
		expect(body).toMatchObject({
			preview: true,
			evaluation: { id: EVALUATION, form: 'course', time_limit: 420, title: 'Tables de 7' }
		});
		expect(body.evaluation.categories).toEqual([ITEM]);
		expect(fake.on('test_sessions')).toHaveLength(0);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('B7 : autre prof, non destinataire → 404', async () => {
		const { call } = setup({ role: 'teacher', userId: OTHER_TEACHER, recipient: false });
		expect((await call()).status).toBe(404);
	});

	it('B7 : élève non destinataire → 404', async () => {
		const { call } = setup({ role: 'student', userId: OTHER_TEACHER, recipient: false });
		expect((await call()).status).toBe(404);
		expect(serviceFrom).not.toHaveBeenCalled();
	});

	it('9 : au-delà de 20 démarrages par minute → 429', async () => {
		const { call } = setup({
			role: 'teacher',
			userId: '88888888-8888-4888-8888-888888888888',
			recipient: false
		});
		const statuses: number[] = [];
		for (let i = 0; i < 21; i++) {
			statuses.push(
				await call()
					.then((r) => r.status)
					.catch((e: { status?: number }) => e.status ?? 0)
			);
		}
		expect(statuses.slice(0, 20).every((s) => s !== 429)).toBe(true);
		expect(statuses[20]).toBe(429);
	});

	it('identifiant invalide : 400', async () => {
		const { call } = setup({ role: 'student', userId: STUDENT, recipient: true });
		expect((await call('pas-un-uuid')).status).toBe(400);
	});
});
