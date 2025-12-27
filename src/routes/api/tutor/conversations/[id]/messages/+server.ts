/**
 * Tutor Conversation Messages API
 *
 * GET: List messages for a conversation with pagination
 * DELETE: Clear all messages from a conversation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getTutorMessagesQuerySchema } from '$lib/server/validation/chat';
import { requireAuth } from '$lib/server/middleware/auth';

// UUID validation schema
const conversationIdSchema = z.string().uuid('ID conversation invalide');

/**
 * GET /api/tutor/conversations/[id]/messages?limit=50&before=timestamp
 *
 * Returns messages for a conversation, ordered by timestamp (oldest first).
 * Only the conversation owner can access messages.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Check authentication with proper session validation
	const { user } = await requireAuth(locals);

	// Validate conversation ID as UUID
	const idValidation = conversationIdSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}
	const conversationId = idValidation.data;

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

	// First, verify the user owns this conversation
	const { data: conversation, error: convError } = await locals.supabase
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
	let query = locals.supabase
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
		console.error('Tutor messages fetch error:', msgError);
		throw error(500, 'Erreur lors du chargement des messages');
	}

	return json({ messages: messages ?? [] });
};

/**
 * DELETE /api/tutor/conversations/[id]/messages
 *
 * Clears all messages from a conversation and resets metadata.
 * Only the conversation owner can delete messages.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Check authentication with proper session validation
	const { user } = await requireAuth(locals);

	// Validate conversation ID as UUID
	const idValidation = conversationIdSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}
	const conversationId = idValidation.data;

	// First, verify the user owns this conversation
	const { data: conversation, error: convError } = await locals.supabase
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

	// Delete all messages from the conversation
	const { error: deleteError } = await locals.supabase
		.from('tutor_messages')
		.delete()
		.eq('conversation_id', conversationId);

	if (deleteError) {
		console.error('Tutor messages delete error:', deleteError);
		throw error(500, 'Erreur lors de la suppression des messages');
	}

	// Reset conversation metadata
	const { error: updateError } = await locals.supabase
		.from('tutor_conversations')
		.update({
			message_count: 0,
			max_help_level_reached: 0
		})
		.eq('id', conversationId);

	if (updateError) {
		console.error('Tutor conversation update error:', updateError);
		// Messages are deleted, but metadata update failed - not critical
	}

	return json({ success: true });
};
