/**
 * Chapter Templates Server Functions
 * ====================================
 *
 * Server-side functions for managing chapter templates and instantiations.
 *
 * Features:
 * - CRUD operations for templates (draft/published/archived lifecycle)
 * - Chapitre lié à un modèle (ADR 0029) : le modèle possède son contenu, le
 *   chapitre le relie ; créer, faire un modèle d'un chapitre, détacher
 *
 * @module server/chapter-templates
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesUpdate } from '$lib/types/database';
import type {
	ChapterTemplate,
	ChapterTemplateInstantiation,
	TemplateSummary,
	InstantiationWithStatus,
	DbChapterTemplate
} from '$lib/types/chapter-templates';
import { dbTemplateToApp, dbInstantiationToApp } from '$lib/types/chapter-templates';
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
 * Les colonnes lues d'une instanciation. Pas `*` : la table porte encore les
 * colonnes de l'ancien système de versions, que le code ne doit plus lire.
 */
const INSTANTIATION_COLUMNS = 'id, template_id, chapter_id, is_detached, instantiated_at';

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
		// `content_snapshot` et `current_version` (ancien système de versions)
		// gardent leur valeur par défaut : plus rien ne les lit.
		const { data: template, error } = await supabase
			.from('chapter_templates')
			.insert({
				created_by: userId,
				title: input.title,
				description: input.description ?? null,
				grades: input.grades ?? [],
				color: input.color ?? null,
				icon: input.icon ?? null,
				status: 'draft'
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
				status: 'draft'
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
 * Modifier le titre, la description, les niveaux, la couleur ou l'icône d'un
 * modèle, quel que soit son statut. Son contenu, lui, se modifie dans les
 * tables (ADR 0029), par les actions de contenu de sa page.
 *
 * @param templateId - Template ID
 * @param input - Update data
 * @param supabase - Supabase client
 * @returns Updated template
 */
export async function updateChapterTemplate(
	templateId: string,
	input: UpdateChapterTemplateInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		const updateData: TablesUpdate<'chapter_templates'> = {};

		if (input.title !== undefined) updateData.title = input.title;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.grades !== undefined) updateData.grades = input.grades;
		if (input.color !== undefined) updateData.color = input.color;
		if (input.icon !== undefined) updateData.icon = input.icon;

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
					.select(INSTANTIATION_COLUMNS)
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
				instantiation: dbInstantiationToApp(instantiation)
			},
			error: null
		};
	} catch (err) {
		logger.error('[instantiateTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

// ============================================================================
// RATTACHEMENT D'UN CHAPITRE
// ============================================================================

/**
 * L'instanciation d'un chapitre, TELLE QUE L'ÉCRAN doit la voir — ou `null`.
 *
 * ⚠️ Un objet « rien à signaler » passé à l'affichage pour un chapitre SANS
 * modèle faisait apparaître l'étiquette « Template supprimé » sur tous les
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
			.select(INSTANTIATION_COLUMNS)
			.eq('chapter_id', chapterId)
			.maybeSingle();

		if (error) {
			logger.error('[getInstantiationWithStatus] Erreur :', error);
			return { data: null, error: new Error(error.message) };
		}

		if (!row) {
			return { data: null, error: null };
		}

		// Le titre du modèle. Un modèle supprimé laisse l'instanciation en place :
		// c'est une absence, que l'écran sait dire.
		const { data: template, error: templateError } = row.template_id
			? await supabase
					.from('chapter_templates')
					.select('title')
					.eq('id', row.template_id)
					.maybeSingle()
			: { data: null, error: null };

		if (templateError) {
			logger.error('[getInstantiationWithStatus] Modèle illisible :', templateError);
			return { data: null, error: new Error(templateError.message) };
		}

		// Le convertisseur du module fait la correspondance de colonnes : la
		// refaire à la main ici la laisserait diverger au prochain champ ajouté.
		return {
			data: {
				...dbInstantiationToApp(row),
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
			// ⚠️ Colonne de l'ancien système de versions, encore NOT NULL sans
			// défaut : la base l'exige tant qu'elle n'est pas supprimée.
			template_version: 1,
			chapter_id: chapterId
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
