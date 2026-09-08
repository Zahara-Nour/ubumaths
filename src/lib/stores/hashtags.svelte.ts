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
 * Names pulled from the `tags` catalogue, merged into the suggestion list.
 *
 * Phase 4 of the referencing work: until now the editor suggested from a
 * hardcoded list that had no relation whatsoever to the `tags` table, so a
 * hashtag typed in a statement could never match a tag used to file an
 * exercise. Two vocabularies, no bridge.
 *
 * The predefined list below stays as a seed: it is what the editor offers
 * before the catalogue has loaded, and on a page that never loads it. The
 * catalogue is authoritative but not required.
 */
let catalogHashtags: string[] = [];

/** Guards against re-fetching on every editor mount. */
let catalogLoad: Promise<void> | null = null;

/**
 * Hydrate the suggestion list from `/api/tags`, once per page load.
 *
 * Deliberately fire-and-forget and failure-tolerant: a suggestion list is a
 * convenience, and an editor that refuses to open because a tag fetch failed
 * would be a poor trade.
 */
export function loadHashtagCatalog(fetcher: typeof fetch = fetch): Promise<void> {
	catalogLoad ??= (async () => {
		try {
			const response = await fetcher('/api/tags');
			if (!response.ok) return;

			const payload: unknown = await response.json();
			const tags = (payload as { tags?: { name?: unknown }[] }).tags ?? [];

			catalogHashtags = tags
				.map((tag) => (typeof tag.name === 'string' ? tag.name : ''))
				.filter(Boolean);
		} catch {
			// Silence volontaire : on garde la liste de secours.
		}
	})();

	return catalogLoad;
}

/**
 * Suggestion list actually offered: the catalogue plus the seed, deduplicated
 * on the normalised form so « Algèbre » and « algebre » are not both proposed.
 */
function suggestionPool(): string[] {
	const seen = new Map<string, string>();
	for (const name of [...catalogHashtags, ...predefinedHashtags]) {
		const key = name
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
		if (!seen.has(key)) seen.set(key, name);
	}
	return [...seen.values()];
}

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
	const needle = tag.toLowerCase();
	return suggestionPool().some((name) => name.toLowerCase() === needle);
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
	const pool = suggestionPool();
	const q = query
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

	if (!q) return pool;

	// Comparaison sans accent des deux côtés : taper « algebre » doit proposer
	// « Algèbre », sinon le prof crée un doublon que l'index unique refusera.
	return pool.filter((tag) =>
		tag
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.includes(q)
	);
}

/**
 * Get all predefined hashtags.
 *
 * @returns Copy of the predefined hashtags array
 */
export function getAllHashtags(): string[] {
	return suggestionPool();
}
