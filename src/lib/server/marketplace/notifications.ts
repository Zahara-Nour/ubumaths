/**
 * Marketplace Notification Helpers
 *
 * Helpers for creating marketplace-specific notifications that integrate
 * with the existing notification system and notificationsRealtimeManager.
 *
 * All notifications are inserted into the `notifications` table and will
 * be automatically broadcast to users via the notificationsRealtimeManager.
 *
 * Écrites par le client service (`insertSystemNotification`) : la base refuse les
 * notifications système aux comptes connectés.
 *
 * Note: notifications.type is constrained to 'info', 'alert', 'announcement', 'reminder'.
 * We use 'info' for all marketplace notifications and distinguish via system_event_type.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { insertSystemNotification } from '$lib/server/notifications';
import { escapeHtml } from '$lib/utils/html-escape';

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
		const { data: proposerProfile, error: proposerError } = await supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', proposerId)
			.single();

		// Le repli « Un élève » existe déjà et convient : la notification part,
		// simplement sans le prénom. On laisse néanmoins la trace.
		if (proposerError) {
			console.error('[marketplace] Nom du proposant illisible :', proposerError);
		}

		const proposerName = proposerProfile
			? `${proposerProfile.firstname || ''} ${proposerProfile.lastname || ''}`.trim() || 'Un élève'
			: 'Un élève';

		const { error: insertError } = await insertSystemNotification({
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
		if (insertError) {
			console.error('[marketplace] Notification non créée :', insertError);
		}
	} catch (error) {
		console.error('Failed to create proposal notification:', error);
	}
}

/**
 * Create notification when proposal is accepted
 */
export async function notifyProposalAccepted(
	proposerId: string,
	listingTitle: string,
	tradeId: string
): Promise<void> {
	try {
		const { error: insertError } = await insertSystemNotification({
			target_user_ids: [proposerId],
			target_type: 'users',
			type: 'info',
			system_event_type: 'marketplace_proposal_accepted',
			title: 'Proposition acceptée',
			message: `Votre proposition pour "${listingTitle}" a été acceptée ! L'échange est terminé.`,
			action_url: `/dashboard/student/marketplace?tab=trades&highlight=${tradeId}`,
			action_label: 'Voir',
			priority: 'important'
		});
		if (insertError) {
			console.error('[marketplace] Notification non créée :', insertError);
		}
	} catch (error) {
		console.error('Failed to create acceptance notification:', error);
	}
}

/**
 * Create notification when proposal is rejected
 */
export async function notifyProposalRejected(
	proposerId: string,
	listingTitle: string,
	rejectionMessage?: string
): Promise<void> {
	try {
		const message = rejectionMessage
			? `Votre proposition pour "${listingTitle}" a été refusée. Message: ${escapeHtml(rejectionMessage)}`
			: `Votre proposition pour "${listingTitle}" a été refusée.`;

		const { error: insertError } = await insertSystemNotification({
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
		if (insertError) {
			console.error('[marketplace] Notification non créée :', insertError);
		}
	} catch (error) {
		console.error('Failed to create rejection notification:', error);
	}
}

/**
 * Create notification when trade is completed
 */
export async function notifyTradeCompleted(
	userId: string,
	partnerName: string,
	tradeId: string
): Promise<void> {
	try {
		const { error: insertError } = await insertSystemNotification({
			target_user_ids: [userId],
			target_type: 'users',
			type: 'info',
			system_event_type: 'marketplace_trade_completed',
			title: 'Échange terminé',
			message: `Votre échange avec ${partnerName} est terminé ! Les cartes et gidouilles ont été transférés.`,
			action_url: `/dashboard/student/marketplace?tab=trades&highlight=${tradeId}`,
			action_label: 'Voir',
			priority: 'important'
		});
		if (insertError) {
			console.error('[marketplace] Notification non créée :', insertError);
		}
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
		const { data: offererProfile, error: offererError } = await supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', offererId)
			.single();

		if (offererError) {
			console.error('[marketplace] Nom de l’offrant illisible :', offererError);
		}

		const offererName = offererProfile
			? `${offererProfile.firstname || ''} ${offererProfile.lastname || ''}`.trim() || 'Un élève'
			: 'Un élève';

		const { error: insertError } = await insertSystemNotification({
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
		if (insertError) {
			console.error('[marketplace] Notification non créée :', insertError);
		}
	} catch (error) {
		console.error('Failed to create trade offer notification:', error);
	}
}
