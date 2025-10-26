/**
 * Error formatting utilities for user-facing error messages
 */

/**
 * Format error messages for user display
 * Extracts meaningful messages from various error types
 */
export function formatUserError(error: unknown): string {
	if (error instanceof Error) {
		// Extract Supabase error details if available
		if ('details' in error) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return (error as any).details || error.message;
		}
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	if (error && typeof error === 'object' && 'message' in error) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return String((error as any).message);
	}

	return "Une erreur inattendue s'est produite";
}

/**
 * Error severity levels for UI feedback
 */
export type ErrorSeverity = 'critical' | 'warning' | 'info';

/**
 * Log non-critical errors to console while allowing operation to continue
 */
export function logNonCriticalError(context: string, error: unknown): void {
	console.warn(`[${context}] Non-critical error:`, error);
}
