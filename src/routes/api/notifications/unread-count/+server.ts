/**
 * GET /api/notifications/unread-count
 *
 * Returns only the count of unread notifications (lighter than fetching all)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadCount } from '$lib/server/notifications';
import { unreadNotificationsCountResponseSchema } from '$lib/server/validation/notifications';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const count = await getUnreadCount(supabase, user.id);

	// Validate response
	const validated = validateJsonResponse(
		unreadNotificationsCountResponseSchema,
		{ count },
		'GET /api/notifications/unread-count'
	);

	return json(validated);
};
