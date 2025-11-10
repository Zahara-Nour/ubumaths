import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteMessageSchema } from '$lib/server/validation/moderation';
import { supabaseAdmin } from '$lib/server/supabase-admin';
import { z } from 'zod';

/**
 * DELETE /api/moderation/messages/[id]
 *
 * Soft deletes a message by setting its deleted_at timestamp.
 * Only accessible by teachers and admins who have access to the conversation.
 *
 * URL params:
 * - id: UUID of the message to delete
 *
 * Request body:
 * - reason: String (5-500 characters) explaining why the message was deleted
 *
 * Responses:
 * - 200: Message deleted successfully
 * - 400: Invalid UUID or validation failed
 * - 401: Not authenticated
 * - 403: Not a teacher/admin OR message not in teacher's conversation
 * - 404: Message not found
 * - 500: Database error
 */
export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	// 1. Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// 2. Check teacher role
	if (!['teacher', 'admin'].includes(locals.user.role)) {
		throw error(403, 'Only teachers and admins can delete messages');
	}

	// 3. Validate message ID from URL params with Zod
	const messageParamsSchema = z.object({
		id: z.string().uuid('Invalid message ID format')
	});

	const paramsValidation = messageParamsSchema.safeParse(params);
	if (!paramsValidation.success) {
		throw error(400, paramsValidation.error.issues[0].message);
	}

	const { id: messageId } = paramsValidation.data;

	// 4. Parse and validate request body
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = deleteMessageSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reason } = validation.data;

	// 5. Fetch message with conversation_id and content (for logging)
	const { data: message, error: fetchError } = await supabaseAdmin
		.from('messages')
		.select('id, conversation_id, sender_id, content, created_at, deleted_at')
		.eq('id', messageId)
		.maybeSingle();

	if (fetchError) {
		console.error('Failed to fetch message:', fetchError);
		throw error(500, 'Failed to fetch message');
	}

	if (!message) {
		throw error(404, 'Message not found');
	}

	// Check if already deleted
	if (message.deleted_at) {
		throw error(400, 'Message is already deleted');
	}

	// 6. Verify teacher has access to the conversation
	// Teachers must either:
	// - Be a participant (for class channels)
	// - Have both students in their classes (for 1-on-1 student chats)
	// - Be an admin (can moderate any message)

	if (locals.user.role === 'admin') {
		// Admins can delete any message - skip authorization checks
	} else {
		// Check if teacher is a participant in the conversation
		const { data: membership } = await supabaseAdmin
			.from('conversation_participants')
			.select('user_id')
			.eq('conversation_id', message.conversation_id)
			.eq('user_id', locals.user.id)
			.maybeSingle();

		if (!membership) {
			// Teacher is NOT a participant - check if it's a student 1-on-1 chat
			const { data: conversation } = await supabaseAdmin
				.from('conversations')
				.select('is_group')
				.eq('id', message.conversation_id)
				.maybeSingle();

			if (!conversation) {
				throw error(404, 'Conversation not found');
			}

			if (conversation.is_group) {
				// Group conversation but teacher not a participant
				throw error(403, 'You do not have access to this conversation');
			}

			// It's a 1-on-1 chat - verify both participants are teacher's students
			const { data: participants } = await supabaseAdmin
				.from('conversation_participants')
				.select('user_id')
				.eq('conversation_id', message.conversation_id);

			if (!participants || participants.length !== 2) {
				throw error(403, 'You do not have access to this conversation');
			}

			// Check if both participants are this teacher's students
			const studentIds = participants.map((p) => p.user_id);
			const { count } = await supabaseAdmin
				.from('class_members')
				.select('student_id', { count: 'exact', head: true })
				.eq('teacher_id', locals.user.id)
				.in('student_id', studentIds);

			if (count !== 2) {
				throw error(
					403,
					'You can only moderate conversations where all participants are your students'
				);
			}
		}
		// If membership exists OR authorization checks passed, proceed to deletion
	}

	// 7. Soft delete the message (set deleted_at timestamp)
	const { error: updateError } = await supabaseAdmin
		.from('messages')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', messageId);

	if (updateError) {
		console.error('Failed to delete message:', updateError);
		throw error(500, 'Failed to delete message');
	}

	// 8. Log moderation action (privacy: content length only, not full content)
	const { error: logError } = await supabaseAdmin.rpc('log_moderation_action', {
		p_action: 'delete_message',
		p_target_type: 'message',
		p_target_id: messageId,
		p_reason: reason,
		p_metadata: {
			conversation_id: message.conversation_id,
			sender_id: message.sender_id,
			message_length: message.content.length, // Privacy: store length, not content
			message_created_at: message.created_at
		}
	});

	if (logError) {
		console.error('Failed to log moderation action:', logError);
		// Don't fail the request if logging fails
	}

	return json({ success: true, message: 'Message deleted successfully' }, { status: 200 });
};
