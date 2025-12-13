/**
 * Tutor Conversation Messages API
 *
 * GET: List messages for a conversation with pagination
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTutorMessagesQuerySchema } from '$lib/server/validation/chat';

/**
 * GET /api/tutor/conversations/[id]/messages?limit=50&before=timestamp
 *
 * Returns messages for a conversation, ordered by timestamp (oldest first).
 * Only the conversation owner can access messages.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Check authentication
	const user = locals.user;
	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const conversationId = params.id;
	if (!conversationId) {
		throw error(400, 'ID conversation requis');
	}

	// Parse and validate query parameters
	const limitParam = url.searchParams.get('limit');
	const beforeParam = url.searchParams.get('before');

	const validation = getTutorMessagesQuerySchema.safeParse({
		limit: limitParam ?? undefined,
		before: beforeParam ?? undefined
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { limit, before } = validation.data;

	const supabase = locals.supabase;

	// First, verify the user owns this conversation
	const { data: conversation, error: convError } = await supabase
		.from('tutor_conversations')
		.select('id, student_id')
		.eq('id', conversationId)
		.single();

	if (convError || !conversation) {
		throw error(404, 'Conversation non trouvée');
	}

	if (conversation.student_id !== user.id) {
		throw error(403, "Vous n'avez pas accès à cette conversation");
	}

	// Build query for messages
	let query = supabase
		.from('tutor_messages')
		.select('id, role, content, help_level, created_at')
		.eq('conversation_id', conversationId)
		.order('created_at', { ascending: true })
		.limit(limit);

	// Add pagination if before timestamp provided
	if (before) {
		query = query.lt('created_at', before);
	}

	const { data: messages, error: msgError } = await query;

	if (msgError) {
		console.error('Error fetching tutor messages:', msgError);
		throw error(500, 'Erreur lors du chargement des messages');
	}

	return json({ messages: messages ?? [] });
};
