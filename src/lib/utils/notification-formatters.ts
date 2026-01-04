/**
 * Notification formatting utilities
 * Shared between client and server for formatting notification messages from metadata
 */

/**
 * Daily changes data structure (matches pg_cron metadata format)
 */
export interface DailySummaryMetadata {
	class_name: string;
	summary_date: string; // ISO date string (YYYY-MM-DD)
	gidouilles_gained: number;
	gidouilles_lost: number;
	bonus_gained: number;
	bonus_used: number;
	warnings_issued: number;
	warnings_removed: number;
	vip_cards_gained: number;
	vip_cards_used: number;
}

/**
 * Format a date for display in French locale
 *
 * @example
 * formatDateForDisplay('2025-11-13') // "13 novembre 2025"
 * formatDateForDisplay(new Date('2025-11-13')) // "13 novembre 2025"
 *
 * @param date - Date string (ISO format) or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: string | Date, locale: string = 'fr-FR'): string {
	try {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleDateString(locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	} catch {
		// Fallback to ISO string if formatting fails
		return typeof date === 'string' ? date : date.toISOString().split('T')[0];
	}
}

/**
 * Format daily summary from metadata as markdown text with emojis
 * Only includes lines for non-zero changes
 *
 * @example
 * ```
 * 📊 Bilan du 13 novembre 2025 - Mathématiques
 *
 * 🪙 Gidouilles : +15 gagnées, -3 perdues (Total : +12)
 * ⚠️ Avertissements : 1 reçu
 * 🎴 Cartes VIP : 2 gagnées, 1 utilisée
 * ⭐ Bonus : +5 gagnés
 * ```
 *
 * @param metadata - Daily summary metadata from notification
 * @returns Formatted markdown string
 */
export function formatDailySummaryFromMetadata(metadata: DailySummaryMetadata): string {
	const formattedDate = formatDateForDisplay(metadata.summary_date);
	const lines: string[] = [];

	// Calculate net changes
	const netGidouilles = metadata.gidouilles_gained - metadata.gidouilles_lost;
	const netBonus = metadata.bonus_gained - metadata.bonus_used;

	// Gidouilles
	if (metadata.gidouilles_gained > 0 || metadata.gidouilles_lost > 0) {
		let gidouillesLine = '🪙 Gidouilles : ';
		const parts: string[] = [];

		if (metadata.gidouilles_gained > 0) {
			parts.push(`+${metadata.gidouilles_gained} gagnées`);
		}
		if (metadata.gidouilles_lost > 0) {
			parts.push(`-${metadata.gidouilles_lost} perdues`);
		}

		gidouillesLine += parts.join(', ');

		// Show net change if both gains and losses
		if (metadata.gidouilles_gained > 0 && metadata.gidouilles_lost > 0) {
			const sign = netGidouilles >= 0 ? '+' : '';
			gidouillesLine += ` (Total : ${sign}${netGidouilles})`;
		}

		lines.push(gidouillesLine);
	}

	// Warnings
	if (metadata.warnings_issued > 0 || metadata.warnings_removed > 0) {
		let warningsLine = '⚠️ Avertissements : ';
		const parts: string[] = [];

		if (metadata.warnings_issued > 0) {
			parts.push(
				`${metadata.warnings_issued} ${metadata.warnings_issued === 1 ? 'reçu' : 'reçus'}`
			);
		}
		if (metadata.warnings_removed > 0) {
			parts.push(
				`${metadata.warnings_removed} ${metadata.warnings_removed === 1 ? 'retiré' : 'retirés'}`
			);
		}

		warningsLine += parts.join(', ');
		lines.push(warningsLine);
	}

	// VIP Cards
	if (metadata.vip_cards_gained > 0 || metadata.vip_cards_used > 0) {
		let vipLine = '🎴 Cartes VIP : ';
		const parts: string[] = [];

		if (metadata.vip_cards_gained > 0) {
			parts.push(
				`${metadata.vip_cards_gained} ${metadata.vip_cards_gained === 1 ? 'gagnée' : 'gagnées'}`
			);
		}
		if (metadata.vip_cards_used > 0) {
			parts.push(
				`${metadata.vip_cards_used} ${metadata.vip_cards_used === 1 ? 'utilisée' : 'utilisées'}`
			);
		}

		vipLine += parts.join(', ');
		lines.push(vipLine);
	}

	// Bonus
	if (metadata.bonus_gained > 0 || metadata.bonus_used > 0) {
		let bonusLine = '⭐ Bonus : ';
		const parts: string[] = [];

		if (metadata.bonus_gained > 0) {
			parts.push(`+${metadata.bonus_gained} ${metadata.bonus_gained === 1 ? 'gagné' : 'gagnés'}`);
		}
		if (metadata.bonus_used > 0) {
			parts.push(`-${metadata.bonus_used} ${metadata.bonus_used === 1 ? 'utilisé' : 'utilisés'}`);
		}

		bonusLine += parts.join(', ');

		// Show net change if both gains and uses
		if (metadata.bonus_gained > 0 && metadata.bonus_used > 0) {
			const sign = netBonus >= 0 ? '+' : '';
			bonusLine += ` (Total : ${sign}${netBonus})`;
		}

		lines.push(bonusLine);
	}

	// Build final message
	if (lines.length === 0) {
		return `📊 Bilan du ${formattedDate} - ${metadata.class_name}\n\nAucune activité enregistrée.`;
	}

	return `📊 Bilan du ${formattedDate} - ${metadata.class_name}\n\n${lines.join('\n')}`;
}

/**
 * Type guard to check if metadata is a valid DailySummaryMetadata
 */
export function isDailySummaryMetadata(metadata: unknown): metadata is DailySummaryMetadata {
	if (!metadata || typeof metadata !== 'object') return false;

	const m = metadata as Record<string, unknown>;

	return (
		typeof m.class_name === 'string' &&
		typeof m.summary_date === 'string' &&
		typeof m.gidouilles_gained === 'number' &&
		typeof m.gidouilles_lost === 'number' &&
		typeof m.bonus_gained === 'number' &&
		typeof m.bonus_used === 'number' &&
		typeof m.warnings_issued === 'number' &&
		typeof m.warnings_removed === 'number' &&
		typeof m.vip_cards_gained === 'number' &&
		typeof m.vip_cards_used === 'number'
	);
}
