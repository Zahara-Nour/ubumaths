import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/messages/unread-count/+server');

/**
 * GET /api/messages/unread-count
 * Get count of unread private messages for the current user
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const { data: count, error: fetchError } = await supabase.rpc(
			'get_private_messages_unread_count',
			{
				p_user_id: user.id
			}
		);

		if (fetchError) {
			logger.error('Error fetching unread count:', fetchError);
			throw error(500, 'Erreur lors de la récupération du compteur de messages non lus');
		}

		return json({ unreadCount: count || 0 });
	} catch (err) {
		logger.error('Error in unread count API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
