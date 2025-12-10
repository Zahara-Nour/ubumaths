/**
 * Chapter System Server Functions
 * ================================
 *
 * Server-side functions for managing class chapters, documents, quizzes,
 * checklists, and exercises.
 *
 * Features:
 * - Teacher CRUD operations for chapters and content
 * - Student access to visible chapters with progress tracking
 * - SRS integration for quiz answers
 * - Reordering support for all content types
 *
 * @module server/chapters
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	ClassChapter,
	ChapterDocument,
	ChapterQuizQuestion,
	ChapterQuizResult,
	ChapterChecklistItem,
	StudentChecklistProgress,
	ChapterExercise,
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
import { createDefaultFSRS } from '$lib/srs/fsrs';
import { Grade, type CardStats, type ReviewHistoryEntry } from '$lib/srs/types';

// ============================================================================
// TYPES
// ============================================================================

type DbClassChapter = Database['public']['Tables']['class_chapters']['Row'];
type DbChapterDocument = Database['public']['Tables']['chapter_documents']['Row'];
type DbChapterQuizQuestion = Database['public']['Tables']['chapter_quiz_questions']['Row'];
type DbChapterQuizResult = Database['public']['Tables']['chapter_quiz_results']['Row'];
type DbChapterChecklistItem = Database['public']['Tables']['chapter_checklist_items']['Row'];
type DbStudentChecklistProgress = Database['public']['Tables']['student_checklist_progress']['Row'];
type DbChapterExercise = Database['public']['Tables']['chapter_exercises']['Row'];

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
		teacherId: db.teacher_id,
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
		createdAt: db.created_at,
		updatedAt: db.updated_at
	};
}

function convertQuizQuestion(db: DbChapterQuizQuestion): ChapterQuizQuestion {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		questionTemplateId: db.question_template_id,
		pointsOverride: db.points_override,
		displayOrder: db.display_order,
		createdAt: db.created_at
	};
}

function convertQuizResult(db: DbChapterQuizResult): ChapterQuizResult {
	return {
		id: db.id,
		studentId: db.student_id,
		chapterQuizQuestionId: db.chapter_quiz_question_id,
		attemptNumber: db.attempt_number,
		isCorrect: db.is_correct,
		submittedAnswer: db.submitted_answer,
		pointsEarned: db.points_earned,
		submittedAt: db.submitted_at,
		timeSpentSeconds: db.time_spent_seconds
	};
}

function convertChecklistItem(db: DbChapterChecklistItem): ChapterChecklistItem {
	return {
		id: db.id,
		chapterId: db.chapter_id,
		content: db.content,
		description: db.description,
		displayOrder: db.display_order,
		createdAt: db.created_at,
		updatedAt: db.updated_at
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
		createdAt: db.created_at
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
			quizQuestions:chapter_quiz_questions(count),
			checklistItems:chapter_checklist_items(count),
			exercises:chapter_exercises(count)
		`
		)
		.eq('teacher_id', teacherId)
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
			quizQuestionCount: (row.quizQuestions as unknown as { count: number }[])?.[0]?.count || 0,
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
	// Get teacher_id from the class (required for DB type even though trigger sets it)
	const { data: classData, error: classError } = await supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', data.classId)
		.single();

	if (classError || !classData) {
		console.error('[createChapter] Error fetching class:', classError);
		return { data: null, error: new Error(classError?.message || 'Class not found') };
	}

	// Get max display order for the class if not provided
	let displayOrder = data.displayOrder;
	if (displayOrder === undefined) {
		const { data: maxOrder } = await supabase
			.from('class_chapters')
			.select('display_order')
			.eq('class_id', data.classId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

		displayOrder = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: chapter, error } = await supabase
		.from('class_chapters')
		.insert({
			class_id: data.classId,
			teacher_id: classData.teacher_id,
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
	const updateData: Record<string, unknown> = {};

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
		const { data: maxOrder } = await supabase
			.from('chapter_documents')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

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
	const updateData: Record<string, unknown> = {};

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
// TEACHER FUNCTIONS - QUIZ QUESTIONS
// ============================================================================

/**
 * Add a quiz question to a chapter
 *
 * @param chapterId - Chapter ID
 * @param questionTemplateId - Question template ID
 * @param supabase - Supabase client
 * @param displayOrder - Optional display order
 * @returns Created quiz question
 */
export async function addQuizQuestion(
	chapterId: string,
	questionTemplateId: string,
	supabase: SupabaseClient<Database>,
	displayOrder?: number
): Promise<OperationResult<ChapterQuizQuestion>> {
	// Get max display order if not provided
	let order = displayOrder;
	if (order === undefined) {
		const { data: maxOrder } = await supabase
			.from('chapter_quiz_questions')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

		order = (maxOrder?.display_order ?? -1) + 1;
	}

	const { data: question, error } = await supabase
		.from('chapter_quiz_questions')
		.insert({
			chapter_id: chapterId,
			question_template_id: questionTemplateId,
			display_order: order
		})
		.select()
		.single();

	if (error) {
		console.error('[addQuizQuestion] Error:', error);
		return { data: null, error: new Error(error.message) };
	}

	return { data: convertQuizQuestion(question), error: null };
}

/**
 * Remove a quiz question from a chapter
 *
 * @param quizQuestionId - Quiz question ID
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function removeQuizQuestion(
	quizQuestionId: string,
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('chapter_quiz_questions').delete().eq('id', quizQuestionId);

	if (error) {
		console.error('[removeQuizQuestion] Error:', error);
		return { error: new Error(error.message) };
	}

	return { error: null };
}

/**
 * Reorder quiz questions within a chapter
 *
 * @param chapterId - Chapter ID
 * @param orderUpdates - Array of {id, displayOrder} updates
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function reorderQuizQuestions(
	chapterId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_quiz_questions')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[reorderQuizQuestions] Error:', error);
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
		const { data: maxOrder } = await supabase
			.from('chapter_checklist_items')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

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
	const updateData: Record<string, unknown> = {};

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

/**
 * Reorder checklist items within a chapter
 *
 * @param chapterId - Chapter ID
 * @param orderUpdates - Array of {id, displayOrder} updates
 * @param supabase - Supabase client
 * @returns Success status
 */
export async function reorderChecklistItems(
	chapterId: string,
	orderUpdates: OrderUpdate[],
	supabase: SupabaseClient<Database>
): Promise<{ error: Error | null }> {
	for (const update of orderUpdates) {
		const { error } = await supabase
			.from('chapter_checklist_items')
			.update({ display_order: update.displayOrder })
			.eq('id', update.id)
			.eq('chapter_id', chapterId);

		if (error) {
			console.error('[reorderChecklistItems] Error:', error);
			return { error: new Error(error.message) };
		}
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
		const { data: maxOrder } = await supabase
			.from('chapter_exercises')
			.select('display_order')
			.eq('chapter_id', chapterId)
			.order('display_order', { ascending: false })
			.limit(1)
			.single();

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

/**
 * Get quiz results for a chapter
 *
 * @param chapterId - Chapter ID
 * @param supabase - Supabase client
 * @param studentId - Optional specific student ID
 * @returns Quiz results grouped by student
 */
export async function getChapterQuizResults(
	chapterId: string,
	supabase: SupabaseClient<Database>,
	studentId?: string
): Promise<
	ListResult<{
		studentId: string;
		results: ChapterQuizResult[];
		totalCorrect: number;
		totalAttempted: number;
	}>
> {
	// Get quiz questions for the chapter
	const { data: questions, error: questionsError } = await supabase
		.from('chapter_quiz_questions')
		.select('id')
		.eq('chapter_id', chapterId);

	if (questionsError) {
		console.error('[getChapterQuizResults] Error fetching questions:', questionsError);
		return { data: [], error: new Error(questionsError.message), count: 0 };
	}

	const questionIds = (questions || []).map((q) => q.id);

	if (questionIds.length === 0) {
		return { data: [], error: null, count: 0 };
	}

	// Get results
	let resultsQuery = supabase
		.from('chapter_quiz_results')
		.select('*')
		.in('chapter_quiz_question_id', questionIds)
		.order('submitted_at', { ascending: false });

	if (studentId) {
		resultsQuery = resultsQuery.eq('student_id', studentId);
	}

	const { data: resultsData, error: resultsError } = await resultsQuery;

	if (resultsError) {
		console.error('[getChapterQuizResults] Error fetching results:', resultsError);
		return { data: [], error: new Error(resultsError.message), count: 0 };
	}

	// Group by student
	const resultsByStudent = new Map<string, DbChapterQuizResult[]>();

	for (const result of resultsData || []) {
		if (!resultsByStudent.has(result.student_id)) {
			resultsByStudent.set(result.student_id, []);
		}
		resultsByStudent.get(result.student_id)!.push(result);
	}

	// Build result
	const result: {
		studentId: string;
		results: ChapterQuizResult[];
		totalCorrect: number;
		totalAttempted: number;
	}[] = [];

	for (const [sid, studentResults] of resultsByStudent) {
		// Get best result per question
		const bestByQuestion = new Map<string, DbChapterQuizResult>();
		for (const r of studentResults) {
			const existing = bestByQuestion.get(r.chapter_quiz_question_id);
			if (!existing || r.is_correct) {
				bestByQuestion.set(r.chapter_quiz_question_id, r);
			}
		}

		const totalCorrect = Array.from(bestByQuestion.values()).filter((r) => r.is_correct).length;

		result.push({
			studentId: sid,
			results: studentResults.map(convertQuizResult),
			totalCorrect,
			totalAttempted: bestByQuestion.size
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

	// Get student's checklist progress
	const { data: checklistProgress } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.in(
			'checklist_item_id',
			(checklistItems || []).map((i) => i.id)
		);

	// Get student's quiz results
	const { data: quizResults } = await supabase
		.from('chapter_quiz_results')
		.select('*')
		.eq('student_id', studentId)
		.in(
			'chapter_quiz_question_id',
			(quizQuestions || []).map((q) => q.id)
		)
		.order('submitted_at', { ascending: false });

	// Build progress map for checklist
	const progressMap = new Map<string, DbStudentChecklistProgress>();
	for (const p of checklistProgress || []) {
		progressMap.set(p.checklist_item_id, p);
	}

	// Build results map for quiz (best result per question)
	const resultsMap = new Map<string, { best: DbChapterQuizResult; count: number }>();
	for (const r of quizResults || []) {
		const existing = resultsMap.get(r.chapter_quiz_question_id);
		if (!existing) {
			resultsMap.set(r.chapter_quiz_question_id, { best: r, count: 1 });
		} else {
			existing.count++;
			if (r.is_correct && !existing.best.is_correct) {
				existing.best = r;
			}
		}
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

	// Build enriched quiz questions
	const quizQuestionsWithResults = (quizQuestions || []).map((q) => {
		const resultInfo = resultsMap.get(q.id);
		return {
			...convertQuizQuestion(q),
			bestResult: resultInfo ? convertQuizResult(resultInfo.best) : null,
			attemptsCount: resultInfo?.count ?? 0
		};
	});

	// Calculate progress
	const completedChecklistItems = checklistItemsWithProgress.filter((i) => i.isCompleted).length;
	const totalChecklistItems = checklistItemsWithProgress.length;
	const correctQuizQuestions = Array.from(resultsMap.values()).filter(
		(r) => r.best.is_correct
	).length;
	const totalQuizQuestions = (quizQuestions || []).length;

	// Calculate points
	const totalPointsEarned = Array.from(resultsMap.values()).reduce(
		(sum, r) => sum + (r.best.is_correct ? r.best.points_earned : 0),
		0
	);
	const maxPossiblePoints = (quizQuestions || []).reduce(
		(sum, q) => sum + (q.points_override ?? 1),
		0
	);

	// Find last activity
	const lastChecklistActivity = checklistItemsWithProgress
		.filter((i) => i.completedAt)
		.sort((a, b) => (b.completedAt! > a.completedAt! ? 1 : -1))[0]?.completedAt;

	const lastQuizActivity = quizResults?.[0]?.submitted_at;

	const lastActivityAt =
		lastChecklistActivity && lastQuizActivity
			? lastChecklistActivity > lastQuizActivity
				? lastChecklistActivity
				: lastQuizActivity
			: lastChecklistActivity || lastQuizActivity || null;

	const progress: ChapterProgress = {
		chapterId,
		studentId,
		totalChecklistItems,
		completedChecklistItems,
		checklistProgress:
			totalChecklistItems > 0
				? Math.round((completedChecklistItems / totalChecklistItems) * 100)
				: 0,
		totalQuizQuestions,
		correctQuizQuestions,
		quizScore:
			totalQuizQuestions > 0 ? Math.round((correctQuizQuestions / totalQuizQuestions) * 100) : 0,
		totalPointsEarned,
		maxPossiblePoints,
		lastActivityAt
	};

	const result: StudentChapterView = {
		...convertChapter(chapter),
		documents: (documents || []).map(convertDocument),
		quizQuestions: (quizQuestions || []).map(convertQuizQuestion),
		checklistItems: (checklistItems || []).map(convertChecklistItem),
		exercises: (exercises || []).map(convertExercise),
		progress,
		checklistItemsWithProgress,
		quizQuestionsWithResults
	};

	return { data: result, error: null };
}

// ============================================================================
// STUDENT FUNCTIONS - QUIZ
// ============================================================================

/**
 * Submit a quiz answer
 *
 * CRITICAL: Also updates SRS card stats if the question template is in student's deck
 *
 * @param studentId - Student's user ID
 * @param quizQuestionId - Chapter quiz question ID
 * @param isCorrect - Whether the answer was correct
 * @param timeSpentSeconds - Time spent on the question
 * @param supabase - Supabase client
 * @param submittedAnswer - The answer submitted (for recording)
 * @returns Created quiz result
 */
export async function submitQuizAnswer(
	studentId: string,
	quizQuestionId: string,
	isCorrect: boolean,
	timeSpentSeconds: number,
	supabase: SupabaseClient<Database>,
	submittedAnswer: string = ''
): Promise<OperationResult<ChapterQuizResult>> {
	// 1. Get the quiz question to find the template ID
	const { data: quizQuestion, error: questionError } = await supabase
		.from('chapter_quiz_questions')
		.select('*, chapter:class_chapters!inner(is_visible, class_id)')
		.eq('id', quizQuestionId)
		.single();

	if (questionError || !quizQuestion) {
		console.error('[submitQuizAnswer] Error fetching question:', questionError);
		return { data: null, error: new Error(questionError?.message || 'Question not found') };
	}

	// 2. Get attempt number (count existing attempts + 1)
	const { count: existingAttempts } = await supabase
		.from('chapter_quiz_results')
		.select('*', { count: 'exact', head: true })
		.eq('chapter_quiz_question_id', quizQuestionId)
		.eq('student_id', studentId);

	const attemptNumber = (existingAttempts ?? 0) + 1;

	// Calculate points earned (use override or default to 1)
	const pointsEarned = isCorrect ? (quizQuestion.points_override ?? 1) : 0;

	// 3. Insert the quiz result
	const { data: result, error: resultError } = await supabase
		.from('chapter_quiz_results')
		.insert({
			chapter_quiz_question_id: quizQuestionId,
			student_id: studentId,
			submitted_answer: submittedAnswer,
			is_correct: isCorrect,
			points_earned: pointsEarned,
			time_spent_seconds: timeSpentSeconds,
			attempt_number: attemptNumber
		})
		.select()
		.single();

	if (resultError) {
		console.error('[submitQuizAnswer] Error inserting result:', resultError);
		return { data: null, error: new Error(resultError.message) };
	}

	// 4. SRS Integration - Check if student has this template in their SRS decks
	const questionTemplateId = quizQuestion.question_template_id;

	try {
		// Find if student has card stats for this template
		const { data: cardStats, error: statsError } = await supabase
			.from('srs_card_stats')
			.select('*')
			.eq('user_id', studentId)
			.eq('card_reference_type', 'template')
			.eq('card_reference_id', questionTemplateId)
			.maybeSingle();

		if (statsError) {
			console.error('[submitQuizAnswer] Error checking SRS stats:', statsError);
			// Don't fail the whole operation, just log the error
		} else if (cardStats) {
			// 5. Update SRS stats using FSRS algorithm
			const fsrs = createDefaultFSRS();

			// Convert DB stats to CardStats type
			const currentStats: CardStats = {
				id: cardStats.id,
				userId: cardStats.user_id,
				cardReferenceType: cardStats.card_reference_type as 'template' | 'custom',
				cardReferenceId: cardStats.card_reference_id,
				difficulty: cardStats.difficulty,
				stability: cardStats.stability,
				state: cardStats.state as CardStats['state'],
				lastReview: cardStats.last_review,
				nextReview: cardStats.next_review,
				totalReviews: cardStats.total_reviews,
				reviewHistory: (cardStats.review_history as unknown as ReviewHistoryEntry[]) || [],
				createdAt: cardStats.created_at,
				updatedAt: cardStats.updated_at
			};

			// Determine grade based on correctness
			// isCorrect = true -> Grade.GOOD (3)
			// isCorrect = false -> Grade.AGAIN (1)
			const grade = isCorrect ? Grade.GOOD : Grade.AGAIN;

			// Review the card
			const updatedStats = fsrs.reviewCard(currentStats, grade, timeSpentSeconds);

			// Update the database
			const { error: updateError } = await supabase
				.from('srs_card_stats')
				.update({
					difficulty: updatedStats.difficulty,
					stability: updatedStats.stability,
					state: updatedStats.state,
					last_review: updatedStats.lastReview,
					next_review: updatedStats.nextReview,
					total_reviews: updatedStats.totalReviews,
					review_history:
						updatedStats.reviewHistory as unknown as Database['public']['Tables']['srs_card_stats']['Update']['review_history']
				})
				.eq('id', cardStats.id);

			if (updateError) {
				console.error('[submitQuizAnswer] Error updating SRS stats:', updateError);
				// Don't fail the whole operation
			} else {
				console.log(
					`[submitQuizAnswer] Updated SRS stats for template ${questionTemplateId}: grade=${grade}, next review in ${fsrs.calculateInterval(updatedStats.stability)} days`
				);
			}
		}
	} catch (srsError) {
		console.error('[submitQuizAnswer] SRS integration error:', srsError);
		// Don't fail the quiz answer submission due to SRS errors
	}

	return { data: convertQuizResult(result), error: null };
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
	const { data: existing } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.eq('checklist_item_id', checklistItemId)
		.maybeSingle();

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
	const { data: progress } = await supabase
		.from('student_checklist_progress')
		.select('*')
		.eq('student_id', studentId)
		.in(
			'checklist_item_id',
			(items || []).map((i) => i.id)
		);

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
