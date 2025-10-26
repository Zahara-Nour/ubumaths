import type { PageServerLoad } from './$types';
import type { AttemptWithDetails } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';
import { getTeacherTestMode } from '$lib/server/test-mode';

/**
 * Load pending manual validations for teacher
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Get test mode to filter students
	const isTestMode = await getTeacherTestMode(session.user.id, supabase);

	// Fetch pending validations for teacher's riddles, filtered by test mode
	const { data: attempts, error: attemptsError } = await supabase
		.from('riddle_attempts')
		.select(
			`
			*,
			riddle:riddles!inner(
				id,
				riddle_number,
				title,
				genre,
				difficulty,
				statement,
				correction,
				created_by
			),
			student:profiles!riddle_attempts_student_id_fkey(
				id,
				firstname,
				lastname,
				avatar_url,
				is_test
			)
		`
		)
		.is('is_correct', null) // Only pending validations
		.eq('riddles.created_by', session.user.id) // Only teacher's riddles
		.eq('profiles.is_test', isTestMode) // Filter by test mode
		.order('created_at', { ascending: true });

	if (attemptsError) {
		console.error('Error fetching pending validations:', attemptsError);
		throw error(500, 'Erreur lors du chargement des validations en attente');
	}

	// Transform to AttemptWithDetails
	const pendingValidations: AttemptWithDetails[] = (attempts || []).map((attempt) => ({
		...attempt,
		riddle: attempt.riddle,
		student: {
			id: attempt.student.id,
			firstname: attempt.student.firstname,
			lastname: attempt.student.lastname,
			avatar_url: attempt.student.avatar_url
		}
	}));

	return {
		pendingValidations
	};
};
