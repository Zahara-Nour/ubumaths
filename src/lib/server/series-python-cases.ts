/**
 * Modèles d'une série à case « programme Python » (outil 49, Q1)
 * ==============================================================
 *
 * Une case Python se juge dans le navigateur seulement : un contrôle (corrigé par le serveur)
 * ne la tire jamais (`excludePythonCases`). Le prof le voit à la création du contrôle : la
 * page dit quels modèles de la série n'y entreront pas.
 *
 * @module server/series-python-cases
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { SeriesItem } from '#lib/validation/series.ts';
import { hasPythonCase } from '#lib/questions/python/python-case.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('server/series-python-cases');

/**
 * Titres des modèles de la série qui ont une case Python, dans l'ordre de la série. Lecture
 * en échec : aucun titre (un avertissement manqué ne casse pas la page ; le tirage du contrôle
 * les écarte de toute façon).
 */
export async function pythonTemplateTitles(
	supabase: SupabaseClient<Database>,
	items: readonly Pick<SeriesItem, 'templateId'>[]
): Promise<string[]> {
	const ids = [...new Set(items.map((item) => item.templateId))];
	if (ids.length === 0) return [];
	const { data, error } = await supabase
		.from('question_templates')
		.select('id, title, shared, variations')
		.in('id', ids);
	if (error) {
		logger.error('[pythonTemplateTitles] Modèles illisibles :', error);
		return [];
	}
	const byId = new Map((data ?? []).map((row) => [row.id, row]));
	return ids.flatMap((id) => {
		const row = byId.get(id);
		return row && hasPythonCase(row) ? [row.title] : [];
	});
}
