/**
 * POST /api/notifications/mark-read
 *
 * Mark a specific notification as read
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markAsRead } from '$lib/server/notifications';
import { markNotificationReadSchema, validateRequest } from '$lib/server/validation';
import { requireAuth } from '$lib/server/middleware/auth';
import { checkNotificationMarkRateLimit } from '$lib/server/rateLimiter';

export const POST: RequestHandler = async ({ request, locals }) => {
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
	// SECURITY: Input Validation
	// ====================================================================
	const body = await request.json();
	const validation = validateRequest(markNotificationReadSchema, body);

	if (!validation.success) {
		throw error(400, validation.error);
	}

	const { notificationId } = validation.data;

	// ====================================================================
	// Business Logic
	// ====================================================================
	const result = await markAsRead(supabase, notificationId, user.id);

	if (!result.success) {
		throw error(500, result.error || 'Erreur lors de la mise à jour');
	}

	return json({ success: true });
};
