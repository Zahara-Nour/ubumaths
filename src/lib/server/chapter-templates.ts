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
 * - Public/private template sharing
 *
 * @module server/chapter-templates
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import type {
	ChapterTemplate,
	ChapterTemplateVersion,
	ChapterTemplateInstantiation,
	TemplateSummary,
	TemplateContentSnapshot,
	TemplateDiff,
	DiffEntry,
	MigrationPreview,
	DbChapterTemplate,
	DbChapterTemplateVersion,
	DbChapterTemplateInstantiation
} from '$lib/types/chapter-templates';
import {
	dbTemplateToApp,
	dbTemplateVersionToApp,
	dbInstantiationToApp,
	parseContentSnapshot,
	hasContent,
	getContentCounts,
	EMPTY_CONTENT_SNAPSHOT
} from '$lib/types/chapter-templates';
import type {
	CreateChapterTemplateInput,
	CreateTemplateFromChapterInput,
	UpdateChapterTemplateInput,
	InstantiateTemplateInput,
	ListTemplatesQuery
} from '$lib/server/validation/chapter-templates';

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
				is_public: false,
				current_version: 1
			})
			.select()
			.single();

		if (error) {
			console.error('[createChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[createChapterTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Create a template from an existing chapter
 *
 * @param input - Template creation data with source chapter
 * @param userId - Creator's user ID
 * @param supabase - Supabase client
 * @returns Created template
 */
export async function createTemplateFromChapter(
	input: CreateTemplateFromChapterInput,
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		// Extract content snapshot from the chapter
		const snapshotResult = await extractContentSnapshotFromChapter(input.chapterId, supabase);

		if (snapshotResult.error) {
			return { data: null, error: snapshotResult.error };
		}

		// Get chapter metadata for defaults
		const { data: chapter, error: chapterError } = await supabase
			.from('class_chapters')
			.select('color, icon')
			.eq('id', input.chapterId)
			.single();

		if (chapterError) {
			console.error('[createTemplateFromChapter] Error fetching chapter:', chapterError);
			return { data: null, error: new Error(chapterError.message) };
		}

		// Create the template with extracted content
		const { data: template, error } = await supabase
			.from('chapter_templates')
			.insert({
				created_by: userId,
				title: input.title,
				description: input.description ?? null,
				grades: input.grades ?? [],
				color: chapter.color,
				icon: chapter.icon,
				content_snapshot: snapshotResult.data as unknown as Json,
				status: 'draft',
				is_public: false,
				current_version: 1
			})
			.select()
			.single();

		if (error) {
			console.error('[createTemplateFromChapter] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[createTemplateFromChapter] Unexpected error:', err);
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
			console.error('[getChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[getChapterTemplate] Unexpected error:', err);
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
			console.error('[updateChapterTemplate] Error fetching template:', fetchError);
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

		const updateData: Record<string, unknown> = {};

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
				console.error('[updateChapterTemplate] Error creating version:', versionError);
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
			console.error('[updateChapterTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[updateChapterTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

/**
 * Delete a chapter template (soft delete by archiving)
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
		// Archive instead of hard delete to preserve instantiation history
		const { error } = await supabase
			.from('chapter_templates')
			.update({ status: 'archived' })
			.eq('id', templateId);

		if (error) {
			console.error('[deleteChapterTemplate] Error:', error);
			return { error: new Error(error.message) };
		}

		return { error: null };
	} catch (err) {
		console.error('[deleteChapterTemplate] Unexpected error:', err);
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

		// Filter: own templates OR public published templates
		if (query.ownOnly) {
			dbQuery = dbQuery.eq('created_by', userId);
		} else if (query.publicOnly) {
			dbQuery = dbQuery.eq('is_public', true).eq('status', 'published');
		} else {
			// Default: own + public published
			dbQuery = dbQuery.or(`created_by.eq.${userId},and(is_public.eq.true,status.eq.published)`);
		}

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
			console.error('[listChapterTemplates] Error:', error);
			return { data: [], error: new Error(error.message), count: 0 };
		}

		const templates: TemplateSummary[] = (data || []).map((row) => {
			const template = dbTemplateToApp(row as unknown as DbChapterTemplate);
			const counts = getContentCounts(template.contentSnapshot);
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
				isPublic: template.isPublic,
				instantiationCount: template.instantiationCount,
				currentVersion: template.currentVersion,
				createdAt: template.createdAt,
				updatedAt: template.updatedAt,
				creatorName: profile?.full_name ?? null,
				isOwner: template.createdBy === userId,
				documentCount: counts.documentCount,
				quizQuestionCount: counts.quizQuestionCount,
				checklistItemCount: counts.checklistItemCount,
				exerciseCount: counts.exerciseCount
			};
		});

		return { data: templates, error: null, count: count ?? 0 };
	} catch (err) {
		console.error('[listChapterTemplates] Unexpected error:', err);
		return { data: [], error: err as Error, count: 0 };
	}
}

// ============================================================================
// PUBLISHING OPERATIONS
// ============================================================================

/**
 * Publish a template (validates content exists)
 *
 * @param templateId - Template ID
 * @param isPublic - Whether to make template public
 * @param supabase - Supabase client
 * @returns Updated template
 */
export async function publishTemplate(
	templateId: string,
	isPublic: boolean,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterTemplate>> {
	try {
		// Get template to validate content
		const { data: template, error: fetchError } = await supabase
			.from('chapter_templates')
			.select('content_snapshot')
			.eq('id', templateId)
			.single();

		if (fetchError) {
			console.error('[publishTemplate] Error fetching template:', fetchError);
			return { data: null, error: new Error(fetchError.message) };
		}

		// Validate content exists
		const snapshot = parseContentSnapshot(template.content_snapshot as Record<string, unknown>);
		if (!hasContent(snapshot)) {
			return {
				data: null,
				error: new Error(
					'Cannot publish empty template. Add at least one document, quiz question, checklist item, or exercise.'
				)
			};
		}

		// Publish the template
		const { data: updated, error } = await supabase
			.from('chapter_templates')
			.update({
				status: 'published',
				is_public: isPublic
			})
			.eq('id', templateId)
			.select()
			.single();

		if (error) {
			console.error('[publishTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(updated as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[publishTemplate] Unexpected error:', err);
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
			console.error('[archiveTemplate] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateToApp(template as DbChapterTemplate), error: null };
	} catch (err) {
		console.error('[archiveTemplate] Unexpected error:', err);
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
		// Get current template to get previous version
		const { data: template, error: fetchError } = await supabase
			.from('chapter_templates')
			.select('content_snapshot, current_version')
			.eq('id', templateId)
			.single();

		if (fetchError) {
			console.error('[createTemplateVersion] Error fetching template:', fetchError);
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
			console.error('[createTemplateVersion] Error creating version:', versionError);
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
			console.error('[createTemplateVersion] Error updating template:', updateError);
			return { data: null, error: new Error(updateError.message) };
		}

		return { data: dbTemplateVersionToApp(version as DbChapterTemplateVersion), error: null };
	} catch (err) {
		console.error('[createTemplateVersion] Unexpected error:', err);
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
			console.error('[getTemplateVersions] Error:', error);
			return { data: [], error: new Error(error.message), count: 0 };
		}

		const versions = (data || []).map((row) =>
			dbTemplateVersionToApp(row as DbChapterTemplateVersion)
		);

		return { data: versions, error: null, count: versions.length };
	} catch (err) {
		console.error('[getTemplateVersions] Unexpected error:', err);
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
			console.error('[getTemplateVersion] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: dbTemplateVersionToApp(version as DbChapterTemplateVersion), error: null };
	} catch (err) {
		console.error('[getTemplateVersion] Unexpected error:', err);
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

	// Quiz questions: keyed by questionTemplateId
	const quizDiffs = diffArray(
		oldSnapshot.quizQuestions,
		newSnapshot.quizQuestions,
		(q) => q.questionTemplateId,
		(a, b) => a.pointsOverride === b.pointsOverride && a.displayOrder === b.displayOrder
	);

	// Checklist items: keyed by content hash (since they're copied)
	const checklistDiffs = diffArray(
		oldSnapshot.checklistItems,
		newSnapshot.checklistItems,
		(item) => `${item.content}-${item.displayOrder}`,
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

	// Compute stats
	const stats = {
		documentsAdded: documentDiffs.filter((d) => d.type === 'added').length,
		documentsRemoved: documentDiffs.filter((d) => d.type === 'removed').length,
		documentsModified: documentDiffs.filter((d) => d.type === 'modified').length,
		quizQuestionsAdded: quizDiffs.filter((d) => d.type === 'added').length,
		quizQuestionsRemoved: quizDiffs.filter((d) => d.type === 'removed').length,
		quizQuestionsModified: quizDiffs.filter((d) => d.type === 'modified').length,
		checklistItemsAdded: checklistDiffs.filter((d) => d.type === 'added').length,
		checklistItemsRemoved: checklistDiffs.filter((d) => d.type === 'removed').length,
		checklistItemsModified: checklistDiffs.filter((d) => d.type === 'modified').length,
		exercisesAdded: exerciseDiffs.filter((d) => d.type === 'added').length,
		exercisesRemoved: exerciseDiffs.filter((d) => d.type === 'removed').length,
		exercisesModified: exerciseDiffs.filter((d) => d.type === 'modified').length
	};

	return {
		documents: documentDiffs,
		quizQuestions: quizDiffs,
		checklistItems: checklistDiffs,
		exercises: exerciseDiffs,
		stats
	};
}

// ============================================================================
// INSTANTIATION OPERATIONS
// ============================================================================

/**
 * Instantiate a template into a chapter
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
		// Get template
		const { data: template, error: templateError } = await supabase
			.from('chapter_templates')
			.select('title, content_snapshot, current_version, color, icon')
			.eq('id', input.templateId)
			.single();

		if (templateError) {
			console.error('[instantiateTemplate] Error fetching template:', templateError);
			return { data: null, error: new Error(templateError.message) };
		}

		const snapshot = parseContentSnapshot(template.content_snapshot as Record<string, unknown>);
		const chapterTitle = input.title ?? template.title;

		// Create the chapter
		const { data: chapter, error: chapterError } = await supabase
			.from('class_chapters')
			.insert({
				class_id: input.classId,
				teacher_id: userId,
				title: chapterTitle,
				description: null,
				is_visible: input.isVisible ?? false,
				color: template.color,
				icon: template.icon,
				display_order: 0 // Will be updated by trigger or manually
			})
			.select()
			.single();

		if (chapterError) {
			console.error('[instantiateTemplate] Error creating chapter:', chapterError);
			return { data: null, error: new Error(chapterError.message) };
		}

		const chapterId = chapter.id;

		// Apply content snapshot to chapter
		const applyResult = await applyContentSnapshotToChapter(chapterId, snapshot, supabase);

		if (applyResult.error) {
			// Rollback: delete the chapter
			await supabase.from('class_chapters').delete().eq('id', chapterId);
			return { data: null, error: applyResult.error };
		}

		// Create instantiation record
		const { data: instantiation, error: instError } = await supabase
			.from('chapter_template_instantiations')
			.insert({
				template_id: input.templateId,
				template_version: template.current_version,
				chapter_id: chapterId,
				current_template_version: template.current_version,
				is_detached: false
			})
			.select()
			.single();

		if (instError) {
			console.error('[instantiateTemplate] Error creating instantiation:', instError);
			// Rollback: delete the chapter
			await supabase.from('class_chapters').delete().eq('id', chapterId);
			return { data: null, error: new Error(instError.message) };
		}

		return {
			data: {
				chapterId,
				instantiation: dbInstantiationToApp(instantiation as DbChapterTemplateInstantiation)
			},
			error: null
		};
	} catch (err) {
		console.error('[instantiateTemplate] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
}

// ============================================================================
// MIGRATION OPERATIONS
// ============================================================================

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
		const { data: instantiation, error } = await supabase
			.from('chapter_template_instantiations')
			.select('template_id, template_version, current_template_version, is_detached')
			.eq('chapter_id', chapterId)
			.single();

		if (error) {
			console.error('[checkForTemplateUpdates] Error:', error);
			return { data: null, error: new Error(error.message) };
		}

		// If detached or template deleted, no updates
		if (instantiation.is_detached || !instantiation.template_id) {
			return { data: { hasUpdate: false, latestVersion: null }, error: null };
		}

		// Get latest template version
		const { data: template, error: templateError } = await supabase
			.from('chapter_templates')
			.select('current_version')
			.eq('id', instantiation.template_id)
			.single();

		if (templateError) {
			console.error('[checkForTemplateUpdates] Error fetching template:', templateError);
			return { data: null, error: new Error(templateError.message) };
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
		console.error('[checkForTemplateUpdates] Unexpected error:', err);
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
			console.error('[getMigrationPreview] Error:', instError);
			return { data: null, error: new Error(instError?.message ?? 'Template not found') };
		}

		// Determine target version
		let finalTargetVersion = targetVersion;
		if (!finalTargetVersion) {
			const { data: template } = await supabase
				.from('chapter_templates')
				.select('current_version')
				.eq('id', instantiation.template_id)
				.single();

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
			console.error('[getMigrationPreview] Error fetching versions:', fromError ?? toError);
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
		console.error('[getMigrationPreview] Unexpected error:', err);
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
			console.error('[migrateChapterToVersion] Error:', instError);
			return { error: new Error(instError?.message ?? 'Template not found') };
		}

		// Get target version content
		const { data: versionData, error: versionError } = await supabase
			.from('chapter_template_versions')
			.select('content_snapshot')
			.eq('template_id', instantiation.template_id)
			.eq('version_number', targetVersion)
			.single();

		if (versionError) {
			console.error('[migrateChapterToVersion] Error fetching version:', versionError);
			return { error: new Error(versionError.message) };
		}

		// Clear existing chapter content (documents, quiz, checklist, exercises)
		await supabase.from('chapter_documents').delete().eq('chapter_id', chapterId);
		await supabase.from('chapter_quiz_questions').delete().eq('chapter_id', chapterId);
		await supabase.from('chapter_checklist_items').delete().eq('chapter_id', chapterId);
		await supabase.from('chapter_exercises').delete().eq('chapter_id', chapterId);

		// Apply new content
		const snapshot = parseContentSnapshot(versionData.content_snapshot as Record<string, unknown>);
		const applyResult = await applyContentSnapshotToChapter(chapterId, snapshot, supabase);

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
			console.error('[migrateChapterToVersion] Error updating instantiation:', updateError);
			return { error: new Error(updateError.message) };
		}

		return { error: null };
	} catch (err) {
		console.error('[migrateChapterToVersion] Unexpected error:', err);
		return { error: err as Error };
	}
}

/**
 * Detach a chapter from its template
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function detachChapterFromTemplate(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	try {
		const { error } = await supabase
			.from('chapter_template_instantiations')
			.update({ is_detached: true })
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[detachChapterFromTemplate] Error:', error);
			return { error: new Error(error.message) };
		}

		return { error: null };
	} catch (err) {
		console.error('[detachChapterFromTemplate] Unexpected error:', err);
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
		// Get documents
		const { data: documents } = await supabase
			.from('chapter_documents')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: true });

		// Get quiz questions
		const { data: quizQuestions } = await supabase
			.from('chapter_quiz_questions')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: true });

		// Get checklist items
		const { data: checklistItems } = await supabase
			.from('chapter_checklist_items')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: true });

		// Get exercises
		const { data: exercises } = await supabase
			.from('chapter_exercises')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: true });

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
			quizQuestions: (quizQuestions || []).map((q) => ({
				questionTemplateId: q.question_template_id,
				pointsOverride: q.points_override,
				displayOrder: q.display_order
			})),
			checklistItems: (checklistItems || []).map((item) => ({
				content: item.content,
				description: item.description,
				displayOrder: item.display_order
			})),
			exercises: (exercises || []).map((ex) => ({
				exerciseId: ex.exercise_id,
				displayOrder: ex.display_order
			}))
		};

		return { data: snapshot, error: null };
	} catch (err) {
		console.error('[extractContentSnapshotFromChapter] Unexpected error:', err);
		return { data: null, error: err as Error };
	}
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
				console.error('[applyContentSnapshotToChapter] Error inserting documents:', docError);
				return { error: new Error(docError.message) };
			}
		}

		// Insert quiz questions
		if (snapshot.quizQuestions.length > 0) {
			const quizInserts = snapshot.quizQuestions.map((q) => ({
				chapter_id: chapterId,
				question_template_id: q.questionTemplateId,
				points_override: q.pointsOverride,
				display_order: q.displayOrder
			}));

			const { error: quizError } = await supabase
				.from('chapter_quiz_questions')
				.insert(quizInserts);

			if (quizError) {
				console.error('[applyContentSnapshotToChapter] Error inserting quiz questions:', quizError);
				return { error: new Error(quizError.message) };
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
				console.error(
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
				console.error('[applyContentSnapshotToChapter] Error inserting exercises:', exerciseError);
				return { error: new Error(exerciseError.message) };
			}
		}

		return { error: null };
	} catch (err) {
		console.error('[applyContentSnapshotToChapter] Unexpected error:', err);
		return { error: err as Error };
	}
}
