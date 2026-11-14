/**
 * Erreurs de la classe sur une question d'un contrôle : mêmes gardes que la page
 * résultats (rôle, auteur), Zod sur `template`, contrôle absent.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluationQuestionErrors } from '$lib/types/evaluation-breakdown';

const EVALUATION = '8b9c0d1e-8888-4888-8888-888888888888';
const TEACHER = '1a2b3c4d-1111-4111-8111-111111111111';
const TEMPLATE = '4d5e6f70-4444-4444-8444-444444444441';

const mocks = vi.hoisted(() => ({
	role: vi.fn(),
	evaluation: vi.fn(),
	results: vi.fn(),
	testMode: vi.fn(),
	errors: vi.fn()
}));

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: async (_locals: unknown, roles: string[]) => {
		const role = mocks.role();
		if (!roles.includes(role.profile.role)) {
			const { error } = await import('@sveltejs/kit');
			throw error(403, 'Accès refusé');
		}
		return role;
	}
}));
vi.mock('$lib/server/test-mode', () => ({ getTeacherTestMode: mocks.testMode }));
vi.mock('$lib/server/evaluation-question-errors', () => ({
	getEvaluationQuestionErrors: mocks.errors
}));
vi.mock('$lib/server/evaluations', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/evaluations')>();
	return { ...original, getEvaluation: mocks.evaluation, getEvaluationResults: mocks.results };
});

import { GET } from '../+server';

type Event = Parameters<typeof GET>[0];
type MaybePromise<T> = T | Promise<T>;

function event(search: string, id = EVALUATION): Event {
	return {
		params: { id },
		url: new URL(`http://localhost/x${search}`),
		locals: { supabase: {} }
	} as unknown as Event;
}

async function status(promise: MaybePromise<Response>): Promise<number> {
	try {
		return (await promise).status;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.role.mockReturnValue({ user: { id: TEACHER }, profile: { role: 'teacher' } });
	mocks.evaluation.mockResolvedValue({
		id: EVALUATION,
		created_by: TEACHER,
		series: { items: [] }
	});
	mocks.testMode.mockResolvedValue(false);
	mocks.results.mockResolvedValue([
		{ student_id: 's-1', student_firstname: 'Ada', student_lastname: 'Lovelace' }
	]);
});

describe('GET question-errors', () => {
	it('nominal : JSON du résultat, élèves du tableau avec leurs noms', async () => {
		const ok: EvaluationQuestionErrors = {
			status: 'ok',
			answers: 1,
			withoutAnswer: 0,
			blanks: [],
			groups: []
		};
		mocks.errors.mockResolvedValue(ok);
		const response = await GET(event(`?template=${TEMPLATE}`));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(ok);
		expect(mocks.errors).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: EVALUATION }),
			[{ id: 's-1', firstname: 'Ada', lastname: 'Lovelace' }],
			TEMPLATE
		);
	});

	it('une lecture en échec reste un JSON « error », pas une exception', async () => {
		mocks.errors.mockResolvedValue({ status: 'error', message: 'x' });
		const response = await GET(event(`?template=${TEMPLATE}`));
		expect(await response.json()).toEqual({ status: 'error', message: 'x' });
	});

	it.each(['', '?template=pas-un-uuid', '?template='])(
		'template invalide (%s) → 400',
		async (q) => {
			expect(await status(GET(event(q)))).toBe(400);
			expect(mocks.errors).not.toHaveBeenCalled();
		}
	);

	it('non professeur → 403', async () => {
		mocks.role.mockReturnValue({ user: { id: 'x' }, profile: { role: 'student' } });
		expect(await status(GET(event(`?template=${TEMPLATE}`)))).toBe(403);
		expect(mocks.errors).not.toHaveBeenCalled();
	});

	it('professeur qui n’est pas l’auteur → 403', async () => {
		mocks.evaluation.mockResolvedValue({
			id: EVALUATION,
			created_by: 'autre',
			series: { items: [] }
		});
		expect(await status(GET(event(`?template=${TEMPLATE}`)))).toBe(403);
		expect(mocks.errors).not.toHaveBeenCalled();
	});

	it('contrôle absent → 404', async () => {
		mocks.evaluation.mockResolvedValue(null);
		expect(await status(GET(event(`?template=${TEMPLATE}`)))).toBe(404);
	});
});
