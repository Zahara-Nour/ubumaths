import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';
import type { VipCardInstance } from '$lib/types/vip-card';

/**
 * Page server load for the trade board
 *
 * Validates:
 * - User is authenticated
 * - Marketplace is enabled for student
 * - User is a participant (initiator or partner) of the trade
 *
 * Returns:
 * - trade: Full trade object with initiator/partner profiles
 * - myCards: Current user's VIP cards available for trade
 * - partnerCards: Partner's VIP cards available for trade
 * - gidouillesBalance: Current user's gidouilles balance
 * - isInitiator: Whether current user is the trade initiator
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		redirect(303, '/dashboard');
	}

	// Check if marketplace is enabled for this student
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		redirect(303, '/dashboard');
	}

	const tradeId = params.id;

	// Fetch trade with relations
	const { data: trade, error: tradeError } = await supabase
		.from('marketplace_trades')
		.select(
			`
			*,
			initiator:profiles!marketplace_trades_initiator_id_fkey(
				id,
				firstname,
				lastname,
				avatar_url,
				vip_cards,
				gidouilles
			),
			partner:profiles!marketplace_trades_partner_id_fkey(
				id,
				firstname,
				lastname,
				avatar_url,
				vip_cards,
				gidouilles
			)
		`
		)
		.eq('id', tradeId)
		.single();

	if (tradeError || !trade) {
		error(404, 'Echange non trouve');
	}

	// Check that user is a participant
	const isInitiator = trade.initiator_id === userId;
	const isPartner = trade.partner_id === userId;

	if (!isInitiator && !isPartner) {
		error(403, 'Vous ne participez pas a cet echange');
	}

	// Check trade status - only allow access to active trades
	if (trade.status !== 'negotiating') {
		redirect(303, '/dashboard/student/marketplace?tab=exchanges');
	}

	// Transform the data for the page
	// Handle Supabase returning single object or array
	const initiatorData = Array.isArray(trade.initiator) ? trade.initiator[0] : trade.initiator;
	const partnerData = Array.isArray(trade.partner) ? trade.partner[0] : trade.partner;

	// Get my profile and partner profile based on role
	const myProfile = isInitiator ? initiatorData : partnerData;
	const theirProfile = isInitiator ? partnerData : initiatorData;

	// Parse VIP cards - filter out used cards and map to VipCardInstance
	// vip_cards is stored as Record<instanceId, VipCardInstance> in the database
	const parseVipCards = (vipCards: unknown): (VipCardInstance & { instanceId: string })[] => {
		if (!vipCards || typeof vipCards !== 'object') return [];

		// Handle both object format (Record<string, VipCardInstance>) and array format
		const entries = Array.isArray(vipCards)
			? vipCards.map((card) => [card.id || card.instanceId, card] as const)
			: Object.entries(vipCards as Record<string, unknown>);

		return entries
			.filter(([, card]) => {
				if (!card || typeof card !== 'object') return false;
				const c = card as Record<string, unknown>;
				// Only include unused cards
				if (c.usedAt || c.used_at) return false;
				return true;
			})
			.map(([instanceId, card]) => {
				const c = card as Record<string, unknown>;
				return {
					instanceId: String(instanceId),
					cardId: String(c.cardId || c.template_id || ''),
					earnedAt: String(c.earnedAt || c.earned_at || c.obtained_at || ''),
					usedAt: (c.usedAt || c.used_at || null) as string | null
				};
			});
	};

	// Get cards for both participants
	const myCards = parseVipCards(myProfile?.vip_cards);
	const partnerCards = parseVipCards(theirProfile?.vip_cards);

	// Get gidouilles balance
	const gidouillesBalance = myProfile?.gidouilles ?? 0;

	// Build trade info for client
	const tradeInfo = {
		id: trade.id,
		status: trade.status,
		initiator_id: trade.initiator_id,
		partner_id: trade.partner_id,
		current_offer: trade.current_offer,
		validated_by_initiator: trade.validated_by_initiator,
		validated_by_partner: trade.validated_by_partner,
		confirmation_started_at: trade.confirmation_started_at,
		created_at: trade.created_at,
		updated_at: trade.updated_at,
		initiator: initiatorData
			? {
					id: initiatorData.id,
					firstname: initiatorData.firstname,
					lastname: initiatorData.lastname,
					avatar_url: initiatorData.avatar_url
				}
			: null,
		partner: partnerData
			? {
					id: partnerData.id,
					firstname: partnerData.firstname,
					lastname: partnerData.lastname,
					avatar_url: partnerData.avatar_url
				}
			: null
	};

	return {
		trade: tradeInfo,
		myCards,
		partnerCards,
		gidouillesBalance,
		isInitiator
	};
};
