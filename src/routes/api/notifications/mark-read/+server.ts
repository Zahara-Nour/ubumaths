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

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

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
