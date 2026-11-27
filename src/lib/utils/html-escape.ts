/**
 * HTML Entity Escaping
 *
 * SECURITY: Escape user-controlled data BEFORE interpolating into HTML templates.
 * This is defense-in-depth (primary defense is DOMPurify sanitization).
 *
 * WHY NEEDED:
 * - Template literals construct HTML before sanitization
 * - User can inject HTML during template construction
 * - Example: name = "</strong><script>xss</script><strong>"
 *
 * USAGE:
 * ```typescript
 * // ❌ UNSAFE
 * message = `<p><strong>${teacherName}</strong></p>`;
 *
 * // ✅ SAFE
 * message = `<p><strong>${escapeHtml(teacherName)}</strong></p>`;
 * ```
 */

/**
 * Escape HTML entities to prevent injection
 *
 * Converts:
 * - `<` → `&lt;`
 * - `>` → `&gt;`
 * - `&` → `&amp;`
 * - `"` → `&quot;`
 * - `'` → `&#039;`
 *
 * @param unsafe - Untrusted string from user/database
 * @returns HTML-escaped safe string
 */
export function escapeHtml(unsafe: string | null | undefined): string {
	// Handle null/undefined
	if (unsafe === null || unsafe === undefined) {
		return '';
	}

	// Handle non-string (numbers, booleans, objects)
	if (typeof unsafe !== 'string') {
		return String(unsafe);
	}

	// Escape HTML entities
	// IMPORTANT: & must be first to avoid double-escaping
	return unsafe
		.replace(/&/g, '&amp;') // MUST be first!
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
