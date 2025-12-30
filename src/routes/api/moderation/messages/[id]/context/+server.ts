import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/moderation/messages/[id]/context
 *
 * Get surrounding messages for context when reviewing a reported message.
 * Returns the reported message plus N messages before it.
 *
 * URL params:
 * - id: UUID - Message ID to get context for
 *
 * Query params:
 * - count: number (optional, default 10) - Number of messages before
 *
 * Responses:
 * - 200: Context messages returned
 * - 400: Invalid message ID
 * - 401: Not authenticated
 * - 403: Not a teacher/admin
 * - 404: Message not found
 * - 500: Database error
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// 1. Check authentication
	if (!locals.user || !locals.profile) {
		throw error(401, 'Not authenticated');
	}

	// 2. Check teacher role
	if (!['teacher', 'admin'].includes(locals.profile.role)) {
		throw error(403, 'Only teachers can access message context');
	}

	// 3. Validate message ID
	const messageId = params.id;
	if (
		!messageId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)
	) {
		throw error(400, 'Invalid message ID');
	}

	// 4. Get count from query params (default 10)
	const countParam = url.searchParams.get('count');
	const count = countParam ? Math.min(Math.max(parseInt(countParam, 10) || 10, 1), 50) : 10;

	// 5. Call RPC to get message context
	const { data, error: rpcError } = await locals.supabase.rpc(
		'get_message_context_for_moderation',
		{
			p_message_id: messageId,
			p_before_count: count
		}
	);

	if (rpcError) {
		console.error('Failed to get message context:', rpcError);

		if (rpcError.message.includes('Permission denied')) {
			throw error(403, 'Permission denied');
		}
		if (rpcError.message.includes('not found')) {
			throw error(404, 'Message not found');
		}

		throw error(500, 'Failed to get message context');
	}

	return json({ messages: data || [] });
};
