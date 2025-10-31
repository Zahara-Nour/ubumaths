/**
 * GET /api/notifications/unread
 *
 * Returns all unread notifications for the current user
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadNotifications } from '$lib/server/notifications';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	const notifications = await getUnreadNotifications(supabase, user.id);

	return json({
		notifications,
		count: notifications.length
	});
};
