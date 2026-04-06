/**
 * Marketplace Notification Helpers
 *
 * Helpers for creating marketplace-specific notifications that integrate
 * with the existing notification system and notificationsRealtimeManager.
 *
 * All notifications are inserted into the `notifications` table and will
 * be automatically broadcast to users via the notificationsRealtimeManager.
 *
 * Note: notifications.type is constrained to 'info', 'alert', 'announcement', 'reminder'.
 * We use 'info' for all marketplace notifications and distinguish via system_event_type.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Create notification when someone makes a proposal on user's listing
 */
export async function notifyNewProposal(
	supabase: SupabaseClient<Database>,
	listingOwnerId: string,
	proposerId: string,
	listingTitle: string,
	proposalId: string
): Promise<void> {
	try {
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
			type: 'info',
			system_event_type: 'marketplace_proposal',
			title: 'Nouvelle proposition',
			message: `${proposerName} a fait une proposition pour "${listingTitle}"`,
			action_url: `/dashboard/student/marketplace?tab=my-listings&highlight=${proposalId}`,
			action_label: 'Voir',
			priority: 'normal'
		});
	} catch (error) {
		console.error('Failed to create proposal notification:', error);
	}
}

/**
 * Create notification when proposal is accepted
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
			type: 'info',
			system_event_type: 'marketplace_proposal_accepted',
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
			type: 'info',
			system_event_type: 'marketplace_proposal_rejected',
			title: 'Proposition refusée',
			message,
			action_url: '/dashboard/student/marketplace',
			action_label: 'Voir',
			priority: 'normal'
		});
	} catch (error) {
		console.error('Failed to create rejection notification:', error);
	}
}

/**
 * Create notification when trade is completed
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
			type: 'info',
			system_event_type: 'marketplace_trade_completed',
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
 */
export async function notifyNewTradeOffer(
	supabase: SupabaseClient<Database>,
	recipientId: string,
	offererId: string,
	tradeId: string
): Promise<void> {
	try {
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
			type: 'info',
			system_event_type: 'marketplace_trade_offer',
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
