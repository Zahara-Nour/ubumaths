/**
 * Action « delete » de la liste des exercices du professeur
 *
 * Une suppression que la base refuse (0 ligne, refus RLS silencieux) rend un
 * échec, jamais `success: true`. L'identifiant est validé (UUID) avant tout appel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';

vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireRoles: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { role: 'teacher' }
	})
}));

vi.mock('#lib/server/exercises.ts', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/exercises.ts')>()),
	getTeacherExercises: vi.fn(),
	deleteExercise: vi.fn()
}));

const { deleteExercise, EXERCISE_NOT_DELETED, ExerciseCitedError } =
	await import('#lib/server/exercises.ts');
const { actions } = await import('../+page.server');

type DeleteAction = (event: unknown) => Promise<unknown>;

function deleteEvent(exerciseId: string) {
	const formData = new FormData();
	formData.set('exercise_id', exerciseId);
	return {
		locals: { supabase: {} },
		request: new Request('http://localhost/dashboard/teacher/contenu/exercices?/delete', {
			method: 'POST',
			body: formData
		})
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('action delete', () => {
	it('0 ligne supprimée → échec 403, pas de succès', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: new Error(EXERCISE_NOT_DELETED) });

		const result = await (actions.delete as DeleteAction)(deleteEvent(EXERCISE_ID));

		expect(result).toMatchObject({ status: 403 });
		expect(result).not.toMatchObject({ success: true });
	});

	it('L113 : exercice cité par 3 séances → 409, le message les compte', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: new ExerciseCitedError(3) });

		const result = await (actions.delete as DeleteAction)(deleteEvent(EXERCISE_ID));

		expect(result).toMatchObject({
			status: 409,
			data: {
				message:
					"Cet exercice est cité dans 3 séances du cahier de texte : retirez-le d'abord de ces séances pour le supprimer."
			}
		});
	});

	it('L113 : compte illisible → 409 sans nombre', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: new ExerciseCitedError(null) });

		const result = await (actions.delete as DeleteAction)(deleteEvent(EXERCISE_ID));

		expect(result).toMatchObject({
			status: 409,
			data: { message: expect.stringContaining('des séances du cahier de texte') }
		});
	});

	it('suppression effective → succès', async () => {
		vi.mocked(deleteExercise).mockResolvedValue({ error: null });

		const result = await (actions.delete as DeleteAction)(deleteEvent(EXERCISE_ID));

		expect(result).toMatchObject({ success: true });
		expect(deleteExercise).toHaveBeenCalledWith(expect.anything(), EXERCISE_ID, TEACHER_ID);
	});

	it('identifiant non UUID → 400 sans appel à la base', async () => {
		const result = await (actions.delete as DeleteAction)(deleteEvent('pas-un-uuid'));

		expect(result).toMatchObject({ status: 400 });
		expect(deleteExercise).not.toHaveBeenCalled();
	});
});
