import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Load archive of past riddles of the day
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Get all past riddles of the day
	const { data: history, error: historyError } = await supabase
		.from('riddle_of_the_day')
		.select(
			`
			*,
			riddle:riddles(*)
		`
		)
		.lt('assignment_date', new Date().toISOString().split('T')[0]) // Only past riddles
		.order('assignment_date', { ascending: false })
		.limit(100);

	if (historyError) {
		console.error('Error fetching history:', historyError);
	}

	// Get student's attempts for these riddles
	const riddleIds = (history || []).map((h) => h.riddle_id);

	const { data: attempts } = await supabase
		.from('riddle_attempts')
		.select('riddle_id, is_correct, attempt_number, gidouilles_awarded')
		.eq('student_id', user.id)
		.in('riddle_id', riddleIds);

	// Create map of riddle_id to attempt
	const attemptsMap = new Map();
	(attempts || []).forEach((attempt) => {
		// Keep only successful attempts or latest attempt
		if (
			!attemptsMap.has(attempt.riddle_id) ||
			attempt.is_correct === true ||
			attemptsMap.get(attempt.riddle_id).attempt_number < attempt.attempt_number
		) {
			attemptsMap.set(attempt.riddle_id, attempt);
		}
	});

	// Transform data
	const archive = (history || []).map((h) => ({
		...h,
		riddle: h.riddle,
		studentAttempt: attemptsMap.get(h.riddle_id) || null
	}));

	return {
		archive
	};
};
