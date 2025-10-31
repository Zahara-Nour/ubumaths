/**
 * Error Formatting Utilities
 * ==========================
 *
 * User-facing error message formatting and logging.
 *
 * This file provides utilities for:
 * - Formatting errors for user display (French messages)
 * - Logging non-critical errors to console
 *
 * ## When to use this vs errorMonitoring.ts?
 *
 * ### Use `errors.ts` (this file) for:
 * - Formatting errors for user display in UI
 * - Converting technical errors to French messages
 * - Logging non-critical errors to console
 * - Simple error handling in components
 *
 * ### Use `errorMonitoring.ts` for:
 * - Capturing errors for server-side logging
 * - Error tracking and analytics
 * - Client-side error reporting (browser errors)
 * - Performance monitoring
 * - Production error monitoring
 *
 * ## Error Severity
 *
 * For error severity levels, import from errorMonitoring.ts:
 * ```typescript
 * import type { ErrorSeverity } from '$lib/utils/errorMonitoring';
 * // 'info' | 'warning' | 'error' | 'critical'
 * ```
 *
 * @module utils/errors
 */

/**
 * Format error messages for user display
 *
 * Extracts meaningful messages from various error types and
 * returns French user-friendly error messages.
 *
 * @param error - Error to format (can be Error, string, or unknown)
 * @returns User-friendly French error message
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const message = formatUserError(error);
 *   toaster.error(message);
 * }
 * ```
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
 * Log non-critical errors to console
 *
 * Use this for errors that don't prevent operation but should be logged.
 * These are console warnings, not sent to error monitoring.
 *
 * @param context - Context string describing where error occurred
 * @param error - Error to log
 *
 * @example
 * ```typescript
 * try {
 *   await optionalFeature();
 * } catch (error) {
 *   logNonCriticalError('Optional Feature', error);
 *   // Continue operation
 * }
 * ```
 */
export function logNonCriticalError(context: string, error: unknown): void {
	console.warn(`[${context}] Non-critical error:`, error);
}
