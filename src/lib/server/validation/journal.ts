/**
 * Class Journal Validation Schemas
 * =================================
 *
 * Zod schemas for validating journal entry requests.
 * All schemas include helpful error messages in French.
 *
 * @module server/validation/journal
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum length for lesson/homework content (50,000 characters)
 * Allows for comprehensive lesson notes while preventing abuse
 */
const MAX_CONTENT_LENGTH = 50000;

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Date schema (YYYY-MM-DD format)
 * Validates that the date is in the correct format and is a valid date
 */
export const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD attendu)')
	.refine(
		(date) => {
			const parsed = new Date(date);
			if (isNaN(parsed.getTime())) return false;
			// Verify the date wasn't auto-corrected (e.g., 2024-02-30 -> 2024-03-01)
			return parsed.toISOString().startsWith(date);
		},
		{ message: 'Date invalide' }
	);

/**
 * Date schema that must not be in the past
 */
export const futureDateSchema = dateSchema.refine(
	(date) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const inputDate = new Date(date);
		return inputDate >= today;
	},
	{ message: 'La date ne peut pas etre dans le passe' }
);

/**
 * Optional date schema (nullable)
 */
export const optionalDateSchema = dateSchema.nullable().optional();

// ============================================================================
// CREATE SCHEMAS
// ============================================================================

/**
 * Schema for creating a journal entry
 */
export const createJournalEntrySchema = z
	.object({
		classId: uuidSchema.describe('ID de la classe'),
		entryDate: dateSchema.describe('Date de la seance'),
		lessonContent: z
			.string()
			.trim()
			.max(
				MAX_CONTENT_LENGTH,
				`Le contenu du cours est trop long (max ${MAX_CONTENT_LENGTH} caracteres)`
			)
			.optional()
			.nullable(),
		homeworkContent: z
			.string()
			.trim()
			.max(
				MAX_CONTENT_LENGTH,
				`Le contenu du devoir est trop long (max ${MAX_CONTENT_LENGTH} caracteres)`
			)
			.optional()
			.nullable(),
		homeworkDueDate: dateSchema.optional().nullable(),
		isPublished: z.boolean().default(false)
	})
	.refine(
		(data) => {
			// If homework_due_date is set, homework_content must be provided
			if (data.homeworkDueDate && !data.homeworkContent) {
				return false;
			}
			return true;
		},
		{
			message: 'Une date limite requiert un contenu de devoir',
			path: ['homeworkDueDate']
		}
	)
	.refine(
		(data) => {
			// homework_due_date must be >= entry_date
			if (data.homeworkDueDate && data.entryDate) {
				const entryDate = new Date(data.entryDate);
				const dueDate = new Date(data.homeworkDueDate);
				return dueDate >= entryDate;
			}
			return true;
		},
		{
			message: "La date limite doit etre posterieure ou egale a la date de l'entree",
			path: ['homeworkDueDate']
		}
	);

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

// ============================================================================
// UPDATE SCHEMAS
// ============================================================================

/**
 * Schema for updating a journal entry
 */
export const updateJournalEntrySchema = z
	.object({
		entryDate: dateSchema.optional(),
		lessonContent: z
			.string()
			.trim()
			.max(
				MAX_CONTENT_LENGTH,
				`Le contenu du cours est trop long (max ${MAX_CONTENT_LENGTH} caracteres)`
			)
			.optional()
			.nullable(),
		homeworkContent: z
			.string()
			.trim()
			.max(
				MAX_CONTENT_LENGTH,
				`Le contenu du devoir est trop long (max ${MAX_CONTENT_LENGTH} caracteres)`
			)
			.optional()
			.nullable(),
		homeworkDueDate: dateSchema.optional().nullable(),
		isPublished: z.boolean().optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	})
	.refine(
		(data) => {
			// If homeworkDueDate is being cleared (set to null), that's fine
			// If homeworkDueDate is being set to a value, ensure we're not removing homeworkContent
			if (data.homeworkDueDate && data.homeworkContent === null) {
				return false;
			}
			return true;
		},
		{
			message: 'Impossible de definir une date limite sans contenu de devoir',
			path: ['homeworkDueDate']
		}
	);

export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Schema for listing journal entries
 */
export const listJournalEntriesQuerySchema = paginationSchema.extend({
	classId: uuidSchema.describe('ID de la classe').optional(),
	teacherId: uuidSchema.describe("ID de l'enseignant").optional(),
	startDate: dateSchema.optional(),
	endDate: dateSchema.optional(),
	publishedOnly: z
		.string()
		.optional()
		.transform((val) => val === 'true')
});

export type ListJournalEntriesQuery = z.infer<typeof listJournalEntriesQuerySchema>;

/**
 * Schema for getting entries for a specific week
 */
export const weekViewQuerySchema = z.object({
	classId: uuidSchema.describe('ID de la classe'),
	weekStart: dateSchema.describe('Debut de la semaine (lundi)'),
	weekEnd: dateSchema.describe('Fin de la semaine (dimanche)').optional()
});

export type WeekViewQuery = z.infer<typeof weekViewQuerySchema>;

/**
 * Schema for getting upcoming homework
 */
export const upcomingHomeworkQuerySchema = z.object({
	studentId: uuidSchema.describe("ID de l'eleve"),
	daysAhead: z
		.number()
		.int('Le nombre de jours doit etre un entier')
		.min(1, 'Le nombre de jours doit etre au moins 1')
		.max(90, 'Le nombre de jours ne peut pas depasser 90')
		.default(14)
});

export type UpcomingHomeworkQuery = z.infer<typeof upcomingHomeworkQuerySchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create journal entry request
 */
export function validateCreateJournalEntry(data: unknown) {
	return createJournalEntrySchema.safeParse(data);
}

/**
 * Validate update journal entry request
 */
export function validateUpdateJournalEntry(data: unknown) {
	return updateJournalEntrySchema.safeParse(data);
}

/**
 * Validate list journal entries query
 */
export function validateListJournalEntriesQuery(params: URLSearchParams) {
	return listJournalEntriesQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate week view query
 */
export function validateWeekViewQuery(params: URLSearchParams) {
	return weekViewQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate upcoming homework query
 */
export function validateUpcomingHomeworkQuery(data: unknown) {
	return upcomingHomeworkQuerySchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Journal entry response schema
 */
export const journalEntryResponseSchema = z.object({
	id: uuidSchema,
	classId: uuidSchema,
	teacherId: uuidSchema,
	entryDate: dateSchema,
	lessonContent: z.string().nullable(),
	homeworkContent: z.string().nullable(),
	homeworkDueDate: dateSchema.nullable(),
	isPublished: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string()
});

/**
 * Journal entry list response schema
 */
export const journalEntryListResponseSchema = z.object({
	entries: z.array(journalEntryResponseSchema),
	total: z.number().int().nonnegative()
});

/**
 * Upcoming homework response schema
 */
export const upcomingHomeworkResponseSchema = z.object({
	id: uuidSchema,
	classId: uuidSchema,
	className: z.string(),
	classLevel: z.string(),
	entryDate: dateSchema,
	homeworkContent: z.string(),
	homeworkDueDate: dateSchema,
	daysUntilDue: z.number().int()
});
