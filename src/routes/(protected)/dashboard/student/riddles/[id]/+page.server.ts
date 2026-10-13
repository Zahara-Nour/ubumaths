import type { PageServerLoad } from './$types';
import type { DbRiddleAttempt } from '$lib/types/riddle';
import { RIDDLE_COLUMNS, toDbRiddle, toDbRiddleAttempt, toStudentRiddle } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';
import { fetchRiddleSolutions } from '$lib/server/riddle-solutions';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/student/riddles/[id]/+page.server');

/**
 * Load riddle detail for student to attempt
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	const id = validateUuidParam(params.id);

	// Fetch riddle — client de l'élève : sa RLS décide s'il voit cette énigme
	const { data: riddle, error: riddleError } = await supabase
		.from('riddles')
		.select(RIDDLE_COLUMNS)
		.eq('id', id)
		.eq('status', 'published')
		.single();

	if (riddleError || !riddle) {
		logger.error('Error fetching riddle:', riddleError);
		throw error(404, 'Énigme non trouvée');
	}

	// Type de saisie et choix d'un QCM : rangés dans `riddle_solutions`, que l'élève ne
	// lit pas. Client service, pour CETTE énigme seulement, que la requête de l'élève
	// vient de rendre ; `toStudentRiddle` n'en garde ni la valeur ni la correction.
	const { solutions, error: solutionsError } = await fetchRiddleSolutions(
		createServiceRoleClient(),
		[riddle.id]
	);

	if (solutionsError) {
		logger.error('Lecture impossible :', solutionsError);
		throw error(500, 'Impossible de charger les données');
	}

	// Fetch student's latest attempt
	const { data: attempts, error: attemptsError } = await supabase
		.from('riddle_attempts')
		.select('*')
		.eq('riddle_id', id)
		.eq('student_id', user.id)
		.order('attempt_number', { ascending: false })
		.limit(1);

	if (attemptsError) {
		logger.error('Lecture impossible :', attemptsError);
		throw error(500, 'Impossible de charger les données');
	}

	// `submitted_answer` est du jsonb et `difficulty`/`status` des colonnes
	// permissives : convertis plutôt qu'affirmés par un cast.
	const studentAttempt: DbRiddleAttempt | null =
		attempts && attempts.length > 0 ? toDbRiddleAttempt(attempts[0]) : null;

	return {
		// Sans la réponse attendue ni la correction : le serveur juge la réponse.
		riddle: toStudentRiddle(toDbRiddle(riddle, solutions.get(riddle.id) ?? null)),
		studentAttempt
	};
};
