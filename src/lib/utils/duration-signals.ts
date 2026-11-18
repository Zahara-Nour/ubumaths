/**
 * Lecture des durées trop courtes (chantier `durees-trop-courtes`, PR 2) et des
 * durées observées (chantier `durees-ajustees`) depuis le panier. Un échec rend
 * null : ni marque ni suggestion, le panier reste (la page n'en dépend pas).
 */

import {
	DURATION_SIGNALS_MAX_TEMPLATES,
	type DurationSignals,
	type DurationSignalsResponse,
	type ObservedDurations
} from '#lib/types/duration-signals.ts';

// Functions

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Modèle → liste d'entrées */
function isDurationSignals(value: unknown): value is DurationSignals {
	return isRecord(value) && Object.values(value).every(Array.isArray);
}

/** Modèle → { seconds, students } */
function isObservedDurations(value: unknown): value is ObservedDurations {
	return (
		isRecord(value) &&
		Object.values(value).every(
			(entry) =>
				isRecord(entry) && typeof entry.seconds === 'number' && typeof entry.students === 'number'
		)
	);
}

/** Forme reçue : `{ signals, observed }` ; le reste est ignoré */
function isDurationSignalsResponse(value: unknown): value is DurationSignalsResponse {
	return isRecord(value) && isDurationSignals(value.signals) && isObservedDurations(value.observed);
}

export async function fetchDurationSignals(
	templateIds: readonly string[],
	fetchFn: typeof fetch = fetch
): Promise<DurationSignalsResponse | null> {
	const ids = [...new Set(templateIds)].slice(0, DURATION_SIGNALS_MAX_TEMPLATES);
	if (ids.length === 0) return { signals: {}, observed: {} };
	try {
		const params = new URLSearchParams({ templates: ids.join(',') });
		const response = await fetchFn(`/api/series/duration-signals?${params}`);
		if (!response.ok) return null;
		const body: unknown = await response.json();
		return isDurationSignalsResponse(body) ? body : null;
	} catch {
		return null;
	}
}
