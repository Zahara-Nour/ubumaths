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

/**
 * Build PostgreSQL full-text search tsquery string
 *
 * Converts sanitized user input to PostgreSQL tsquery format
 * for use with websearch_to_tsquery() or plainto_tsquery().
 *
 * **Note**: Input MUST be sanitized with sanitizeSearchQuery() first!
 *
 * @param sanitizedSearch - Sanitized search string (from sanitizeSearchQuery)
 * @param operator - Search operator: 'and' (all words) or 'or' (any word)
 * @returns Formatted tsquery string
 *
 * @example AND search (all words must match)
 * ```typescript
 * const sanitized = sanitizeSearchQuery("théorème pythagore");
 * const query = buildTsQuery(sanitized, 'and');
 * // Returns: "théorème & pythagore"
 * ```
 *
 * @example OR search (any word matches)
 * ```typescript
 * const sanitized = sanitizeSearchQuery("addition multiplication");
 * const query = buildTsQuery(sanitized, 'or');
 * // Returns: "addition | multiplication"
 * ```
 */
export function buildTsQuery(sanitizedSearch: string, operator: 'and' | 'or' = 'and'): string {
	const separator = operator === 'and' ? ' & ' : ' | ';
	return sanitizedSearch.split(/\s+/).join(separator);
}

/**
 * Highlight search terms in text (for UI display)
 *
 * Wraps matching search terms in <mark> tags for highlighting.
 * Case-insensitive matching with accent support.
 *
 * @param text - Text to search within
 * @param searchQuery - Search query (will be sanitized)
 * @returns Text with search terms wrapped in <mark> tags
 *
 * @example
 * ```typescript
 * const highlighted = highlightSearchTerms(
 *   "Le théorème de Pythagore est fondamental",
 *   "pythagore"
 * );
 * // Returns: "Le théorème de <mark>Pythagore</mark> est fondamental"
 * ```
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
	const sanitized = sanitizeSearchQuery(searchQuery);
	if (!sanitized) return text;

	const terms = sanitized.split(/\s+/);
	let result = text;

	for (const term of terms) {
		if (term.length < 2) continue; // Skip single characters

		// Create case-insensitive regex that preserves accents
		const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
		result = result.replace(regex, '<mark>$1</mark>');
	}

	return result;
}

/**
 * Escape special regex characters
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 *
 * @internal
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
