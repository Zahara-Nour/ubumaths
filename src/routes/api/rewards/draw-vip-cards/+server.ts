import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { drawVipCardsSchema } from '$lib/server/validation/draw-vip-cards';
import { requireConsent, hasConsentFields } from '$lib/server/middleware/consent';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { VIP_CARD_COST } from '$lib/utils/vip-cards';

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
		const isPrivileged = profile.role === 'teacher' || profile.role === 'admin';
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

		// 3b. SECURITY (finding C8): a self-drawing student must not dictate the
		// gidouilles PRICE nor force RARITY. Both arrive from the request body and the
		// RPC only checks `cost <= count * max`, so a student could pay 1 gidouille for
		// 10 forced-legendary cards and resell them. For a non-privileged *gidouilles*
		// self-draw we derive the cost server-side and drop the rarity filters.
		//
		// The `vip_card` payment branch is NOT touched here: a student self-activating
		// a legitimately-earned "draw_cards" action card passes the rarity its card
		// grants, and blanket-nulling would silently downgrade those draws. (Validating
		// those filters against the card instance's own action config is a Vague-1 item.)
		const isSelfDraw = user.id === data.studentId;
		const isCheatableSelfDraw = isSelfDraw && !isPrivileged && data.paymentMethod === 'gidouilles';
		let gidouillesCost = data.paymentMethod === 'gidouilles' ? data.gidouillesCost : null;
		let forceRarity = data.filters?.forceRarity ?? null;
		let minRarity = data.filters?.minRarity ?? null;
		if (isCheatableSelfDraw) {
			gidouillesCost = data.count * VIP_CARD_COST;
			forceRarity = null;
			minRarity = null;
		}

		// 4. RPC call with mapped parameters (including optional filters)
		const { data: result, error: rpcError } = await supabase.rpc('draw_multiple_vip_cards', {
			p_student_id: data.studentId,
			p_count: data.count,
			p_payment_method: data.paymentMethod,
			p_gidouilles_cost: gidouillesCost ?? undefined,
			// Ces paramètres sont `DEFAULT NULL` côté SQL et donc optionnels dans les
			// types générés : les omettre applique le même défaut que passer NULL.
			p_vip_card_instance_id:
				data.paymentMethod === 'vip_card' ? data.vipCardInstanceId : undefined,
			// Filter parameters (all optional)
			p_force_rarity: forceRarity ?? undefined,
			p_min_rarity: minRarity ?? undefined,
			p_exclude_card_ids: data.filters?.excludeCardIds ?? undefined,
			p_only_cards_with_actions: data.filters?.onlyCardsWithActions ?? false
		});

		// 5. Error handling
		if (rpcError) {
			console.error('RPC error drawing VIP cards:', rpcError);

			// RPC errors contain user-friendly validation messages
			// (e.g., "Insufficient gidouilles: Required 10, available 5")
			throw error(400, rpcError.message || 'Failed to draw VIP cards');
		}

		// 6. Audit trail for VIP card payment is now handled atomically
		// inside the draw_multiple_vip_cards RPC (no separate INSERT needed)

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
