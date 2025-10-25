import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { BadgeProgress } from '$lib/utils/riddle-badges';

/**
 * Load student's personal riddle history
 */
export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Get filters from query params
	const difficultyFilter = url.searchParams.get('difficulty');
	const genreFilter = url.searchParams.get('genre');

	// Use riddle_student_history view
	let query = supabase
		.from('riddle_student_history')
		.select('*')
		.eq('student_id', session.user.id)
		.eq('is_correct', true) // Only successful attempts
		.order('first_success_at', { ascending: false });

	// Apply filters
	if (difficultyFilter) {
		query = query.eq('difficulty', parseInt(difficultyFilter));
	}
	if (genreFilter && genreFilter !== 'all') {
		query = query.eq('genre', genreFilter);
	}

	const { data: history, error: historyError } = await query;

	if (historyError) {
		console.error('Error fetching history:', historyError);
	}

	// Get unique genres for filter
	const { data: allGenres } = await supabase
		.from('riddles')
		.select('genre')
		.not('genre', 'is', null)
		.eq('status', 'published');

	const uniqueGenres = [...new Set((allGenres || []).map((r) => r.genre).filter((g: string) => g))];

	// Calculate summary stats
	const totalSuccess = history?.length || 0;
	const totalGidouilles =
		history?.reduce((sum: number, h) => sum + (h.gidouilles_awarded || 0), 0) || 0;
	const firstAttemptCount = history?.filter((h) => h.total_attempts_for_success === 1).length || 0;
	const multipleAttemptCount = history?.filter((h) => h.total_attempts_for_success > 1).length || 0;

	// Calculate genre counts
	const genreCounts: Record<string, number> = {};
	history?.forEach((h) => {
		if (h.genre) {
			genreCounts[h.genre] = (genreCounts[h.genre] || 0) + 1;
		}
	});

	// Calculate consecutive days streak (simplified - just count unique dates)
	// For a real streak, would need to check if dates are consecutive
	const { data: riddleOfTheDayAttempts } = await supabase
		.from('riddle_attempts')
		.select(
			`
			created_at,
			is_correct,
			riddle:riddles!inner(id)
		`
		)
		.eq('student_id', session.user.id)
		.eq('is_correct', true)
		.in(
			'riddle_id',
			(
				await supabase
					.from('riddle_of_the_day')
					.select('riddle_id')
					.order('assignment_date', { ascending: false })
					.limit(30)
			).data?.map((r) => r.riddle_id) || []
		)
		.order('created_at', { ascending: false });

	const consecutiveDaysStreak = new Set(
		(riddleOfTheDayAttempts || []).map((a) => a.created_at.split('T')[0])
	).size;

	// Badge progress
	const badgeProgress: BadgeProgress = {
		firstAttemptCount,
		multipleAttemptCount,
		genreCounts,
		consecutiveDaysStreak
	};

	return {
		history: history || [],
		uniqueGenres,
		filters: {
			difficulty: difficultyFilter,
			genre: genreFilter
		},
		summary: {
			totalSuccess,
			totalGidouilles,
			firstAttemptCount
		},
		badgeProgress
	};
};
