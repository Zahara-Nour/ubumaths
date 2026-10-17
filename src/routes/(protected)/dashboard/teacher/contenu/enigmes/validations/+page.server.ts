import type { PageServerLoad } from './$types';
import type { AttemptWithDetails } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { RIDDLE_COLUMNS, toDbRiddle, toDbRiddleAttempt } from '$lib/types/riddle';
import { fetchRiddleSolutions } from '$lib/server/riddle-solutions';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/contenu/enigmes/validations/+page.server'
);

/**
 * Load pending manual validations for teacher
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Get test mode to filter students
	const isTestMode = await getTeacherTestMode(user.id, supabase);

	// Fetch pending validations for teacher's riddles, filtered by test mode
	const { data: attempts, error: attemptsError } = await supabase
		.from('riddle_attempts')
		// Colonnes nommées : réponse attendue et correction vivent dans `riddle_solutions`,
		// lue à part ci-dessous (le type métier `DbRiddle` les porte).
		.select(
			`
			*,
			riddle:riddles!inner(${RIDDLE_COLUMNS}),
			student:profiles!riddle_attempts_student_id_fkey(
				id,
				firstname,
				lastname,
				avatar_url,
				is_test
			)
		` as const
		)
		.is('is_correct', null) // Only pending validations
		.eq('riddles.created_by', user.id) // Only teacher's riddles
		.eq('profiles.is_test', isTestMode) // Filter by test mode
		.order('created_at', { ascending: true });

	if (attemptsError) {
		logger.error('Error fetching pending validations:', attemptsError);
		throw error(500, 'Erreur lors du chargement des validations en attente');
	}

	const { solutions, error: solutionsError } = await fetchRiddleSolutions(
		supabase,
		(attempts || []).map((a) => a.riddle.id)
	);

	if (solutionsError) {
		logger.error('Error fetching riddle solutions:', solutionsError);
		throw error(500, 'Erreur lors du chargement des validations en attente');
	}

	// Transform to AttemptWithDetails
	const pendingValidations: AttemptWithDetails[] = (attempts || []).map((attempt) => ({
		// `difficulty`, `status` et `answer` sont plus permissifs en base qu'en
		// type métier : convertis plutôt qu'affirmés.
		...toDbRiddleAttempt(attempt),
		riddle: toDbRiddle(attempt.riddle, solutions.get(attempt.riddle.id) ?? null),
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
