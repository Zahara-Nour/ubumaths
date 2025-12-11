/**
 * Exercise slug generator
 * Format: topic-shortid (e.g., "algebre-k8m2n4p7")
 */

// URL-safe characters, excluding ambiguous ones (l, o, 0, 1, I, O)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Generates a short random ID (URL-safe)
 */
function generateShortId(length = 8): string {
	let result = '';
	const randomValues = crypto.getRandomValues(new Uint8Array(length));
	for (let i = 0; i < length; i++) {
		result += ALPHABET[randomValues[i] % ALPHABET.length];
	}
	return result;
}

/**
 * Converts a string to a URL-friendly slug
 */
function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove accents
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // Replace non-alphanum with dash
		.replace(/^-|-$/g, '') // Trim dashes
		.replace(/-{2,}/g, '-'); // Collapse multiple dashes
}

/**
 * Generates a unique slug for an exercise
 * @param topic - Optional topic string (e.g., "Algèbre", "Géométrie plane")
 * @returns Slug in format "topic-shortid" or just "shortid" if no topic
 *
 * @example
 * generateExerciseSlug("Algèbre") // "algebre-k8m2n4p7"
 * generateExerciseSlug("Géométrie plane") // "geometrie-plane-x3v9b2c5"
 * generateExerciseSlug() // "k8m2n4p7"
 * generateExerciseSlug(null) // "k8m2n4p7"
 */
export function generateExerciseSlug(topic?: string | null): string {
	const shortId = generateShortId();

	if (!topic) return shortId;

	const slugTopic = slugify(topic);

	return slugTopic ? `${slugTopic}-${shortId}` : shortId;
}

/**
 * Validates a slug format
 * @returns true if valid slug format
 */
export function isValidSlug(slug: string): boolean {
	// Must be lowercase alphanumeric with dashes, 3-100 chars
	return /^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(slug);
}
