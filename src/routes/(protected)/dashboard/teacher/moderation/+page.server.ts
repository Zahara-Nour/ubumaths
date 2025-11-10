import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

/**
 * Load moderation data for teachers
 *
 * Loads:
 * - Active restrictions created by this teacher
 * - Moderation logs for this teacher's actions
 *
 * Only accessible by teachers and admins
 */
export const load: PageServerLoad = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// Check teacher role
	if (!['teacher', 'admin'].includes(locals.user.role)) {
		throw error(403, 'Access denied');
	}

	const supabase = locals.supabase;

	// Fetch active restrictions for this teacher's students
	const { data: restrictions, error: restrictionsError } = await supabase
		.from('user_restrictions')
		.select(
			`
      *,
      user:profiles!user_restrictions_user_id_fkey(id, firstname, lastname),
      restricted_by_profile:profiles!user_restrictions_restricted_by_fkey(firstname, lastname),
      conversation:conversations(name)
    `
		)
		.eq('restricted_by', locals.user.id)
		.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
		.order('created_at', { ascending: false });

	if (restrictionsError) {
		console.error('Failed to fetch restrictions:', restrictionsError);
		throw error(500, 'Failed to load restrictions');
	}

	// Fetch moderation logs for this teacher
	const { data: logs, error: logsError } = await supabase
		.from('moderation_logs')
		.select(
			`
      *,
      moderator:profiles!moderation_logs_moderator_id_fkey(firstname, lastname)
    `
		)
		.eq('moderator_id', locals.user.id)
		.order('created_at', { ascending: false })
		.limit(100);

	if (logsError) {
		console.error('Failed to fetch logs:', logsError);
		throw error(500, 'Failed to load logs');
	}

	return {
		restrictions: restrictions || [],
		logs: logs || []
	};
};
