/**
 * Fuzzy Text Validator
 * ====================
 *
 * Provides fuzzy matching for text-type blanks in fill_in_blanks questions.
 * Handles accent-insensitive, case-insensitive matching with Levenshtein tolerance.
 *
 * Rules:
 * - Words with 1-2 characters: exact match required (after normalization)
 * - Words with 3+ characters: Levenshtein distance ≤ 1 accepted
 * - Normalization: NFD accent stripping + lowercase + trim
 *
 * @module utils/fuzzy-text-validator
 */

/**
 * Normalize text for comparison.
 *
 * Applies: NFD decomposition → strip combining diacritical marks → lowercase → trim.
 *
 * @param text - Input text
 * @returns Normalized text (no accents, lowercase, trimmed)
 */
export function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}

/**
 * Compute the Levenshtein distance between two strings.
 *
 * Uses the classic dynamic programming algorithm (O(m*n) time, O(min(m,n)) space).
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (minimum insertions + deletions + substitutions)
 */
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Use shorter string as "columns" for space optimization
	if (a.length > b.length) {
		[a, b] = [b, a];
	}

	const m = a.length;
	const n = b.length;

	// Single row DP
	let prev = new Array<number>(m + 1);
	let curr = new Array<number>(m + 1);

	for (let j = 0; j <= m; j++) {
		prev[j] = j;
	}

	for (let i = 1; i <= n; i++) {
		curr[0] = i;
		for (let j = 1; j <= m; j++) {
			const cost = a[j - 1] === b[i - 1] ? 0 : 1;
			curr[j] = Math.min(
				curr[j - 1] + 1, // insertion
				prev[j] + 1, // deletion
				prev[j - 1] + cost // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[m];
}

/**
 * Check if a user's text answer matches the expected answer with fuzzy tolerance.
 *
 * After normalization (accent strip + lowercase + trim):
 * - Words with 1-2 characters: exact match required
 * - Words with 3+ characters: Levenshtein distance ≤ 1 accepted
 *
 * @param userAnswer - User's text answer
 * @param expectedAnswer - Expected correct answer
 * @returns true if the answer matches within tolerance
 */
export function fuzzyTextMatch(userAnswer: string, expectedAnswer: string): boolean {
	const normalizedUser = normalizeText(userAnswer);
	const normalizedExpected = normalizeText(expectedAnswer);

	// Exact match after normalization
	if (normalizedUser === normalizedExpected) return true;

	// For short expected answers (1-2 chars), require exact match
	if (normalizedExpected.length <= 2) return false;

	// For longer words, allow Levenshtein distance ≤ 1
	return levenshteinDistance(normalizedUser, normalizedExpected) <= 1;
}
