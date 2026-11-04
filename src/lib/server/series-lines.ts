/**
 * Composition enregistrée d'une série → lignes `{ templateId, quantity, delay }`
 * ============================================================================
 *
 * `series.categories` porte la nouvelle forme (ADR 0035) ou, tant que la
 * conversion (lot 2b) n'est pas passée, l'ancienne (catégorie). Toute lecture
 * serveur d'une composition passe par ici : les anciennes lignes sont résolues
 * vers leur modèle publié en UNE requête, sous la RLS du client donné.
 *
 * @module server/series-lines
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	legacyCategoriesOf,
	legacyTemplatesFilter,
	resolveSeriesLines,
	storedSeriesLinesSchema,
	type LegacyResolvableTemplate,
	type StoredSeriesLine
} from '$lib/questions/series-legacy';
import type { SeriesItem } from '$lib/validation/series';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/series-lines');

// Types
type SB = SupabaseClient<Database>;

/** Composition relue : les lignes, et le nombre d'anciennes lignes sans modèle */
export interface ReadSeries {
	items: SeriesItem[];
	unresolved: number;
}

export class SeriesLinesError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SeriesLinesError';
	}
}

// Constantes

/** Modèles lus au plus pour résoudre d'anciennes lignes (50 lignes × quelques séries) */
const MAX_LEGACY_TEMPLATES = 1000;

// Functions

/** Composition brute → lignes enregistrées, ou `null` si illisible (tracé) */
export function parseStoredSeries(id: string, raw: unknown): StoredSeriesLine[] | null {
	const parsed = storedSeriesLinesSchema.safeParse(raw);
	if (!parsed.success) {
		logger.error('[series-lines] Composition illisible pour', id);
		return null;
	}
	return parsed.data;
}

/**
 * Modèles publiés des anciennes lignes, en une requête (vide si aucune).
 * Lève `SeriesLinesError` si la lecture échoue : une panne ne doit pas se lire
 * « modèle retiré ».
 */
export async function loadLegacyTemplates(
	supabase: SB,
	lines: readonly StoredSeriesLine[]
): Promise<LegacyResolvableTemplate[]> {
	const categories = legacyCategoriesOf(lines);
	if (categories.length === 0) return [];
	const { data, error } = await supabase
		.from('question_templates')
		.select('id, theme, domain, subdomain, level')
		.eq('status', 'published')
		.or(legacyTemplatesFilter(categories))
		.limit(MAX_LEGACY_TEMPLATES);
	if (error) throw new SeriesLinesError(error.message);
	return data ?? [];
}

/**
 * Compositions brutes de plusieurs séries → lignes, par id. Une composition
 * illisible est absente du résultat (tracée).
 */
export async function readStoredSeriesMany(
	supabase: SB,
	rows: ReadonlyArray<{ id: string; categories: unknown }>
): Promise<Map<string, ReadSeries>> {
	const parsed = new Map<string, StoredSeriesLine[]>();
	for (const row of rows) {
		const lines = parseStoredSeries(row.id, row.categories);
		if (lines) parsed.set(row.id, lines);
	}

	const templates = await loadLegacyTemplates(supabase, [...parsed.values()].flat());
	const result = new Map<string, ReadSeries>();
	for (const [id, lines] of parsed) {
		const read = resolveSeriesLines(lines, templates);
		if (read.unresolved > 0) {
			logger.warn(`[series-lines] ${read.unresolved} ancienne(s) ligne(s) sans modèle pour`, id);
		}
		result.set(id, read);
	}
	return result;
}

/** Composition brute d'une série → lignes, ou `null` si illisible */
export async function readStoredSeries(
	supabase: SB,
	id: string,
	raw: unknown
): Promise<ReadSeries | null> {
	const read = await readStoredSeriesMany(supabase, [{ id, categories: raw }]);
	return read.get(id) ?? null;
}
