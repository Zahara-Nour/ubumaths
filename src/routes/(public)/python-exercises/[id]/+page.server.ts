import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PythonExerciseStudentView } from '$lib/types/python-exercises';

interface SubmissionSummary {
	id: string;
	code: string;
	is_correct: boolean;
	attempt_number: number;
	created_at: string;
	assignment_id: string | null;
}

/**
 * Load the exercise + the caller's previous submissions for the consultation page.
 *
 * Routes the exercise through /api/python-exercises/[id] so RLS + solution_code
 * stripping happens in one place. Submissions are fetched in parallel via
 * /my-submissions (auth-only; RLS does the rest).
 *
 * `canSubmit` is an optimistic flag (true for any authenticated student). The
 * actual gate is RLS at INSERT time — this just controls UI affordance.
 */
export const load: PageServerLoad = async ({ params, fetch, locals }) => {
	const exerciseFetch = fetch(`/api/python-exercises/${params.id}`);

	const submissionsFetch: Promise<{ submissions: SubmissionSummary[] }> = locals.user
		? fetch(`/api/python-exercises/${params.id}/my-submissions?limit=10`)
				.then((r) => (r.ok ? r.json() : { submissions: [] }))
				.catch(() => ({ submissions: [] }))
		: Promise.resolve({ submissions: [] });

	const profileFetch = locals.user
		? locals.supabase
				.from('profiles')
				.select('role')
				.eq('id', locals.user.id)
				.single()
				.then((r) => r.data?.role ?? null)
				.catch(() => null)
		: Promise.resolve(null);

	const [exerciseRes, submissionsPayload, role] = await Promise.all([
		exerciseFetch,
		submissionsFetch,
		profileFetch
	]);

	if (exerciseRes.status === 404) {
		throw error(404, 'Exercice introuvable');
	}
	if (!exerciseRes.ok) {
		throw error(exerciseRes.status, "Erreur lors du chargement de l'exercice");
	}

	const { exercise } = (await exerciseRes.json()) as { exercise: PythonExerciseStudentView };

	return {
		exercise,
		submissions: submissionsPayload.submissions,
		canSubmit: role === 'student',
		isAuthenticated: Boolean(locals.user)
	};
};
