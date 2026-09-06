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

	// Verify chapter exists
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('*')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapitre non trouve');
	}

	// Verify class matches
	if (chapter.class_id !== classId) {
		throw error(404, 'Chapitre non trouve dans cette classe');
	}

	// Get class info
	const { data: classData, error: classDataError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', classId)
		.single();

	// PGRST116 = la classe n'existe pas ; le repli d'affichage existe déjà.
	if (classDataError && classDataError.code !== 'PGRST116') {
		console.error('Classe illisible :', classDataError);
		throw error(500, 'Impossible de charger la classe');
	}

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

	// Quiz de chapitre : hors service, et depuis toujours — pendant côté
	// professeur du même défaut corrigé côté élève.
	//
	// `question_templates` n'a ni `question`, ni `answer`, ni `answer_type` : un
	// modèle porte `title`, `description` et surtout `variations`, où vit
	// l'énoncé. Les requêtes échouaient donc à chaque affichage, et ni la liste
	// des questions du quiz ni le sélecteur d'ajout n'ont jamais rien montré.
	//
	// On retire les requêtes mortes plutôt que d'improviser : rebrancher le quiz
	// suppose de décider comment une `variation` devient une question vrai/faux,
	// ce qui relève d'un choix produit. Comportement inchangé.
	const questionTemplates: Record<string, { id: string; question: string; answer: unknown }> = {};

	// Get exercise details
	// `exercises.title` est nullable en base : un exercice sans titre reste
	// listable, il s'affiche sous un libellé de repli.
	const exerciseDetails: Record<string, { id: string; title: string }> = {};
	if (exercises.length > 0) {
		const exerciseIds = exercises.map((e) => e.exerciseId);
		const { data: exerciseData, error: exerciseDataError } = await locals.supabase
			.from('exercises')
			.select('id, title')
			.in('id', exerciseIds);

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (exerciseDataError) {
			console.error('Enrichissement illisible :', exerciseDataError);
		}

		for (const e of exerciseData || []) {
			exerciseDetails[e.id] = {
				id: e.id,
				title: e.title ?? 'Exercice sans titre'
			};
		}
	}

	// Même modèle inexistant que ci-dessus (`question`, `answer`, `answer_type`,
	// `topic`, `subtopic`) : la liste est restée vide depuis toujours.
	const availableTemplates: Array<{ id: string; question: string }> = [];

	// Get available exercises for linking
	const { data: availableExercises, error: availableExercisesError } = await locals.supabase
		.from('exercises')
		.select('id, title')
		.eq('created_by', user.id)
		.order('created_at', { ascending: false })
		.limit(100);

	if (availableExercisesError) {
		console.error('Lecture impossible :', availableExercisesError);
		throw error(500, 'Impossible de charger les données');
	}

	// Get student progress
	const { data: checklistProgress, error: checklistProgressError } =
		await getStudentChecklistProgress(chapterId, locals.supabase);

	// L'avancement des élèves : une panne le montrerait entièrement à zéro, ce
	// que le professeur lirait comme « personne n'a rien fait ».
	if (checklistProgressError) {
		console.error('Avancement illisible :', checklistProgressError);
		throw error(500, 'Impossible de charger l’avancement');
	}

	const { data: quizResultsData, error: quizResultsDataError } = await getChapterQuizResults(
		chapterId,
		locals.supabase
	);

	// L'avancement des élèves : une panne le montrerait entièrement à zéro, ce
	// que le professeur lirait comme « personne n'a rien fait ».
	if (quizResultsDataError) {
		console.error('Avancement illisible :', quizResultsDataError);
		throw error(500, 'Impossible de charger l’avancement');
	}

	// Get students in class
	// `is_test` est une colonne de `profiles`, pas de `class_members` : le filtre
	// rendait la requête ENTIÈRE invalide, donc `students` valait toujours `null`
	// et le professeur ne voyait aucun élève sur la page de chapitre.
	// L'embed passe en `!inner` pour que le filtre sur la table liée s'applique.
	const { data: students, error: studentsError } = await locals.supabase
		.from('class_members')
		.select('student_id, profiles!inner (id, full_name, avatar_url, is_test)')
		.eq('class_id', classId)
		.eq('status', 'active')
		.eq('profiles.is_test', false);

	// ⚠️ C'est la liste des élèves du chapitre. Vide par accident, elle dit au
	// professeur que personne n'est inscrit — le même symptôme que le filtre
	// `is_test` mal placé corrigé plus haut.
	if (studentsError) {
		console.error('Élèves illisibles :', studentsError);
		throw error(500, 'Impossible de charger les élèves');
	}

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
	const { data: templateInstantiation, error: templateInstantiationError } =
		await checkForTemplateUpdates(chapterId, locals.supabase);

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (templateInstantiationError) {
		console.error('Enrichissement illisible :', templateInstantiationError);
	}

	return {
		chapter: {
			id: chapter.id,
			classId: chapter.class_id,
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
		availableTemplates,
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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[addChecklistItem] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'addChecklistItem' });
		}

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
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify item exists (RLS enforces ownership)
		const { data: item, error: itemError } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id')
			.eq('id', itemId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (itemError && itemError.code !== 'PGRST116') {
			console.error('[updateChecklistItem] Lecture impossible :', itemError);
			return fail(500, { error: 'Verification impossible', action: 'updateChecklistItem' });
		}

		if (!item) {
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
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		// Verify item exists (RLS enforces ownership)
		const { data: item, error: itemError } = await locals.supabase
			.from('chapter_checklist_items')
			.select('id')
			.eq('id', itemId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (itemError && itemError.code !== 'PGRST116') {
			console.error('[deleteChecklistItem] Lecture impossible :', itemError);
			return fail(500, { error: 'Verification impossible', action: 'deleteChecklistItem' });
		}

		if (!item) {
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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[addQuizQuestion] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'addQuizQuestion' });
		}

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
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const quizQuestionId = formData.get('quizQuestionId') as string;

		// Verify question exists (RLS enforces ownership)
		const { data: question, error: questionError } = await locals.supabase
			.from('chapter_quiz_questions')
			.select('id')
			.eq('id', quizQuestionId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (questionError && questionError.code !== 'PGRST116') {
			console.error('[removeQuizQuestion] Lecture impossible :', questionError);
			return fail(500, { error: 'Verification impossible', action: 'removeQuizQuestion' });
		}

		if (!question) {
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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[linkExercise] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'linkExercise' });
		}

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
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const chapterExerciseId = formData.get('chapterExerciseId') as string;

		// Verify link exists (RLS enforces ownership)
		const { data: link, error: linkError } = await locals.supabase
			.from('chapter_exercises')
			.select('id')
			.eq('id', chapterExerciseId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (linkError && linkError.code !== 'PGRST116') {
			console.error('[unlinkExercise] Lecture impossible :', linkError);
			return fail(500, { error: 'Verification impossible', action: 'unlinkExercise' });
		}

		if (!link) {
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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[uploadDocument] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'uploadDocument' });
		}

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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[addGoogleDriveDocument] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'addGoogleDriveDocument' });
		}

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
		await requireRole(locals, 'teacher');

		const formData = await request.formData();
		const documentId = formData.get('documentId') as string;

		if (!documentId) {
			return fail(400, { error: 'Document ID requis', action: 'deleteDocument' });
		}

		// Get document info and verify it exists (RLS enforces ownership)
		const { data: document, error: documentError } = await locals.supabase
			.from('chapter_documents')
			.select('id, storage_path, source_type')
			.eq('id', documentId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (documentError && documentError.code !== 'PGRST116') {
			console.error('[deleteDocument] Lecture impossible :', documentError);
			return fail(500, { error: 'Verification impossible', action: 'deleteDocument' });
		}

		if (!document) {
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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[migrateToVersion] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'migrateToVersion' });
		}

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
		await requireRole(locals, 'teacher');
		const { chapterId } = params;

		// Verify chapter exists (RLS enforces ownership)
		const { data: chapter, error: chapterError } = await locals.supabase
			.from('class_chapters')
			.select('id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime.
		// Toute AUTRE panne produisait le même « accès refusé » : le professeur
		// s'entendait dire qu'il n'a pas accès à son propre chapitre.
		if (chapterError && chapterError.code !== 'PGRST116') {
			console.error('[detachFromTemplate] Lecture impossible :', chapterError);
			return fail(500, { error: 'Verification impossible', action: 'detachFromTemplate' });
		}

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
