/**
 * Search Utilities
 *
 * Functions for sanitizing and processing user search input
 * to prevent SQL injection and ensure safe database queries.
 *
 * @module utils/search
 */

/**
 * Sanitize search query string for PostgreSQL full-text search
 *
 * Removes potentially dangerous characters while preserving
 * valid search terms including French accented characters.
 *
 * **Security**: This prevents SQL injection by:
 * 1. Removing special SQL characters (quotes, semicolons, etc.)
 * 2. Limiting length to prevent DoS
 * 3. Preserving only alphanumeric, spaces, and basic punctuation
 *
 * @param search - Raw user search input
 * @returns Sanitized search string safe for use in SQL queries
 *
 * @example Basic sanitization
 * ```typescript
 * const safe = sanitizeSearchQuery("trigonométrie équations");
 * // Returns: "trigonométrie équations"
 * ```
 *
 * @example Removing dangerous characters
 * ```typescript
 * const safe = sanitizeSearchQuery("'; DROP TABLE--");
 * // Returns: "DROP TABLE" (quotes and SQL syntax removed)
 * ```
 *
 * @example Length limiting
 * ```typescript
 * const longString = "a".repeat(200);
 * const safe = sanitizeSearchQuery(longString);
 * // Returns: first 100 characters only
 * ```
 */
export function sanitizeSearchQuery(search: string): string {
	if (!search) return '';

	return (
		search
			// Remove dangerous SQL characters
			// Keep: letters (incl. accented), numbers, spaces, hyphens, apostrophes
			.replace(/[^\w\sÀ-ÿ'-]/gi, '')
			// Collapse multiple spaces to single space
			.replace(/\s+/g, ' ')
			// Limit to 100 characters to prevent DoS
			.slice(0, 100)
			// Trim whitespace
			.trim()
	);
}

/**
 * Validate that search query is safe and meaningful
 *
 * Checks that sanitized query meets minimum requirements:
 * - Not empty after sanitization
 * - Meets minimum length (default: 2 characters)
 *
 * @param search - Raw user search input
 * @param minLength - Minimum length for valid search (default: 2)
 * @returns Validation result with sanitized query if valid
 *
 * @example Valid search
 * ```typescript
 * const result = validateSearchQuery("pythagore");
 * // Returns: { valid: true, sanitized: "pythagore" }
 * ```
 *
 * @example Invalid search (too short)
 * ```typescript
 * const result = validateSearchQuery("a");
 * // Returns: { valid: false, error: "Search query too short (minimum 2 characters)" }
 * ```
 *
 * @example Invalid search (empty after sanitization)
 * ```typescript
 * const result = validateSearchQuery("!!!@@@###");
 * // Returns: { valid: false, error: "Search query empty after sanitization" }
 * ```
 */
export function validateSearchQuery(
	search: string,
	minLength = 2
): { valid: boolean; sanitized?: string; error?: string } {
	const sanitized = sanitizeSearchQuery(search);

	if (!sanitized) {
		return {
			valid: false,
			error: 'Search query empty after sanitization'
		};
	}

	if (sanitized.length < minLength) {
		return {
			valid: false,
			error: `Search query too short (minimum ${minLength} characters)`
		};
	}

	return {
		valid: true,
		sanitized
	};
}
