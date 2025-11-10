/**
 * GET /api/notifications/unread
 *
 * Returns unread notifications for the current user with pagination
 *
 * Query Parameters:
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 20, min: 1, max: 100)
 *
 * Response:
 * {
 *   notifications: NotificationWithDetails[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number,
 *     hasMore: boolean
 *   }
 * }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadNotifications } from '$lib/server/notifications';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';

// Zod schema for pagination query parameters
const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().min(1).max(100).default(20)
});

export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate pagination parameters
	const pageParam = url.searchParams.get('page');
	const limitParam = url.searchParams.get('limit');

	const validation = paginationSchema.safeParse({
		page: pageParam,
		limit: limitParam
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit } = validation.data;

	// Fetch paginated notifications
	const result = await getUnreadNotifications(supabase, user.id, { page, limit });

	return json(result);
};
