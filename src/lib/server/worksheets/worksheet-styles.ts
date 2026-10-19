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
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
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

	const own = (data ?? []).filter((row) => !isBuiltInStyle(row.id));
	return [...BUILT_IN_STYLE_OPTIONS, ...own];
}

/**
 * La fiche du style retenu pour la fiche, quand c'est un style du prof ;
 * `null` pour un style de Chiphre, une fiche sans style, ou un style que le
 * prof ne peut pas lire.
 */
export async function loadStyleTemplate(
	supabase: SupabaseClient<Database>,
	worksheet: { style_id?: string | null }
): Promise<WorksheetTemplateRow | null> {
	const styleId = styleIdOf(worksheet);
	if (!styleId || isBuiltInStyle(styleId)) return null;
	return readStyleTemplate(supabase, styleId);
}

/**
 * La mise en page d'un style du prof pour un lecteur qui n'a pas accès aux
 * tables des styles : l'élève destinataire de la fiche (D11). Lue en
 * service-role, et seulement si le style appartient à l'AUTEUR de la fiche
 * (audit du lot 3a) ; sinon `null`, et le PDF prend « Fiche élève ».
 *
 * ⚠️ L'appelant a déjà vérifié que le lecteur a accès à la fiche.
 */
export async function loadAuthorStyleTemplate(worksheet: {
	style_id?: string | null;
	created_by: string;
}): Promise<{ template_content: string } | null> {
	const styleId = styleIdOf(worksheet);
	if (!styleId || isBuiltInStyle(styleId)) return null;

	const service = createServiceRoleClient();
	const { data: style, error } = await service
		.from('worksheet_styles')
		.select('owner_id')
		.eq('id', styleId)
		.maybeSingle();
	if (error) {
		logger.error('Style de la fiche illisible :', error);
		return null;
	}
	if (!style || style.owner_id !== worksheet.created_by) return null;

	const template = await readStyleTemplate(service, styleId);
	return template ? { template_content: template.template_content } : null;
}

/** La forme « fiche » d'un style, lue avec le client donné ; `null` si absente ou illisible */
async function readStyleTemplate(
	client: SupabaseClient<Database>,
	styleId: string
): Promise<WorksheetTemplateRow | null> {
	const { data, error } = await client
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

// ============================================================================
// UN GABARIT DE LA PAGE « GABARITS » ET SON STYLE (D10)
// ============================================================================
//
// La page « Gabarits » ne change pas à l'écran (D9), mais chaque gabarit
// qu'elle crée est la fiche d'un style du même nom, au même identifiant : c'est
// ce style que le menu de la fiche propose. Renommer le gabarit renomme le
// style ; supprimer le gabarit supprime le style (et, par cascade, le gabarit).

type TemplateInsert = Database['public']['Tables']['worksheet_templates']['Insert'];
type TemplateRow = Database['public']['Tables']['worksheet_templates']['Row'];

/**
 * Le style propre au gabarit — créé avec lui, au même identifiant — ou `null`
 * (gabarit rattaché à un autre style, ou sans style).
 */
export function ownStyleId(template: { id: string; style_id: string | null }): string | null {
	return template.style_id === template.id ? template.style_id : null;
}

/**
 * Crée le style, puis sa fiche. Fiche refusée : le style, inutile seul, est
 * retiré.
 */
export async function insertTemplateWithStyle(
	supabase: SupabaseClient<Database>,
	row: Omit<TemplateInsert, 'id' | 'style_id' | 'form'> & { created_by: string }
): Promise<{ data: TemplateRow | null; error: unknown }> {
	const id = crypto.randomUUID();
	const { error: styleError } = await supabase.from('worksheet_styles').insert({
		id,
		owner_id: row.created_by,
		name: row.name,
		description: row.description ?? null
	});
	if (styleError) return { data: null, error: styleError };

	const { data, error } = await supabase
		.from('worksheet_templates')
		.insert({ ...row, id, style_id: id, form: 'worksheet' })
		.select()
		.single();
	if (error) {
		const { data: removed, error: removeError } = await supabase
			.from('worksheet_styles')
			.delete()
			.eq('id', id)
			.select('id');
		// La RLS refuse en silence : un style resté seul apparaîtrait au menu
		if (removeError || (removed ?? []).length === 0) {
			logger.error('Style sans gabarit non retiré :', removeError ?? 'aucune ligne', id);
		}
		return { data: null, error };
	}
	return { data, error: null };
}

/**
 * Le nom et la description du gabarit, recopiés sur son style. Rend faux si
 * le style n'a pas suivi (l'appelant le dit au prof).
 */
export async function syncTemplateStyle(
	supabase: SupabaseClient<Database>,
	template: { id: string; style_id: string | null },
	fields: { name?: string; description?: string | null }
): Promise<boolean> {
	const styleId = ownStyleId(template);
	if (!styleId || (fields.name === undefined && fields.description === undefined)) return true;

	const update: Database['public']['Tables']['worksheet_styles']['Update'] = {};
	if (fields.name !== undefined) update.name = fields.name;
	if (fields.description !== undefined) update.description = fields.description;
	const { data, error } = await supabase
		.from('worksheet_styles')
		.update(update)
		.eq('id', styleId)
		.select('id');
	// La RLS refuse en silence : zéro ligne, sans erreur
	if (error || (data ?? []).length === 0) {
		logger.error('Style du gabarit non renommé :', error ?? 'aucune ligne');
		return false;
	}
	return true;
}

/**
 * Le nombre de fiches qui désignent le style de ce gabarit : la suppression
 * leur retirerait leur mise en page sans le dire. Un gabarit sans style propre
 * n'est désigné par aucune fiche (`style_id` ne vise que `worksheet_styles`).
 */
export async function countWorksheetsUsingTemplate(
	supabase: SupabaseClient<Database>,
	template: { id: string; style_id: string | null }
): Promise<{ count: number; error: unknown }> {
	const styleId = ownStyleId(template);
	if (!styleId) return { count: 0, error: null };
	const { count, error } = await supabase
		.from('worksheets')
		.select('id', { count: 'exact', head: true })
		.eq('style_id', styleId);
	return { count: count ?? 0, error };
}

/**
 * Supprime le gabarit avec son style (la cascade emporte le gabarit), ou le
 * gabarit seul s'il n'a pas de style propre. Rend faux si rien n'a été
 * supprimé (la RLS refuse en silence).
 */
export async function deleteTemplateWithStyle(
	supabase: SupabaseClient<Database>,
	template: { id: string; style_id: string | null }
): Promise<{ deleted: boolean; error: unknown }> {
	const styleId = ownStyleId(template);
	const { data, error } = styleId
		? await supabase.from('worksheet_styles').delete().eq('id', styleId).select('id')
		: await supabase.from('worksheet_templates').delete().eq('id', template.id).select('id');
	return { deleted: !error && (data ?? []).length > 0, error };
}
