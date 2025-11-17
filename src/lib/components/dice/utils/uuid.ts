/**
 * UUID Generation Utility
 *
 * Provides cross-environment UUID generation with fallback for non-secure contexts
 */

/**
 * Generate a unique identifier
 *
 * Uses crypto.randomUUID() in secure contexts (HTTPS/localhost),
 * falls back to timestamp + random string in HTTP contexts
 *
 * @returns Unique identifier string
 */
export function generateId(): string {
	// Try native crypto.randomUUID() first (secure contexts only)
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	// Fallback for non-secure contexts (HTTP)
	// Format: timestamp-randomstring (e.g., "1699234567890-k3j9d2a")
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 11);

	return `${timestamp}-${random}`;
}
