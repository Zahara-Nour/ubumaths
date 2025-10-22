/**
 * POST /api/notifications/mark-read
 *
 * Mark a specific notification as read
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markAsRead } from '$lib/server/notifications';

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	const { notificationId } = await request.json();

	if (!notificationId) {
		throw error(400, 'ID de notification manquant');
	}

	const result = await markAsRead(supabase, notificationId, session.user.id);

	if (!result.success) {
		throw error(500, result.error || 'Erreur lors de la mise à jour');
	}

	return json({ success: true });
};
