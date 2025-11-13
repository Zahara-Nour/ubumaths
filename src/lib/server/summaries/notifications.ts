/**
 * Create and format notification messages for summaries and rewards
 * Handles formatting and insertion of system notifications
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { DailyChanges, NotificationInsert } from './types';
import { formatDateForDisplay } from './timezone-utils';

type DbClient = SupabaseClient<Database>;

/**
 * Format daily summary as markdown text with emojis
 * Only includes lines for non-zero changes
 *
 * @example
 * ```
 * 📊 Bilan du 13 novembre - Mathématiques
 *
 * 🪙 Gidouilles : +15 gagnées, -3 perdues (Total : +12)
 * ⚠️ Avertissements : 1 reçu
 * 🎴 Cartes VIP : 2 gagnées, 1 utilisée
 * ⭐ Bonus : +5 gagnés
 * ```
 *
 * @param className - Name of the class
 * @param date - Date of the summary
 * @param changes - Daily changes object
 * @returns Formatted markdown string
 */
export function formatDailySummary(className: string, date: Date, changes: DailyChanges): string {
	const formattedDate = formatDateForDisplay(date);
	const lines: string[] = [];

	// Calculate net changes
	const netGidouilles = changes.gidouilles_gained - changes.gidouilles_lost;
	const netBonus = changes.bonus_gained - changes.bonus_used;

	// Gidouilles
	if (changes.gidouilles_gained > 0 || changes.gidouilles_lost > 0) {
		let gidouillesLine = '🪙 Gidouilles : ';
		const parts: string[] = [];

		if (changes.gidouilles_gained > 0) {
			parts.push(`+${changes.gidouilles_gained} gagnées`);
		}
		if (changes.gidouilles_lost > 0) {
			parts.push(`-${changes.gidouilles_lost} perdues`);
		}

		gidouillesLine += parts.join(', ');

		// Show net change if both gains and losses
		if (changes.gidouilles_gained > 0 && changes.gidouilles_lost > 0) {
			const sign = netGidouilles >= 0 ? '+' : '';
			gidouillesLine += ` (Total : ${sign}${netGidouilles})`;
		}

		lines.push(gidouillesLine);
	}

	// Warnings
	if (changes.warnings_issued > 0 || changes.warnings_removed > 0) {
		let warningsLine = '⚠️ Avertissements : ';
		const parts: string[] = [];

		if (changes.warnings_issued > 0) {
			parts.push(`${changes.warnings_issued} ${changes.warnings_issued === 1 ? 'reçu' : 'reçus'}`);
		}
		if (changes.warnings_removed > 0) {
			parts.push(
				`${changes.warnings_removed} ${changes.warnings_removed === 1 ? 'retiré' : 'retirés'}`
			);
		}

		warningsLine += parts.join(', ');
		lines.push(warningsLine);
	}

	// VIP Cards
	if (changes.vip_cards_gained > 0 || changes.vip_cards_used > 0) {
		let vipLine = '🎴 Cartes VIP : ';
		const parts: string[] = [];

		if (changes.vip_cards_gained > 0) {
			parts.push(
				`${changes.vip_cards_gained} ${changes.vip_cards_gained === 1 ? 'gagnée' : 'gagnées'}`
			);
		}
		if (changes.vip_cards_used > 0) {
			parts.push(
				`${changes.vip_cards_used} ${changes.vip_cards_used === 1 ? 'utilisée' : 'utilisées'}`
			);
		}

		vipLine += parts.join(', ');
		lines.push(vipLine);
	}

	// Bonus
	if (changes.bonus_gained > 0 || changes.bonus_used > 0) {
		let bonusLine = '⭐ Bonus : ';
		const parts: string[] = [];

		if (changes.bonus_gained > 0) {
			parts.push(`+${changes.bonus_gained} ${changes.bonus_gained === 1 ? 'gagné' : 'gagnés'}`);
		}
		if (changes.bonus_used > 0) {
			parts.push(`-${changes.bonus_used} ${changes.bonus_used === 1 ? 'utilisé' : 'utilisés'}`);
		}

		bonusLine += parts.join(', ');

		// Show net change if both gains and uses
		if (changes.bonus_gained > 0 && changes.bonus_used > 0) {
			const sign = netBonus >= 0 ? '+' : '';
			bonusLine += ` (Total : ${sign}${netBonus})`;
		}

		lines.push(bonusLine);
	}

	// Build final message
	if (lines.length === 0) {
		return `📊 Bilan du ${formattedDate} - ${className}\n\nAucune activité enregistrée.`;
	}

	return `📊 Bilan du ${formattedDate} - ${className}\n\n${lines.join('\n')}`;
}

/**
 * Format weekly reward message
 *
 * @example
 * ```
 * 🏆 Récompense hebdomadaire - Mathématiques
 *
 * Bravo ! Tu as reçu 1 gidouille pour avoir passé la semaine
 * du 9 au 15 novembre sans avertissement.
 *
 * Continue comme ça ! 💪
 * ```
 *
 * @param className - Name of the class
 * @param weekStart - Start of the week
 * @param weekEnd - End of the week
 * @returns Formatted markdown string
 */
export function formatWeeklyReward(className: string, weekStart: Date, weekEnd: Date): string {
	const startStr = formatDateForDisplay(weekStart);
	const endStr = formatDateForDisplay(weekEnd);

	return (
		`🏆 Récompense hebdomadaire - ${className}\n\n` +
		`Bravo ! Tu as reçu 1 gidouille pour avoir passé la semaine ` +
		`du ${startStr} au ${endStr} sans avertissement.\n\n` +
		`Continue comme ça ! 💪`
	);
}

/**
 * Create a system notification for daily summary
 * Inserts notification into the database
 *
 * @param supabase - Supabase client
 * @param studentId - Student UUID
 * @param className - Name of the class
 * @param date - Date of the summary
 * @param changes - Daily changes object
 */
export async function createDailySummaryNotification(
	supabase: DbClient,
	studentId: string,
	className: string,
	date: Date,
	changes: DailyChanges
): Promise<void> {
	try {
		const message = formatDailySummary(className, date, changes);

		const notification: NotificationInsert = {
			title: '📊 Bilan quotidien',
			message,
			type: 'info',
			is_system: true,
			system_event_type: 'daily_summary',
			target_type: 'users',
			target_user_ids: [studentId]
		};

		const { error } = await supabase.from('notifications').insert(notification);

		if (error) {
			console.error('[createDailySummaryNotification] Failed to create notification:', error);
			throw error;
		}

		console.log(`[createDailySummaryNotification] Created notification for student ${studentId}`);
	} catch (error) {
		console.error('[createDailySummaryNotification] Error:', error);
		throw error;
	}
}

/**
 * Create a system notification for weekly reward
 * Inserts notification into the database
 *
 * @param supabase - Supabase client
 * @param studentId - Student UUID
 * @param className - Name of the class
 * @param weekStart - Start of the week
 * @param weekEnd - End of the week
 */
export async function createWeeklyRewardNotification(
	supabase: DbClient,
	studentId: string,
	className: string,
	weekStart: Date,
	weekEnd: Date
): Promise<void> {
	try {
		const message = formatWeeklyReward(className, weekStart, weekEnd);

		const notification: NotificationInsert = {
			title: `🏆 Récompense hebdomadaire`,
			message,
			type: 'success',
			is_system: true,
			system_event_type: 'weekly_reward',
			target_type: 'users',
			target_user_ids: [studentId]
		};

		const { error } = await supabase.from('notifications').insert(notification);

		if (error) {
			console.error('[createWeeklyRewardNotification] Failed to create notification:', error);
			throw error;
		}

		console.log(`[createWeeklyRewardNotification] Created notification for student ${studentId}`);
	} catch (error) {
		console.error('[createWeeklyRewardNotification] Error:', error);
		throw error;
	}
}

/**
 * Get summary of notifications sent for a date range
 * Useful for monitoring and analytics
 *
 * @param supabase - Supabase client
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Object with counts by notification type
 */
export async function getNotificationsSummary(
	supabase: DbClient,
	startDate: Date,
	endDate: Date
): Promise<{ daily_summaries: number; weekly_rewards: number; total: number }> {
	try {
		const { data, error } = await supabase
			.from('notifications')
			.select('system_event_type')
			.eq('is_system', true)
			.in('system_event_type', ['daily_summary', 'weekly_reward'])
			.gte('created_at', startDate.toISOString())
			.lte('created_at', endDate.toISOString());

		if (error) {
			console.error('[getNotificationsSummary] Database error:', error);
			throw error;
		}

		const counts = {
			daily_summaries: 0,
			weekly_rewards: 0,
			total: 0
		};

		if (data) {
			for (const notification of data) {
				if (notification.system_event_type === 'daily_summary') {
					counts.daily_summaries++;
				} else if (notification.system_event_type === 'weekly_reward') {
					counts.weekly_rewards++;
				}
				counts.total++;
			}
		}

		return counts;
	} catch (error) {
		console.error('[getNotificationsSummary] Error:', error);
		throw error;
	}
}
