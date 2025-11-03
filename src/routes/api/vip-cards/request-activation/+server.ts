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
 * - Card must have an action defined
 * - Card must not be used or already have a pending activation request
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getVipCardById } from '$lib/types/vip-card';

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
	const { user } = await requireAuth(locals);
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

	// Fetch student's VIP cards
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[request-activation] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;

	// Verify that the instance exists and belongs to the student
	const instance = vipCards[instanceId];

	if (!instance) {
		throw error(404, 'VIP card instance not found');
	}

	// Verify that the card is not already used
	if (instance.usedAt) {
		throw error(400, 'This card has already been used');
	}

	// Verify that there is no pending activation request
	if (instance.activationRequestedAt) {
		throw error(400, 'Activation request already pending');
	}

	// Get card definition to verify it has an action
	const cardDef = getVipCardById(instance.cardId);

	if (!cardDef) {
		throw error(404, 'Card definition not found');
	}

	if (!cardDef.action) {
		throw error(400, 'This card does not have an activatable action');
	}

	// Update instance with activation request
	const updatedInstance = {
		...instance,
		activationRequestedAt: new Date().toISOString(),
		activationRequestedBy: studentId
	};

	const updatedCards = {
		...vipCards,
		[instanceId]: updatedInstance
	};

	// Save updated cards to database
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[request-activation] Error updating vip_cards:', updateError);
		throw error(500, `Failed to request activation: ${updateError.message}`);
	}

	// Return success with updated instance
	return json({
		success: true,
		message: 'Activation request submitted successfully',
		instance: updatedInstance,
		cardName: cardDef.name,
		actionDescription: getActionDescription(cardDef.action)
	});
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get human-readable description of card action
 */
function getActionDescription(
	action: NonNullable<NonNullable<ReturnType<typeof getVipCardById>>['action']>
): string {
	switch (action.type) {
		case 'draw_cards':
			return `Piocher ${action.count} carte${action.count > 1 ? 's' : ''} VIP`;

		case 'remove_warnings':
			return `Enlever ${action.count} avertissement${action.count > 1 ? 's' : ''}${action.warningType ? ` (${action.warningType})` : ''}`;

		case 'exchange_cards':
			if (action.exchange.mode === 'replace_random') {
				return `Échanger ${action.exchange.count} carte${action.exchange.count > 1 ? 's' : ''} contre de nouvelles cartes`;
			} else if (action.exchange.mode === 'rarity_points') {
				return `Échanger des cartes contre une carte ${action.exchange.targetRarity}`;
			} else {
				return `Échanger ${action.exchange.discardCount} carte${action.exchange.discardCount > 1 ? 's' : ''} contre une carte spécifique`;
			}

		case 'add_gidouilles':
			return `Gagner ${action.amount} gidouilles`;

		default:
			return 'Action spéciale';
	}
}
