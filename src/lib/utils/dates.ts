/**
 * Date and deadline utilities for Exercise Assignment system
 */

import { differenceInDays, isPast, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DEADLINE_WARNING_DAYS } from '$lib/constants/deadlines';

/**
 * Check if deadline has passed (considers timezone)
 */
export function isDeadlinePassed(deadline: string | null | undefined): boolean {
	if (!deadline) return false;
	return isPast(new Date(deadline));
}

/**
 * Check if deadline is soon (within DEADLINE_WARNING_DAYS)
 */
export function isDeadlineSoon(deadline: string | null | undefined): boolean {
	if (!deadline) return false;
	const days = differenceInDays(new Date(deadline), new Date());
	return days >= 0 && days <= DEADLINE_WARNING_DAYS;
}

/**
 * Format deadline for display (French locale)
 *
 * @param deadline - ISO timestamp string (or null)
 * @param mode - Display mode: 'compact' (default) or 'detailed'
 * @returns Formatted deadline string
 *
 * @example Compact mode (default)
 * ```typescript
 * formatDeadline('2024-01-20T23:59:59Z') // "Dans 5 jours"
 * formatDeadline('2024-01-20T23:59:59Z', 'compact') // "5j"
 * ```
 *
 * @example Detailed mode
 * ```typescript
 * formatDeadline('2024-01-20T23:59:59Z', 'detailed') // "Dans 5 jours"
 * formatDeadline(null, 'detailed') // "Aucune limite"
 * ```
 */
export function formatDeadline(
	deadline: string | null,
	mode: 'compact' | 'detailed' = 'compact'
): string {
	if (!deadline) {
		return mode === 'detailed' ? 'Aucune limite' : 'Aucune limite';
	}

	const date = new Date(deadline);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

	// Expired
	if (diffMs < 0) {
		return mode === 'detailed' ? 'Expiré' : 'Échue';
	}

	// Less than 24 hours
	if (diffHours < 24) {
		if (diffHours === 0) return "Aujourd'hui";
		return mode === 'detailed' ? `Plus que ${diffHours}h` : `${diffHours}h`;
	}

	// Tomorrow
	if (diffDays === 1) {
		return 'Demain';
	}

	// Within a week
	if (diffDays < 7) {
		return mode === 'detailed' ? `Dans ${diffDays} jours` : `${diffDays}j`;
	}

	// More than a week
	if (mode === 'detailed') {
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	// Compact: show date
	return format(date, 'dd/MM', { locale: fr });
}

/**
 * Format deadline with full context (for tooltips and detailed displays)
 */
export function formatDeadlineFull(deadline: string): string {
	const date = new Date(deadline);
	return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Get deadline status (passed, soon, or normal)
 */
export function getDeadlineStatus(deadline: string): 'passed' | 'soon' | 'normal' {
	if (isDeadlinePassed(deadline)) return 'passed';
	if (isDeadlineSoon(deadline)) return 'soon';
	return 'normal';
}
