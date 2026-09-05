import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Load global riddle leaderboard
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Use the riddle_progress view which already aggregates data
	const { data: leaderboard, error: leaderboardError } = await supabase
		.from('riddle_progress')
		.select('*')
		.order('riddles_gidouilles', { ascending: false })
		.limit(50);

	if (leaderboardError) {
		console.error('Error fetching leaderboard:', leaderboardError);
	}

	// Enrich with profile data
	// `riddle_progress` est une vue : `student_id` y est nullable. Sans garde de
	// type, la liste reste `(string | null)[]` et ne peut pas alimenter `.in()`.
	const studentIds = (leaderboard || [])
		.map((entry) => entry.student_id)
		.filter((id): id is string => id !== null);

	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, avatar_url')
		.in('id', studentIds);

	// Create profile map
	const profileMap = new Map();
	(profiles || []).forEach((profile) => {
		profileMap.set(profile.id, profile);
	});

	// Merge data
	const enrichedLeaderboard = (leaderboard || []).map((entry, index: number) => ({
		...entry,
		rank: index + 1,
		profile: profileMap.get(entry.student_id) || {
			id: entry.student_id,
			firstname: 'Inconnu',
			lastname: '',
			avatar_url: null
		}
	}));

	// Find current user rank
	const currentUserEntry = enrichedLeaderboard.find((entry) => entry.student_id === user.id);
	const currentUserRank = currentUserEntry ? currentUserEntry.rank : null;

	return {
		leaderboard: enrichedLeaderboard,
		currentUserId: user.id,
		currentUserRank
	};
};
