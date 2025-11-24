/**
 * Markdown Utilities
 * ==================
 *
 * Shared utility functions for markdown components.
 *
 * @module components/markdown/utils
 */

/**
 * Escape HTML special characters to prevent XSS attacks.
 *
 * This function MUST be called before rendering any user-provided
 * content with {@html} directive.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for HTML rendering
 *
 * @example
 * ```typescript
 * import { escapeHtml } from './utils';
 *
 * const userInput = '<script>alert("xss")</script>';
 * const safe = escapeHtml(userInput);
 * // Result: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
