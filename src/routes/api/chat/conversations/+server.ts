import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createConversationSchema } from '$lib/server/validation/chat';

/**
 * GET /api/chat/conversations
 *
 * Get all conversations for the current user
 *
 * Query params: None
 *
 * Responses:
 * - 200: Array of conversations with metadata
 * - 401: Not authenticated
 * - 500: Database error
 */
export const GET: RequestHandler = async ({ locals }) => {
	// ====================================================================
	// SECURITY: Authentication Check
	// ====================================================================
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		// ====================================================================
		// DATABASE: Call get_user_conversations RPC (exists in migration 042)
		// ====================================================================
		const { data, error: dbError } = await locals.supabase.rpc('get_user_conversations', {
			p_user_id: locals.user.id
		});

		if (dbError) {
			console.error('Failed to get conversations:', {
				userId: locals.user.id,
				error: dbError.message
			});
			throw error(500, 'Failed to load conversations');
		}

		return json({ conversations: data || [] }, { status: 200 });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Conversations API error:', err);
		throw error(500, 'Failed to load conversations');
	}
};

/**
 * POST /api/chat/conversations
 *
 * Create a 1-on-1 chat with a friend
 *
 * Request body:
 * - friendId: UUID
 *
 * Responses:
 * - 201: Conversation created (returns conversationId)
 * - 400: Validation failed
 * - 401: Not authenticated
 * - 403: Users not friends
 * - 409: Conversation already exists
 * - 500: Database error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// ====================================================================
	// SECURITY: Authentication Check
	// ====================================================================
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// ====================================================================
	// SECURITY: Input Validation with Zod
	// ====================================================================
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = createConversationSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { friendId } = validation.data;

	try {
		// ====================================================================
		// DATABASE: Call create_1on1_chat RPC (exists in migration 037)
		// RPC has built-in duplicate detection, returns existing conversation if found
		// ====================================================================
		const { data: conversationId, error: createError } = await locals.supabase.rpc(
			'create_1on1_chat',
			{
				p_user1_id: locals.user.id,
				p_user2_id: friendId
			}
		);

		if (createError) {
			// Handle specific error messages from RPC
			if (createError.message.includes('must be friends')) {
				throw error(403, 'Vous devez être ami avec cet utilisateur pour discuter');
			}
			if (createError.message.includes('already exists')) {
				throw error(409, 'La conversation existe déjà');
			}

			console.error('Failed to create conversation:', {
				userId: locals.user.id,
				friendId,
				error: createError.message
			});
			throw error(500, 'Échec de la création de la conversation');
		}

		if (!conversationId) {
			console.error('create_1on1_chat returned no conversation ID', {
				userId: locals.user.id,
				friendId
			});
			throw error(500, 'Échec de la création de la conversation');
		}

		return json({ conversationId }, { status: 201 });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Create conversation API error:', err);
		throw error(500, 'Échec de la création de la conversation');
	}
};
