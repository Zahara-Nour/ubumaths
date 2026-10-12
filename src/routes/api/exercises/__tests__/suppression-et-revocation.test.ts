/**
 * Suppression d'un exercice et révocation d'un lien de partage : réponses de l'API
 *
 * - Une suppression que la base refuse (0 ligne, refus RLS silencieux) est une
 *   erreur pour le professeur, jamais un succès.
 * - Révoquer un jeton inconnu répond 404 « introuvable », pas 500.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';
const TOKEN_ID = '550e8400-e29b-41d4-a716-446655440004';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { role: 'teacher' }
	})
}));

vi.mock('$lib/server/exercises', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/exercises')>()),
	getExercise: vi.fn(),
	deleteExercise: vi.fn()
}));

vi.mock('$lib/server/exercise-share-tokens', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/exercise-share-tokens')>()),
	revokeShareToken: vi.fn()
}));

const { getExercise, deleteExercise, EXERCISE_NOT_DELETED } = await import('$lib/server/exercises');
const { revokeShareToken, SHARE_TOKEN_NOT_FOUND } =
	await import('$lib/server/exercise-share-tokens');
const { DELETE: deleteExerciseRoute } = await import('../[id]/+server');
const { DELETE: revokeRoute } = await import('../[id]/share/[tokenId]/+server');

type Handler = (event: unknown) => Promise<Response>;

/** Statut de l'erreur HTTP levée par le handler. */
async function failureStatus(run: () => Promise<Response>): Promise<number> {
	try {
		await run();
	} catch (e) {
		if (isHttpError(e)) return e.status;
		throw e;
	}
	throw new Error('le handler n’a rien refusé');
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('DELETE /api/exercises/[id]', () => {
	it('0 ligne supprimée → erreur 403, pas de succès', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: new Error(EXERCISE_NOT_DELETED) });

		const status = await failureStatus(() =>
			(deleteExerciseRoute as Handler)({ locals: { supabase: {} }, params: { id: EXERCISE_ID } })
		);

		expect(status).toBe(403);
	});

	it('identifiant non UUID → 400, sans appel à la base', async () => {
		const status = await failureStatus(() =>
			(deleteExerciseRoute as Handler)({ locals: { supabase: {} }, params: { id: 'pas-un-uuid' } })
		);

		expect(status).toBe(400);
		expect(deleteExercise).not.toHaveBeenCalled();
	});

	it('suppression effective → succès', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: null });

		const response = await (deleteExerciseRoute as Handler)({
			locals: { supabase: {} },
			params: { id: EXERCISE_ID }
		});

		expect(await response.json()).toEqual({ success: true });
	});
});

describe('DELETE /api/exercises/[id]/share/[tokenId]', () => {
	beforeEach(() => {
		vi.mocked(getExercise).mockResolvedValue({
			data: { id: EXERCISE_ID, created_by: TEACHER_ID },
			error: null
		} as unknown as Awaited<ReturnType<typeof getExercise>>);
	});

	it('jeton inconnu → 404', async () => {
		vi.mocked(revokeShareToken).mockResolvedValue({ error: SHARE_TOKEN_NOT_FOUND });

		const status = await failureStatus(() =>
			(revokeRoute as Handler)({
				locals: { supabase: {} },
				params: { id: EXERCISE_ID, tokenId: TOKEN_ID }
			})
		);

		expect(status).toBe(404);
	});

	it('révoque le jeton de CET exercice', async () => {
		vi.mocked(revokeShareToken).mockResolvedValue({ error: null });

		await (revokeRoute as Handler)({
			locals: { supabase: {} },
			params: { id: EXERCISE_ID, tokenId: TOKEN_ID }
		});

		expect(revokeShareToken).toHaveBeenCalledWith(expect.anything(), TOKEN_ID, EXERCISE_ID);
	});
});
