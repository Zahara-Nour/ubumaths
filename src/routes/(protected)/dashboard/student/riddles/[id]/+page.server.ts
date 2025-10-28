import type { PageServerLoad } from './$types';
import type { DbRiddle, DbRiddleAttempt } from '$lib/types/riddle';
import { error, redirect } from '@sveltejs/kit';

/**
 * Load riddle detail for student to attempt
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Fetch riddle
	const { data: riddle, error: riddleError } = await supabase
		.from('riddles')
		.select('*')
		.eq('id', params.id)
		.eq('status', 'published')
		.single();

	if (riddleError || !riddle) {
		console.error('Error fetching riddle:', riddleError);
		throw error(404, 'Énigme non trouvée');
	}

	// Fetch student's latest attempt
	const { data: attempts } = await supabase
		.from('riddle_attempts')
		.select('*')
		.eq('riddle_id', params.id)
		.eq('student_id', user.id)
		.order('attempt_number', { ascending: false })
		.limit(1);

	const studentAttempt: DbRiddleAttempt | null =
		attempts && attempts.length > 0 ? attempts[0] : null;

	return {
		riddle: riddle as DbRiddle,
		studentAttempt
	};
};
