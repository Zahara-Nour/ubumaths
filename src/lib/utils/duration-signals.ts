/**
 * Lecture des durées trop courtes depuis le panier (chantier
 * `durees-trop-courtes`, PR 2). Un échec rend null : pas de marque, le panier
 * reste (la page ne dépend pas du signal).
 */

import { DURATION_SIGNALS_MAX_TEMPLATES, type DurationSignals } from '$lib/types/duration-signals';

// Functions

/** Forme reçue : modèle → liste d'entrées ; le reste est ignoré */
function isDurationSignals(value: unknown): value is DurationSignals {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every(Array.isArray)
	);
}

export async function fetchDurationSignals(
	templateIds: readonly string[],
	fetchFn: typeof fetch = fetch
): Promise<DurationSignals | null> {
	const ids = [...new Set(templateIds)].slice(0, DURATION_SIGNALS_MAX_TEMPLATES);
	if (ids.length === 0) return {};
	try {
		const params = new URLSearchParams({ templates: ids.join(',') });
		const response = await fetchFn(`/api/series/duration-signals?${params}`);
		if (!response.ok) return null;
		const body: unknown = await response.json();
		return isDurationSignals(body) ? body : null;
	} catch {
		return null;
	}
}
