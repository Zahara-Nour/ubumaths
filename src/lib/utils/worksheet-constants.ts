/**
 * Shared constants and utilities for worksheet views
 */

import type { WorksheetType, WorksheetStatus } from '#lib/types/worksheets.ts';
import { WORKSHEET_TYPE_LABELS, WORKSHEET_TYPE_ORDER } from '#lib/utils/worksheet-type-labels.ts';
import { FileText, ClipboardCheck, BookOpen, Home } from '@lucide/svelte';

// =============================================================================
// TYPE AND STATUS OPTIONS (for form selects)
// =============================================================================

/**
 * Worksheet type options for select dropdowns
 */
export const WORKSHEET_TYPE_OPTIONS = WORKSHEET_TYPE_ORDER.map((value) => ({
	value,
	label: WORKSHEET_TYPE_LABELS[value]
}));

export type WorksheetTypeOption = (typeof WORKSHEET_TYPE_OPTIONS)[number];

// =============================================================================
// DISPLAY MAPPINGS (icons, labels, variants)
// =============================================================================

/**
 * Icons for each worksheet type
 */
export const WORKSHEET_TYPE_ICONS: Record<WorksheetType, typeof FileText> = {
	worksheet: FileText,
	assessment: ClipboardCheck,
	exam: BookOpen,
	homework: Home
};

// Table unique : src/lib/utils/worksheet-type-labels.ts
export { WORKSHEET_TYPE_LABELS };

/**
 * Badge variants for each worksheet status
 */
export const WORKSHEET_STATUS_VARIANTS: Record<
	WorksheetStatus,
	'default' | 'secondary' | 'outline'
> = {
	draft: 'secondary',
	published: 'default',
	archived: 'outline'
};

/**
 * Human-readable labels for worksheet statuses
 */
export const WORKSHEET_STATUS_LABELS: Record<WorksheetStatus, string> = {
	draft: 'Brouillon',
	published: 'Publie',
	archived: 'Archive'
};

/**
 * Human-readable labels for assignment statuses
 */
export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
	draft: 'Brouillon',
	active: 'Actif',
	completed: 'Termine',
	cancelled: 'Annule'
};

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format duration in minutes to human-readable string
 * (`formatDuration` de `utils/format.ts`, elle, attend des secondes)
 *
 * @param minutes - Duration in minutes or null
 * @returns Formatted duration string or '-' if null
 *
 * @example
 * ```typescript
 * formatMinutes(45) // "45 min"
 * formatMinutes(90) // "1h 30min"
 * formatMinutes(60) // "1h"
 * formatMinutes(null) // "-"
 * ```
 */
export function formatMinutes(minutes: number | null): string {
	if (!minutes) return '-';
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
