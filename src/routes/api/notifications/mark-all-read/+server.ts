/**
 * POST /api/notifications/mark-all-read
 *
 * Mark all unread notifications as read for the current user
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markAllAsRead } from '$lib/server/notifications';
import { requireAuth } from '$lib/server/middleware/auth';
import { checkNotificationMarkRateLimit } from '$lib/server/rateLimiter';

export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	// ====================================================================
	// SECURITY: Rate Limiting
	// ====================================================================
	const rateLimitResult = await checkNotificationMarkRateLimit(user.id);
	if (!rateLimitResult.allowed) {
		return json(
			{ error: rateLimitResult.message },
			{
				status: 429,
				headers: {
					'Retry-After': rateLimitResult.retryAfter?.toString() || '900'
				}
			}
		);
	}

	// ====================================================================
	// Business Logic
	// ====================================================================
	const result = await markAllAsRead(supabase, user.id);

	if (!result.success) {
		throw error(500, result.error || 'Erreur lors de la mise à jour');
	}

	return json({ success: true });
};
