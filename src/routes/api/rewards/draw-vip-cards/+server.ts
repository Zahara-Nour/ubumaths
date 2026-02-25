import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { drawVipCardsSchema } from '$lib/server/validation/draw-vip-cards';
import { requireConsent, hasConsentFields } from '$lib/server/middleware/consent';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

/**
 * Draw multiple VIP cards for a student
 *
 * POST /api/rewards/draw-vip-cards
 *
 * Request body (discriminated union based on paymentMethod):
 *
 * For gidouilles payment:
 *   - studentId (string, UUID): Student's profile ID
 *   - count (number, 1-10): Number of cards to draw
 *   - paymentMethod (string): "gidouilles"
 *   - gidouillesCost (number, 0-100): Cost in gidouilles
 *   - filters (optional object): See below
 *
 * For VIP card payment:
 *   - studentId (string, UUID): Student's profile ID
 *   - count (number, 1-10): Number of cards to draw
 *   - paymentMethod (string): "vip_card"
 *   - vipCardInstanceId (string, UUID): ID of VIP card to consume
 *   - filters (optional object): See below
 *
 * Optional filters:
 *   - forceRarity (string): Force all cards to be of specific rarity
 *   - minRarity (string): Guarantee minimum rarity (common < rare < epic < legendary)
 *   - excludeCardIds (string[]): Card IDs to exclude from the draw pool
 *   - onlyCardsWithActions (boolean): Only draw cards that have actions
 *
 * Note: forceRarity and minRarity are mutually exclusive.
 *
 * Response:
 *   - 200: { cards: [{ cardId, instanceId, earnedAt }, ...] }
 *   - 400: Validation error or insufficient resources (from RPC)
 *   - 401: Not authenticated
 *   - 500: Server error
 *
 * Security:
 *   - Requires authentication
 *   - All input validated with Zod schema
 *   - RPC function handles authorization and business logic
 *
 * RPC error examples:
 *   - "Insufficient gidouilles: Required 10, available 5"
 *   - "VIP card instance not found or already used"
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Authentication check
	const { user, profile } = await requireAuth(locals);

	// Check consent for students (teachers/admins can draw cards without consent)
	if (hasConsentFields(profile)) {
		requireConsent(profile, 'earn_rewards');
	}

	const supabase = locals.supabase;

	try {
		// 2. Input validation
		const body = await request.json();
		const validation = drawVipCardsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 3. Authorization: verify caller can draw cards for this student
		if (user.id !== data.studentId) {
			// Teacher/admin drawing for a student — verify access
			const hasAccess = await verifyTeacherStudentWithRole(
				user.id,
				data.studentId,
				profile,
				supabase
			);
			if (!hasAccess) {
				throw error(403, 'You can only draw cards for students in your classes');
			}
		}

		// 4. RPC call with mapped parameters (including optional filters)
		const { data: result, error: rpcError } = await supabase.rpc('draw_multiple_vip_cards', {
			p_student_id: data.studentId,
			p_count: data.count,
			p_payment_method: data.paymentMethod,
			p_gidouilles_cost: data.paymentMethod === 'gidouilles' ? data.gidouillesCost : null,
			p_vip_card_instance_id: data.paymentMethod === 'vip_card' ? data.vipCardInstanceId : null,
			// Filter parameters (all optional)
			p_force_rarity: data.filters?.forceRarity ?? null,
			p_min_rarity: data.filters?.minRarity ?? null,
			p_exclude_card_ids: data.filters?.excludeCardIds ?? null,
			p_only_cards_with_actions: data.filters?.onlyCardsWithActions ?? false
		});

		// 5. Error handling
		if (rpcError) {
			console.error('RPC error drawing VIP cards:', rpcError);

			// RPC errors contain user-friendly validation messages
			// (e.g., "Insufficient gidouilles: Required 10, available 5")
			throw error(400, rpcError.message || 'Failed to draw VIP cards');
		}

		// 6. Log audit trail for VIP card payment
		if (data.paymentMethod === 'vip_card') {
			// Fetch the card template ID from the student's profile (card is now marked as used by the RPC)
			const { data: studentProfile } = await supabase
				.from('profiles')
				.select('vip_cards')
				.eq('id', data.studentId)
				.single();

			const vipCards = (studentProfile?.vip_cards ?? {}) as Record<string, { cardId?: string }>;
			const cardTemplateId = vipCards[data.vipCardInstanceId]?.cardId ?? 'unknown';

			const { error: activityError } = await supabase.from('vip_cards_activity').insert({
				student_id: data.studentId,
				card_instance_id: data.vipCardInstanceId,
				card_template_id: cardTemplateId,
				action: 'used' as const,
				metadata: {
					action_type: 'draw_cards',
					cards_drawn: data.count,
					filters: data.filters ?? null
				}
			});

			if (activityError) {
				console.error('[draw-vip-cards] Error logging activity:', activityError);
			}
		}

		// 7. Success response
		return json(result);
	} catch (err) {
		console.error('Error drawing VIP cards:', err);

		// Re-throw SvelteKit errors (they already have proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
