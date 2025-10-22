/**
 * POST /api/notifications/mark-all-read
 *
 * Mark all unread notifications as read for the current user
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markAllAsRead } from '$lib/server/notifications';

export const POST: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	const result = await markAllAsRead(supabase, session.user.id);

	if (!result.success) {
		throw error(500, result.error || 'Erreur lors de la mise à jour');
	}

	return json({ success: true });
};
