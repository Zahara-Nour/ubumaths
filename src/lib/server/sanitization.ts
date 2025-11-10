/**
 * Server-Side HTML Sanitization
 *
 * CRITICAL SECURITY: Prevents stored XSS attacks in notifications
 *
 * **Security Context**:
 * - User-submitted HTML is stored in database without sanitization (VULNERABILITY)
 * - Client-side sanitization can be bypassed
 * - Server-side sanitization is the ONLY defense against stored XSS
 *
 * **Configuration**:
 * - Uses shared config from `$lib/utils/sanitize-configs.ts`
 * - Server and client use IDENTICAL configuration (defense-in-depth)
 * - 13 safe tags, 0 attributes, strict whitelist
 *
 * **Attack Vectors Blocked**:
 * - `<script>` tags for JS execution
 * - Event handlers (`onclick`, `onerror`, etc.)
 * - `<iframe>` for clickjacking/phishing
 * - `javascript:` URLs in links
 * - `data:` URLs with malicious payloads
 *
 * **Used By**:
 * - `createNotification()` - Teacher/admin notifications
 * - `createSystemNotification()` - Automated system messages
 * - All auto-notification helpers
 *
 * @module sanitization
 */

import * as DOMPurifyModule from 'isomorphic-dompurify';
import { NOTIFICATION_SANITIZE_CONFIG } from '$lib/utils/sanitize-configs';

// isomorphic-dompurify exports DOMPurify as both default and named export
// Use type assertion to handle both module formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for DOMPurify module compatibility
const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

/**
 * Sanitize notification HTML to prevent XSS attacks
 *
 * **What it does**:
 * 1. Strips dangerous tags (`<script>`, `<iframe>`, `<object>`, etc.)
 * 2. Removes ALL attributes (no `onclick`, `onerror`, `href`, `style`)
 * 3. Keeps only whitelisted safe tags (p, strong, ul, etc.)
 * 4. Preserves text content even if tags are removed
 * 5. Logs when HTML is modified (potential attack attempt)
 *
 * **Examples**:
 * ```typescript
 * // Attack blocked
 * sanitizeNotificationHtml('<script>alert("xss")</script>') // → ""
 * sanitizeNotificationHtml('<p onclick="steal()">Text</p>') // → "<p>Text</p>"
 *
 * // Safe HTML preserved
 * sanitizeNotificationHtml('<p><strong>Bold</strong> text</p>') // → "<p><strong>Bold</strong> text</p>"
 * sanitizeNotificationHtml('Plain text') // → "Plain text"
 * ```
 *
 * **CRITICAL**: This function MUST be called on ALL user-submitted HTML
 * before storing in the database. Never trust client-side sanitization.
 *
 * @param html - Untrusted HTML from user input (notification message field)
 * @returns Sanitized HTML safe for storage and rendering
 */
export function sanitizeNotificationHtml(html: string): string {
	// Handle null, undefined, empty, or non-string input
	if (!html || typeof html !== 'string') {
		return '';
	}

	// Sanitize using DOMPurify with shared strict configuration
	// SECURITY: Configuration is shared between server and client (defense-in-depth)
	const cleaned = DOMPurify.sanitize(html, NOTIFICATION_SANITIZE_CONFIG) as string;

	// Security logging: Detect potential attack attempts
	// If sanitization removed content, log it for security monitoring
	if (cleaned !== html) {
		const originalLength = html.length;
		const cleanedLength = cleaned.length;
		const removed = originalLength - cleanedLength;

		console.warn('[SECURITY] Notification HTML sanitized - potential XSS attempt blocked', {
			original_length: originalLength,
			cleaned_length: cleanedLength,
			removed_bytes: removed,
			removed_percentage: originalLength > 0 ? Math.round((removed / originalLength) * 100) : 0,
			timestamp: new Date().toISOString()
		});

		// Additional logging for debugging (only in development)
		if (process.env.NODE_ENV === 'development') {
			console.warn('[SECURITY] Original HTML (first 200 chars):', html.substring(0, 200));
			console.warn('[SECURITY] Cleaned HTML (first 200 chars):', cleaned.substring(0, 200));
		}
	}

	return cleaned;
}

/**
 * Validate that HTML is safe (no dangerous patterns detected)
 *
 * Use this for pre-validation before sanitization to provide
 * user-friendly error messages.
 *
 * **Note**: This is NOT a replacement for sanitization.
 * Always call `sanitizeNotificationHtml()` regardless of validation result.
 *
 * @param html - HTML to check
 * @returns true if dangerous patterns detected
 */
export function containsDangerousHtml(html: string): boolean {
	if (!html || typeof html !== 'string') {
		return false;
	}

	// Patterns that indicate XSS attempts
	const dangerousPatterns = [
		/<script/i, // <script> tags
		/<iframe/i, // <iframe> for clickjacking
		/<object/i, // <object> for plugin exploits
		/<embed/i, // <embed> for plugin exploits
		/<form/i, // <form> for phishing
		/<input/i, // <input> for phishing
		/<link/i, // <link> for CSS injection
		/<meta/i, // <meta> for redirection
		/javascript:/i, // javascript: protocol
		/data:text\/html/i, // data: URLs with HTML
		/on\w+\s*=/i, // Event handlers (onclick, onerror, onload, etc.)
		/<svg.*onload/i // SVG with onload
	];

	return dangerousPatterns.some((pattern) => pattern.test(html));
}
