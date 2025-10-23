import type { PageServerLoad } from './$types';
import type { AttemptWithDetails } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';

/**
 * Load pending manual validations for teacher
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Fetch pending validations for teacher's riddles
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
				avatar_url
			)
		`
		)
		.is('is_correct', null) // Only pending validations
		.eq('riddles.created_by', session.user.id) // Only teacher's riddles
		.order('created_at', { ascending: true });

	if (attemptsError) {
		console.error('Error fetching pending validations:', attemptsError);
		throw error(500, 'Erreur lors du chargement des validations en attente');
	}

	// Transform to AttemptWithDetails
	const pendingValidations: AttemptWithDetails[] = (attempts || []).map((attempt: any) => ({
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
