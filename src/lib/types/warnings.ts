/**
 * Warning Types - Shared Constants
 * =================================
 * Shared type definitions and constants for the warning system.
 * Can be imported from both client and server code.
 */

/**
 * Warning type enum (database constraint)
 */
export type WarningType = 'C' | 'M' | 'R' | 'T';

/**
 * Human-readable labels for warning types (French)
 */
export const WARNING_TYPE_LABELS: Record<WarningType, string> = {
	C: 'Comportement',
	M: 'Matériel',
	R: 'Retard',
	T: 'Travail'
} as const;

/**
 * Get the label for a warning type
 */
export function getWarningTypeLabel(type: WarningType): string {
	return WARNING_TYPE_LABELS[type];
}
