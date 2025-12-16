/**
 * Teacher Chapter Content Editor Server
 * ======================================
 *
 * Manages chapter content:
 * - Documents (add/remove/reorder)
 * - Quiz questions (add/remove/reorder)
 * - Checklist items (CRUD/reorder)
 * - Exercises (link/unlink/reorder)
 * - View student progress
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import {
	addChapterDocument,
	deleteChapterDocument,
	addQuizQuestion,
	removeQuizQuestion,
	addChecklistItem,
	updateChecklistItem,
	deleteChecklistItem,
	linkExercise,
	unlinkExercise,
	getStudentChecklistProgress,
	getChapterQuizResults
} from '$lib/server/chapters';
import {
	checkForTemplateUpdates,
	migrateChapterToVersion,
	detachChapterFromTemplate
} from '$lib/server/chapter-templates';
import {
	createChecklistItemSchema,
	updateChecklistItemSchema
} from '$lib/server/validation/chapters';
import type {
	ChapterDocument,
	ChapterQuizQuestion,
	ChapterChecklistItem,
	ChapterExercise
} from '$lib/types/chapters';
import type { InstantiationWithStatus } from '$lib/types/chapter-templates';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { classId, chapterId } = params;

	// Verify teacher owns this chapter
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('*')
		.eq('id', chapterId)
		.eq('teacher_id', user.id)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapitre non trouve');
	}

	// Verify class matches
	if (chapter.class_id !== classId) {
		throw error(404, 'Chapitre non trouve dans cette classe');
	}

	// Get class info
	const { data: classData } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', classId)
		.single();

	// Get chapter content in parallel
	const [documentsResult, quizResult, checklistResult, exercisesResult] = await Promise.all([
		locals.supabase
			.from('chapter_documents')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		locals.supabase
			.from('chapter_quiz_questions')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		locals.supabase
			.from('chapter_checklist_items')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order'),
		locals.supabase
			.from('chapter_exercises')
			.select('*')
			.eq('chapter_id', chapterId)
			.order('display_order')
	]);

	// Transform to app types
	const documents: ChapterDocument[] = (documentsResult.data || []).map((d) => ({
		id: d.id,
		chapterId: d.chapter_id,
		title: d.title,
		description: d.description,
		sourceType: d.source_type as ChapterDocument['sourceType'],
		storagePath: d.storage_path,
		fileName: d.file_name,
		mimeType: d.mime_type,
		fileSize: d.file_size,
		googleFileId: d.google_file_id,
		googleDriveUrl: d.google_drive_url,
		thumbnailUrl: d.thumbnail_url,
		displayOrder: d.display_order,
		createdAt: d.created_at,
		updatedAt: d.updated_at
	}));

	const quizQuestions: ChapterQuizQuestion[] = (quizResult.data || []).map((q) => ({
		id: q.id,
		chapterId: q.chapter_id,
		questionTemplateId: q.question_template_id,
		pointsOverride: q.points_override,
		displayOrder: q.display_order,
		createdAt: q.created_at
	}));

	const checklistItems: ChapterChecklistItem[] = (checklistResult.data || []).map((c) => ({
		id: c.id,
		chapterId: c.chapter_id,
		content: c.content,
		description: c.description,
		displayOrder: c.display_order,
		createdAt: c.created_at,
		updatedAt: c.updated_at
	}));

	const exercises: ChapterExercise[] = (exercisesResult.data || []).map((e) => ({
		id: e.id,
		chapterId: e.chapter_id,
		exerciseId: e.exercise_id,
		displayOrder: e.display_order,
		createdAt: e.created_at
	}));

	// Get question templates for quiz display
	const questionTemplates: Record<string, { id: string; question: string; answer: unknown }> = {};
	if (quizQuestions.length > 0) {
		const templateIds = quizQuestions.map((q) => q.questionTemplateId);
		const { data: templates } = await locals.supabase
			.from('question_templates')
			.select('id, question, answer')
			.in('id', templateIds);

		for (const t of templates || []) {
			questionTemplates[t.id] = {
				id: t.id,
				question: t.question,
				answer: t.answer
			};
		}
	}

	// Get exercise details
	const exerciseDetails: Record<string, { id: string; title: string; description: string | null }> =
		{};
	if (exercises.length > 0) {
		const exerciseIds = exercises.map((e) => e.exerciseId);
		const { data: exerciseData } = await locals.supabase
			.from('exercises')
			.select('id, title, description')
			.in('id', exerciseIds);

		for (const e of exerciseData || []) {
			exerciseDetails[e.id] = {
				id: e.id,
				title: e.title,
				description: e.description
			};
		}
	}

	// Get available question templates for adding to quiz (true/false only)
	const { data: availableTemplates } = await locals.supabase
		.from('question_templates')
		.select('id, question, answer, topic, subtopic')
		.eq('answer_type', 'true_false')
		.order('created_at', { ascending: false })
		.limit(100);

	// Get available exercises for linking
	const { data: availableExercises } = await locals.supabase
		.from('exercises')
		.select('id, title, description')
		.eq('teacher_id', user.id)
		.order('created_at', { ascending: false })
		.limit(100);

	// Get student progress
	const { data: checklistProgress } = await getStudentChecklistProgress(chapterId, locals.supabase);

	const { data: quizResultsData } = await getChapterQuizResults(chapterId, locals.supabase);

	// Get students in class
	const { data: students } = await locals.supabase
		.from('class_members')
		.select('student_id, profiles:student_id (id, full_name, avatar_url)')
		.eq('class_id', classId)
		.eq('is_test', false);

	const studentList = (students || [])
		.map((s) => {
			const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
			return profile
				? {
						id: profile.id,
						name: profile.full_name || 'Etudiant',
						avatar: profile.avatar_url
					}
				: null;
		})
		.filter((s): s is { id: string; name: string; avatar: string | null } => s !== null);

	// Check if chapter has template instantiation
	const { data: templateInstantiation } = await checkForTemplateUpdates(chapterId, locals.supabase);

	return {
		chapter: {
			id: chapter.id,
			classId: chapter.class_id,
			teacherId: chapter.teacher_id,
			title: chapter.title,
			description: chapter.description,
			displayOrder: chapter.display_order,
			isVisible: chapter.is_visible,
			color: chapter.color,
			icon: chapter.icon,
			createdAt: chapter.created_at,
			updatedAt: chapter.updated_at
		},
		classData,
		documents,
		quizQuestions,
		checklistItems,
		exercises,
		questionTemplates,
		exerciseDetails,
		availableTemplates: availableTemplates || [],
		availableExercises: availableExercises || [],
		checklistProgress: checklistProgress || [],
		quizResults: quizResultsData || [],
		students: studentList,
		templateInstantiation: templateInstantiation as InstantiationWithStatus | null
	};
};

export const actions: Actions = {
	// ============ CHECKLIST ACTIONS ============

	addChecklistItem: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'addChecklistItem' });
		}

		const formData = await request.formData();
		const data = {
			content: formData.get('content') as string,
			description: (formData.get('description') as string) || undefined
		};

		const validation = createChecklistItemSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message, action: 'addChecklistItem' });
		}

		const { error: addError } = await addChecklistItem(chapterId, validation.data, locals.supabase);

		if (addError) {
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addChecklistItem' });
		}

		return { success: true, action: 'addChecklistItem' };
	},

	updateChecklistItem: async ({ request, locals, params: _params }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify ownership via chapter
		const { data: item } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id, chapter:chapter_id!inner(teacher_id)')
			.eq('id', itemId)
			.single();

		const chapterData = item?.chapter as unknown as { teacher_id: string } | null;
		if (!item || chapterData?.teacher_id !== user.id) {
			return fail(403, { error: 'Acces refuse', action: 'updateChecklistItem' });
		}

		const data = {
			content: formData.get('content') as string | undefined,
			description: formData.get('description') as string | undefined
		};

		const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

		const validation = updateChecklistItemSchema.safeParse(cleanData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'updateChecklistItem'
			});
		}

		const { error: updateError } = await updateChecklistItem(
			itemId,
			validation.data,
			locals.supabase
		);

		if (updateError) {
			return fail(500, { error: 'Erreur lors de la mise a jour', action: 'updateChecklistItem' });
		}

		return { success: true, action: 'updateChecklistItem' };
	},

	deleteChecklistItem: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify ownership
		const { data: item } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id, chapter:chapter_id!inner(teacher_id)')
			.eq('id', itemId)
			.single();

		const chapterData = item?.chapter as unknown as { teacher_id: string } | null;
		if (!item || chapterData?.teacher_id !== user.id) {
			return fail(403, { error: 'Acces refuse', action: 'deleteChecklistItem' });
		}

		const { error: deleteError } = await deleteChecklistItem(itemId, locals.supabase);

		if (deleteError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'deleteChecklistItem' });
		}

		return { success: true, action: 'deleteChecklistItem' };
	},

	// ============ QUIZ ACTIONS ============

	addQuizQuestion: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'addQuizQuestion' });
		}

		const formData = await request.formData();
		const questionTemplateId = formData.get('questionTemplateId') as string;

		if (!questionTemplateId) {
			return fail(400, { error: 'Question requise', action: 'addQuizQuestion' });
		}

		const { error: addError } = await addQuizQuestion(
			chapterId,
			questionTemplateId,
			locals.supabase
		);

		if (addError) {
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addQuizQuestion' });
		}

		return { success: true, action: 'addQuizQuestion' };
	},

	removeQuizQuestion: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const quizQuestionId = formData.get('quizQuestionId') as string;

		// Verify ownership
		const { data: question } = await locals.supabase
			.from('chapter_quiz_questions')
			.select('id, chapter:chapter_id!inner(teacher_id)')
			.eq('id', quizQuestionId)
			.single();

		const chapterData = question?.chapter as unknown as { teacher_id: string } | null;
		if (!question || chapterData?.teacher_id !== user.id) {
			return fail(403, { error: 'Acces refuse', action: 'removeQuizQuestion' });
		}

		const { error: removeError } = await removeQuizQuestion(quizQuestionId, locals.supabase);

		if (removeError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'removeQuizQuestion' });
		}

		return { success: true, action: 'removeQuizQuestion' };
	},

	// ============ EXERCISE ACTIONS ============

	linkExercise: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'linkExercise' });
		}

		const formData = await request.formData();
		const exerciseId = formData.get('exerciseId') as string;

		if (!exerciseId) {
			return fail(400, { error: 'Exercice requis', action: 'linkExercise' });
		}

		const { error: linkError } = await linkExercise(chapterId, exerciseId, locals.supabase);

		if (linkError) {
			return fail(500, { error: 'Erreur lors du lien', action: 'linkExercise' });
		}

		return { success: true, action: 'linkExercise' };
	},

	unlinkExercise: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const chapterExerciseId = formData.get('chapterExerciseId') as string;

		// Verify ownership
		const { data: link } = await locals.supabase
			.from('chapter_exercises')
			.select('id, chapter:chapter_id!inner(teacher_id)')
			.eq('id', chapterExerciseId)
			.single();

		const chapterData = link?.chapter as unknown as { teacher_id: string } | null;
		if (!link || chapterData?.teacher_id !== user.id) {
			return fail(403, { error: 'Acces refuse', action: 'unlinkExercise' });
		}

		const { error: unlinkError } = await unlinkExercise(chapterExerciseId, locals.supabase);

		if (unlinkError) {
			return fail(500, { error: 'Erreur lors de la suppression', action: 'unlinkExercise' });
		}

		return { success: true, action: 'unlinkExercise' };
	},

	// ============ DOCUMENT ACTIONS ============

	uploadDocument: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'uploadDocument' });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const title = formData.get('title') as string;
		const description = (formData.get('description') as string) || null;

		if (!file || !(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Fichier requis', action: 'uploadDocument' });
		}

		if (!title?.trim()) {
			return fail(400, { error: 'Titre requis', action: 'uploadDocument' });
		}

		// Validate file type
		const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
		if (!ALLOWED_TYPES.includes(file.type)) {
			return fail(400, { error: 'Type de fichier non supporte', action: 'uploadDocument' });
		}

		// Validate file size (10MB)
		const MAX_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			return fail(400, { error: 'Fichier trop volumineux (max 10MB)', action: 'uploadDocument' });
		}

		try {
			// Generate unique filename
			const timestamp = Date.now();
			const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
			const storagePath = `chapters/${chapterId}/${timestamp}.${ext}`;

			// Upload to Supabase Storage
			const arrayBuffer = await file.arrayBuffer();
			const buffer = new Uint8Array(arrayBuffer);

			const { error: uploadError } = await locals.supabase.storage
				.from('chapter-documents')
				.upload(storagePath, buffer, {
					contentType: file.type,
					upsert: false,
					cacheControl: '3600'
				});

			if (uploadError) {
				console.error('[uploadDocument] Storage error:', uploadError);
				return fail(500, { error: "Erreur lors de l'upload", action: 'uploadDocument' });
			}

			// Create document record
			const { error: dbError } = await addChapterDocument(
				chapterId,
				{
					chapterId,
					sourceType: 'upload',
					title: title.trim(),
					description: description?.trim() || null,
					storagePath,
					fileName: file.name,
					mimeType: file.type,
					fileSize: file.size
				},
				locals.supabase
			);

			if (dbError) {
				// Try to clean up uploaded file
				await locals.supabase.storage.from('chapter-documents').remove([storagePath]);
				console.error('[uploadDocument] DB error:', dbError);
				return fail(500, { error: "Erreur lors de l'enregistrement", action: 'uploadDocument' });
			}

			return { success: true, action: 'uploadDocument' };
		} catch (err) {
			console.error('[uploadDocument] Error:', err);
			return fail(500, { error: 'Erreur inattendue', action: 'uploadDocument' });
		}
	},

	addGoogleDriveDocument: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'addGoogleDriveDocument' });
		}

		const formData = await request.formData();
		const googleDriveUrl = formData.get('googleDriveUrl') as string;
		const title = formData.get('title') as string;
		const description = (formData.get('description') as string) || null;

		if (!googleDriveUrl?.trim()) {
			return fail(400, { error: 'URL Google Drive requise', action: 'addGoogleDriveDocument' });
		}

		if (!title?.trim()) {
			return fail(400, { error: 'Titre requis', action: 'addGoogleDriveDocument' });
		}

		// Basic URL validation
		if (
			!googleDriveUrl.includes('drive.google.com') &&
			!googleDriveUrl.includes('docs.google.com')
		) {
			return fail(400, { error: 'URL Google Drive invalide', action: 'addGoogleDriveDocument' });
		}

		// Extract Google file ID from URL (optional - for API operations later)
		let googleFileId: string | null = null;
		const fileIdMatch = googleDriveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
		if (fileIdMatch) {
			googleFileId = fileIdMatch[1];
		}

		const { error: dbError } = await addChapterDocument(
			chapterId,
			{
				chapterId,
				sourceType: 'google_drive',
				title: title.trim(),
				description: description?.trim() || null,
				googleDriveUrl: googleDriveUrl.trim(),
				googleFileId: googleFileId ?? ''
			},
			locals.supabase
		);

		if (dbError) {
			console.error('[addGoogleDriveDocument] Error:', dbError);
			return fail(500, { error: "Erreur lors de l'ajout", action: 'addGoogleDriveDocument' });
		}

		return { success: true, action: 'addGoogleDriveDocument' };
	},

	deleteDocument: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const documentId = formData.get('documentId') as string;

		if (!documentId) {
			return fail(400, { error: 'Document ID requis', action: 'deleteDocument' });
		}

		// Get document info and verify ownership
		const { data: document } = await locals.supabase
			.from('chapter_documents')
			.select('id, storage_path, source_type, chapter:chapter_id!inner(teacher_id)')
			.eq('id', documentId)
			.single();

		const chapterData = document?.chapter as unknown as { teacher_id: string } | null;
		if (!document || chapterData?.teacher_id !== user.id) {
			return fail(403, { error: 'Acces refuse', action: 'deleteDocument' });
		}

		// If it's an uploaded file, delete from storage
		if (document.source_type === 'upload' && document.storage_path) {
			const { error: storageError } = await locals.supabase.storage
				.from('chapter-documents')
				.remove([document.storage_path]);

			if (storageError) {
				console.warn('[deleteDocument] Storage delete warning:', storageError);
				// Continue anyway - DB record deletion is more important
			}
		}

		// Delete document record
		const { error: dbError } = await deleteChapterDocument(documentId, locals.supabase);

		if (dbError) {
			console.error('[deleteDocument] Error:', dbError);
			return fail(500, { error: 'Erreur lors de la suppression', action: 'deleteDocument' });
		}

		return { success: true, action: 'deleteDocument' };
	},

	// ============ TEMPLATE ACTIONS ============

	migrateToVersion: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'migrateToVersion' });
		}

		const formData = await request.formData();
		const targetVersionStr = formData.get('targetVersion') as string;
		const targetVersion = parseInt(targetVersionStr, 10);

		if (isNaN(targetVersion) || targetVersion < 1) {
			return fail(400, { error: 'Version cible invalide', action: 'migrateToVersion' });
		}

		const { error: migrateError } = await migrateChapterToVersion(
			chapterId,
			targetVersion,
			locals.supabase
		);

		if (migrateError) {
			console.error('[migrateToVersion] Error:', migrateError);
			return fail(500, { error: 'Erreur lors de la migration', action: 'migrateToVersion' });
		}

		return { success: true, action: 'migrateToVersion' };
	},

	detachFromTemplate: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify ownership
		const { data: chapter } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapter) {
			return fail(403, { error: 'Acces refuse', action: 'detachFromTemplate' });
		}

		const { error: detachError } = await detachChapterFromTemplate(chapterId, locals.supabase);

		if (detachError) {
			console.error('[detachFromTemplate] Error:', detachError);
			return fail(500, { error: 'Erreur lors du detachement', action: 'detachFromTemplate' });
		}

		return { success: true, action: 'detachFromTemplate' };
	}
};
