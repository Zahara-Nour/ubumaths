/**
 * Chapter Templates Server Functions
 * ====================================
 *
 * Server-side functions for managing chapter templates, versions, and instantiations.
 *
 * Features:
 * - CRUD operations for templates (draft/published/archived lifecycle)
 * - Version management with diff tracking
 * - Template instantiation into chapters
 * - Migration support for applying template updates
 *
 * @module server/chapter-templates
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, TablesUpdate } from '$lib/types/database';
import type {
	ChapterTemplate,
	ChapterTemplateVersion,
	ChapterTemplateInstantiation,
	TemplateSummary,
	TemplateContentSnapshot,
	TemplateDiff,
	DiffEntry,
	MigrationPreview,
	InstantiationWithStatus,
	DbChapterTemplate,
	DbChapterTemplateVersion,
	DbChapterTemplateInstantiation
} from '$lib/types/chapter-templates';
import {
	dbTemplateToApp,
	dbTemplateVersionToApp,
	dbInstantiationToApp,
	parseContentSnapshot,
	EMPTY_CONTENT_SNAPSHOT
} from '$lib/types/chapter-templates';
import type {
	CreateChapterTemplateInput,
	CreateTemplateFromChapterInput,
	UpdateChapterTemplateInput,
	InstantiateTemplateInput,
	ListTemplatesQuery
} from '$lib/server/validation/chapter-templates';
import { createServerLogger } from '$lib/utils/logger';
import { CHAPTER_DOCUMENTS_BUCKET, ownerStoragePrefix } from './content-owner';
import {
	copyStoredFile,
	countTemplateContent,
	EMPTY_TEMPLATE_COUNTS,
	removeStoredFiles,
	templateHasContent
} from './template-content';
import { createServiceRoleClient } from './serviceRoleClient';
import {
	LINKED_TABLES_SECTIONS_LAST,
	adoptMappedRows,
	copyContentToTemplate,
	readChapterContent,
	type ContentMapping
} from './chapter-template-copy';

const logger = createServerLogger('server/chapter-templates');

/**
 * Le modèle existe mais ne peut pas servir (brouillon, archivé). Son message
 * est écrit pour le professeur, et l'écran le montre tel quel ; toute autre
 * erreur d'instanciation reste une panne, au message générique.
 */
export class TemplateUnusableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TemplateUnusableError';
	}
}

/**
 * Le modèle est encore relié à des chapitres (non détachés) : on ne le supprime
 * pas, on l'archive (ADR 0029). Message écrit pour le professeur.
 */
export class TemplateInUseError extends Error {
	constructor(
		message = 'Ce modèle est relié à des chapitres : archivez-le plutôt que de le supprimer.'
	) {
		super(message);
		this.name = 'TemplateInUseError';
	}
}

// ============================================================================
// TYPES
// ============================================================================

/** Result type for operations */
interface OperationResult<T> {
	data: T | null;
	error: Error | null;
}

/**
 * L'ancien circuit des versions (snapshot) refuse un modèle qui POSSÈDE son
 * contenu, ou un chapitre qui le relie (ADR 0029) : une version figée écraserait
 * le lien vivant. Ce circuit disparaît à l'étape 5.
 */
export class TemplateLinkedContentError extends Error {
	constructor(
		message = 'Ce modèle possède son contenu : il se modifie sur sa page, plus par versions.'
	) {
		super(message);
		this.name = 'TemplateLinkedContentError';
	}
}

/** Result type for list operations */
interface ListResult<T> {
	data: T[];
	error: Error | null;
	count: number;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new chapter template from scratch
 *
 * @param input - Template creation data
 * @param userId - Creator's user ID
 * @param supabase - Supabase client
 * @returns Created template
 */
export async function createChapterTemplate(
	input: CreateChapterTemplateInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		const contentSnapshot = input.contentSnapshot ?? EMPTY_CONTENT_SNAPSHOT;

		const { data: template, error } = await supabase
			.from('chapter_templates')
			.insert({
				created_by: userId,
				title: input.title,
				description: input.description ?? null,
				grades: input.grades ?? [],
				color: input.color ?? null,
				icon: input.icon ?? null,
				content_snapshot: contentSnapshot as unknown as Json,
				status: 'draft',
				current_version: 1
			})
			.select()
			.single();

		if (error) {
			logger.error('[createChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		logger.error('[createChapterTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Faire un modèle d'un chapitre (ADR 0029).
 *
 * Le modèle POSSÈDE une copie du contenu du chapitre — sections d'abord, puis
 * les cinq types d'éléments, chacun rangé dans la section copiée ; les fichiers
 * téléversés sont COPIÉS sous `templates/<id>/…`. Puis le chapitre devient lié
 * au modèle et ADOPTE chacun de ses éléments (`source_id` = l'élément du modèle) :
 * mêmes identifiants, donc publications et cases cochées des élèves gardées.
 *
 * ⚠️ L'ordre compte : l'instanciation n'est créée qu'APRÈS la copie. Créée
 * avant, chaque élément ajouté au modèle aurait été diffusé au chapitre par la
 * base (`modele_ajout_diffuse`), en double de ses propres éléments.
 *
 * Un chapitre déjà rattaché à un modèle (lié ou détaché) garde son
 * rattachement : le modèle est créé avec la copie, sans adoption.
 *
 * L'ancien fichier `chapters/…` d'un document adopté n'est PAS supprimé : la
 * ligne pointe désormais la copie du modèle, le nettoyage viendra à part.
 *
 * @param input - Chapitre source, titre et description du modèle
 * @param userId - Auteur du modèle
 * @param supabase - Client de la requête (RLS du professeur)
 */
export async function createTemplateFromChapter(
	input: CreateTemplateFromChapterInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate> & { warning?: string }> {
	try {
		const { data: chapter, error: chapterError } = await supabase
			.from('class_chapters')
			.select('color, icon')
			.eq('id', input.chapterId)
			.single();

		if (chapterError) {
			logger.error('[createTemplateFromChapter] Error fetching chapter:', chapterError);
			return { data: null, error: new Error(chapterError.message) };
		}

		// Tout le contenu du chapitre, lu AVANT de créer quoi que ce soit : une
		// lecture en échec ne doit pas produire un modèle amputé.
		const contenu = await readChapterContent(input.chapterId, supabase);
		if (contenu.error || !contenu.data) {
			return { data: null, error: contenu.error ?? new Error('Contenu illisible') };
		}

		const { data: template, error } = await supabase
			.from('chapter_templates')
			.insert({
				created_by: userId,
				title: input.title,
				description: input.description ?? null,
				grades: input.grades ?? [],
				color: chapter.color,
				icon: chapter.icon,
				content_snapshot: EMPTY_CONTENT_SNAPSHOT as unknown as Json,
				status: 'draft',
				current_version: 1
			})
			.select()
			.single();

		if (error) {
			logger.error('[createTemplateFromChapter] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		const copie = await copyContentToTemplate(contenu.data, template.id, supabase);
		if (copie.error || !copie.data) {
			// Un modèle à moitié rempli serait pire que pas de modèle : il part,
			// avec les fichiers déjà copiés (avant la ligne : la règle de
			// stockage exige que le modèle existe).
			await removeStoredFiles(copie.copiedFiles, supabase);
			const { error: rollbackError } = await supabase
				.from('chapter_templates')
				.delete()
				.eq('id', template.id)
				.select('id');
			if (rollbackError) {
				logger.error('[createTemplateFromChapter] Modèle incomplet non supprimé :', rollbackError);
			}
			return { data: null, error: copie.error ?? new Error('Copie impossible') };
		}

		const nonAdoptes = await adoptChapterContent(
			input.chapterId,
			template.id,
			copie.data,
			supabase
		);

		return {
			data: dbTemplateToApp(template as DbChapterTemplate),
			error: null,
			...(nonAdoptes > 0
				? {
						warning: `Modèle créé, mais ${nonAdoptes} élément(s) du chapitre n’ont pas pu être reliés au modèle : ils restent propres au chapitre.`
					}
				: {})
		};
	} catch (err) {
		logger.error('[createTemplateFromChapter] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Get a single chapter template by ID
 *
 * @param templateId - Template ID
 * @param supabase - Supabase client
 * @returns Template with content
 */
export async function getChapterTemplate(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		const { data: template, error } = await supabase
			.from('chapter_templates')
			.select('*')
			.eq('id', templateId)
			.single();

		if (error) {
			logger.error('[getChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		logger.error('[getChapterTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Update a chapter template (draft only for metadata, creates version for content changes)
 *
 * @param templateId - Template ID
 * @param input - Update data
 * @param userId - User making the update
 * @param supabase - Supabase client
 * @returns Updated template
 */
export async function updateChapterTemplate(
	templateId: string,
	input: UpdateChapterTemplateInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		// Get current template to check status
		const { data: current, error: fetchError } = await supabase
			.from('chapter_templates')
			.select('status, content_snapshot, current_version')
			.eq('id', templateId)
			.single();

		if (fetchError) {
			logger.error('[updateChapterTemplate] Error fetching template:', fetchError);
			return { data: null, error: new Error(fetchError.message) };
		}

		// Only drafts can be updated directly
		if (current.status !== 'draft' && input.contentSnapshot) {
			return {
				data: null,
				error: new Error(
					'Cannot update content of published/archived templates. Create a new version instead.'
				)
			};
		}

		const updateData: TablesUpdate<'chapter_templates'> = {};

		if (input.title !== undefined) updateData.title = input.title;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.grades !== undefined) updateData.grades = input.grades;
		if (input.color !== undefined) updateData.color = input.color;
		if (input.icon !== undefined) updateData.icon = input.icon;

		// If content is updated in draft, update both template and create new version
		if (input.contentSnapshot && current.status === 'draft') {
			updateData.content_snapshot = input.contentSnapshot as unknown as Json;

			// Compute diff if there's previous content
			const oldSnapshot = parseContentSnapshot(current.content_snapshot as Record<string, unknown>);
			const diff = computeDiff(oldSnapshot, input.contentSnapshot);

			// Create new version
			const newVersion = current.current_version + 1;
			updateData.current_version = newVersion;

			const { error: versionError } = await supabase.from('chapter_template_versions').insert({
				template_id: templateId,
				version_number: newVersion,
				created_by: userId,
				content_snapshot: input.contentSnapshot as unknown as Json,
				change_summary: null,
				diff: diff as unknown as Json
			});

			if (versionError) {
				logger.error('[updateChapterTemplate] Error creating version:', versionError);
				return { data: null, error: new Error(versionError.message) };
			}
		}

		const { data: template, error } = await supabase
			.from('chapter_templates')
			.update(updateData)
			.eq('id', templateId)
			.select()
			.single();

		if (error) {
			logger.error('[updateChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		logger.error('[updateChapterTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Supprimer définitivement un modèle — seulement s'il n'est relié à AUCUN
 * chapitre (ADR 0029, comportements 16-17).
 *
 * Un modèle relié se refuse avec `TemplateInUseError` (« archivez-le ») : ses
 * éléments sont lus par les chapitres liés, et la base refuserait de toute façon
 * (`ON DELETE RESTRICT` des lignes de lien). Un chapitre détaché ne compte pas :
 * il a sa propre copie.
 *
 * Refus aussi s'il reste une seule ligne de lien vers un élément du modèle (même
 * instanciation détachée). Puis la ligne du modèle est supprimée (vérifiée), PUIS
 * ses fichiers `templates/<id>/…`, avec le client service : la règle de stockage
 * du professeur exige que le modèle existe.
 *
 * @param templateId - Template ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function deleteChapterTemplate(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	try {
		// Un modèle archivé a été retiré de l'usage : c'est une trace, et on ne
		// détruit pas une trace par mégarde.
		const { data: template, error: readError } = await supabase
			.from('chapter_templates')
			.select('status')
			.eq('id', templateId)
			.single();

		if (readError) {
			logger.error('[deleteChapterTemplate] Lecture impossible :', readError);
			return { error: new Error(readError.message) };
		}

		if (template.status === 'archived') {
			return {
				error: new Error('Un modèle archivé ne peut pas être supprimé.')
			};
		}

		const { data: liens, error: liensError } = await supabase
			.from('chapter_template_instantiations')
			.select('id')
			.eq('template_id', templateId)
			.eq('is_detached', false)
			.limit(1);

		// Une lecture en échec ne vaut pas « relié à rien ».
		if (liensError) {
			logger.error('[deleteChapterTemplate] Chapitres liés illisibles :', liensError);
			return { error: new Error(liensError.message) };
		}
		if ((liens ?? []).length > 0) {
			return { error: new TemplateInUseError() };
		}

		// Une ligne de lien peut survivre à une instanciation marquée détachée
		// (détachement interrompu) : c'est elle, et non l'instanciation, qui sert un
		// fichier du modèle à des élèves. Refus AVANT de toucher au moindre fichier.
		const relie = await templateIsLinked(templateId, supabase);
		if (relie.error) return { error: relie.error };
		if (relie.data) return { error: new TemplateInUseError() };

		// Les versions et le contenu du modèle partent avec lui (CASCADE) ; les
		// chapitres détachés gardent leur copie, leur rattachement passe à NULL.
		const { data: supprime, error } = await supabase
			.from('chapter_templates')
			.delete()
			.eq('id', templateId)
			.select('id');

		if (error) {
			if (error.code === '23503') return { error: new TemplateInUseError() };
			logger.error('[deleteChapterTemplate] Suppression impossible :', error);
			return { error: new Error(error.message) };
		}
		if (!supprime || supprime.length !== 1) {
			return { error: new Error('Modèle introuvable') };
		}

		// Le modèle n'existe plus : la règle de stockage du professeur (qui exige
		// qu'il existe) ne s'applique plus, d'où le client service. Il ne touche
		// QUE ce dossier, et seulement après la suppression vérifiée de la ligne.
		await removeTemplateFolder(templateId);

		return { error: null };
	} catch (err) {
		logger.error('[deleteChapterTemplate] Unexpected error:', err);
		return { error: err as Error };
	}
}

/**
 * List chapter templates with filters
 *
 * @param query - Query parameters (status, grades, search, pagination)
 * @param userId - User ID (for ownership checks)
 * @param supabase - Supabase client
 * @returns List of templates with metadata
 */
export async function listChapterTemplates(
	query: ListTemplatesQuery,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<ListResult<TemplateSummary>> {
	try {
		let dbQuery = supabase
			.from('chapter_templates')
			.select('*, profiles!chapter_templates_created_by_fkey(full_name)', { count: 'exact' });

		// Only the user's own templates (no inter-teacher sharing).
		// RLS already restricts rows to the owner; this keeps the query explicit.
		dbQuery = dbQuery.eq('created_by', userId);

		// Filter by status
		if (query.status) {
			dbQuery = dbQuery.eq('status', query.status);
		}

		// Filter by grades (contains any of the specified grades)
		if (query.grades && query.grades.length > 0) {
			dbQuery = dbQuery.overlaps('grades', query.grades);
		}

		// Search by title
		if (query.search) {
			dbQuery = dbQuery.ilike('title', `%${query.search}%`);
		}

		// Sort
		const sortBy = query.sortBy ?? 'updatedAt';
		const sortDir = query.sortDir ?? 'desc';
		const sortColumn =
			sortBy === 'createdAt'
				? 'created_at'
				: sortBy === 'updatedAt'
					? 'updated_at'
					: sortBy === 'instantiationCount'
						? 'instantiation_count'
						: 'title';

		dbQuery = dbQuery.order(sortColumn, { ascending: sortDir === 'asc' });

		// Pagination
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		dbQuery = dbQuery.range(from, to);

		const { data, error, count } = await dbQuery;

		if (error) {
			logger.error('[listChapterTemplates] Error:', error);
			return { data: [], error: new Error(error.message), count: 0 };
		}

		// Les compteurs viennent du contenu RÉEL du modèle (ADR 0029), plus du
		// snapshot : l'éditeur du modèle écrit dans les tables.
		const { data: comptes, error: countError } = await countTemplateContent(
			(data || []).map((row) => row.id),
			supabase
		);
		if (countError || !comptes) {
			return { data: [], error: countError ?? new Error('Compteurs illisibles'), count: 0 };
		}

		const templates: TemplateSummary[] = (data || []).map((row) => {
			const template = dbTemplateToApp(row as unknown as DbChapterTemplate);
			const counts = comptes.get(template.id) ?? EMPTY_TEMPLATE_COUNTS;
			const profile = (row as unknown as { profiles: { full_name: string | null } | null })
				.profiles;

			return {
				id: template.id,
				title: template.title,
				description: template.description,
				grades: template.grades,
				color: template.color,
				icon: template.icon,
				status: template.status,
				instantiationCount: template.instantiationCount,
				currentVersion: template.currentVersion,
				createdAt: template.createdAt,
				updatedAt: template.updatedAt,
				creatorName: profile?.full_name ?? null,
				isOwner: template.createdBy === userId,
				documentCount: counts.documentCount,
				checklistItemCount: counts.checklistItemCount,
				exerciseCount: counts.exerciseCount,
				worksheetCount: counts.worksheetCount,
				seriesCount: counts.seriesCount
			};
		});

		return { data: templates, error: null, count: count ?? 0 };
	} catch (err) {
		logger.error('[listChapterTemplates] Unexpected error:', err);
		return { data: [], error: err as Error, count: 0 };
	}
}

// ============================================================================
// PUBLISHING OPERATIONS
// ============================================================================

/**
 * Publier un modèle : il doit avoir au moins un élément non retiré (document,
 * objectif, exercice, fiche ou série). Depuis l'ADR 0029, c'est le contenu
 * POSSÉDÉ par le modèle qui compte, plus la photo `content_snapshot`.
 *
 * @param templateId - Template ID
 * @param supabase - Supabase client
 * @returns Updated template
 */
export async function publishTemplate(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		const { data: aDuContenu, error: contentError } = await templateHasContent(
			templateId,
			supabase
		);

		if (contentError) {
			logger.error('[publishTemplate] Contenu illisible :', contentError);
			return { data: null, error: contentError };
		}

		if (!aDuContenu) {
			return {
				data: null,
				error: new Error(
					'Modèle vide : ajoutez au moins un document, un objectif, un exercice ou une fiche.'
				)
			};
		}

		// Publish the template
		const { data: updated, error } = await supabase
			.from('chapter_templates')
			.update({
				status: 'published'
			})
			.eq('id', templateId)
			.select()
			.single();

		if (error) {
			logger.error('[publishTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(updated as DbChapterTemplate), error: null };
	} catch (err) {
		logger.error('[publishTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Archive a template
 *
 * @param templateId - Template ID
 * @param supabase - Supabase client
 * @returns Updated template
 */
export async function archiveTemplate(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		const { data: template, error } = await supabase
			.from('chapter_templates')
			.update({ status: 'archived' })
			.eq('id', templateId)
			.select()
			.single();

		if (error) {
			logger.error('[archiveTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		logger.error('[archiveTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

// ============================================================================
// VERSION OPERATIONS
// ============================================================================

/**
 * Create a new template version with diff
 *
 * @param templateId - Template ID
 * @param contentSnapshot - New content snapshot
 * @param changeSummary - Optional summary of changes
 * @param userId - User creating the version
 * @param supabase - Supabase client
 * @returns Created version
 */
export async function createTemplateVersion(
	templateId: string,
	contentSnapshot: TemplateContentSnapshot,
	changeSummary: string | null,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplateVersion>> {
	try {
		const proprio = await templateOwnsContent(templateId, supabase);
		if (proprio.error) return { data: null, error: proprio.error };
		if (proprio.data) return { data: null, error: new TemplateLinkedContentError() };

		// Get current template to get previous version
		const { data: template, error: fetchError } = await supabase
			.from('chapter_templates')
			.select('content_snapshot, current_version')
			.eq('id', templateId)
			.single();

		if (fetchError) {
			logger.error('[createTemplateVersion] Error fetching template:', fetchError);
			return { data: null, error: new Error(fetchError.message) };
		}

		// Compute diff
		const oldSnapshot = parseContentSnapshot(template.content_snapshot as Record<string, unknown>);
		const diff = computeDiff(oldSnapshot, contentSnapshot);

		// Create new version
		const newVersionNumber = template.current_version + 1;

		const { data: version, error: versionError } = await supabase
			.from('chapter_template_versions')
			.insert({
				template_id: templateId,
				version_number: newVersionNumber,
				created_by: userId,
				content_snapshot: contentSnapshot as unknown as Json,
				change_summary: changeSummary,
				diff: diff as unknown as Json
			})
			.select()
			.single();

		if (versionError) {
			logger.error('[createTemplateVersion] Error creating version:', versionError);
			return { data: null, error: new Error(versionError.message) };
		}

		// Update template current version and content
		const { error: updateError } = await supabase
			.from('chapter_templates')
			.update({
				current_version: newVersionNumber,
				content_snapshot: contentSnapshot as unknown as Json
			})
			.eq('id', templateId);

		if (updateError) {
			logger.error('[createTemplateVersion] Error updating template:', updateError);
			return { data: null, error: new Error(updateError.message) };
		}

		return { data: dbTemplateVersionToApp(version as DbChapterTemplateVersion), error: null };
	} catch (err) {
		logger.error('[createTemplateVersion] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Get all versions for a template
 *
 * @param templateId - Template ID
 * @param supabase - Supabase client
 * @returns List of versions
 */
export async function getTemplateVersions(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<ListResult<ChapterTemplateVersion>> {
	try {
		const { data, error } = await supabase
			.from('chapter_template_versions')
			.select('*')
			.eq('template_id', templateId)
			.order('version_number', { ascending: false });

		if (error) {
			logger.error('[getTemplateVersions] Error:', error);
			return { data: [], error: new Error(error.message), count: 0 };
		}

		const versions = (data || []).map((row) =>
			dbTemplateVersionToApp(row as DbChapterTemplateVersion)
		);

		return { data: versions, error: null, count: versions.length };
	} catch (err) {
		logger.error('[getTemplateVersions] Unexpected error:', err);
		return { data: [], error: err as Error, count: 0 };
	}
}

/**
 * Get a specific template version
 *
 * @param templateId - Template ID
 * @param versionNumber - Version number
 * @param supabase - Supabase client
 * @returns Template version
 */
export async function getTemplateVersion(
	templateId: string,
	versionNumber: number,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplateVersion>> {
	try {
		const { data: version, error } = await supabase
			.from('chapter_template_versions')
			.select('*')
			.eq('template_id', templateId)
			.eq('version_number', versionNumber)
			.single();

		if (error) {
			logger.error('[getTemplateVersion] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateVersionToApp(version as DbChapterTemplateVersion), error: null };
	} catch (err) {
		logger.error('[getTemplateVersion] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Compute diff between two content snapshots
 *
 * @param oldSnapshot - Previous snapshot
 * @param newSnapshot - New snapshot
 * @returns Diff with statistics
 */
export function computeDiff(
	oldSnapshot: TemplateContentSnapshot,
	newSnapshot: TemplateContentSnapshot
): TemplateDiff {
	// Helper to compare arrays by key
	function diffArray<T>(
		oldArr: T[],
		newArr: T[],
		getKey: (item: T) => string,
		equals: (a: T, b: T) => boolean
	): DiffEntry<T>[] {
		const diffs: DiffEntry<T>[] = [];
		const oldMap = new Map(oldArr.map((item) => [getKey(item), item]));
		const newMap = new Map(newArr.map((item) => [getKey(item), item]));

		// Find removed items
		for (const [key, item] of oldMap) {
			if (!newMap.has(key)) {
				diffs.push({ type: 'removed', item });
			}
		}

		// Find added and modified items
		for (const [key, newItem] of newMap) {
			const oldItem = oldMap.get(key);
			if (!oldItem) {
				diffs.push({ type: 'added', item: newItem });
			} else if (!equals(oldItem, newItem)) {
				diffs.push({ type: 'modified', item: newItem, previousItem: oldItem });
			}
		}

		return diffs;
	}

	// Documents: keyed by URL
	const documentDiffs = diffArray(
		oldSnapshot.documents,
		newSnapshot.documents,
		(doc) => doc.documentUrl,
		(a, b) =>
			a.title === b.title &&
			a.description === b.description &&
			a.sourceType === b.sourceType &&
			a.displayOrder === b.displayOrder
	);

	// Objectifs : reconnus par leur TEXTE seul.
	//
	// La clé incluait le rang, si bien qu'un simple réordonnancement produisait
	// N « supprimés » + N « ajoutés » — un écran d'alertes pour une mise à jour
	// qui ne changera rien. Et c'est le texte, et lui seul, qui sert de clé à la
	// fusion : le diff doit dire la même chose qu'elle.
	const checklistDiffs = diffArray(
		oldSnapshot.checklistItems,
		newSnapshot.checklistItems,
		(item) => item.content,
		(a, b) =>
			a.content === b.content &&
			a.description === b.description &&
			a.displayOrder === b.displayOrder
	);

	// Exercises: keyed by exerciseId
	const exerciseDiffs = diffArray(
		oldSnapshot.exercises,
		newSnapshot.exercises,
		(ex) => ex.exerciseId,
		(a, b) => a.displayOrder === b.displayOrder
	);

	// Fiches : sans elles, l'aperçu était MUET sur du contenu que la mise à jour
	// allait pourtant poser dans le chapitre.
	const worksheetDiffs = diffArray(
		oldSnapshot.worksheets,
		newSnapshot.worksheets,
		(w) => w.worksheetId,
		(a, b) => a.displayOrder === b.displayOrder
	);

	// Compute stats
	const stats = {
		documentsAdded: documentDiffs.filter((d) => d.type === 'added').length,
		documentsRemoved: documentDiffs.filter((d) => d.type === 'removed').length,
		documentsModified: documentDiffs.filter((d) => d.type === 'modified').length,
		checklistItemsAdded: checklistDiffs.filter((d) => d.type === 'added').length,
		checklistItemsRemoved: checklistDiffs.filter((d) => d.type === 'removed').length,
		checklistItemsModified: checklistDiffs.filter((d) => d.type === 'modified').length,
		exercisesAdded: exerciseDiffs.filter((d) => d.type === 'added').length,
		exercisesRemoved: exerciseDiffs.filter((d) => d.type === 'removed').length,
		exercisesModified: exerciseDiffs.filter((d) => d.type === 'modified').length,
		worksheetsAdded: worksheetDiffs.filter((d) => d.type === 'added').length,
		worksheetsRemoved: worksheetDiffs.filter((d) => d.type === 'removed').length,
		worksheetsModified: worksheetDiffs.filter((d) => d.type === 'modified').length
	};

	return {
		documents: documentDiffs,
		checklistItems: checklistDiffs,
		exercises: exerciseDiffs,
		worksheets: worksheetDiffs,
		stats
	};
}

// ============================================================================
// INSTANTIATION OPERATIONS
// ============================================================================

/**
 * Créer un chapitre LIÉ à un modèle (ADR 0029, comportement 5).
 *
 * Le chapitre ne copie rien : `link_chapter_to_template` crée l'instanciation et
 * une ligne de lien par élément non retiré du modèle, sections d'abord. Rien
 * n'est publié, aucun fichier n'est copié.
 *
 * Les six sections semées à la création du chapitre (déclencheur
 * `seed_default_chapter_sections`) sont retirées quand le modèle a son propre
 * plan : sinon « Le cours » apparaîtrait deux fois. Elles sont vides — le
 * chapitre vient de naître.
 *
 * @param input - Instantiation data (templateId, classId, optional title)
 * @param userId - User creating the chapter
 * @param supabase - Supabase client
 * @returns Created chapter ID and instantiation record
 */
export async function instantiateTemplate(
	input: InstantiateTemplateInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<{ chapterId: string; instantiation: ChapterTemplateInstantiation }>> {
	try {
		const { data: template, error: templateError } = await supabase
			.from('chapter_templates')
			.select('title, color, icon, status')
			.eq('id', input.templateId)
			.single();

		if (templateError) {
			logger.error('[instantiateTemplate] Error fetching template:', templateError);
			return { data: null, error: new Error(templateError.message) };
		}

		// Publier, c'est dire « ce modèle est prêt à servir ». Sans cette garde, un
		// brouillon se répandait dans les classes, et publier ne voulait plus rien
		// dire ; un modèle archivé, lui, a été retiré de l'usage.
		if (template.status !== 'published') {
			return {
				data: null,
				error: new TemplateUnusableError(
					template.status === 'draft'
						? 'Un modèle en brouillon ne peut pas être utilisé : publiez-le d’abord.'
						: 'Un modèle archivé ne peut plus être utilisé.'
				)
			};
		}

		const { data: chapter, error: chapterError } = await supabase
			.from('class_chapters')
			.insert({
				class_id: input.classId,
				title: input.title ?? template.title,
				description: null,
				is_visible: input.isVisible ?? false,
				color: template.color,
				icon: template.icon,
				display_order: 0 // Will be updated by trigger or manually
			})
			.select()
			.single();

		if (chapterError) {
			logger.error('[instantiateTemplate] Error creating chapter:', chapterError);
			return { data: null, error: new Error(chapterError.message) };
		}

		const chapterId = chapter.id;

		const { error: linkError } = await supabase.rpc('link_chapter_to_template', {
			p_chapter_id: chapterId,
			p_template_id: input.templateId
		});

		const { data: instantiation, error: instError } = linkError
			? { data: null, error: linkError }
			: await supabase
					.from('chapter_template_instantiations')
					.select('*')
					.eq('chapter_id', chapterId)
					.single();

		if (instError || !instantiation) {
			logger.error('[instantiateTemplate] Lien impossible :', instError);
			// Un chapitre vide et sans modèle ne doit pas rester dans la classe.
			const { data: supprime, error: rollbackError } = await supabase
				.from('class_chapters')
				.delete()
				.eq('id', chapterId)
				.select('id');
			if (rollbackError || !supprime || supprime.length !== 1) {
				logger.error('[instantiateTemplate] Chapitre orphelin non supprimé :', chapterId);
			}
			return { data: null, error: new Error(instError?.message ?? 'Lien impossible') };
		}

		await dropSeededSections(chapterId, supabase);

		return {
			data: {
				chapterId,
				instantiation: dbInstantiationToApp(instantiation as DbChapterTemplateInstantiation)
			},
			error: null
		};
	} catch (err) {
		logger.error('[instantiateTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

// ============================================================================
// MIGRATION OPERATIONS
// ============================================================================

/**
 * L'instanciation d'un chapitre, TELLE QUE L'ÉCRAN doit la voir — ou `null`.
 *
 * ⚠️ Distincte de `checkForTemplateUpdates`, qui ne rend que « y a-t-il une
 * version plus récente ? » et répond `{ hasUpdate: false }` — un objet, donc
 * VRAI — même quand le chapitre n'a aucun modèle. Le passer tel quel à
 * l'affichage faisait apparaître l'étiquette « Template supprimé » sur tous les
 * chapitres créés à la main, et plantait la page sur le premier tooltip.
 *
 * Ici, pas de modèle ⇒ `null`. C'est la seule valeur qui dit « rien à
 * montrer », et l'écran n'a pas à l'interpréter.
 */
export async function getInstantiationWithStatus(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<InstantiationWithStatus | null>> {
	try {
		// `maybeSingle` : un chapitre créé de zéro n'a aucune instanciation, et
		// c'est le cas normal — une absence, pas une panne.
		const { data: row, error } = await supabase
			.from('chapter_template_instantiations')
			.select('*')
			.eq('chapter_id', chapterId)
			.maybeSingle();

		if (error) {
			logger.error('[getInstantiationWithStatus] Erreur :', error);
			return { data: null, error: new Error(error.message) };
		}

		if (!row) {
			return { data: null, error: null };
		}

		// Le titre et la version courante du modèle. Un modèle supprimé laisse
		// l'instanciation en place : c'est une absence, que l'écran sait dire.
		const { data: template, error: templateError } = row.template_id
			? await supabase
					.from('chapter_templates')
					.select('title, current_version')
					.eq('id', row.template_id)
					.maybeSingle()
			: { data: null, error: null };

		if (templateError) {
			logger.error('[getInstantiationWithStatus] Modèle illisible :', templateError);
			return { data: null, error: new Error(templateError.message) };
		}

		const hasUpdate =
			template !== null &&
			row.current_template_version !== null &&
			template.current_version > row.current_template_version;

		// Le convertisseur du module fait la correspondance de colonnes : la
		// refaire à la main ici la laisserait diverger au prochain champ ajouté.
		return {
			data: {
				...dbInstantiationToApp(row),
				hasUpdate,
				latestVersion: hasUpdate ? template.current_version : null,
				templateTitle: template?.title ?? null
			},
			error: null
		};
	} catch (err) {
		logger.error('[getInstantiationWithStatus] Erreur inattendue :', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Check if a chapter's template has updates available
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @returns Update availability info
 */
export async function checkForTemplateUpdates(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<{ hasUpdate: boolean; latestVersion: number | null }>> {
	try {
		// ⚠️ `maybeSingle`, pas `single` : un chapitre créé de zéro n'a AUCUNE
		// instanciation, et c'est le cas normal. `.single()` rendait alors
		// PGRST116 — « 0 ligne » — traité comme une panne : 14 remontées d'erreur
		// en production sur la page de chapitre du professeur, entre le 13 et le
		// 15 septembre 2026, pour un chapitre qui n'a simplement pas de modèle.
		const { data: instantiation, error } = await supabase
			.from('chapter_template_instantiations')
			.select('template_id, template_version, current_template_version, is_detached')
			.eq('chapter_id', chapterId)
			.maybeSingle();

		if (error) {
			logger.error('[checkForTemplateUpdates] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		// Pas d'instanciation, détaché, ou modèle supprimé : rien à proposer.
		if (!instantiation || instantiation.is_detached || !instantiation.template_id) {
			return { data: { hasUpdate: false, latestVersion: null }, error: null };
		}

		// Get latest template version
		// Idem : un `template_id` qui ne pointe plus sur rien — modèle supprimé —
		// est une absence, pas une panne.
		const { data: template, error: templateError } = await supabase
			.from('chapter_templates')
			.select('current_version')
			.eq('id', instantiation.template_id)
			.maybeSingle();

		if (templateError) {
			logger.error('[checkForTemplateUpdates] Error fetching template:', templateError);
			return { data: null, error: new Error(templateError.message) };
		}

		if (!template) {
			return { data: { hasUpdate: false, latestVersion: null }, error: null };
		}

		const hasUpdate =
			instantiation.current_template_version !== null &&
			template.current_version > instantiation.current_template_version;

		return {
			data: {
				hasUpdate,
				latestVersion: hasUpdate ? template.current_version : null
			},
			error: null
		};
	} catch (err) {
		logger.error('[checkForTemplateUpdates] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Get migration preview showing what will change
 *
 * @param chapterId - Chapter ID
 * @param targetVersion - Target version (optional, defaults to latest)
 * @param supabase - Supabase client
 * @returns Migration preview with diff
 */
export async function getMigrationPreview(
	chapterId: string,
	targetVersion: number | undefined,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<MigrationPreview>> {
	try {
		// Get instantiation
		const { data: instantiation, error: instError } = await supabase
			.from('chapter_template_instantiations')
			.select('id, template_id, template_version, current_template_version')
			.eq('chapter_id', chapterId)
			.single();

		if (instError || !instantiation.template_id) {
			logger.error('[getMigrationPreview] Error:', instError);
			return { data: null, error: new Error(instError?.message ?? 'Template not found') };
		}

		// Determine target version
		let finalTargetVersion = targetVersion;
		if (!finalTargetVersion) {
			const { data: template, error: templateError } = await supabase
				.from('chapter_templates')
				.select('current_version')
				.eq('id', instantiation.template_id)
				.single();

			// Sans la version courante, l'aperçu compare contre la version déjà
			// instanciée : il annonce « aucun changement » quelle que soit la mise
			// à jour réellement disponible.
			if (templateError) {
				logger.error('[getMigrationPreview] Version courante illisible :', templateError);
				return { data: null, error: new Error(templateError.message) };
			}

			finalTargetVersion = template?.current_version ?? instantiation.template_version;
		}

		const fromVersion = instantiation.current_template_version ?? instantiation.template_version;

		// Get version snapshots
		const { data: fromVersionData, error: fromError } = await supabase
			.from('chapter_template_versions')
			.select('content_snapshot, change_summary')
			.eq('template_id', instantiation.template_id)
			.eq('version_number', fromVersion)
			.single();

		const { data: toVersionData, error: toError } = await supabase
			.from('chapter_template_versions')
			.select('content_snapshot, change_summary')
			.eq('template_id', instantiation.template_id)
			.eq('version_number', finalTargetVersion)
			.single();

		if (fromError || toError) {
			logger.error('[getMigrationPreview] Error fetching versions:', fromError ?? toError);
			return { data: null, error: new Error('Failed to fetch version data') };
		}

		// Compute diff
		const fromSnapshot = parseContentSnapshot(
			fromVersionData.content_snapshot as Record<string, unknown>
		);
		const toSnapshot = parseContentSnapshot(
			toVersionData.content_snapshot as Record<string, unknown>
		);
		const diff = computeDiff(fromSnapshot, toSnapshot);

		return {
			data: {
				instantiationId: instantiation.id,
				chapterId,
				fromVersion,
				toVersion: finalTargetVersion,
				diff,
				changeSummary: toVersionData.change_summary
			},
			error: null
		};
	} catch (err) {
		logger.error('[getMigrationPreview] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Migrate a chapter to a new template version
 *
 * @param chapterId - Chapter ID
 * @param targetVersion - Target version number
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function migrateChapterToVersion(
	chapterId: string,
	targetVersion: number,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	try {
		// Get instantiation
		const { data: instantiation, error: instError } = await supabase
			.from('chapter_template_instantiations')
			.select('template_id, current_template_version')
			.eq('chapter_id', chapterId)
			.single();

		if (instError || !instantiation.template_id) {
			logger.error('[migrateChapterToVersion] Error:', instError);
			return { error: new Error(instError?.message ?? 'Template not found') };
		}

		const refus = await refuseLegacyVersioning(instantiation.template_id, chapterId, supabase);
		if (refus) return { error: refus };

		// Get target version content
		const { data: versionData, error: versionError } = await supabase
			.from('chapter_template_versions')
			.select('content_snapshot')
			.eq('template_id', instantiation.template_id)
			.eq('version_number', targetVersion)
			.single();

		if (versionError) {
			logger.error('[migrateChapterToVersion] Error fetching version:', versionError);
			return { error: new Error(versionError.message) };
		}

		// On N'EFFACE PLUS. Voir `mergeContentSnapshotIntoChapter` : supprimer
		// puis recréer perdait ce que le professeur avait ajouté à la main, et
		// effaçait `published_at` — les élèves voyaient le chapitre se vider.
		const snapshot = parseContentSnapshot(versionData.content_snapshot as Record<string, unknown>);
		const applyResult = await mergeContentSnapshotIntoChapter(chapterId, snapshot, supabase);

		if (applyResult.error) {
			return { error: applyResult.error };
		}

		// Update instantiation record
		const { error: updateError } = await supabase
			.from('chapter_template_instantiations')
			.update({
				current_template_version: targetVersion,
				last_migrated_at: new Date().toISOString()
			})
			.eq('chapter_id', chapterId);

		if (updateError) {
			logger.error('[migrateChapterToVersion] Error updating instantiation:', updateError);
			return { error: new Error(updateError.message) };
		}

		return { error: null };
	} catch (err) {
		logger.error('[migrateChapterToVersion] Unexpected error:', err);
		return { error: err as Error };
	}
}

/**
 * Détacher un chapitre de son modèle (ADR 0029, comportement 15).
 *
 * Le contenu relié devient celui du chapitre, avec sa publication, sa section et
 * son ordre : ses élèves ne perdent rien.
 *
 * 1. Chaque fichier relié (`templates/…`) est COPIÉ chez le chapitre
 *    (`chapters/<id>/…`). Une copie en échec arrête tout AVANT de délier : un
 *    lien gardé vaut mieux qu'un document sans fichier.
 * 2. Chaque document copié se délie en pointant sa copie (la base l'autorise
 *    quand `source_id` passe à vide).
 * 3. Toutes les autres lignes de lien se délient, sections EN DERNIER.
 * 4. L'instanciation est marquée détachée : le modèle ne diffuse plus rien ici.
 *
 * Rejouable : une étape interrompue laisse des lignes déjà autonomes (avec leur
 * fichier) et d'autres encore reliées, que l'appel suivant reprend.
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client (droits du professeur)
 * @returns Success status
 */
export async function detachChapterFromTemplate(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	try {
		const { data: instantiation, error: instError } = await supabase
			.from('chapter_template_instantiations')
			.select('id, is_detached')
			.eq('chapter_id', chapterId)
			.maybeSingle();

		if (instError) {
			logger.error('[detachChapterFromTemplate] Rattachement illisible :', instError);
			return { error: new Error(instError.message) };
		}
		if (!instantiation) {
			return { error: new Error('Ce chapitre n’est lié à aucun modèle.') };
		}
		if (instantiation.is_detached) {
			return { error: null };
		}

		// Les sections que ce chapitre masque : leur masquage TIENT au détachement
		// (décision du 2026-10-14). Leur contenu reste masqué, non publié, et
		// revient quand la section est réaffichée.
		const { data: masquees, error: masqueesError } = await supabase
			.from('chapter_sections')
			.select('id')
			.eq('chapter_id', chapterId)
			.eq('hidden', true);

		if (masqueesError) {
			logger.error('[detachChapterFromTemplate] Sections illisibles :', masqueesError);
			return { error: new Error(masqueesError.message) };
		}
		const sectionsMasquees = new Set((masquees ?? []).map((s) => s.id));
		/** Un élément d'une section masquée garde son masquage ; les autres le perdent. */
		const resteMasque = (sectionId: string | null) =>
			sectionId !== null && sectionsMasquees.has(sectionId);

		// 1. Copier les fichiers reliés.
		const { data: documents, error: docsError } = await supabase
			.from('chapter_documents')
			.select('id, source_type, storage_path, section_id')
			.eq('chapter_id', chapterId)
			.not('source_id', 'is', null);

		if (docsError) {
			logger.error('[detachChapterFromTemplate] Documents illisibles :', docsError);
			return { error: new Error(docsError.message) };
		}

		const owner = { kind: 'chapter', id: chapterId } as const;
		const copies: { id: string; path: string; sectionId: string | null }[] = [];
		for (const [rang, doc] of (documents ?? []).entries()) {
			if (doc.source_type !== 'upload' || !doc.storage_path) continue;
			const { path, error: copyError } = await copyStoredFile(
				doc.storage_path,
				owner,
				String(rang),
				supabase
			);
			if (copyError || !path) {
				await removeStoredFiles(
					copies.map((c) => c.path),
					supabase
				);
				return {
					error: new Error('Copie des fichiers impossible : le chapitre reste lié au modèle.')
				};
			}
			copies.push({ id: doc.id, path, sectionId: doc.section_id });
		}

		// 2. Les documents copiés se délient en pointant leur copie.
		for (const copie of copies) {
			const { data, error } = await supabase
				.from('chapter_documents')
				.update(
					resteMasque(copie.sectionId)
						? { source_id: null, storage_path: copie.path }
						: { source_id: null, storage_path: copie.path, hidden: false }
				)
				.eq('id', copie.id)
				.eq('chapter_id', chapterId)
				.select('id');
			if (error || !data || data.length !== 1) {
				logger.error('[detachChapterFromTemplate] Document non délié :', copie.id, error);
				return { error: new Error(error?.message ?? 'Document non délié') };
			}
		}

		// 3. Le reste, sections en dernier : les éléments y sont rangés.
		// Un élément masqué SEUL redevient visible du professeur, NON publié
		// (masqué l'était déjà) : sans ça, il resterait figé, ni démasquable (ce
		// n'est plus un lien) ni publiable (la base refuse un élément masqué
		// publié). Un élément d'une section masquée, lui, reste masqué : la
		// section le fera revenir. Une section garde son propre masquage.
		const masqueesListe = [...sectionsMasquees];
		for (const table of LINKED_TABLES_SECTIONS_LAST) {
			let error: { message: string } | null = null;
			if (table !== 'chapter_sections') {
				// a. Hors section masquée : délié ET démasqué.
				let horsMasquees = supabase
					.from(table)
					.update({ source_id: null, hidden: false })
					.eq('chapter_id', chapterId)
					.not('source_id', 'is', null);
				if (masqueesListe.length > 0) {
					horsMasquees = horsMasquees.or(
						`section_id.is.null,section_id.not.in.(${masqueesListe.join(',')})`
					);
				}
				({ error } = await horsMasquees);
			}
			// b. Le reste (sections, et éléments des sections masquées) : délié seulement.
			if (!error) {
				({ error } = await supabase
					.from(table)
					.update({ source_id: null })
					.eq('chapter_id', chapterId)
					.not('source_id', 'is', null));
			}
			if (error) {
				logger.error(`[detachChapterFromTemplate] ${table} non délié :`, error);
				return { error: new Error(error.message) };
			}

			// La RLS échoue en silence : on ne sait pas combien de lignes devaient
			// changer, on vérifie donc qu'il n'en RESTE aucune.
			const { data: restantes, error: checkError } = await supabase
				.from(table)
				.select('id')
				.eq('chapter_id', chapterId)
				.not('source_id', 'is', null)
				.limit(1);
			if (checkError || (restantes ?? []).length > 0) {
				logger.error(`[detachChapterFromTemplate] ${table} : liens restants`, checkError);
				return { error: new Error(`Détachement incomplet (${table})`) };
			}
		}

		// 4. Le modèle ne diffuse plus rien à ce chapitre.
		const { data: detache, error } = await supabase
			.from('chapter_template_instantiations')
			.update({ is_detached: true })
			.eq('chapter_id', chapterId)
			.select('id');

		if (error || !detache || detache.length !== 1) {
			logger.error('[detachChapterFromTemplate] Error:', error);
			return { error: new Error(error?.message ?? 'Rattachement non modifié') };
		}

		return { error: null };
	} catch (err) {
		logger.error('[detachChapterFromTemplate] Unexpected error:', err);
		return { error: err as Error };
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract content snapshot from an existing chapter
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @returns Content snapshot
 */
export async function extractContentSnapshotFromChapter(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<TemplateContentSnapshot>> {
	try {
		// ⚠️ Ce snapshot est ÉCRIT en base comme version du modèle. Une section
		// illisible produisait un modèle amputé — silencieusement, et hérité par
		// toutes les instanciations futures.
		const [documentsRes, checklistItemsRes, exercisesRes, worksheetsRes] = await Promise.all([
			supabase
				.from('chapter_documents')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order', { ascending: true }),
			supabase
				.from('chapter_checklist_items')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order', { ascending: true }),
			supabase
				.from('chapter_exercises')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order', { ascending: true }),
			supabase
				.from('chapter_worksheets')
				.select('*')
				.eq('chapter_id', chapterId)
				.order('display_order', { ascending: true })
		]);

		const sectionEnEchec = [documentsRes, checklistItemsRes, exercisesRes, worksheetsRes].find(
			(r) => r.error
		);
		if (sectionEnEchec?.error) {
			logger.error('[extractContentSnapshot] Section illisible :', sectionEnEchec.error);
			return { data: null, error: new Error(sectionEnEchec.error.message) };
		}

		const documents = documentsRes.data;
		const checklistItems = checklistItemsRes.data;
		const exercises = exercisesRes.data;
		const worksheets = worksheetsRes.data;

		// Build snapshot
		const snapshot: TemplateContentSnapshot = {
			documents: (documents || []).map((doc) => ({
				title: doc.title,
				description: doc.description,
				documentUrl:
					doc.source_type === 'google_drive'
						? doc.google_drive_url!
						: `storage://${doc.storage_path}`, // Reference for uploaded files
				sourceType: doc.source_type === 'google_drive' ? 'google_drive' : 'external_url',
				mimeType: doc.mime_type,
				displayOrder: doc.display_order
			})),
			checklistItems: (checklistItems || []).map((item) => ({
				content: item.content,
				description: item.description,
				displayOrder: item.display_order
			})),
			exercises: (exercises || []).map((ex) => ({
				exerciseId: ex.exercise_id,
				displayOrder: ex.display_order
			})),
			// `published_at` n'est PAS repris : la publication appartient à la
			// classe, pas au modèle. Un contenu arrivant par instanciation ou par
			// mise à jour est donc préparé, jamais donné.
			worksheets: (worksheets || []).map((w) => ({
				worksheetId: w.worksheet_id,
				displayOrder: w.display_order
			}))
		};

		return { data: snapshot, error: null };
	} catch (err) {
		logger.error('[extractContentSnapshotFromChapter] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Réconcilie le chapitre avec ce que le modèle apporte : ajoute ce qui manque,
 * met à jour ce qui a changé, ne supprime JAMAIS rien.
 *
 * Remplace l'ancienne mise à jour, qui supprimait les quatre contenus du
 * chapitre avant de réappliquer le modèle. Trois dégâts, dont le dernier est né
 * de la publication au fur et à mesure :
 *
 * 1. ce que le professeur avait ajouté à la main dans CETTE classe
 *    disparaissait — le modèle est un point de départ, pas une laisse ;
 * 2. les quatre suppressions ne lisaient pas leur erreur : l'une pouvait
 *    échouer sans un mot, et la reconstruction se faisait par-dessus ;
 * 3. supprimer puis recréer effaçait `published_at` — les élèves voyaient le
 *    chapitre se vider d'un coup, en plein cours.
 *
 * CE QUI SE PROPAGE, ET CE QUI NE SE PROPAGE PAS :
 *
 * - le **contenu** d'un élément déjà présent est mis à jour (titre d'un
 *   document, barème d'une question, description d'un objectif). Sans ça, une
 *   correction dans le modèle ne redescendrait jamais — et le chapitre serait
 *   quand même marqué à jour, donc plus aucun bouton pour réessayer ;
 * - l'**ordre d'affichage** ne se propage pas, et `published_at` non plus. Les
 *   deux appartiennent à la classe : le professeur y range et y publie à son
 *   rythme, une mise à jour de modèle n'a pas à défaire ça ;
 * - un élément **retiré** du modèle reste dans les chapitres déjà créés. C'est
 *   le revers assumé de « ne plus rien effacer ».
 *
 * Chaque type a sa clé de reconnaissance : l'identifiant référencé pour les
 * exercices, fiches et questions ; le texte pour les objectifs ; l'URL pour les
 * documents, qui n'ont pas d'identifiant partagé.
 *
 * ⚠️ Limite connue : un objectif dont le professeur corrige le TEXTE n'est plus
 * reconnu, et la mise à jour suivante réinsère la version du modèle — l'élève
 * voit alors deux objectifs voisins. Rien en base ne l'en empêche
 * (`chapter_checklist_items` n'a aucune contrainte d'unicité). Fermer ça
 * suppose de donner une origine traçable aux objectifs issus d'un modèle, donc
 * une migration : décision en attente.
 */
export async function mergeContentSnapshotIntoChapter(
	chapterId: string,
	snapshot: TemplateContentSnapshot,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	// Ce que le chapitre contient DÉJÀ. Une lecture en échec ne doit surtout pas
	// passer pour « chapitre vide » : la fusion réinsérerait tout, en double.
	const [documentsRes, checklistRes, exercisesRes, worksheetsRes] = await Promise.all([
		supabase
			.from('chapter_documents')
			.select('id, google_drive_url, title, description, mime_type, display_order')
			.eq('chapter_id', chapterId),
		supabase
			.from('chapter_checklist_items')
			.select('id, content, description, display_order')
			.eq('chapter_id', chapterId),
		supabase
			.from('chapter_exercises')
			.select('id, exercise_id, display_order')
			.eq('chapter_id', chapterId),
		supabase
			.from('chapter_worksheets')
			.select('id, worksheet_id, display_order')
			.eq('chapter_id', chapterId)
	]);

	const lectureEnEchec = [documentsRes, checklistRes, exercisesRes, worksheetsRes].find(
		(r) => r.error
	);
	if (lectureEnEchec?.error) {
		logger.error('[mergeContentSnapshotIntoChapter] Contenu illisible :', lectureEnEchec.error);
		return { error: new Error(lectureEnEchec.error.message) };
	}

	/**
	 * Les nouveautés se rangent APRÈS l'existant.
	 *
	 * Réutiliser le rang du modèle produirait des égalités avec les ajouts faits
	 * à la main (qui prennent `max + 1` dans le chapitre), et les requêtes
	 * d'affichage trient sur ce seul champ : à égalité, l'ordre devient
	 * arbitraire et peut changer d'un chargement à l'autre.
	 */
	const rangSuivant = (rangs: { display_order: number }[]) =>
		rangs.reduce((max, r) => Math.max(max, r.display_order), -1) + 1;

	// --- Documents : reconnus par leur URL -----------------------------------
	const documentsParUrl = new Map((documentsRes.data ?? []).map((d) => [d.google_drive_url, d]));
	let rang = rangSuivant(documentsRes.data ?? []);
	for (const doc of snapshot.documents) {
		const existant = documentsParUrl.get(doc.documentUrl);
		if (existant) {
			if (existant.title !== doc.title || existant.description !== doc.description) {
				const { error } = await supabase
					.from('chapter_documents')
					.update({ title: doc.title, description: doc.description, mime_type: doc.mimeType })
					.eq('id', existant.id);
				if (error) {
					logger.error('[mergeContentSnapshotIntoChapter] Document non mis à jour :', error);
					return { error: new Error(error.message) };
				}
			}
			continue;
		}
		const { error } = await supabase.from('chapter_documents').insert({
			chapter_id: chapterId,
			title: doc.title,
			description: doc.description,
			// Les documents d'un modèle sont des références, jamais des fichiers
			// recopiés — l'idiome retenu à la création des modèles.
			source_type: 'google_drive',
			google_drive_url: doc.documentUrl,
			mime_type: doc.mimeType,
			display_order: rang++
		});
		if (error) {
			logger.error('[mergeContentSnapshotIntoChapter] Document non ajouté :', error);
			return { error: new Error(error.message) };
		}
	}

	// --- Objectifs : reconnus par leur texte ---------------------------------
	const objectifsParTexte = new Map((checklistRes.data ?? []).map((c) => [c.content, c]));
	rang = rangSuivant(checklistRes.data ?? []);
	for (const item of snapshot.checklistItems) {
		const existant = objectifsParTexte.get(item.content);
		if (existant) {
			if (existant.description !== item.description) {
				const { error } = await supabase
					.from('chapter_checklist_items')
					.update({ description: item.description })
					.eq('id', existant.id);
				if (error) {
					logger.error('[mergeContentSnapshotIntoChapter] Objectif non mis à jour :', error);
					return { error: new Error(error.message) };
				}
			}
			continue;
		}
		const { error } = await supabase.from('chapter_checklist_items').insert({
			chapter_id: chapterId,
			content: item.content,
			description: item.description,
			display_order: rang++
		});
		if (error) {
			logger.error('[mergeContentSnapshotIntoChapter] Objectif non ajouté :', error);
			return { error: new Error(error.message) };
		}
	}

	// --- Exercices et fiches : de pures références, rien à mettre à jour ------
	const exercicesPresents = new Set((exercisesRes.data ?? []).map((e) => e.exercise_id));
	rang = rangSuivant(exercisesRes.data ?? []);
	for (const ex of snapshot.exercises) {
		if (exercicesPresents.has(ex.exerciseId)) continue;
		const { error } = await supabase.from('chapter_exercises').insert({
			chapter_id: chapterId,
			exercise_id: ex.exerciseId,
			display_order: rang++
		});
		if (error) {
			logger.error('[mergeContentSnapshotIntoChapter] Exercice non ajouté :', error);
			return { error: new Error(error.message) };
		}
	}

	const fichesPresentes = new Set((worksheetsRes.data ?? []).map((w) => w.worksheet_id));
	rang = rangSuivant(worksheetsRes.data ?? []);
	for (const w of snapshot.worksheets) {
		if (fichesPresentes.has(w.worksheetId)) continue;
		// Rattachée, jamais publiée ni distribuée : `published_at` reste NULL et
		// la policy de l'élève exige en plus `student_has_worksheet_access`.
		const { error } = await supabase.from('chapter_worksheets').insert({
			chapter_id: chapterId,
			worksheet_id: w.worksheetId,
			display_order: rang++
		});
		if (error) {
			logger.error('[mergeContentSnapshotIntoChapter] Fiche non ajoutée :', error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

/**
 * Apply content snapshot to a chapter
 *
 * @param chapterId - Chapter ID
 * @param snapshot - Content snapshot to apply
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function applyContentSnapshotToChapter(
	chapterId: string,
	snapshot: TemplateContentSnapshot,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	try {
		// Insert documents (as refs, not uploaded files)
		if (snapshot.documents.length > 0) {
			const documentInserts = snapshot.documents.map((doc) => {
				// Handle storage:// references (from uploaded files in source chapter)
				const isStorageRef = doc.documentUrl.startsWith('storage://');
				const isGoogleDrive = doc.sourceType === 'google_drive';

				if (isGoogleDrive) {
					return {
						chapter_id: chapterId,
						title: doc.title,
						description: doc.description,
						source_type: 'google_drive' as const,
						google_drive_url: doc.documentUrl,
						display_order: doc.displayOrder,
						mime_type: doc.mimeType
					};
				} else {
					// External URL or storage ref (treat as external for now)
					return {
						chapter_id: chapterId,
						title: doc.title,
						description: doc.description,
						source_type: 'google_drive' as const, // Using google_drive type for external refs
						google_drive_url: isStorageRef ? doc.documentUrl : doc.documentUrl,
						display_order: doc.displayOrder,
						mime_type: doc.mimeType
					};
				}
			});

			const { error: docError } = await supabase
				.from('chapter_documents')
				.insert(
					documentInserts as unknown as Database['public']['Tables']['chapter_documents']['Insert'][]
				);

			if (docError) {
				logger.error('[applyContentSnapshotToChapter] Error inserting documents:', docError);
				return { error: new Error(docError.message) };
			}
		}

		// Insert checklist items
		if (snapshot.checklistItems.length > 0) {
			const checklistInserts = snapshot.checklistItems.map((item) => ({
				chapter_id: chapterId,
				content: item.content,
				description: item.description,
				display_order: item.displayOrder
			}));

			const { error: checklistError } = await supabase
				.from('chapter_checklist_items')
				.insert(checklistInserts);

			if (checklistError) {
				logger.error(
					'[applyContentSnapshotToChapter] Error inserting checklist items:',
					checklistError
				);
				return { error: new Error(checklistError.message) };
			}
		}

		// Insert exercises
		if (snapshot.exercises.length > 0) {
			const exerciseInserts = snapshot.exercises.map((ex) => ({
				chapter_id: chapterId,
				exercise_id: ex.exerciseId,
				display_order: ex.displayOrder
			}));

			const { error: exerciseError } = await supabase
				.from('chapter_exercises')
				.insert(exerciseInserts);

			if (exerciseError) {
				logger.error('[applyContentSnapshotToChapter] Error inserting exercises:', exerciseError);
				return { error: new Error(exerciseError.message) };
			}
		}

		// Les fiches du modèle : rattachées, JAMAIS distribuées ni publiées. La
		// policy de l'élève exige `student_has_worksheet_access` en plus du
		// rattachement, donc instancier un modèle ne donne rien à personne.
		if (snapshot.worksheets.length > 0) {
			const { error: worksheetError } = await supabase.from('chapter_worksheets').insert(
				snapshot.worksheets.map((w) => ({
					chapter_id: chapterId,
					worksheet_id: w.worksheetId,
					display_order: w.displayOrder
				}))
			);

			if (worksheetError) {
				logger.error('[applyContentSnapshotToChapter] Error inserting worksheets:', worksheetError);
				return { error: new Error(worksheetError.message) };
			}
		}

		return { error: null };
	} catch (err) {
		logger.error('[applyContentSnapshotToChapter] Unexpected error:', err);
		return { error: err as Error };
	}
}

// ============================================================================
// CONTENU POSSÉDÉ PAR LE MODÈLE (ADR 0029) — aides internes
// ============================================================================

/**
 * Lie le chapitre source au modèle qu'il vient de remplir, puis chacun de ses
 * éléments ADOPTE sa copie (`source_id`), sections d'abord : la base reprend le
 * contenu du modèle et garde l'identifiant, l'ordre, la section et la
 * publication du chapitre.
 *
 * Le modèle existe et il est complet : un échec ici ne le perd pas. Il est
 * tracé, et COMPTÉ : l'appelant avertit le professeur (un élément non adopté
 * reste propre au chapitre, et le modèle en a une copie).
 *
 * @returns Le nombre d'éléments que le chapitre n'a pas pu adopter
 */
async function adoptChapterContent(
	chapterId: string,
	templateId: string,
	mapping: ContentMapping,
	supabase: SupabaseClient<Database>
): Promise<number> {
	const { data: existing, error: existingError } = await supabase
		.from('chapter_template_instantiations')
		.select('id')
		.eq('chapter_id', chapterId)
		.maybeSingle();

	if (existingError) {
		logger.error('[adoptChapterContent] Rattachement illisible :', existingError);
		return mapping.length;
	}
	// Un chapitre ne porte qu'un rattachement : celui qui suit (ou a suivi) un
	// modèle garde le sien. Ce n'est pas un échec.
	if (existing) return 0;

	const { data: lien, error: linkError } = await supabase
		.from('chapter_template_instantiations')
		.insert({
			template_id: templateId,
			template_version: 1,
			chapter_id: chapterId,
			current_template_version: 1
		})
		.select('id');

	if (linkError || !lien || lien.length !== 1) {
		logger.error('[adoptChapterContent] Rattachement impossible :', linkError);
		return mapping.length;
	}

	return (await adoptMappedRows(chapterId, mapping, supabase)).length;
}

/**
 * Retire les six sections semées à la création d'un chapitre lié, quand le
 * modèle apporte son propre plan. Échec tracé, pas remonté : le chapitre est
 * créé, au pire avec quelques sections vides de trop.
 */
async function dropSeededSections(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<void> {
	const { data: liees, error } = await supabase
		.from('chapter_sections')
		.select('id')
		.eq('chapter_id', chapterId)
		.not('source_id', 'is', null)
		.limit(1);

	if (error) {
		logger.error('[dropSeededSections] Sections illisibles :', error);
		return;
	}
	if ((liees ?? []).length === 0) return;

	const { error: deleteError } = await supabase
		.from('chapter_sections')
		.delete()
		.eq('chapter_id', chapterId)
		.is('source_id', null)
		.select('id');

	if (deleteError) {
		logger.error('[dropSeededSections] Sections par défaut non retirées :', deleteError);
	}
}

/**
 * Le modèle possède-t-il du contenu en tables (une ligne `template_id`, sections
 * comprises, retirée ou non) ?
 */
async function templateOwnsContent(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: boolean | null; error: Error | null }> {
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const { data, error } = await supabase
			.from(table)
			.select('id')
			.eq('template_id', templateId)
			.limit(1);
		if (error) {
			logger.error(`[templateOwnsContent] ${table} illisible :`, error);
			return { data: null, error: new Error(error.message) };
		}
		if ((data ?? []).length > 0) return { data: true, error: null };
	}
	return { data: false, error: null };
}

/** Le chapitre a-t-il au moins une ligne de lien ? */
async function chapterHasLinks(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: boolean | null; error: Error | null }> {
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const { data, error } = await supabase
			.from(table)
			.select('id')
			.eq('chapter_id', chapterId)
			.not('source_id', 'is', null)
			.limit(1);
		if (error) {
			logger.error(`[chapterHasLinks] ${table} illisible :`, error);
			return { data: null, error: new Error(error.message) };
		}
		if ((data ?? []).length > 0) return { data: true, error: null };
	}
	return { data: false, error: null };
}

/**
 * L'ancien circuit des versions (« mettre à jour depuis un chapitre », nouvelle
 * version, migration) est refusé dès que le modèle possède son contenu OU que le
 * chapitre relie un modèle. Rend l'erreur à renvoyer, `null` si le circuit reste
 * permis.
 */
export async function refuseLegacyVersioning(
	templateId: string,
	chapterId: string | null,
	supabase: SupabaseClient<Database>
): Promise<Error | null> {
	const proprio = await templateOwnsContent(templateId, supabase);
	if (proprio.error) return proprio.error;
	if (proprio.data) return new TemplateLinkedContentError();

	if (chapterId) {
		const liens = await chapterHasLinks(chapterId, supabase);
		if (liens.error) return liens.error;
		if (liens.data) {
			return new TemplateLinkedContentError(
				'Ce chapitre relie un modèle : le modèle se modifie sur sa page, plus par versions.'
			);
		}
	}
	return null;
}

/**
 * Une ligne d'un chapitre relie-t-elle encore un élément de ce modèle ? Lu table
 * par table : les identifiants des éléments du modèle, puis une ligne dont
 * `source_id` en désigne un.
 */
async function templateIsLinked(
	templateId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: boolean | null; error: Error | null }> {
	for (const table of LINKED_TABLES_SECTIONS_LAST) {
		const { data: elements, error } = await supabase
			.from(table)
			.select('id')
			.eq('template_id', templateId);
		if (error) {
			logger.error(`[templateIsLinked] ${table} illisible :`, error);
			return { data: null, error: new Error(error.message) };
		}
		const ids = (elements ?? []).map((e) => e.id);
		if (ids.length === 0) continue;

		const { data: liens, error: liensError } = await supabase
			.from(table)
			.select('id')
			.in('source_id', ids)
			.limit(1);
		if (liensError) {
			logger.error(`[templateIsLinked] liens ${table} illisibles :`, liensError);
			return { data: null, error: new Error(liensError.message) };
		}
		if ((liens ?? []).length > 0) return { data: true, error: null };
	}
	return { data: false, error: null };
}

/**
 * Supprime les fichiers du dossier `templates/<id>/` d'un modèle SUPPRIMÉ, par le
 * client service. Strictement ce dossier : un nom qui en sortirait (sous-dossier,
 * `..`) est ignoré. Au mieux : un fichier restant est un déchet, tracé.
 */
async function removeTemplateFolder(templateId: string): Promise<void> {
	const service = createServiceRoleClient();
	const dossier = ownerStoragePrefix({ kind: 'template', id: templateId });
	const { data: fichiers, error } = await service.storage
		.from(CHAPTER_DOCUMENTS_BUCKET)
		.list(dossier.slice(0, -1), { limit: 1000 });

	if (error) {
		logger.error('[removeTemplateFolder] Fichiers illisibles :', error);
		return;
	}

	const chemins = (fichiers ?? [])
		// `id` nul = un sous-dossier, que la liste rend aussi.
		.filter((f) => f.id !== null && !f.name.includes('/') && !f.name.includes('..'))
		.map((f) => `${dossier}${f.name}`);
	if (chemins.length === 0) return;

	const { data: supprimes, error: removeError } = await service.storage
		.from(CHAPTER_DOCUMENTS_BUCKET)
		.remove(chemins);
	if (removeError || (supprimes ?? []).length !== chemins.length) {
		logger.error('[removeTemplateFolder] Fichiers non supprimés :', removeError);
	}
}
