/**
 * GET /api/notifications/unread
 *
 * Returns all unread notifications for the current user
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadNotifications } from '$lib/server/notifications';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const notifications = await getUnreadNotifications(supabase, user.id);

	return json({
		notifications,
		count: notifications.length
	});
};
