/**
 * Shared Sanitization Configurations
 *
 * SECURITY: Configuration constants for HTML sanitization across server and client.
 *
 * WHY SHARED CONFIG?
 * - Ensures server and client sanitization are identical (defense-in-depth)
 * - Single source of truth prevents configuration drift
 * - If server sanitization is bypassed (database manipulation, migration bug),
 *   client provides identical protection
 *
 * USAGE:
 * ```typescript
 * // Server-side
 * import { NOTIFICATION_SANITIZE_CONFIG } from '$lib/utils/sanitize-configs';
 * const cleaned = DOMPurify.sanitize(html, NOTIFICATION_SANITIZE_CONFIG);
 *
 * // Client-side
 * import { NOTIFICATION_SANITIZE_CONFIG } from '$lib/utils/sanitize-configs';
 * const cleaned = DOMPurify.sanitize(html, NOTIFICATION_SANITIZE_CONFIG);
 * ```
 *
 * @module sanitize-configs
 */

/**
 * Safe HTML tags allowed in notifications
 *
 * Whitelist-based security: Only these 13 tags are preserved.
 * All other tags are stripped, keeping only text content.
 *
 * Tag categories:
 * - Text formatting: p, br, strong, b, em, i, u, mark (8 tags)
 * - Lists: ul, ol, li (3 tags)
 * - Structural: blockquote, hr (2 tags)
 *
 * NOT ALLOWED (examples):
 * - Links: <a> (no href attribute = useless anyway)
 * - Images: <img> (tracking pixels, broken images)
 * - Headings: <h1>-<h6> (UI disruption)
 * - Divs/spans: <div>, <span> (layout manipulation)
 * - Tables: <table> (unnecessary complexity)
 * - Scripts: <script> (XSS)
 * - Iframes: <iframe> (clickjacking)
 */
const NOTIFICATION_ALLOWED_TAGS = [
	// Text formatting
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	'mark',

	// Lists
	'ul',
	'ol',
	'li',

	// Structural
	'blockquote',
	'hr'
] as const;

/**
 * Notification HTML Sanitization Configuration
 *
 * SECURITY HARDENING:
 * - ALLOWED_TAGS: 13 safe tags only (minimal attack surface)
 * - ALLOWED_ATTR: [] - NO attributes allowed (blocks onclick, href, style, class)
 * - ALLOW_DATA_ATTR: false - Blocks data-* attributes (XSS vector)
 * - ALLOW_UNKNOWN_PROTOCOLS: false - Only http:, https:, mailto:
 * - SAFE_FOR_TEMPLATES: true - Extra protection for template injection
 * - KEEP_CONTENT: true - Preserve text even if tags are stripped
 *
 * WHY ZERO ATTRIBUTES?
 * - No onclick/onerror/onload (event handler XSS)
 * - No href (JavaScript URLs, phishing)
 * - No style (UI redressing, CSS injection)
 * - No class (CSS selector exploitation)
 * - No src (tracking pixels, broken images)
 *
 * DEFENSE-IN-DEPTH:
 * - Layer 1: Input validation (Zod schemas)
 * - Layer 2: HTML escaping (template strings)
 * - Layer 3: Server sanitization (PRIMARY - this config)
 * - Layer 4: Client sanitization (SECONDARY - this config)
 */
export const NOTIFICATION_SANITIZE_CONFIG = {
	ALLOWED_TAGS: NOTIFICATION_ALLOWED_TAGS,
	ALLOWED_ATTR: [], // CRITICAL: No attributes = no XSS vectors
	ALLOW_DATA_ATTR: false,
	ALLOW_UNKNOWN_PROTOCOLS: false,
	SAFE_FOR_TEMPLATES: true,
	KEEP_CONTENT: true,
	RETURN_TRUSTED_TYPE: false // Return string, not TrustedHTML
} as const;

/**
 * Type export for notification configuration
 * Use this type when creating custom sanitization configs
 */
export type NotificationSanitizeConfig = typeof NOTIFICATION_SANITIZE_CONFIG;
