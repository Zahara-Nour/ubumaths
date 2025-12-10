/**
 * Chapter System Validation Schemas
 *
 * Zod schemas for validating chapter-related API requests.
 * All schemas include helpful error messages in French.
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Chapter icon values (must match ChapterIcon type in types/chapters.ts)
 */
const CHAPTER_ICON_VALUES = [
	'book',
	'calculator',
	'compass',
	'lightbulb',
	'target',
	'star',
	'trophy',
	'flag',
	'rocket',
	'puzzle',
	'brain',
	'chart-bar',
	'chart-line',
	'percent',
	'sigma',
	'pi',
	'square-root',
	'ruler',
	'shapes',
	'cube'
] as const;

/**
 * Chapter icon validation
 */
export const chapterIconSchema = z.enum(CHAPTER_ICON_VALUES);

/**
 * Chapter color values (must match ChapterColor type in types/chapters.ts)
 */
const CHAPTER_COLOR_VALUES = [
	'slate',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose'
] as const;

/**
 * Chapter color validation
 */
export const chapterColorSchema = z.enum(CHAPTER_COLOR_VALUES);

/**
 * Document source type validation
 */
export const documentSourceTypeSchema = z.enum(['upload', 'google_drive']);

/**
 * Display order validation (positive integer, reasonable max)
 */
export const displayOrderSchema = z
	.number()
	.int("L'ordre d'affichage doit etre un entier")
	.min(0, "L'ordre d'affichage doit etre positif")
	.max(1000, "L'ordre d'affichage est trop eleve (max 1000)");

// ============================================================================
// CHAPTER SCHEMAS
// ============================================================================

/**
 * Schema for creating a new chapter
 */
export const createChapterSchema = z.object({
	classId: uuidSchema.describe('ID de la classe'),
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(2000, 'La description est trop longue (max 2000 caracteres)')
		.optional()
		.nullable(),
	displayOrder: displayOrderSchema.optional(),
	isVisible: z.boolean().default(true),
	color: chapterColorSchema.optional().nullable(),
	icon: chapterIconSchema.optional().nullable()
});

export type CreateChapterInput = z.infer<typeof createChapterSchema>;

/**
 * Schema for updating a chapter
 */
export const updateChapterSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Le titre est requis')
			.max(200, 'Le titre est trop long (max 200 caracteres)')
			.optional(),
		description: z
			.string()
			.trim()
			.max(2000, 'La description est trop longue (max 2000 caracteres)')
			.optional()
			.nullable(),
		displayOrder: displayOrderSchema.optional(),
		isVisible: z.boolean().optional(),
		color: chapterColorSchema.optional().nullable(),
		icon: chapterIconSchema.optional().nullable()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;

/**
 * Schema for reordering chapters
 */
export const reorderChaptersSchema = z.object({
	chapters: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins un chapitre requis')
		.max(100, 'Trop de chapitres (max 100)')
});

export type ReorderChaptersInput = z.infer<typeof reorderChaptersSchema>;

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a document (upload)
 */
export const createUploadDocumentSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(1000, 'La description est trop longue (max 1000 caracteres)')
		.optional()
		.nullable(),
	storagePath: z.string().min(1, 'Le chemin de stockage est requis'),
	fileName: z
		.string()
		.min(1, 'Le nom du fichier est requis')
		.max(500, 'Le nom du fichier est trop long'),
	mimeType: z.string().min(1, 'Le type MIME est requis').max(100, 'Le type MIME est trop long'),
	fileSize: z
		.number()
		.int('La taille doit etre un entier')
		.min(1, 'Le fichier ne peut pas etre vide')
		.max(100 * 1024 * 1024, 'Le fichier est trop volumineux (max 100 Mo)'),
	displayOrder: displayOrderSchema.optional()
});

export type CreateUploadDocumentInput = z.infer<typeof createUploadDocumentSchema>;

/**
 * Schema for creating a document (Google Drive link)
 */
export const createGoogleDriveDocumentSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(1000, 'La description est trop longue (max 1000 caracteres)')
		.optional()
		.nullable(),
	googleFileId: z.string().min(1, "L'ID du fichier Google est requis"),
	googleDriveUrl: z.string().url('URL Google Drive invalide'),
	fileName: z.string().max(500, 'Le nom du fichier est trop long').optional().nullable(),
	mimeType: z.string().max(100, 'Le type MIME est trop long').optional().nullable(),
	thumbnailUrl: z.string().url('URL de miniature invalide').optional().nullable(),
	displayOrder: displayOrderSchema.optional()
});

export type CreateGoogleDriveDocumentInput = z.infer<typeof createGoogleDriveDocumentSchema>;

/**
 * Combined schema for creating any document type
 */
export const createDocumentSchema = z.discriminatedUnion('sourceType', [
	createUploadDocumentSchema.extend({ sourceType: z.literal('upload') }),
	createGoogleDriveDocumentSchema.extend({ sourceType: z.literal('google_drive') })
]);

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

/**
 * Schema for updating a document
 */
export const updateDocumentSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Le titre est requis')
			.max(200, 'Le titre est trop long (max 200 caracteres)')
			.optional(),
		description: z
			.string()
			.trim()
			.max(1000, 'La description est trop longue (max 1000 caracteres)')
			.optional()
			.nullable(),
		displayOrder: displayOrderSchema.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

/**
 * Schema for reordering documents
 */
export const reorderDocumentsSchema = z.object({
	documents: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins un document requis')
		.max(100, 'Trop de documents (max 100)')
});

export type ReorderDocumentsInput = z.infer<typeof reorderDocumentsSchema>;

// ============================================================================
// CHECKLIST SCHEMAS
// ============================================================================

/**
 * Schema for creating a checklist item
 */
export const createChecklistItemSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	content: z
		.string()
		.trim()
		.min(1, 'Le contenu est requis')
		.max(500, 'Le contenu est trop long (max 500 caracteres)'),
	description: z
		.string()
		.trim()
		.max(1000, 'La description est trop longue (max 1000 caracteres)')
		.optional()
		.nullable(),
	displayOrder: displayOrderSchema.optional()
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

/**
 * Schema for updating a checklist item
 */
export const updateChecklistItemSchema = z
	.object({
		content: z
			.string()
			.trim()
			.min(1, 'Le contenu est requis')
			.max(500, 'Le contenu est trop long (max 500 caracteres)')
			.optional(),
		description: z
			.string()
			.trim()
			.max(1000, 'La description est trop longue (max 1000 caracteres)')
			.optional()
			.nullable(),
		displayOrder: displayOrderSchema.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

/**
 * Schema for toggling a checklist item (student action)
 */
export const toggleChecklistSchema = z.object({
	checklistItemId: uuidSchema.describe("ID de l'element de la checklist"),
	isCompleted: z.boolean()
});

export type ToggleChecklistInput = z.infer<typeof toggleChecklistSchema>;

/**
 * Schema for bulk toggling checklist items
 */
export const bulkToggleChecklistSchema = z.object({
	items: z
		.array(
			z.object({
				checklistItemId: uuidSchema,
				isCompleted: z.boolean()
			})
		)
		.min(1, 'Au moins un element requis')
		.max(50, "Trop d'elements (max 50)")
});

export type BulkToggleChecklistInput = z.infer<typeof bulkToggleChecklistSchema>;

/**
 * Schema for reordering checklist items
 */
export const reorderChecklistItemsSchema = z.object({
	items: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins un element requis')
		.max(100, "Trop d'elements (max 100)")
});

export type ReorderChecklistItemsInput = z.infer<typeof reorderChecklistItemsSchema>;

// ============================================================================
// QUIZ SCHEMAS
// ============================================================================

/**
 * Schema for adding a question to a chapter quiz
 */
export const addQuizQuestionSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	questionTemplateId: uuidSchema.describe('ID du template de question'),
	pointsOverride: z
		.number()
		.int('Les points doivent etre un entier')
		.min(0, 'Les points doivent etre positifs')
		.max(100, 'Les points sont trop eleves (max 100)')
		.optional()
		.nullable(),
	displayOrder: displayOrderSchema.optional()
});

export type AddQuizQuestionInput = z.infer<typeof addQuizQuestionSchema>;

/**
 * Schema for updating a quiz question link
 */
export const updateQuizQuestionSchema = z
	.object({
		pointsOverride: z
			.number()
			.int('Les points doivent etre un entier')
			.min(0, 'Les points doivent etre positifs')
			.max(100, 'Les points sont trop eleves (max 100)')
			.optional()
			.nullable(),
		displayOrder: displayOrderSchema.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateQuizQuestionInput = z.infer<typeof updateQuizQuestionSchema>;

/**
 * Schema for adding multiple questions to a quiz
 */
export const addBulkQuizQuestionsSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	questions: z
		.array(
			z.object({
				questionTemplateId: uuidSchema,
				pointsOverride: z.number().int().min(0).max(100).optional().nullable(),
				displayOrder: displayOrderSchema.optional()
			})
		)
		.min(1, 'Au moins une question requise')
		.max(50, 'Trop de questions (max 50)')
});

export type AddBulkQuizQuestionsInput = z.infer<typeof addBulkQuizQuestionsSchema>;

/**
 * Schema for reordering quiz questions
 */
export const reorderQuizQuestionsSchema = z.object({
	questions: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins une question requise')
		.max(100, 'Trop de questions (max 100)')
});

export type ReorderQuizQuestionsInput = z.infer<typeof reorderQuizQuestionsSchema>;

/**
 * Schema for student submitting a quiz answer
 */
export const submitQuizAnswerSchema = z.object({
	chapterQuizQuestionId: uuidSchema.describe('ID de la question du quiz'),
	submittedAnswer: z
		.string()
		.trim()
		.min(1, 'La reponse est requise')
		.max(5000, 'La reponse est trop longue (max 5000 caracteres)'),
	isCorrect: z.boolean(),
	timeSpentSeconds: z
		.number()
		.int('Le temps doit etre un entier')
		.min(0, 'Le temps ne peut pas etre negatif')
		.max(86400, 'Le temps est trop eleve (max 24h)')
		.optional()
		.nullable()
});

export type SubmitQuizAnswerInput = z.infer<typeof submitQuizAnswerSchema>;

/**
 * Schema for submitting multiple quiz answers (batch)
 */
export const submitBulkQuizAnswersSchema = z.object({
	answers: z
		.array(
			z.object({
				chapterQuizQuestionId: uuidSchema,
				submittedAnswer: z.string().trim().min(1).max(5000),
				isCorrect: z.boolean(),
				timeSpentSeconds: z.number().int().min(0).max(86400).optional().nullable()
			})
		)
		.min(1, 'Au moins une reponse requise')
		.max(50, 'Trop de reponses (max 50)')
});

export type SubmitBulkQuizAnswersInput = z.infer<typeof submitBulkQuizAnswersSchema>;

// ============================================================================
// EXERCISE SCHEMAS
// ============================================================================

/**
 * Schema for linking an exercise to a chapter
 */
export const linkExerciseSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	exerciseId: uuidSchema.describe("ID de l'exercice"),
	displayOrder: displayOrderSchema.optional()
});

export type LinkExerciseInput = z.infer<typeof linkExerciseSchema>;

/**
 * Schema for linking multiple exercises
 */
export const linkBulkExercisesSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	exercises: z
		.array(
			z.object({
				exerciseId: uuidSchema,
				displayOrder: displayOrderSchema.optional()
			})
		)
		.min(1, 'Au moins un exercice requis')
		.max(50, "Trop d'exercices (max 50)")
});

export type LinkBulkExercisesInput = z.infer<typeof linkBulkExercisesSchema>;

/**
 * Schema for reordering exercises
 */
export const reorderExercisesSchema = z.object({
	exercises: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins un exercice requis')
		.max(100, "Trop d'exercices (max 100)")
});

export type ReorderExercisesInput = z.infer<typeof reorderExercisesSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Schema for listing chapters
 */
export const listChaptersQuerySchema = paginationSchema.extend({
	classId: uuidSchema.describe('ID de la classe'),
	visibleOnly: z
		.string()
		.optional()
		.transform((val) => val === 'true')
});

export type ListChaptersQuery = z.infer<typeof listChaptersQuerySchema>;

/**
 * Schema for getting chapter progress
 */
export const chapterProgressQuerySchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	studentId: uuidSchema.describe("ID de l'eleve").optional()
});

export type ChapterProgressQuery = z.infer<typeof chapterProgressQuerySchema>;

/**
 * Schema for listing quiz results
 */
export const listQuizResultsQuerySchema = paginationSchema.extend({
	chapterId: uuidSchema.optional(),
	studentId: uuidSchema.optional(),
	questionId: uuidSchema.optional()
});

export type ListQuizResultsQuery = z.infer<typeof listQuizResultsQuerySchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create chapter request
 */
export function validateCreateChapter(data: unknown) {
	return createChapterSchema.safeParse(data);
}

/**
 * Validate update chapter request
 */
export function validateUpdateChapter(data: unknown) {
	return updateChapterSchema.safeParse(data);
}

/**
 * Validate create document request
 */
export function validateCreateDocument(data: unknown) {
	return createDocumentSchema.safeParse(data);
}

/**
 * Validate create checklist item request
 */
export function validateCreateChecklistItem(data: unknown) {
	return createChecklistItemSchema.safeParse(data);
}

/**
 * Validate toggle checklist request
 */
export function validateToggleChecklist(data: unknown) {
	return toggleChecklistSchema.safeParse(data);
}

/**
 * Validate add quiz question request
 */
export function validateAddQuizQuestion(data: unknown) {
	return addQuizQuestionSchema.safeParse(data);
}

/**
 * Validate submit quiz answer request
 */
export function validateSubmitQuizAnswer(data: unknown) {
	return submitQuizAnswerSchema.safeParse(data);
}

/**
 * Validate link exercise request
 */
export function validateLinkExercise(data: unknown) {
	return linkExerciseSchema.safeParse(data);
}

/**
 * Validate list chapters query
 */
export function validateListChaptersQuery(params: URLSearchParams) {
	return listChaptersQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate chapter progress query
 */
export function validateChapterProgressQuery(params: URLSearchParams) {
	return chapterProgressQuerySchema.safeParse(Object.fromEntries(params));
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Chapter response schema
 */
export const chapterResponseSchema = z.object({
	id: uuidSchema,
	classId: uuidSchema,
	teacherId: uuidSchema,
	title: z.string(),
	description: z.string().nullable(),
	displayOrder: z.number().int(),
	isVisible: z.boolean(),
	color: chapterColorSchema.nullable(),
	icon: chapterIconSchema.nullable(),
	createdAt: z.string(),
	updatedAt: z.string()
});

/**
 * Document response schema
 */
export const documentResponseSchema = z.object({
	id: uuidSchema,
	chapterId: uuidSchema,
	title: z.string(),
	description: z.string().nullable(),
	sourceType: documentSourceTypeSchema,
	storagePath: z.string().nullable(),
	fileName: z.string().nullable(),
	mimeType: z.string().nullable(),
	fileSize: z.number().nullable(),
	googleFileId: z.string().nullable(),
	googleDriveUrl: z.string().nullable(),
	thumbnailUrl: z.string().nullable(),
	displayOrder: z.number().int(),
	createdAt: z.string(),
	updatedAt: z.string()
});

/**
 * Chapter progress response schema
 */
export const chapterProgressResponseSchema = z.object({
	chapterId: uuidSchema,
	studentId: uuidSchema,
	totalChecklistItems: z.number().int().nonnegative(),
	completedChecklistItems: z.number().int().nonnegative(),
	checklistProgress: z.number().min(0).max(100),
	totalQuizQuestions: z.number().int().nonnegative(),
	correctQuizQuestions: z.number().int().nonnegative(),
	quizScore: z.number().min(0).max(100),
	totalPointsEarned: z.number().int().nonnegative(),
	maxPossiblePoints: z.number().int().nonnegative(),
	lastActivityAt: z.string().nullable()
});

/**
 * Chapter list response schema
 */
export const chapterListResponseSchema = z.object({
	chapters: z.array(chapterResponseSchema),
	total: z.number().int().nonnegative()
});

/**
 * Quiz result response schema
 */
export const quizResultResponseSchema = z.object({
	id: uuidSchema,
	studentId: uuidSchema,
	chapterQuizQuestionId: uuidSchema,
	attemptNumber: z.number().int().positive(),
	isCorrect: z.boolean(),
	submittedAnswer: z.string(),
	pointsEarned: z.number().int().nonnegative(),
	submittedAt: z.string(),
	timeSpentSeconds: z.number().int().nonnegative().nullable()
});
