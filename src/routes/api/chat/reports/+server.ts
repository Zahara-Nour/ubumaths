import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reportMessageSchema } from '$lib/server/validation/chat';

/**
 * POST /api/chat/reports
 *
 * Report a message as inappropriate
 *
 * Request body:
 * - messageId: UUID - Message to report
 * - reason: 'spam' | 'harassment' | 'inappropriate' | 'other'
 * - details: string (optional, max 500 chars)
 *
 * Responses:
 * - 201: Report created successfully
 * - 400: Validation failed
 * - 401: Not authenticated
 * - 403: Not a participant in conversation
 * - 404: Message not found
 * - 409: Already reported by this user
 * - 500: Database error
 *
 * @throws {Error} 401 - User not authenticated
 * @throws {Error} 400 - Invalid request body
 * @throws {Error} 403 - User not a participant in conversation
 * @throws {Error} 404 - Message not found
 * @throws {Error} 409 - User has already reported this message
 * @throws {Error} 500 - Database error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// 2. Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const validation = reportMessageSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { messageId, reason, details } = validation.data;

	// 3. Call report_message RPC (exists in migration 041)
	// RPC performs validations:
	// - User must be participant in conversation
	// - Cannot report same message twice
	// - Message must exist
	const { data: reportId, error: reportError } = await locals.supabase.rpc('report_message', {
		p_message_id: messageId,
		p_reason: reason,
		p_details: details ?? null
	});

	if (reportError) {
		// Handle specific error codes based on RPC error messages
		if (reportError.message.includes('already reported')) {
			throw error(409, 'You have already reported this message');
		}
		if (reportError.message.includes('not a participant')) {
			throw error(403, 'You can only report messages in your conversations');
		}
		if (reportError.message.includes('not found')) {
			throw error(404, 'Message not found');
		}

		console.error('Failed to report message:', reportError);
		throw error(500, 'Failed to report message');
	}

	return json({ success: true, reportId }, { status: 201 });
};
