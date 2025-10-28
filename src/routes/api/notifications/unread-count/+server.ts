/**
 * GET /api/notifications/unread-count
 *
 * Returns only the count of unread notifications (lighter than fetching all)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadCount } from '$lib/server/notifications';
import { unreadCountResponseSchema } from '$lib/server/validation/notifications';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	const count = await getUnreadCount(supabase, session.user.id);

	// Validate response
	const validated = validateJsonResponse(
		unreadCountResponseSchema,
		{ count },
		'GET /api/notifications/unread-count'
	);

	return json(validated);
};
