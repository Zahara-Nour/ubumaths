import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PythonExerciseStudentView, PythonMasteryStatus } from '$lib/types/python-exercises';

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
		? Promise.resolve(
				locals.supabase
					.from('profiles')
					.select('role')
					.eq('id', locals.user.id)
					.single()
					.then((r) => r.data?.role ?? null)
			).catch(() => null)
		: Promise.resolve(null);

	const masteryFetch: Promise<{ status: PythonMasteryStatus | null }> = locals.user
		? fetch(`/api/python-exercises/${params.id}/mastery`)
				.then((r) => (r.ok ? r.json() : { status: null }))
				.catch(() => ({ status: null }))
		: Promise.resolve({ status: null });

	const [exerciseRes, submissionsPayload, role, masteryPayload] = await Promise.all([
		exerciseFetch,
		submissionsFetch,
		profileFetch,
		masteryFetch
	]);

	if (exerciseRes.status === 404) {
		throw error(404, 'Exercice introuvable');
	}
	if (!exerciseRes.ok) {
		throw error(exerciseRes.status, "Erreur lors du chargement de l'exercice");
	}

	const { exercise } = (await exerciseRes.json()) as { exercise: PythonExerciseStudentView };

	// Show the "Voir les résultats" link only to teachers who can actually load
	// the page: author OR has at least one assignment they created for this exo.
	// Mirrors the authz of /python-exercises/[id]/results/+page.server.ts.
	const isAuthor =
		role === 'teacher' &&
		locals.user !== null &&
		(exercise as { author_id?: string }).author_id === locals.user.id;
	let canViewResults = false;
	if (role === 'teacher' && locals.user) {
		if (isAuthor) {
			canViewResults = true;
		} else {
			const { data: ownAssignments } = await locals.supabase
				.from('python_exercise_assignments')
				.select('id')
				.eq('exercise_id', params.id)
				.eq('assigned_by', locals.user.id)
				.limit(1);
			canViewResults = Boolean(ownAssignments && ownAssignments.length > 0);
		}
	}

	return {
		exercise,
		submissions: submissionsPayload.submissions,
		canSubmit: role === 'student',
		isAuthenticated: Boolean(locals.user),
		masteryStatus: role === 'student' ? masteryPayload.status : null,
		canViewResults,
		canEdit: isAuthor
	};
};
