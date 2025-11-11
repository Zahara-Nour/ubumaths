/**
 * Client-Side Notification HTML Sanitization
 *
 * SECURITY: Defense-in-depth secondary layer for notification rendering.
 *
 * WHY CLIENT-SIDE SANITIZATION?
 * - Primary defense: Server sanitization before database storage
 * - Secondary defense (this): Client sanitization before rendering
 * - Protects against database manipulation, migration bugs, or server bypass
 *
 * CONFIGURATION:
 * - Uses shared config from `$lib/utils/sanitize-configs.ts`
 * - IDENTICAL to server configuration (13 tags, 0 attributes)
 * - Single source of truth prevents configuration drift
 *
 * DEFENSE-IN-DEPTH LAYERS:
 * 1. Input validation (Zod schemas) - Server
 * 2. HTML escaping (template strings) - Server
 * 3. Server sanitization (PRIMARY) - Before database INSERT
 * 4. Client sanitization (SECONDARY) - Before rendering (THIS FUNCTION)
 *
 * USAGE:
 * ```svelte
 * <script>
 *   import { sanitizeNotificationHtml } from '$lib/utils/sanitize-notification';
 * </script>
 *
 * {@html sanitizeNotificationHtml(notification.message)}
 * ```
 *
 * NOTE: Do NOT use generic `sanitizeHtml()` from `$lib/utils/sanitize.ts`
 * for notifications. That sanitizer allows 47 tags and 12 attributes (too permissive).
 */

import DOMPurify from 'isomorphic-dompurify';
import { NOTIFICATION_SANITIZE_CONFIG } from './sanitize-configs';

/**
 * Sanitize notification HTML for safe client-side rendering
 *
 * This is the SECONDARY defense layer. Server sanitization is PRIMARY.
 *
 * **What it does**:
 * 1. Strips dangerous tags (script, iframe, object, etc.)
 * 2. Removes ALL attributes (no onclick, onerror, href, style)
 * 3. Keeps only whitelisted safe tags (p, strong, ul, etc.)
 * 4. Preserves text content even if tags are removed
 *
 * **Attack Vectors Blocked**:
 * - `<script>alert('xss')</script>` → removed
 * - `<p onclick="steal()">Text</p>` → `<p>Text</p>`
 * - `<iframe src="evil.com">` → removed
 * - `<img src="track.gif">` → removed
 * - `<a href="javascript:alert(1)">` → `<a>` (href removed, but <a> also not in whitelist)
 * - `<p style="position:fixed">` → `<p>` (style removed)
 *
 * **Safe HTML Preserved**:
 * ```typescript
 * sanitizeNotificationHtml('<p><strong>Bold</strong> text</p>')
 * // → '<p><strong>Bold</strong> text</p>'
 *
 * sanitizeNotificationHtml('Plain text with <em>emphasis</em>')
 * // → 'Plain text with <em>emphasis</em>'
 * ```
 *
 * @param html - Notification message HTML (should already be server-sanitized)
 * @returns Client-sanitized HTML safe for {@html} rendering
 */
export function sanitizeNotificationHtml(html: string): string {
	// Handle null, undefined, empty, or non-string input
	if (!html || typeof html !== 'string') {
		return '';
	}

	// Sanitize using DOMPurify with shared strict configuration
	// SECURITY: This config is IDENTICAL to server-side (defense-in-depth)
	// @ts-expect-error - DOMPurify types don't match perfectly with isomorphic-dompurify
	return DOMPurify.sanitize(html, NOTIFICATION_SANITIZE_CONFIG) as unknown as string;
}
