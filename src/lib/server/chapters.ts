/**
 * Chapter System Server Functions
 * ================================
 *
 * Server-side functions for managing class chapters, documents, checklists,
 * and exercises.
 *
 * Features:
 * - Teacher CRUD operations for chapters and content
 * - Student access to visible chapters with progress tracking
 * - Reordering support for all content types
 *
 * @module server/chapters
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesUpdate } from '$lib/types/database';
import type {
	ClassChapter,
	ChapterDocument,
	ChapterChecklistItem,
	StudentChecklistProgress,
	ChapterExercise,
	ChapterWorksheet,
	ChapterProgress,
	ChapterSummary,
	StudentChapterView
} from '$lib/types/chapters';
import type {
	CreateChapterInput,
	UpdateChapterInput,
	CreateDocumentInput,
	UpdateDocumentInput,
	CreateChecklistItemInput,
	UpdateChecklistItemInput
} from '$lib/server/validation/chapters';

// ============================================================================
// TYPES
// ============================================================================

type DbClassChapter = Database['public']['Tables']['class_chapters']['Row'];
type DbChapterDocument = Database['public']['Tables']['chapter_documents']['Row'];
type DbChapterChecklistItem = Database['public']['Tables']['chapter_checklist_items']['Row'];
type DbStudentChecklistProgress = Database['public']['Tables']['student_checklist_progress']['Row'];
type DbChapterExercise = Database['public']['Tables']['chapter_exercises']['Row'];
type DbChapterWorksheet = Database['public']['Tables']['chapter_worksheets']['Row'];

/** Order update item for reordering operations */
interface OrderUpdate {
	id: string;
	displayOrder: number;
}

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
// CONVERTER FUNCTIONS (DB -> App)
// Imported from chapters.ts but re-implemented here to avoid circular imports
// ============================================================================

function convertChapter(db: DbClassChapter): ClassChapter {
	return {
		id: db.id,
		classId: db.class_id,
		title: db.title,
		description: db.description,
		displayOrder: db.display_order,
		isVisible: db.is_visible,
		color: db.color as ClassChapter['color'],
		icon: db.icon as ClassChapter['icon'],
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

function convertDocument(db: DbChapterDocument): ChapterDocument {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		title: db.title,
		description: db.description,
		sourceType: db.source_type as ChapterDocument['sourceType'],
		storagePath: db.storage_path,
		fileName: db.file_name,
		mimeType: db.mime_type,
		fileSize: db.file_size,
		googleFileId: db.google_file_id,
		googleDriveUrl: db.google_drive_url,
		thumbnailUrl: db.thumbnail_url,
		displayOrder: db.display_order,
		sectionId: db.section_id,
		sectionOrder: db.section_order,
		createdAt: db.created_at,
		updatedAt: db.updated_at,
		publishedAt: db.published_at
	};
}

function convertChecklistItem(db: DbChapterChecklistItem): ChapterChecklistItem {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		content: db.content,
		description: db.description,
		displayOrder: db.display_order,
		sectionId: db.section_id,
		sectionOrder: db.section_order,
		createdAt: db.created_at,
		updatedAt: db.updated_at,
		publishedAt: db.published_at
	};
}

function convertChecklistProgress(db: DbStudentChecklistProgress): StudentChecklistProgress {
	return {
		id: db.id,
		studentId: db.student_id,
		checklistItemId: db.checklist_item_id,
		isCompleted: db.is_completed,
		completedAt: db.completed_at,
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

function convertExercise(db: DbChapterExercise): ChapterExercise {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		exerciseId: db.exercise_id,
		displayOrder: db.display_order,
		sectionId: db.section_id,
		sectionOrder: db.section_order,
		createdAt: db.created_at,
		publishedAt: db.published_at
	};
}

function convertWorksheet(db: DbChapterWorksheet): ChapterWorksheet {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		worksheetId: db.worksheet_id,
		displayOrder: db.display_order,
		sectionId: db.section_id,
		sectionOrder: db.section_order,
		createdAt: db.created_at,
		publishedAt: db.published_at
	};
}

// ============================================================================
// TEACHER FUNCTIONS - CHAPTERS
// ============================================================================

/**
 * Get all chapters for a teacher, optionally filtered by class
 *
 * @param teacherId - Teacher's user ID
 * @param supabase - Supabase client
 * @param classId - Optional class ID filter
 * @returns List of chapters with counts
 */
export async function getTeacherChapters(
	teacherId: string,
	supabase: SupabaseClient<Database>,
	classId?: string
): Promise<ListResult<ChapterSummary>> {
	let query = supabase
		.from('class_chapters')
		.select(
			`
			*,
			documents:chapter_documents(count),
			checklistItems:chapter_checklist_items(count),
			exercises:chapter_exercises(count)
		`
		)
		.order('display_order', { ascending: true });

	if (classId) {
		query = query.eq('class_id', classId);
	}

	const { data, error } = await query;

	if (error) {
		console.error('[getTeacherChapters] Error:', error);
		return { data: [], error: new Error(error.message), count: 0 };
	}

	const chapters: ChapterSummary[] = (data || []).map((row) => {
		const chapter = convertChapter(row as unknown as DbClassChapter);
		return {
			...chapter,
			documentCount: (row.documents as unknown as { count: number }[])?.[0]?.count || 0,
			checklistItemCount: (row.checklistItems as unknown as { count: number }[])?.[0]?.count || 0,
			exerciseCount: (row.exercises as unknown as { count: number }[])?.[0]?.count || 0
		};
	});

	return { data: chapters, error: null, count: chapters.length };
}

/**
 * Create a new chapter
 *
 * @param data - Chapter creation data
 * @param supabase - Supabase client
 * @returns Created chapter
 */
export async function createChapter(
	data: CreateChapterInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ClassChapter>> {
	// Verify the class exists (chapter ownership is role-based via RLS now;
	// class_chapters.teacher_id was dropped in the mono-teacher refactor).
	const { data: classData, error: classError } = await supabase
		.from('classes')
		.select('id')
		.eq('id', data.classId)
		.single();

	if (classError || !classData) {
		console.error('[createChapter] Error fetching class:', classError);
		return { data: null, error: new Error(classError?.message || 'Class not found') };
	}

	// Get max display order for the class if not provided
	let displayOrder = data.displayOrder;
	if (displayOrder === undefined) {
		const { data: maxOrder, error: maxOrderError } = await supabase
			.from('class_chapters')
			.select('display_order')
			.eq('class_id', data.classId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Aucune ligne = premier élément, cas légitime. Toute autre panne laissait
		// le rang à 0, ce qui insérait l'élément EN TÊTE et réordonnait la liste
		// du professeur sans rien dire.
		if (maxOrderError) {
			console.error('[chapters] Rang suivant illisible (class_chapters) :', maxOrderError);
			return { data: null, error: new Error(maxOrderError.message) };
		}

		displayOrder = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: chapter, error } = await supabase
		.from('class_chapters')
		.insert({
			class_id: data.classId,
			title: data.title,
			description: data.description ?? null,
			display_order: displayOrder,
			is_visible: data.isVisible ?? false,
			color: data.color ?? null,
			icon: data.icon ?? null
		})
		.select()
		.single();

	if (error) {
		console.error('[createChapter] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertChapter(chapter), error: null };
}

/**
 * Update an existing chapter
 *
 * @param chapterId - Chapter ID
 * @param data - Update data
 * @param supabase - Supabase client
 * @returns Updated chapter
 */
export async function updateChapter(
	chapterId: string,
	data: UpdateChapterInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ClassChapter>> {
	const updateData: TablesUpdate<'class_chapters'> = {};

	if (data.title !== undefined) updateData.title = data.title;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
	if (data.isVisible !== undefined) updateData.is_visible = data.isVisible;
	if (data.color !== undefined) updateData.color = data.color;
	if (data.icon !== undefined) updateData.icon = data.icon;

	const { data: chapter, error } = await supabase
		.from('class_chapters')
		.update(updateData)
		.eq('id', chapterId)
		.select()
		.single();

	if (error) {
		console.error('[updateChapter] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertChapter(chapter), error: null };
}

/**
 * Delete a chapter (documents are moved to orphans by trigger)
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function deleteChapter(
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	// The orphan_chapter_documents trigger handles moving uploaded documents
	const { error } = await supabase.from('class_chapters').delete().eq('id', chapterId);

	if (error) {
		console.error('[deleteChapter] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Reorder chapters within a class
 *
 * @param classId - Class ID
 * @param orderUpdates - Array of {id, displayOrder} updates
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function reorderChapters(
	classId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	// Use a transaction via RPC or sequential updates
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('class_chapters')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('class_id', classId);

		if (error) {
			console.error('[reorderChapters] Error updating order:', error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

// ============================================================================
// TEACHER FUNCTIONS - DOCUMENTS
// ============================================================================

/**
 * Add a document to a chapter
 *
 * @param chapterId - Chapter ID
 * @param data - Document data
 * @param supabase - Supabase client
 * @returns Created document
 */
export async function addChapterDocument(
	chapterId: string,
	data: CreateDocumentInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterDocument>> {
	// Get max display order if not provided
	let displayOrder = data.displayOrder;
	if (displayOrder === undefined) {
		const { data: maxOrder, error: maxOrderError } = await supabase
			.from('chapter_documents')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Aucune ligne = premier élément, cas légitime. Toute autre panne laissait
		// le rang à 0, ce qui insérait l'élément EN TÊTE et réordonnait la liste
		// du professeur sans rien dire.
		if (maxOrderError) {
			console.error('[chapters] Rang suivant illisible (chapter_documents) :', maxOrderError);
			return { data: null, error: new Error(maxOrderError.message) };
		}

		displayOrder = (maxOrder?.display_order ?? -1) + 1;
	}

	// Build insert data based on source type
	type DocumentInsert = Database['public']['Tables']['chapter_documents']['Insert'];

	let insertData: DocumentInsert;

	if (data.sourceType === 'upload') {
		insertData = {
			chapter_id: chapterId,
			title: data.title,
			description: data.description ?? null,
			source_type: 'upload',
			display_order: displayOrder,
			storage_path: data.storagePath,
			file_name: data.fileName,
			mime_type: data.mimeType,
			file_size: data.fileSize
		};
	} else {
		insertData = {
			chapter_id: chapterId,
			title: data.title,
			description: data.description ?? null,
			source_type: 'google_drive',
			display_order: displayOrder,
			google_drive_url: data.googleDriveUrl,
			google_file_id: data.googleFileId,
			file_name: data.fileName ?? null,
			mime_type: data.mimeType ?? null,
			thumbnail_url: data.thumbnailUrl ?? null
		};
	}

	const { data: document, error } = await supabase
		.from('chapter_documents')
		.insert(insertData)
		.select()
		.single();

	if (error) {
		console.error('[addChapterDocument] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertDocument(document), error: null };
}

/**
 * Update a document
 *
 * @param documentId - Document ID
 * @param data - Update data
 * @param supabase - Supabase client
 * @returns Updated document
 */
export async function updateChapterDocument(
	documentId: string,
	data: UpdateDocumentInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterDocument>> {
	const updateData: TablesUpdate<'chapter_documents'> = {};

	if (data.title !== undefined) updateData.title = data.title;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

	const { data: document, error } = await supabase
		.from('chapter_documents')
		.update(updateData)
		.eq('id', documentId)
		.select()
		.single();

	if (error) {
		console.error('[updateChapterDocument] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertDocument(document), error: null };
}

/**
 * Delete a document
 *
 * @param documentId - Document ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function deleteChapterDocument(
	documentId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	// Note: Storage file deletion should be handled separately
	const { error } = await supabase.from('chapter_documents').delete().eq('id', documentId);

	if (error) {
		console.error('[deleteChapterDocument] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Reorder documents within a chapter
 *
 * @param chapterId - Chapter ID
 * @param orderUpdates - Array of {id, displayOrder} updates
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function reorderDocuments(
	chapterId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_documents')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[reorderDocuments] Error:', error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

// ============================================================================
// TEACHER FUNCTIONS - CHECKLIST
// ============================================================================

/**
 * Add a checklist item to a chapter
 *
 * @param chapterId - Chapter ID
 * @param data - Checklist item data
 * @param supabase - Supabase client
 * @returns Created checklist item
 */
export async function addChecklistItem(
	chapterId: string,
	data: CreateChecklistItemInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterChecklistItem>> {
	// Get max display order if not provided
	let displayOrder = data.displayOrder;
	if (displayOrder === undefined) {
		const { data: maxOrder, error: maxOrderError } = await supabase
			.from('chapter_checklist_items')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Aucune ligne = premier élément, cas légitime. Toute autre panne laissait
		// le rang à 0, ce qui insérait l'élément EN TÊTE et réordonnait la liste
		// du professeur sans rien dire.
		if (maxOrderError) {
			console.error('[chapters] Rang suivant illisible (chapter_checklist_items) :', maxOrderError);
			return { data: null, error: new Error(maxOrderError.message) };
		}

		displayOrder = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: item, error } = await supabase
		.from('chapter_checklist_items')
		.insert({
			chapter_id: chapterId,
			content: data.content,
			description: data.description ?? null,
			display_order: displayOrder
		})
		.select()
		.single();

	if (error) {
		console.error('[addChecklistItem] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertChecklistItem(item), error: null };
}

/**
 * Update a checklist item
 *
 * @param itemId - Checklist item ID
 * @param data - Update data
 * @param supabase - Supabase client
 * @returns Updated checklist item
 */
export async function updateChecklistItem(
	itemId: string,
	data: UpdateChecklistItemInput,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<ChapterChecklistItem>> {
	const updateData: TablesUpdate<'chapter_checklist_items'> = {};

	if (data.content !== undefined) updateData.content = data.content;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

	const { data: item, error } = await supabase
		.from('chapter_checklist_items')
		.update(updateData)
		.eq('id', itemId)
		.select()
		.single();

	if (error) {
		console.error('[updateChecklistItem] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertChecklistItem(item), error: null };
}

/**
 * Delete a checklist item
 *
 * @param itemId - Checklist item ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function deleteChecklistItem(
	itemId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('chapter_checklist_items').delete().eq('id', itemId);

	if (error) {
		console.error('[deleteChecklistItem] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

// ============================================================================
// TEACHER FUNCTIONS - EXERCISES
// ============================================================================

/**
 * Link an exercise to a chapter
 *
 * @param chapterId - Chapter ID
 * @param exerciseId - Exercise ID
 * @param supabase - Supabase client
 * @param displayOrder - Optional display order
 * @returns Created chapter exercise link
 */
export async function linkExercise(
	chapterId: string,
	exerciseId: string,
	supabase: SupabaseClient<Database>,
	displayOrder?: number
): Promise<OperationResult<ChapterExercise>> {
	// Get max display order if not provided
	let order = displayOrder;
	if (order === undefined) {
		const { data: maxOrder, error: maxOrderError } = await supabase
			.from('chapter_exercises')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Aucune ligne = premier élément, cas légitime. Toute autre panne laissait
		// le rang à 0, ce qui insérait l'élément EN TÊTE et réordonnait la liste
		// du professeur sans rien dire.
		if (maxOrderError) {
			console.error('[chapters] Rang suivant illisible (chapter_exercises) :', maxOrderError);
			return { data: null, error: new Error(maxOrderError.message) };
		}

		order = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: exercise, error } = await supabase
		.from('chapter_exercises')
		.insert({
			chapter_id: chapterId,
			exercise_id: exerciseId,
			display_order: order
		})
		.select()
		.single();

	if (error) {
		console.error('[linkExercise] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertExercise(exercise), error: null };
}

/**
 * Unlink an exercise from a chapter
 *
 * @param chapterExerciseId - Chapter exercise link ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function unlinkExercise(
	chapterExerciseId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('chapter_exercises').delete().eq('id', chapterExerciseId);

	if (error) {
		console.error('[unlinkExercise] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Rattache une fiche à un chapitre.
 *
 * Rattacher ne DISTRIBUE pas : la policy de l'élève sur `chapter_worksheets`
 * exige `student_has_worksheet_access`, donc une fiche préparée à l'avance
 * reste invisible jusqu'à son affectation. C'est tout l'intérêt du geste.
 *
 * @param chapterId - ID du chapitre
 * @param worksheetId - ID de la fiche
 * @param supabase - Client Supabase
 * @param displayOrder - Rang, sinon à la suite
 */
export async function linkWorksheet(
	chapterId: string,
	worksheetId: string,
	supabase: SupabaseClient<Database>,
	displayOrder?: number
): Promise<OperationResult<ChapterWorksheet>> {
	let order = displayOrder;
	if (order === undefined) {
		const { data: maxOrder, error: maxOrderError } = await supabase
			.from('chapter_worksheets')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Aucune ligne = première fiche, cas légitime. Toute autre panne laissait
		// le rang à 0, ce qui insérait la fiche EN TÊTE et réordonnait la liste du
		// professeur sans rien dire.
		if (maxOrderError) {
			console.error('[chapters] Rang suivant illisible (chapter_worksheets) :', maxOrderError);
			return { data: null, error: new Error(maxOrderError.message) };
		}

		order = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: worksheet, error } = await supabase
		.from('chapter_worksheets')
		.insert({
			chapter_id: chapterId,
			worksheet_id: worksheetId,
			display_order: order
		})
		.select()
		.single();

	if (error) {
		console.error('[linkWorksheet] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertWorksheet(worksheet), error: null };
}

/**
 * Détache une fiche d'un chapitre.
 *
 * La fiche elle-même n'est pas touchée, ni son affectation : l'élève à qui elle
 * a été distribuée continue de l'avoir dans « Mon travail ». Seul le
 * rangement dans le chapitre disparaît.
 *
 * @param chapterWorksheetId - ID du lien
 * @param supabase - Client Supabase
 */
export async function unlinkWorksheet(
	chapterWorksheetId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('chapter_worksheets').delete().eq('id', chapterWorksheetId);

	if (error) {
		console.error('[unlinkWorksheet] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Reorder exercises within a chapter
 *
 * @param chapterId - Chapter ID
 * @param orderUpdates - Array of {id, displayOrder} updates
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function reorderExercises(
	chapterId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_exercises')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[reorderExercises] Error:', error);
			return { error: new Error(error.message) };
		}
	}

	return { error: null };
}

// ============================================================================
// TEACHER FUNCTIONS - PROGRESS TRACKING
// ============================================================================

/**
 * Get student checklist progress for a chapter
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @param studentId - Optional specific student ID
 * @returns Progress data
 */
export async function getStudentChecklistProgress(
	chapterId: string,
	supabase: SupabaseClient<Database>,
	studentId?: string
): Promise<
	ListResult<{
		studentId: string;
		items: (ChapterChecklistItem & { isCompleted: boolean; completedAt: string | null })[];
	}>
> {
	// Get checklist items for the chapter
	const { data: checklistItems, error: itemsError } = await supabase
		.from('chapter_checklist_items')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (itemsError) {
		console.error('[getStudentChecklistProgress] Error fetching items:', itemsError);
		return { data: [], error: new Error(itemsError.message), count: 0 };
	}

	// Get progress records
	let progressQuery = supabase
		.from('student_checklist_progress')
		.select('*')
		.in(
			'checklist_item_id',
			(checklistItems || []).map((i) => i.id)
		);

	if (studentId) {
		progressQuery = progressQuery.eq('student_id', studentId);
	}

	const { data: progressData, error: progressError } = await progressQuery;

	if (progressError) {
		console.error('[getStudentChecklistProgress] Error fetching progress:', progressError);
		return { data: [], error: new Error(progressError.message), count: 0 };
	}

	// Group by student
	const progressByStudent = new Map<
		string,
		Map<string, { isCompleted: boolean; completedAt: string | null }>
	>();

	for (const progress of progressData || []) {
		if (!progressByStudent.has(progress.student_id)) {
			progressByStudent.set(progress.student_id, new Map());
		}
		progressByStudent.get(progress.student_id)!.set(progress.checklist_item_id, {
			isCompleted: progress.is_completed,
			completedAt: progress.completed_at
		});
	}

	// Build result
	const result: {
		studentId: string;
		items: (ChapterChecklistItem & { isCompleted: boolean; completedAt: string | null })[];
	}[] = [];

	for (const [sid, itemProgress] of progressByStudent) {
		result.push({
			studentId: sid,
			items: (checklistItems || []).map((item) => {
				const progress = itemProgress.get(item.id);
				return {
					...convertChecklistItem(item),
					isCompleted: progress?.isCompleted ?? false,
					completedAt: progress?.completedAt ?? null
				};
			})
		});
	}

	return { data: result, error: null, count: result.length };
}

// ============================================================================
// STUDENT FUNCTIONS - VIEW
// ============================================================================

/**
 * Get visible chapters for a student
 *
 * @param studentId - Student's user ID
 * @param supabase - Supabase client
 * @param classId - Optional class ID filter
 * @returns List of visible chapters
 */
export async function getStudentChapters(
	studentId: string,
	supabase: SupabaseClient<Database>,
	classId?: string
): Promise<ListResult<ClassChapter>> {
	// RLS handles visibility filtering (is_visible = true AND is_class_student)
	let query = supabase
		.from('class_chapters')
		.select('*')
		.eq('is_visible', true)
		.order('display_order', { ascending: true });

	if (classId) {
		query = query.eq('class_id', classId);
	}

	const { data, error } = await query;

	if (error) {
		console.error('[getStudentChapters] Error:', error);
		return { data: [], error: new Error(error.message), count: 0 };
	}

	const chapters = (data || []).map(convertChapter);
	return { data: chapters, error: null, count: chapters.length };
}

/**
 * Get chapter with full content and student progress
 *
 * @param chapterId - Chapter ID
 * @param studentId - Student's user ID
 * @param supabase - Supabase client
 * @returns Chapter with content and progress
 */
export async function getChapterWithContent(
	chapterId: string,
	studentId: string,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<StudentChapterView>> {
	// Get chapter (RLS handles visibility)
	const { data: chapter, error: chapterError } = await supabase
		.from('class_chapters')
		.select('*')
		.eq('id', chapterId)
		.single();

	if (chapterError) {
		console.error('[getChapterWithContent] Error fetching chapter:', chapterError);
		return { data: null, error: new Error(chapterError.message) };
	}

	// Les trois sections du chapitre. Une panne sur l'une d'elles rendait la
	// section vide à l'élève, sans distinction avec « le professeur n'a rien
	// déposé » : un cours amputé passait donc pour un cours terminé.
	const [documentsRes, checklistItemsRes, exercisesRes] = await Promise.all([
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
			.order('display_order', { ascending: true })
	]);

	const sectionEnEchec = [documentsRes, checklistItemsRes, exercisesRes].find((r) => r.error);
	if (sectionEnEchec?.error) {
		console.error('[getChapterWithContent] Section illisible :', sectionEnEchec.error);
		return { data: null, error: new Error(sectionEnEchec.error.message) };
	}

	const documents = documentsRes.data;
	const checklistItems = checklistItemsRes.data;
	const exercises = exercisesRes.data;

	// Get student's checklist progress
	const { data: checklistProgress, error: checklistProgressError } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.in(
			'checklist_item_id',
			(checklistItems || []).map((i) => i.id)
		);

	// L'avancement de l'élève, lui, n'empêche pas d'afficher le cours : une
	// panne ici le montre « non commencé » plutôt que de fermer la page. Mais
	// elle laisse une trace, au lieu de se confondre avec un vrai zéro.
	if (checklistProgressError) {
		console.error('[getChapterWithContent] Avancement illisible :', checklistProgressError);
	}

	// Build progress map for checklist
	const progressMap = new Map<string, DbStudentChecklistProgress>();
	for (const p of checklistProgress || []) {
		progressMap.set(p.checklist_item_id, p);
	}

	// Build enriched checklist items
	const checklistItemsWithProgress = (checklistItems || []).map((item) => {
		const progress = progressMap.get(item.id);
		return {
			...convertChecklistItem(item),
			isCompleted: progress?.is_completed ?? false,
			completedAt: progress?.completed_at ?? null
		};
	});

	// Calculate progress
	const completedChecklistItems = checklistItemsWithProgress.filter((i) => i.isCompleted).length;
	const totalChecklistItems = checklistItemsWithProgress.length;
	// Find last activity
	const lastChecklistActivity = checklistItemsWithProgress
		.filter((i) => i.completedAt)
		.sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1))[0]?.completedAt;

	const lastActivityAt = lastChecklistActivity ?? null;

	const progress: ChapterProgress = {
		chapterId,
		studentId,
		totalChecklistItems,
		completedChecklistItems,
		checklistProgress:
			totalChecklistItems > 0
				? Math.round((completedChecklistItems / totalChecklistItems) * 100)
				: 0,
		lastActivityAt
	};

	const result: StudentChapterView = {
		...convertChapter(chapter),
		documents: (documents || []).map(convertDocument),
		checklistItems: (checklistItems || []).map(convertChecklistItem),
		exercises: (exercises || []).map(convertExercise),
		progress,
		checklistItemsWithProgress
	};

	return { data: result, error: null };
}

// ============================================================================
// STUDENT FUNCTIONS - CHECKLIST
// ============================================================================

/**
 * Toggle a checklist item completion status
 *
 * @param studentId - Student's user ID
 * @param checklistItemId - Checklist item ID
 * @param isCompleted - New completion status
 * @param supabase - Supabase client
 * @returns Updated progress
 */
export async function toggleChecklistItem(
	studentId: string,
	checklistItemId: string,
	isCompleted: boolean,
	supabase: SupabaseClient<Database>
): Promise<OperationResult<StudentChecklistProgress>> {
	// Check if progress record exists
	const { data: existing, error: existingError } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.eq('checklist_item_id', checklistItemId)
		.maybeSingle();

	// `maybeSingle` rend `null` quand la ligne n'existe pas — cas normal, on la
	// crée. Mais une PANNE rendait aussi `null` : on partait alors créer une
	// seconde ligne d'avancement pour le même élève et le même item.
	if (existingError) {
		console.error('[toggleChecklistItem] Avancement existant illisible :', existingError);
		return { data: null, error: new Error(existingError.message) };
	}

	if (existing) {
		// Update existing
		const { data: updated, error } = await supabase
			.from('student_checklist_progress')
			.update({ is_completed: isCompleted })
			.eq('id', existing.id)
			.select()
			.single();

		if (error) {
			console.error('[toggleChecklistItem] Error updating:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: convertChecklistProgress(updated), error: null };
	} else {
		// Create new
		const { data: created, error } = await supabase
			.from('student_checklist_progress')
			.insert({
				student_id: studentId,
				checklist_item_id: checklistItemId,
				is_completed: isCompleted
			})
			.select()
			.single();

		if (error) {
			console.error('[toggleChecklistItem] Error creating:', error);
			return { data: null, error: new Error(error.message) };
		}

		return { data: convertChecklistProgress(created), error: null };
	}
}

/**
 * Get student's checklist progress for a chapter
 *
 * @param studentId - Student's user ID
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @returns List of checklist items with progress
 */
export async function getMyChecklistProgress(
	studentId: string,
	chapterId: string,
	supabase: SupabaseClient<Database>
): Promise<
	ListResult<ChapterChecklistItem & { isCompleted: boolean; completedAt: string | null }>
> {
	// Get checklist items
	const { data: items, error: itemsError } = await supabase
		.from('chapter_checklist_items')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('display_order', { ascending: true });

	if (itemsError) {
		console.error('[getMyChecklistProgress] Error fetching items:', itemsError);
		return { data: [], error: new Error(itemsError.message), count: 0 };
	}

	// Get progress
	const { data: progress, error: progressError } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.in(
			'checklist_item_id',
			(items || []).map((i) => i.id)
		);

	// Sans cette garde, une panne affichait toute la liste décochée : l'élève
	// voyait son travail effacé et pouvait le refaire par-dessus.
	if (progressError) {
		console.error('[getMyChecklistProgress] Avancement illisible :', progressError);
		return { data: [], error: new Error(progressError.message), count: 0 };
	}

	// Build progress map
	const progressMap = new Map<string, DbStudentChecklistProgress>();
	for (const p of progress || []) {
		progressMap.set(p.checklist_item_id, p);
	}

	// Combine items with progress
	const result = (items || []).map((item) => {
		const p = progressMap.get(item.id);
		return {
			...convertChecklistItem(item),
			isCompleted: p?.is_completed ?? false,
			completedAt: p?.completed_at ?? null
		};
	});

	return { data: result, error: null, count: result.length };
}
