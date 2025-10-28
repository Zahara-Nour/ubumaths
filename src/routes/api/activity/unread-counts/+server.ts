/**
 * GET /api/activity/unread-counts
 *
 * Unified endpoint that returns unread counts for both notifications and messages
 * This reduces database polling overhead by combining two requests into one
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUnreadCount } from '$lib/server/notifications';
import { uuidSchema } from '$lib/server/validation/common';
import { getCached, CACHE_KEYS, TTL } from '$lib/server/cache';

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	// Validate user ID format (project security standard: validate all inputs)
	const userIdValidation = uuidSchema.safeParse(session.user.id);
	if (!userIdValidation.success) {
		console.error('Invalid user ID format in session:', session.user.id);
		throw error(400, 'Format ID utilisateur invalide');
	}

	const userId = userIdValidation.data;

	try {
		// Cache activity counts with 30s TTL (matches frontend polling interval)
		// This reduces database load from 2 queries per user per 30s to near-zero for cache hits
		const counts = await getCached(
			CACHE_KEYS.ACTIVITY_COUNTS(userId),
			TTL.ACTIVITY_COUNTS,
			async () => {
				// Fetch both counts in parallel for optimal performance
				const [notificationsCount, messagesResult] = await Promise.all([
					getUnreadCount(supabase, userId),
					supabase.rpc('get_private_messages_unread_count', {
						p_user_id: userId
					})
				]);

				// Handle messages RPC result
				// Note: We throw errors instead of returning default values (0) to ensure
				// the client knows the request failed. This prevents showing stale counts
				// that could mislead users about their actual unread messages.
				if (messagesResult.error) {
					console.error('Error fetching unread messages count:', messagesResult.error);
					throw error(500, 'Erreur lors de la récupération du compteur de messages');
				}

				return {
					notifications: notificationsCount,
					messages: messagesResult.data || 0
				};
			}
		);

		// Return cached or fresh counts
		return json(counts);
	} catch (err) {
		console.error('Error in unified unread counts API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
