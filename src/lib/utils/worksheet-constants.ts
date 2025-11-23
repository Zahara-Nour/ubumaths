/**
 * Shared constants and utilities for worksheet views
 */

import type { WorksheetType, WorksheetStatus } from '$lib/types/worksheets';
import { FileText, ClipboardCheck, BookOpen, HelpCircle, Home } from 'lucide-svelte';

// =============================================================================
// TYPE AND STATUS OPTIONS (for form selects)
// =============================================================================

/**
 * Worksheet type options for select dropdowns
 */
export const WORKSHEET_TYPE_OPTIONS = [
	{ value: 'worksheet', label: "Feuille d'exercices" },
	{ value: 'assessment', label: 'Evaluation' },
	{ value: 'exam', label: 'Examen' },
	{ value: 'quiz', label: 'Quiz' },
	{ value: 'homework', label: 'Devoirs' }
] as const;

export type WorksheetTypeOption = (typeof WORKSHEET_TYPE_OPTIONS)[number];

/**
 * Numbering style options for select dropdowns
 */
export const NUMBERING_STYLE_OPTIONS = [
	{ value: 'numeric', label: '1, 2, 3...' },
	{ value: 'alphabetic', label: 'A, B, C...' },
	{ value: 'roman', label: 'I, II, III...' }
] as const;

export type NumberingStyleOption = (typeof NUMBERING_STYLE_OPTIONS)[number];

/**
 * Page layout options for select dropdowns
 */
export const PAGE_LAYOUT_OPTIONS = [
	{ value: 'A4', label: 'A4' },
	{ value: 'Letter', label: 'Letter' }
] as const;

export type PageLayoutOption = (typeof PAGE_LAYOUT_OPTIONS)[number];

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
	quiz: HelpCircle,
	homework: Home
};

/**
 * Human-readable labels for worksheet types
 */
export const WORKSHEET_TYPE_LABELS: Record<WorksheetType, string> = {
	worksheet: "Feuille d'exercices",
	assessment: 'Evaluation',
	exam: 'Examen',
	quiz: 'Quiz',
	homework: 'Devoirs'
};

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
 * Format date for display with French locale
 *
 * @param dateString - ISO timestamp string or null
 * @returns Formatted date string or '-' if null
 *
 * @example
 * ```typescript
 * formatDate('2024-01-20T15:30:00Z') // "20 janvier 2024 15:30"
 * formatDate(null) // "-"
 * ```
 */
export function formatDate(dateString: string | null): string {
	if (!dateString) return '-';
	const date = new Date(dateString);
	return date.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Format duration in minutes to human-readable string
 *
 * @param minutes - Duration in minutes or null
 * @returns Formatted duration string or '-' if null
 *
 * @example
 * ```typescript
 * formatDuration(45) // "45 min"
 * formatDuration(90) // "1h 30min"
 * formatDuration(60) // "1h"
 * formatDuration(null) // "-"
 * ```
 */
export function formatDuration(minutes: number | null): string {
	if (!minutes) return '-';
	if (minutes < 60) return `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
