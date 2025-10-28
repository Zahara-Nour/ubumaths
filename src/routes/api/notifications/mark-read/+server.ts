/**
 * POST /api/notifications/mark-read
 *
 * Mark a specific notification as read
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markAsRead } from '$lib/server/notifications';
import { markNotificationReadSchema, validateRequest } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	// ====================================================================
	// SECURITY: Authentication Check
	// ====================================================================
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
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
