/**
 * Composition enregistrée d'une série → lignes `{ templateId, quantity, delay }`
 * ============================================================================
 *
 * `series.categories` porte les lignes de modèle (ADR 0035). Toute lecture
 * serveur d'une composition passe par ici : une composition illisible (forme
 * inconnue, ancienne forme d'avant l'ADR) est absente du résultat, et tracée.
 *
 * @module server/series-lines
 */

import { seriesItemsSchema, type SeriesItem } from '$lib/validation/series';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/series-lines');

/** Composition brute → lignes, ou `null` si illisible (tracé) */
export function parseStoredSeries(id: string, raw: unknown): SeriesItem[] | null {
	const parsed = seriesItemsSchema.safeParse(raw);
	if (!parsed.success) {
		logger.error('[series-lines] Composition illisible pour', id);
		return null;
	}
	return parsed.data;
}

/**
 * Compositions brutes de plusieurs séries → lignes, par id. Une composition
 * illisible est absente du résultat (tracée).
 */
export function readStoredSeriesMany(
	rows: ReadonlyArray<{ id: string; categories: unknown }>
): Map<string, SeriesItem[]> {
	const result = new Map<string, SeriesItem[]>();
	for (const row of rows) {
		const items = parseStoredSeries(row.id, row.categories);
		if (items) result.set(row.id, items);
	}
	return result;
}
