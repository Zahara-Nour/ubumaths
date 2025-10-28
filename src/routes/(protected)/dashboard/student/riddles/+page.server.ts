import type { PageServerLoad } from './$types';
import type { DbRiddleAttempt } from '$lib/types/riddle';
import { redirect } from '@sveltejs/kit';

/**
 * Load riddle of the day for student
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Get riddle of the day using RPC function
	const { data: riddleOfTheDay, error: riddleError } = await supabase.rpc('get_riddle_of_the_day');

	if (riddleError) {
		console.error('Error fetching riddle of the day:', riddleError);
	}

	let studentAttempt: DbRiddleAttempt | null = null;
	let riddleOfTheDayDate: string | null = null;

	// If there is a riddle of the day, fetch student's attempt
	if (riddleOfTheDay && riddleOfTheDay.length > 0) {
		const todayRiddle = riddleOfTheDay[0];
		riddleOfTheDayDate = todayRiddle.assignment_date;

		// Fetch student's latest attempt for this riddle
		const { data: attempts } = await supabase
			.from('riddle_attempts')
			.select('*')
			.eq('riddle_id', todayRiddle.riddle_id)
			.eq('student_id', user.id)
			.order('attempt_number', { ascending: false })
			.limit(1);

		if (attempts && attempts.length > 0) {
			studentAttempt = attempts[0];
		}
	}

	// Get assigned riddles for this student (optional for now)
	const { data: assignments } = await supabase
		.from('riddle_assignments')
		.select(
			`
			*,
			riddle:riddles(*)
		`
		)
		.or(`student_id.eq.${user.id},class_id.in.(${user.class_ids || []})`)
		.eq('riddles.status', 'published')
		.order('assigned_at', { ascending: false });

	return {
		riddleOfTheDay: riddleOfTheDay && riddleOfTheDay.length > 0 ? riddleOfTheDay[0] : null,
		riddleOfTheDayDate,
		studentAttempt,
		assignments: (assignments || []).map((a) => ({
			...a,
			riddle: a.riddle
		}))
	};
};
