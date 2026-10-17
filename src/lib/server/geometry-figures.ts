/**
 * Figures géométriques stockées (ADR 0027) : lister, lire, créer, modifier,
 * supprimer.
 *
 * Les droits sont tenus par la RLS de `geometry_figures` : publique lisible par
 * tous, privée par son auteur ; seuls prof et admin créent ; chacun ne modifie et
 * ne supprime que SES figures. Une écriture refusée par la RLS ne lève RIEN et
 * rend zéro ligne : chaque écriture relit donc ses lignes (`.select()`) et tient
 * « zéro ligne » pour un refus (404), jamais pour un succès.
 *
 * Les tags passent par `resource-tags.ts` (type `geometry_figure`) ; ils sont
 * effacés avec la figure par la base.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	GeometryFigureRow,
	GeometryFigureSummary,
	GeometryFigureWithTags,
	PublicGeometryFigure
} from '$lib/types/database-helpers';
import type { FigureInput, FigureListFilters } from '$lib/server/validation/geometry-figures';
import {
	fetchResourceIdsByAnyTag,
	fetchResourceTagNames,
	fetchTagNamesForResources,
	syncResourceTags
} from '$lib/server/resource-tags';
import { createServerLogger } from '$lib/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

type TypedSupabaseClient = SupabaseClient<Database>;

// ============================================================================
// CONSTANTES
// ============================================================================

const logger = createServerLogger('server/geometry-figures');

const TAG_KIND = 'geometry_figure';

/** Borne de la liste : au-delà, l'auteur affine ses filtres */
export const FIGURE_LIST_LIMIT = 200;

/** Colonnes de la liste : tout sauf le script (jusqu'à 100 000 caractères) */
const SUMMARY_COLUMNS =
	'id, author_id, title, description, grades, is_public, created_at, updated_at';

/** Colonnes de la page publique : ni l'auteur ni les dates */
const PUBLIC_COLUMNS = 'id, title, description, dsl_script, grades';

/** Refus d'une écriture par la RLS quand elle LÈVE (insertion hors politique) */
const INSUFFICIENT_PRIVILEGE = '42501';

export const FIGURE_NOT_FOUND_MESSAGE = 'Figure introuvable';
export const FIGURE_CREATE_FORBIDDEN_MESSAGE =
	'Seuls les professeurs et les administrateurs créent des figures';
export const FIGURE_TAGS_NOT_SAVED_MESSAGE =
	"La figure est enregistrée, mais ses tags n'ont pas pu l'être : les poser à nouveau ici";

// ============================================================================
// ERREURS
// ============================================================================

/** Échec d'une opération sur une figure, avec le code HTTP à rendre */
export class GeometryFigureError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'GeometryFigureError';
	}
}

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Motif `ilike` sûr pour un filtre `.or()` de PostgREST.
 *
 * Deux grammaires se superposent : celle de `.or()` (la virgule sépare les
 * branches, les parenthèses les groupent, le guillemet cite) et celle de LIKE
 * (`%` et `_` sont des jokers, `\` les échappe ; PostgREST lit aussi `*` comme
 * `%`). Les caractères de la première et `*` deviennent des espaces ; `%` et `_`
 * sont échappés, pour être cherchés tels quels.
 */
export function toIlikePattern(text: string): string {
	const neutral = text.replace(/[\\,()"*]/g, ' ');
	const escaped = neutral.replace(/[%_]/g, (char) => `\\${char}`);
	return `%${escaped}%`;
}

/**
 * Figures visibles par l'utilisateur, filtrées, les plus récemment modifiées
 * d'abord. Les filtres se combinent (ET) ; le filtre de tags retient les
 * figures qui portent AU MOINS UN des tags demandés.
 */
export async function listGeometryFigures(
	supabase: TypedSupabaseClient,
	userId: string,
	filters: FigureListFilters
): Promise<GeometryFigureSummary[]> {
	let taggedIds: string[] | null = null;
	if (filters.tags.length > 0) {
		try {
			taggedIds = await fetchResourceIdsByAnyTag(supabase, TAG_KIND, filters.tags);
		} catch {
			throw new GeometryFigureError(500, 'Impossible de filtrer les figures par tag');
		}
		if (taggedIds.length === 0) return [];
	}

	let query = supabase.from('geometry_figures').select(SUMMARY_COLUMNS);
	if (filters.scope === 'mine') query = query.eq('author_id', userId);
	if (filters.scope === 'public') query = query.eq('is_public', true);
	if (filters.grade) query = query.contains('grades', [filters.grade]);
	if (taggedIds) query = query.in('id', taggedIds);
	if (filters.q) {
		const pattern = toIlikePattern(filters.q);
		query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
	}

	const { data, error } = await query
		.order('updated_at', { ascending: false })
		.limit(FIGURE_LIST_LIMIT);

	if (error) {
		logger.error('[listGeometryFigures] Lecture impossible :', error);
		throw new GeometryFigureError(500, 'Impossible de charger les figures');
	}
	const rows = data ?? [];
	if (rows.length === 0) return [];

	let tagsById: Map<string, string[]>;
	try {
		tagsById = await fetchTagNamesForResources(
			supabase,
			TAG_KIND,
			rows.map((row) => row.id)
		);
	} catch {
		throw new GeometryFigureError(500, 'Impossible de charger les tags des figures');
	}
	return rows.map((row) => ({ ...row, tags: tagsById.get(row.id) ?? [] }));
}

/**
 * Noms des tags posés sur des figures, pour le filtre de la liste. Lire ce
 * catalogue plutôt que celui de tous les tags : un filtre ne propose que ce qui
 * peut trouver quelque chose. (Un utilisateur connecté lit les liens de tag de
 * toutes les figures, privées comprises : tag et identifiant, jamais le contenu
 * — accepté par David, ADR 0027.)
 */
export async function listGeometryFigureTagNames(supabase: TypedSupabaseClient): Promise<string[]> {
	const { data, error } = await supabase
		.from('resource_tags')
		.select('tags(name)')
		.eq('resource_kind', TAG_KIND);

	if (error) {
		logger.error('[listGeometryFigureTagNames] Lecture impossible :', error);
		throw new GeometryFigureError(500, 'Impossible de charger les tags des figures');
	}
	const names = new Set<string>();
	for (const row of data ?? []) {
		const tag = (row as { tags: { name: string } | null }).tags;
		if (tag?.name) names.add(tag.name);
	}
	return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Une figure lisible par l'appelant (publique, ou la sienne), sinon `null` */
export async function getGeometryFigure(
	supabase: TypedSupabaseClient,
	figureId: string
): Promise<GeometryFigureRow | null> {
	const { data, error } = await supabase
		.from('geometry_figures')
		.select('*')
		.eq('id', figureId)
		.maybeSingle();

	if (error) {
		logger.error('[getGeometryFigure] Lecture impossible :', error);
		throw new GeometryFigureError(500, 'Impossible de charger la figure');
	}
	return data;
}

/**
 * Une figure de l'utilisateur, avec ses tags, pour la page de modification.
 * Une figure publique d'un autre auteur est lisible mais pas modifiable : elle
 * rend `null`, comme une figure inexistante.
 */
export async function getOwnGeometryFigure(
	supabase: TypedSupabaseClient,
	figureId: string,
	userId: string
): Promise<GeometryFigureWithTags | null> {
	const figure = await getGeometryFigure(supabase, figureId);
	if (!figure || figure.author_id !== userId) return null;

	try {
		const tags = await fetchResourceTagNames(supabase, TAG_KIND, figureId);
		return { ...figure, tags };
	} catch {
		throw new GeometryFigureError(500, 'Impossible de charger les tags de la figure');
	}
}

/**
 * Une figure PUBLIQUE pour la page sans compte, sinon `null`. Le filtre
 * `is_public` est explicite : l'auteur connecté lit aussi ses figures privées,
 * et la page publique doit répondre 404 pour lui comme pour les autres.
 */
export async function getPublicGeometryFigure(
	supabase: TypedSupabaseClient,
	figureId: string
): Promise<PublicGeometryFigure | null> {
	const { data, error } = await supabase
		.from('geometry_figures')
		.select(PUBLIC_COLUMNS)
		.eq('id', figureId)
		.eq('is_public', true)
		.maybeSingle();

	if (error) {
		logger.error('[getPublicGeometryFigure] Lecture impossible :', error);
		throw new GeometryFigureError(500, 'Impossible de charger la figure');
	}
	return data;
}

/** Remplace les tags ; un échec est signalé sans masquer l'écriture de la figure */
async function saveTags(
	supabase: TypedSupabaseClient,
	figureId: string,
	tags: string[]
): Promise<void> {
	try {
		await syncResourceTags(supabase, TAG_KIND, figureId, tags);
	} catch {
		throw new GeometryFigureError(500, FIGURE_TAGS_NOT_SAVED_MESSAGE);
	}
}

/**
 * Créer une figure (prof ou admin ; la RLS refuse les autres).
 *
 * Un échec des tags ne LÈVE pas : la figure existe déjà, et une erreur ferait
 * croire qu'il faut réessayer — un second envoi créerait un doublon. Il est
 * rendu (`tagsSaved: false`) pour que la page renvoie vers la modification.
 */
export async function createGeometryFigure(
	supabase: TypedSupabaseClient,
	input: FigureInput,
	userId: string
): Promise<{ figure: GeometryFigureRow; tagsSaved: boolean }> {
	const { data, error } = await supabase
		.from('geometry_figures')
		.insert({
			author_id: userId,
			title: input.title,
			description: input.description,
			dsl_script: input.dsl_script,
			grades: input.grades,
			is_public: input.is_public
		})
		.select();

	if (error) {
		if (error.code === INSUFFICIENT_PRIVILEGE) {
			throw new GeometryFigureError(403, FIGURE_CREATE_FORBIDDEN_MESSAGE);
		}
		logger.error('[createGeometryFigure] Insertion impossible :', error);
		throw new GeometryFigureError(500, "La figure n'a pas pu être enregistrée");
	}
	// Insérée mais illisible : ne peut pas arriver à l'auteur ; on ne l'annonce pas comme réussie
	const figure = data?.[0];
	if (!figure) {
		throw new GeometryFigureError(500, "La figure n'a pas pu être enregistrée");
	}

	try {
		await saveTags(supabase, figure.id, input.tags);
		return { figure, tagsSaved: true };
	} catch {
		return { figure, tagsSaved: false };
	}
}

/** Modifier une figure de l'utilisateur ; zéro ligne rendue = introuvable ou pas à lui */
export async function updateGeometryFigure(
	supabase: TypedSupabaseClient,
	figureId: string,
	input: FigureInput
): Promise<GeometryFigureRow> {
	const { data, error } = await supabase
		.from('geometry_figures')
		.update({
			title: input.title,
			description: input.description,
			dsl_script: input.dsl_script,
			grades: input.grades,
			is_public: input.is_public
		})
		.eq('id', figureId)
		.select();

	if (error) {
		logger.error('[updateGeometryFigure] Écriture impossible :', error);
		throw new GeometryFigureError(500, "La figure n'a pas pu être enregistrée");
	}
	const figure = data?.[0];
	if (!figure) {
		throw new GeometryFigureError(404, FIGURE_NOT_FOUND_MESSAGE);
	}

	await saveTags(supabase, figureId, input.tags);
	return figure;
}

/** Supprimer une figure de l'utilisateur ; zéro ligne rendue = rien n'a été supprimé */
export async function deleteGeometryFigure(
	supabase: TypedSupabaseClient,
	figureId: string
): Promise<void> {
	const { data, error } = await supabase
		.from('geometry_figures')
		.delete()
		.eq('id', figureId)
		.select('id');

	if (error) {
		logger.error('[deleteGeometryFigure] Suppression impossible :', error);
		throw new GeometryFigureError(500, "La figure n'a pas pu être supprimée");
	}
	if (!data || data.length === 0) {
		throw new GeometryFigureError(404, FIGURE_NOT_FOUND_MESSAGE);
	}
}
