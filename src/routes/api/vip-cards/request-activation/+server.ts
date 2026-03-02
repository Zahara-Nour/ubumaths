/**
 * API Endpoint: Request VIP Card Activation
 * ==========================================
 *
 * Allows students to request activation of a VIP card with an action.
 * The request is stored in the card instance and awaits teacher approval.
 *
 * POST /api/vip-cards/request-activation
 *
 * @param instanceId - UUID of the VIP card instance
 * @param studentId - UUID of the student requesting activation
 *
 * SECURITY:
 * - Requires authentication
 * - Student can only request activation for their own cards
 * - Card must have an action defined (validated by RPC)
 * - Card must not be used or already have a pending activation request
 *
 * ATOMICITY:
 * - Uses request_vip_card_activation RPC with FOR UPDATE lock
 * - Profile update + audit trail in a single transaction
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const requestActivationSchema = z.object({
	instanceId: z.string().uuid('Invalid instance ID format'),
	studentId: z.string().uuid('Invalid student ID format')
});

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	requireConsent(profile, 'purchase_items');
	const supabase = locals.supabase;

	// Parse and validate request body
	const body = await request.json();
	const validation = requestActivationSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	// Verify that the authenticated user is the student making the request
	if (user.id !== studentId) {
		throw error(403, 'You can only request activation for your own cards');
	}

	// Call atomic RPC (FOR UPDATE + audit trail in one transaction)
	const { data: rpcResult, error: rpcError } = await supabase.rpc(
		'request_vip_card_activation' as never,
		{
			p_student_id: studentId,
			p_instance_id: instanceId
		} as never
	);

	if (rpcError) {
		console.error('[request-activation] RPC error:', rpcError);
		throw error(500, `Failed to request activation: ${rpcError.message}`);
	}

	const result = rpcResult as {
		success: boolean;
		error?: string;
		cardName?: string;
		actionType?: string;
	};

	if (!result.success) {
		// Map RPC error messages to appropriate HTTP status codes
		const msg = result.error || 'Failed to request activation';
		if (msg.includes('not found')) {
			throw error(404, msg);
		}
		if (msg.includes('only request activation for your own')) {
			throw error(403, msg);
		}
		throw error(400, msg);
	}

	// Build action description from action type returned by RPC
	const actionDescription = result.actionType
		? getActionDescriptionFromType(result.actionType)
		: 'Action speciale';

	// Fetch updated instance for response
	const { data: updatedProfile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	const updatedInstance = updatedProfile?.vip_cards
		? (updatedProfile.vip_cards as Record<string, unknown>)[instanceId]
		: null;

	return json({
		success: true,
		message: 'Activation request submitted successfully',
		instance: updatedInstance,
		cardName: result.cardName,
		actionDescription
	});
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get human-readable description of card action from action type string
 */
function getActionDescriptionFromType(actionType: string): string {
	switch (actionType) {
		case 'draw_cards':
			return 'Piocher des cartes VIP';
		case 'remove_warnings':
			return 'Enlever des avertissements';
		case 'exchange_cards':
			return 'Echanger des cartes';
		case 'add_gidouilles':
			return 'Gagner des gidouilles';
		case 'choose_card':
			return 'Choisir des cartes';
		case 'hint':
			return 'Obtenir un indice';
		case 'undo':
			return 'Annuler un coup';
		default:
			return 'Action speciale';
	}
}
