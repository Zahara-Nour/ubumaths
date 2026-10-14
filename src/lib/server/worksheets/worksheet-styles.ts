/**
 * Les styles d'une fiche, côté serveur (ADR 0028, lot 3b)
 * =======================================================
 *
 * Deux lectures, toujours avec le client du prof (RLS de `worksheet_styles`
 * et `worksheet_templates`, D9) :
 *   - `listWorksheetStyles` : le menu « Style » — les styles de Chiphre, pris
 *     dans le code, puis ceux du prof ;
 *   - `loadStyleTemplate` : la fiche d'un style du prof, pour le PDF. Un style
 *     de Chiphre n'en a pas besoin (son Typst vient du code) ; un style
 *     illisible rend `null`, et le PDF retombe sur le style par défaut.
 *
 * @module server/worksheets/worksheet-styles
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { WorksheetTemplateRow } from '$lib/types/worksheets';
import {
	BUILT_IN_STYLE_OPTIONS,
	isBuiltInStyle,
	styleIdOf,
	type StyleOption
} from '$lib/typst/templates/styles';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/worksheets/worksheet-styles');

/**
 * Les styles proposés au prof : ceux de Chiphre, dans l'ordre du code, puis
 * les siens par nom. Un style du prof imprime les points selon la case de la
 * fiche. Lecture en échec : les styles de Chiphre seuls (le menu reste
 * utilisable), et une trace.
 *
 * `ownerId` filtre en plus de la RLS : l'admin lit tous les styles, mais son
 * menu ne propose que les siens.
 */
export async function listWorksheetStyles(
	supabase: SupabaseClient<Database>,
	ownerId: string
): Promise<StyleOption[]> {
	const { data, error } = await supabase
		.from('worksheet_styles')
		.select('id, name, description')
		.eq('owner_id', ownerId)
		.order('name');

	if (error) {
		logger.error('Styles du prof illisibles :', error);
		return [...BUILT_IN_STYLE_OPTIONS];
	}

	const own = (data ?? [])
		.filter((row) => !isBuiltInStyle(row.id))
		.map((row) => ({ ...row, showsPoints: true }));
	return [...BUILT_IN_STYLE_OPTIONS, ...own];
}

/**
 * La fiche du style retenu pour la fiche, quand c'est un style du prof ;
 * `null` pour un style de Chiphre, une fiche sans style, ou un style que le
 * prof ne peut pas lire.
 */
export async function loadStyleTemplate(
	supabase: SupabaseClient<Database>,
	worksheet: { style_id?: string | null; template_id?: string | null }
): Promise<WorksheetTemplateRow | null> {
	const styleId = styleIdOf(worksheet);
	if (!styleId || isBuiltInStyle(styleId)) return null;

	const { data, error } = await supabase
		.from('worksheet_templates')
		.select('id, name, description, template_content, created_by, style_id, created_at, updated_at')
		.eq('style_id', styleId)
		.eq('form', 'worksheet')
		.maybeSingle();

	if (error) {
		logger.error('Gabarit du style illisible :', error);
		return null;
	}
	return data ? { ...data, placeholders: [] } : null;
}
