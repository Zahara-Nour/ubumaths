import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Load global riddle leaderboard
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	// Use the riddle_progress view which already aggregates data
	const { data: leaderboard, error: leaderboardError } = await supabase
		.from('riddle_progress')
		.select('*')
		.order('total_gidouilles_from_riddles', { ascending: false })
		.limit(50);

	if (leaderboardError) {
		console.error('Error fetching leaderboard:', leaderboardError);
	}

	// Enrich with profile data
	const studentIds = (leaderboard || []).map((entry: any) => entry.student_id);

	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, avatar_url')
		.in('id', studentIds);

	// Create profile map
	const profileMap = new Map();
	(profiles || []).forEach((profile: any) => {
		profileMap.set(profile.id, profile);
	});

	// Merge data
	const enrichedLeaderboard = (leaderboard || []).map((entry: any, index: number) => ({
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
	const currentUserEntry = enrichedLeaderboard.find(
		(entry: any) => entry.student_id === session.user.id
	);
	const currentUserRank = currentUserEntry ? currentUserEntry.rank : null;

	return {
		leaderboard: enrichedLeaderboard,
		currentUserId: session.user.id,
		currentUserRank
	};
};
