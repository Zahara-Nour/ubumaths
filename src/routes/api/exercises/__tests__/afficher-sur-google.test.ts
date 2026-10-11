/**
 * « Afficher sur Google » — réponses de l'API exercices
 *
 * Une écriture « privé + Google » est refusée par un 400 au message français,
 * jamais par un 500 brut — que le refus vienne de Zod, du serveur ou de la
 * contrainte de la base (23514).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import {
	SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE,
	SearchIndexedRequiresPublicError
} from '$lib/server/exercise-search-indexed';

// Mocks

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { role: 'teacher' }
	})
}));

vi.mock('$lib/server/exercises', () => ({
	getExercises: vi.fn(),
	getExercise: vi.fn(),
	createExercise: vi.fn(),
	updateExercise: vi.fn(),
	deleteExercise: vi.fn()
}));

const { createExercise, updateExercise } = await import('$lib/server/exercises');
const { POST } = await import('../+server');
const { PUT } = await import('../[id]/+server');

/** Erreur telle que PostgREST la rend quand la contrainte refuse l'écriture. */
const CHECK_ERROR = {
	code: '23514',
	message:
		'new row for relation "exercises" violates check constraint "exercises_search_indexed_requires_public"'
};

const VARIATIONS = [{ label: 'default', statement_md: 'Q ?', solution_md: 'R' }];

type Handler = (event: unknown) => Promise<Response>;

function event(body: unknown, params: Record<string, string> = {}) {
	return {
		locals: {},
		params,
		request: new Request('http://localhost/api/exercises', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	};
}

/** Statut et message de l'erreur HTTP levée par le handler. */
async function failure(run: () => Promise<Response>): Promise<{ status: number; message: string }> {
	try {
		await run();
	} catch (e) {
		if (isHttpError(e)) return { status: e.status, message: e.body.message };
		throw e;
	}
	throw new Error('le handler n’a rien refusé');
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /api/exercises — privé + Google', () => {
	it('refuse par un 400 au message français, sans écrire', async () => {
		const result = await failure(() =>
			(POST as unknown as Handler)(
				event({
					category: 'automatisme',
					variations: VARIATIONS,
					is_public: false,
					search_indexed: true
				})
			)
		);
		expect(result.status).toBe(400);
		expect(result.message).toBe(SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
		expect(createExercise).not.toHaveBeenCalled();
	});

	it('traduit le refus de la base (23514) en 400 lisible', async () => {
		vi.mocked(createExercise).mockResolvedValue({ data: null, error: CHECK_ERROR as never });
		const result = await failure(() =>
			(POST as unknown as Handler)(
				event({
					category: 'automatisme',
					variations: VARIATIONS,
					is_public: true,
					search_indexed: true
				})
			)
		);
		expect(result).toEqual({ status: 400, message: SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE });
	});
});

describe('PUT /api/exercises/[id] — privé + Google', () => {
	it('refuse par un 400 au message français, sans écrire', async () => {
		const result = await failure(() =>
			(PUT as unknown as Handler)(
				event({ is_public: false, search_indexed: true }, { id: EXERCISE_ID })
			)
		);
		expect(result.status).toBe(400);
		expect(result.message).toBe(SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE);
		expect(updateExercise).not.toHaveBeenCalled();
	});

	it('traduit l’erreur métier de updateExercise en 400 lisible', async () => {
		vi.mocked(updateExercise).mockResolvedValue({
			data: null,
			error: new SearchIndexedRequiresPublicError()
		});
		const result = await failure(() =>
			(PUT as unknown as Handler)(
				event({ is_public: true, search_indexed: true }, { id: EXERCISE_ID })
			)
		);
		expect(result).toEqual({ status: 400, message: SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE });
		expect(updateExercise).toHaveBeenCalledWith(
			undefined, // locals.supabase : sans objet ici, `updateExercise` est simulé
			EXERCISE_ID,
			expect.objectContaining({ search_indexed: true }),
			TEACHER_ID
		);
	});

	it('traduit le refus de la base (23514) en 400 lisible', async () => {
		vi.mocked(updateExercise).mockResolvedValue({ data: null, error: CHECK_ERROR as never });
		const result = await failure(() =>
			(PUT as unknown as Handler)(event({ is_public: true }, { id: EXERCISE_ID }))
		);
		expect(result).toEqual({ status: 400, message: SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE });
	});
});
