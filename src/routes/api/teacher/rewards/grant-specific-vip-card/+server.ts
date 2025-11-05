import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

/**
 * Validation schema for granting specific VIP cards
 */
const grantVipCardSchema = z.object({
	studentId: z.string().uuid('Invalid student ID format'),
	cardId: z.string().min(1, 'Card ID is required').max(100, 'Card ID too long'),
	count: z
		.number()
		.int('Count must be an integer')
		.min(1, 'Count must be at least 1')
		.max(10, 'Count cannot exceed 10')
		.default(1)
});

/**
 * POST /api/teacher/rewards/grant-specific-vip-card
 *
 * Grants a specific VIP card to a student for free (teacher override).
 *
 * @requires Authentication (teacher or admin)
 * @requires Teacher-student relationship (via class_members)
 *
 * Request body:
 * - studentId: UUID of the student
 * - cardId: Specific card ID to grant (e.g., "bonus", "Sheikh")
 * - count: Number of instances to grant (1-10, default: 1)
 *
 * Returns:
 * - success: boolean
 * - cards: Array of granted card instances [{ cardId, instanceId, earnedAt }]
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth check
	const { user } = locals;
	if (!user) {
		throw error(401, 'Authentication required');
	}

	// Parse and validate request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const validation = grantVipCardSchema.safeParse(requestBody);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId, count } = validation.data;
	const supabase = locals.supabase;

	// Call RPC function
	const { data: result, error: rpcError } = await supabase.rpc('grant_specific_vip_card', {
		p_student_id: studentId,
		p_card_id: cardId,
		p_count: count
	});

	if (rpcError) {
		console.error('RPC Error granting specific VIP card:', rpcError);
		throw error(400, rpcError.message);
	}

	// Type guard for result structure
	if (!result || typeof result !== 'object' || !('cards' in result)) {
		console.error('Unexpected RPC result structure:', result);
		throw error(500, 'Unexpected response from database');
	}

	// Return success with cards
	return json({
		success: true,
		cards: result.cards
	});
};
