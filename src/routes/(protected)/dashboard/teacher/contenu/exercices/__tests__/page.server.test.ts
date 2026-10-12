/**
 * Action « delete » de la liste des exercices du professeur
 *
 * Une suppression que la base refuse (0 ligne, refus RLS silencieux) rend un
 * échec, jamais `success: true`. L'identifiant est validé (UUID) avant tout appel.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-446655440003';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { role: 'teacher' }
	})
}));

vi.mock('$lib/server/exercises', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/exercises')>()),
	getTeacherExercises: vi.fn(),
	deleteExercise: vi.fn()
}));

const { deleteExercise, EXERCISE_NOT_DELETED } = await import('$lib/server/exercises');
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
