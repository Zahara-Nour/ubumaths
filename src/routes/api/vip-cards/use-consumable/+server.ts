/**
 * API Endpoint: Use Consumable VIP Card
 * ======================================
 *
 * Student endpoint to use a consumable VIP card.
 *
 * POST /api/vip-cards/use-consumable
 *
 * @param instanceId - UUID of the VIP card instance to use
 *
 * USAGE FLOW:
 * -----------
 * 1. Validates card instance belongs to student
 * 2. Checks card has usesRemaining > 0 (or null for single-use)
 * 3. Decrements usesRemaining (or marks usedAt for single-use)
 * 4. Logs each use in vip_cards_activity
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only students can use their own cards
 * - studentId is taken from session.user.id (not from body)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { useConsumableBodySchema } from '$lib/server/validation/vip-cards';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UseConsumableResult {
	success: boolean;
	usesRemaining?: number | null;
	isFullyConsumed?: boolean;
	usedAt?: string | null;
	activityMetadata?: {
		usesRemaining: number | null;
		useNumber: number;
		totalUses: number;
		fullyConsumed: boolean;
	};
	error?: string;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (students only)
	const { user } = await requireRole(locals, 'student');
	const supabase = locals.supabase;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = useConsumableBodySchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId } = validation.data;

	// Call the use consumable RPC function
	// The RPC handles all validation and atomicity:
	// - Verifies card belongs to student
	// - Checks usesRemaining > 0 (or null for single-use)
	// - Decrements usesRemaining or marks usedAt
	// - Logs EACH use to vip_cards_activity
	const { data, error: rpcError } = await supabase.rpc('use_consumable_card', {
		p_student_id: user.id,
		p_instance_id: instanceId
	});

	if (rpcError) {
		console.error('[use-consumable] RPC error:', rpcError);
		throw error(500, `Failed to use card: ${rpcError.message}`);
	}

	// The RPC returns a JSON object with the result
	const result = data as UseConsumableResult;

	if (!result.success) {
		// Return appropriate status based on error type
		const errorMessage = result.error || 'Failed to use card';

		// Determine appropriate status code from error message
		if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
			throw error(404, errorMessage);
		}
		if (errorMessage.includes('not owned') || errorMessage.includes('Unauthorized')) {
			throw error(403, errorMessage);
		}
		if (
			errorMessage.includes('no remaining uses') ||
			errorMessage.includes('already used') ||
			errorMessage.includes('fully consumed')
		) {
			throw error(400, errorMessage);
		}

		throw error(400, errorMessage);
	}

	// Return success response
	return json({
		success: true,
		usesRemaining: result.usesRemaining,
		isFullyConsumed: result.isFullyConsumed,
		usedAt: result.usedAt,
		activityMetadata: result.activityMetadata
	});
};
