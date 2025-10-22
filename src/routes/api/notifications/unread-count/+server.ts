/**
 * GET /api/notifications/unread-count
 *
 * Returns only the count of unread notifications (lighter than fetching all)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadCount } from '$lib/server/notifications';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	const count = await getUnreadCount(supabase, session.user.id);

	return json({ count });
};
