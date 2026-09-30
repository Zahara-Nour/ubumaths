/**
 * Modifier une évaluation : seulement un BROUILLON. L'action relit l'évaluation
 * (la page n'est pas une garde : un POST direct la contourne).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from '../+page.server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const TEACHER = '22222222-2222-4222-8222-222222222222';
const EVALUATION = '55555555-5555-4555-8555-555555555555';

function evaluationRow(status: string) {
	return {
		id: EVALUATION,
		series_id: 'serie',
		form: 'interactive',
		time_limit: null,
		max_attempts: null,
		deadline: null,
		shuffle_questions: true,
		academic_period_id: null,
		status,
		created_by: TEACHER,
		created_at: '2026-09-30T10:00:00Z',
		updated_at: '2026-09-30T10:00:00Z',
		series: {
			id: 'serie',
			title: 'Tables',
			description: null,
			grade: '6',
			categories: [],
			created_by: TEACHER,
			created_at: '2026-09-30T10:00:00Z',
			updated_at: '2026-09-30T10:00:00Z'
		}
	};
}

function post(status: string) {
	const fake = createFakeSupabase((table, calls) => {
		if (table === 'profiles') return { data: { id: TEACHER, role: 'teacher' } };
		if (calls.some((c) => c.method === 'update')) return { data: [evaluationRow(status)] };
		return { data: evaluationRow(status) };
	});
	const form = new FormData();
	form.set('settings', JSON.stringify({ form: 'course', time_limit_minutes: 7 }));
	const promise = actions.default({
		request: new Request('http://localhost', { method: 'POST', body: form }),
		params: { id: EVALUATION },
		locals: {
			supabase: fake.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		}
	} as never);
	return { promise, fake };
}

const updates = (fake: ReturnType<typeof createFakeSupabase>) =>
	fake.on('evaluations').filter((q) => q.calls.some((c) => c.method === 'update'));

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('action « Modifier l’évaluation »', () => {
	it('ancien lien (id d’assessment) : écrit sur l’id de l’ÉVALUATION', async () => {
		const LEGACY = '99999999-9999-4999-8999-999999999999';
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'profiles') return { data: { id: TEACHER, role: 'teacher' } };
			if (calls.some((c) => c.method === 'update')) return { data: [evaluationRow('draft')] };
			const byId = calls.some((c) => c.method === 'eq' && c.args[0] === 'id');
			return { data: byId ? null : evaluationRow('draft') };
		});
		const form = new FormData();
		form.set('settings', JSON.stringify({ form: 'interactive' }));
		const result = await actions.default({
			request: new Request('http://localhost', { method: 'POST', body: form }),
			params: { id: LEGACY },
			locals: {
				supabase: fake.client,
				safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
			}
		} as never);
		expect(result).toEqual({ success: true });
		const [update] = updates(fake);
		expect(update.calls).toContainEqual({ method: 'eq', args: ['id', EVALUATION] });
	});

	it('brouillon : modifié', async () => {
		const { promise, fake } = post('draft');
		expect(await promise).toEqual({ success: true });
		expect(updates(fake)).toHaveLength(1);
	});

	for (const status of ['published', 'archived']) {
		it(`${status} : refusé, rien n’est écrit`, async () => {
			const { promise, fake } = post(status);
			const result = (await promise) as { status: number; data: { message: string } };
			expect(result.status).toBe(409);
			expect(result.data.message).toBe('Seule une évaluation en brouillon se modifie');
			expect(updates(fake)).toHaveLength(0);
		});
	}
});
