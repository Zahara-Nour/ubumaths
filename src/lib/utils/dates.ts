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
 */
export function formatDeadline(deadline: string): string {
	const date = new Date(deadline);
	const days = differenceInDays(date, new Date());

	if (days < 0) return 'Échue';
	if (days === 0) return "Aujourd'hui";
	if (days === 1) return 'Demain';
	if (days <= 7) return `${days}j`;

	// For longer deadlines, show actual date
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
