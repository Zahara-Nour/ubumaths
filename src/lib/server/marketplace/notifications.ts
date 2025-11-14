/**
 * Marketplace Notification Helpers
 *
 * Helpers for creating marketplace-specific notifications that integrate
 * with the existing notification system and notificationsRealtimeManager.
 *
 * All notifications are inserted into the `notifications` table and will
 * be automatically broadcast to users via the notificationsRealtimeManager.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Create notification when someone makes a proposal on user's listing
 *
 * @param supabase - Supabase client
 * @param listingOwnerId - ID of the user who created the listing
 * @param proposerId - ID of the user who made the proposal
 * @param listingTitle - Title of the listing
 * @param proposalId - ID of the proposal
 */
export async function notifyNewProposal(
	supabase: SupabaseClient<Database>,
	listingOwnerId: string,
	proposerId: string,
	listingTitle: string,
	proposalId: string
): Promise<void> {
	try {
		// Get proposer's name for notification
		const { data: proposerProfile } = await supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', proposerId)
			.single();

		const proposerName = proposerProfile
			? `${proposerProfile.firstname || ''} ${proposerProfile.lastname || ''}`.trim() || 'Un élève'
			: 'Un élève';

		await supabase.from('notifications').insert({
			target_user_ids: [listingOwnerId],
			target_type: 'users',
			type: 'marketplace_proposal',
			title: 'Nouvelle proposition',
			message: `${proposerName} a fait une proposition pour "${listingTitle}"`,
			action_url: `/dashboard/student/marketplace?tab=my-listings&highlight=${proposalId}`,
			action_label: 'Voir',
			priority: 'normal'
		});
	} catch (error) {
		console.error('Failed to create proposal notification:', error);
		// Don't throw - notification failure shouldn't break the main flow
	}
}

/**
 * Create notification when proposal is accepted
 *
 * @param supabase - Supabase client
 * @param proposerId - ID of the user who made the proposal
 * @param listingTitle - Title of the listing
 * @param tradeId - ID of the completed trade
 */
export async function notifyProposalAccepted(
	supabase: SupabaseClient<Database>,
	proposerId: string,
	listingTitle: string,
	tradeId: string
): Promise<void> {
	try {
		await supabase.from('notifications').insert({
			target_user_ids: [proposerId],
			target_type: 'users',
			type: 'marketplace_proposal_accepted',
			title: 'Proposition acceptée',
			message: `Votre proposition pour "${listingTitle}" a été acceptée ! L'échange est terminé.`,
			action_url: `/dashboard/student/marketplace?tab=trades&highlight=${tradeId}`,
			action_label: 'Voir',
			priority: 'high'
		});
	} catch (error) {
		console.error('Failed to create acceptance notification:', error);
	}
}

/**
 * Create notification when proposal is rejected
 *
 * @param supabase - Supabase client
 * @param proposerId - ID of the user who made the proposal
 * @param listingTitle - Title of the listing
 * @param rejectionMessage - Optional message explaining the rejection
 */
export async function notifyProposalRejected(
	supabase: SupabaseClient<Database>,
	proposerId: string,
	listingTitle: string,
	rejectionMessage?: string
): Promise<void> {
	try {
		const message = rejectionMessage
			? `Votre proposition pour "${listingTitle}" a été refusée. Message: ${rejectionMessage}`
			: `Votre proposition pour "${listingTitle}" a été refusée.`;

		await supabase.from('notifications').insert({
			target_user_ids: [proposerId],
			target_type: 'users',
			type: 'marketplace_proposal_rejected',
			title: 'Proposition refusée',
			message,
			action_url: `/dashboard/student/marketplace?tab=proposals`,
			action_label: 'Voir',
			priority: 'normal'
		});
	} catch (error) {
		console.error('Failed to create rejection notification:', error);
	}
}

/**
 * Create notification when trade is completed
 *
 * @param supabase - Supabase client
 * @param userId - ID of the user to notify
 * @param partnerName - Name of the trade partner
 * @param tradeId - ID of the completed trade
 */
export async function notifyTradeCompleted(
	supabase: SupabaseClient<Database>,
	userId: string,
	partnerName: string,
	tradeId: string
): Promise<void> {
	try {
		await supabase.from('notifications').insert({
			target_user_ids: [userId],
			target_type: 'users',
			type: 'marketplace_trade_completed',
			title: 'Échange terminé',
			message: `Votre échange avec ${partnerName} est terminé ! Les cartes et gidouilles ont été transférés.`,
			action_url: `/dashboard/student/marketplace?tab=trades&highlight=${tradeId}`,
			action_label: 'Voir',
			priority: 'high'
		});
	} catch (error) {
		console.error('Failed to create trade completion notification:', error);
	}
}

/**
 * Create notification when a new offer is made in a trade
 *
 * @param supabase - Supabase client
 * @param recipientId - ID of the user to notify
 * @param offererId - ID of the user who made the offer
 * @param tradeId - ID of the trade
 */
export async function notifyNewTradeOffer(
	supabase: SupabaseClient<Database>,
	recipientId: string,
	offererId: string,
	tradeId: string
): Promise<void> {
	try {
		// Get offerer's name for notification
		const { data: offererProfile } = await supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', offererId)
			.single();

		const offererName = offererProfile
			? `${offererProfile.firstname || ''} ${offererProfile.lastname || ''}`.trim() || 'Un élève'
			: 'Un élève';

		await supabase.from('notifications').insert({
			target_user_ids: [recipientId],
			target_type: 'users',
			type: 'marketplace_trade_offer',
			title: 'Nouvelle offre',
			message: `${offererName} a fait une nouvelle offre dans votre échange`,
			action_url: `/dashboard/student/marketplace?tab=trades&highlight=${tradeId}`,
			action_label: 'Voir',
			priority: 'normal'
		});
	} catch (error) {
		console.error('Failed to create trade offer notification:', error);
	}
}
