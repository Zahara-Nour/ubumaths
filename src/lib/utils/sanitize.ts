/**
 * HTML Sanitization Utility
 *
 * SECURITY: Prevents XSS (Cross-Site Scripting) attacks
 * - Uses DOMPurify for safe HTML sanitization
 * - Whitelist-based approach (only allowed tags/attributes)
 * - Supports math rendering (MathLive)
 * - Safe for user-generated content
 *
 * USAGE:
 * ```svelte
 * <script>
 *   import { sanitizeHtml } from '$lib/utils/sanitize';
 *   let untrustedContent = '<script>alert("xss")</script><p>Safe text</p>';
 * </script>
 *
 * {@html sanitizeHtml(untrustedContent)}
 * ```
 *
 * CRITICAL: ALWAYS use sanitizeHtml() before rendering user-generated HTML with {@html}
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration for educational math content
 * Allows rich text formatting + math expressions
 */
const ALLOWED_TAGS = [
	// Text formatting
	'p',
	'br',
	'strong',
	'b',
	'em',
	'i',
	'u',
	's',
	'strike',
	'del',
	'mark',
	'sub',
	'sup',
	'small',

	// Headings
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',

	// Lists
	'ul',
	'ol',
	'li',

	// Links and media
	'a',
	'img',

	// Tables (for structured data)
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',

	// Math rendering (MathLive)
	'math-field',
	'math-inline',
	'math-display',

	// Structural
	'div',
	'span',
	'blockquote',
	'code',
	'pre'
];

const ALLOWED_ATTR = [
	// Links
	'href',
	'target',
	'rel',

	// Images
	'src',
	'alt',
	'title',
	'width',
	'height',

	// Styling (limited)
	'class',
	'style',

	// MathLive specific
	'read-only',
	'disabled',

	// Table attributes
	'colspan',
	'rowspan',

	// Accessibility
	'aria-label',
	'role'
];

/**
 * Sanitize HTML content for safe rendering
 *
 * @param dirty - Untrusted HTML string
 * @returns Sanitized HTML safe for {@html} rendering
 */
export function sanitizeHtml(dirty: string): string {
	if (!dirty || typeof dirty !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS,
		ALLOWED_ATTR,
		ALLOW_DATA_ATTR: false, // Prevent data-* attributes (potential XSS vector)
		ALLOW_UNKNOWN_PROTOCOLS: false, // Only http:, https:, mailto:
		// Pas de `SAFE_FOR_TEMPLATES` : il efface tout de `{{` au dernier `}}` (formules, variables
		// de modèles) et ne protège que d'un moteur de gabarits qui relirait le HTML dans le
		// navigateur (Angular, Vue), absent ici — Svelte ne relit pas `{@html}` (2026-11-08)
		KEEP_CONTENT: true, // Keep text content even if tags are removed
		RETURN_TRUSTED_TYPE: false // Return string, not TrustedHTML
	});
}

/**
 * Sanitize plain text (strip all HTML)
 * Use for contexts where no HTML should be allowed
 *
 * @param dirty - Untrusted string
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(dirty: string): string {
	if (!dirty || typeof dirty !== 'string') {
		return '';
	}

	return DOMPurify.sanitize(dirty, {
		ALLOWED_TAGS: [], // No tags allowed
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true // Keep text content
	});
}

/** Schémas d'URL autorisés dans un lien ; un lien relatif (sans schéma) passe aussi */
const SAFE_URL_SCHEMES: ReadonlySet<string> = new Set(['http', 'https', 'mailto']);

/**
 * Un lien sûr, ou '#' : schémas autorisés (`SAFE_URL_SCHEMES`) ou lien relatif.
 *
 * @param url - URL string to sanitize
 * @returns The URL unchanged if safe, '#' otherwise
 */
export function sanitizeUrl(url: string | undefined): string {
	if (!url || typeof url !== 'string') {
		return '#';
	}

	// Ce que le NAVIGATEUR lira : il retire espaces et caractères de contrôle en
	// tête, et tabulations / retours à la ligne partout (`java\nscript:` devient
	// `javascript:`). On décide sur cette forme-là, pas sur la chaîne écrite.
	// eslint-disable-next-line no-control-regex
	const normalized = url.replace(/^[\u0000-\u0020]+/, '').replace(/[\t\n\r]/g, '');

	// Un schéma explicite (`xxx:`) doit être dans la liste BLANCHE. Une liste
	// noire (`javascript:`, `data:`…) laisse passer ce qu'on n'a pas prévu.
	const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1].toLowerCase();
	if (scheme !== undefined && !SAFE_URL_SCHEMES.has(scheme)) {
		return '#';
	}

	return url;
}

/**
 * Check if string contains potentially dangerous HTML
 * Use for validation before sanitization
 *
 * @param input - String to check
 * @returns true if input contains script/dangerous tags
 */
export function containsDangerousHtml(input: string): boolean {
	if (!input || typeof input !== 'string') {
		return false;
	}

	// Check for dangerous patterns
	const dangerousPatterns = [
		/<script/i,
		/<iframe/i,
		/<object/i,
		/<embed/i,
		/<link/i,
		/javascript:/i,
		/on\w+\s*=/i, // Event handlers (onclick, onload, etc.)
		/<meta/i
	];

	return dangerousPatterns.some((pattern) => pattern.test(input));
}
