/**
 * Hashtags Store
 * ==============
 *
 * Store for predefined hashtags used in the rich text editor.
 * Provides filtering and validation functions for autocomplete.
 *
 * @module stores/hashtags
 */

/**
 * Predefined list of valid hashtags for the educational platform.
 *
 * Categories:
 * - Subject areas: mathematiques, algebre, geometrie, etc.
 * - Difficulty levels: facile, moyen, difficile
 * - Content types: exercice, correction, cours, exemple
 */
const predefinedHashtags: string[] = [
	// Subject areas
	'mathematiques',
	'algebre',
	'geometrie',
	'calcul',
	'fractions',
	'equations',
	'fonctions',
	'probabilites',
	'statistiques',
	'trigonometrie',
	'derivees',
	'integrales',
	'arithmetique',
	'nombres',
	'proportionnalite',
	'pourcentages',
	'puissances',
	'racines',
	'logarithmes',
	'suites',
	'matrices',
	'vecteurs',
	'complexes',
	// Difficulty levels
	'facile',
	'moyen',
	'difficile',
	'expert',
	// Content types
	'exercice',
	'correction',
	'cours',
	'exemple',
	'devoir',
	'controle',
	'revision',
	'entrainement',
	// Grade levels
	'sixieme',
	'cinquieme',
	'quatrieme',
	'troisieme',
	'seconde',
	'premiere',
	'terminale'
];

/**
 * Check if a hashtag is in the predefined list.
 *
 * @param tag - The tag to validate (without # prefix)
 * @returns true if the tag is valid
 *
 * @example
 * isValidHashtag('math'); // true
 * isValidHashtag('unknown'); // false
 */
export function isValidHashtag(tag: string): boolean {
	return predefinedHashtags.includes(tag.toLowerCase());
}

/**
 * Filter hashtags based on a query string.
 *
 * @param query - The search query (partial tag name)
 * @returns Array of matching hashtags
 *
 * @example
 * filterHashtags('ma'); // ['mathematiques', 'matrices']
 * filterHashtags(''); // returns all hashtags
 */
export function filterHashtags(query: string): string[] {
	const q = query.toLowerCase();
	if (!q) {
		return [...predefinedHashtags];
	}
	return predefinedHashtags.filter((tag) => tag.includes(q));
}

/**
 * Get all predefined hashtags.
 *
 * @returns Copy of the predefined hashtags array
 */
export function getAllHashtags(): string[] {
	return [...predefinedHashtags];
}
