/**
 * String utility functions
 */

/**
 * Convert text to URL-safe slug
 *
 * Converts text like "Théorème de Pythagore" to "theoreme-de-pythagore"
 * Used for generating anchor IDs in markdown headers.
 *
 * @param text - The text to slugify
 * @returns URL-safe slug with lowercase letters, numbers, and hyphens
 *
 * @example
 * ```typescript
 * slugify("Hello World!") // "hello-world"
 * slugify("Théorème de Pythagore") // "theoreme-de-pythagore"
 * ```
 */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // accents retirés (é → e)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
