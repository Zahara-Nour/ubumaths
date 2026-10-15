/**
 * Worksheet API validation schemas
 *
 * Comprehensive Zod validation for all worksheet-related API endpoints.
 * Based on types from $lib/types/worksheets.ts
 */

import { z } from 'zod';
import { uuidSchema } from './common';
import { exerciseHintSchema, exerciseTranslationsSchema } from './exercises';
import { gradeCodeSchema } from './grades';
import { CONTENT_LOCALES } from '$lib/types/locale';
import { capitalPairsSchema } from '$lib/questions/capital-pairs';
import {
	ANSWER_FRAME_MODES,
	ANSWER_FRAME_SIZES,
	CALCULATOR_RULES,
	WORKSHEET_TYPES,
	isIsoDate
} from '$lib/types/worksheets';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

/**
 * Type de fiche (ADR 0030) : les quatre types ; « quiz » est refusé
 */
export const worksheetTypeSchema = z.enum(WORKSHEET_TYPES, {
	message: 'Type de fiche invalide'
});

/** Calculatrice autorisée ou interdite (évaluation écrite, examen blanc) */
const calculatorRuleSchema = z.enum(CALCULATOR_RULES, {
	message: 'Règle de calculatrice invalide'
});

/** Cadres de réponse : après chaque question ou après l'exercice (ADR 0030, lot 3) */
const answerFrameModeSchema = z.enum(ANSWER_FRAME_MODES, {
	message: 'Placement des cadres invalide'
});

/**
 * Tailles des cadres d'un exercice, estimées par le serveur (vue de l'élève) :
 * bornées, une question n'en a qu'une, un cadre ne dépasse pas une page
 */
const answerFrameEstimateSchema = z.object({
	questions: z.array(z.enum(ANSWER_FRAME_SIZES)).max(200),
	exercise_cm: z.number().positive().max(30)
});

/** Date de rendu d'un devoir maison : `AAAA-MM-JJ`, une date qui existe */
const dueDateSchema = z
	.string()
	.refine(isIsoDate, { message: 'Date de rendu invalide (AAAA-MM-JJ attendu)' });

/**
 * Worksheet status enum
 */
export const worksheetStatusSchema = z.enum(['draft', 'published', 'archived'], {
	message: 'Statut de fiche invalide'
});

/**
 * Niveau de guidage d'une affectation (ADR 0023) : les étiquettes des
 * versions d'un exercice (`GuidanceLevel`)
 */
export const guidanceLevelSchema = z.enum(['guided', 'intermediate', 'autonomous'], {
	message: 'Niveau de guidage invalide'
});

/**
 * Variant mode enum
 */
export const variantModeSchema = z.enum(['none', 'individual', 'n_versions', 'group'], {
	message: 'Mode de variantes invalide'
});

/**
 * Numbering style enum
 */
export const numberingStyleSchema = z.enum(['numeric', 'alphabetic', 'roman'], {
	message: 'Style de numérotation invalide'
});

// ============================================================================
// LOCALE & TRANSLATION SCHEMAS
// ============================================================================

/**
 * Content locale of a worksheet: French (the source of truth) or English.
 * An unknown locale is rejected rather than stored and ignored later.
 */
const contentLocaleSchema = z.enum(CONTENT_LOCALES);

/**
 * Translations of a row's texts, keyed by locale.
 *
 * `strict()` on both levels: an unknown locale key or an unknown field is a
 * bug in the caller, not something to store silently. Lengths mirror the
 * French columns so a translation cannot smuggle in a bigger payload.
 */
const rowTranslationsSchema = z
	.object({
		en: z
			.object({
				title: z.string().trim().max(200, 'Titre trop long').optional(),
				description: z.string().trim().max(5000, 'Description trop longue').optional(),
				instructions: z.string().trim().max(5000, 'Consignes trop longues').optional(),
				custom_instructions: z.string().trim().max(5000, 'Consignes trop longues').optional()
			})
			.strict()
			.optional()
	})
	.strict();

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

/**
 * Base worksheet config object schema (without optional/default wrappers)
 */
const worksheetConfigObjectSchema = z.object({
	language: contentLocaleSchema.optional(),
	// Options du type de fiche (ADR 0030, `TYPE_OPTION_KEYS`)
	show_student_name: z.boolean().optional(),
	show_points: z.boolean().optional(),
	calculator: calculatorRuleSchema.optional(),
	answers_on_sheet: z.boolean().optional(),
	answer_frames: answerFrameModeSchema.optional(),
	due_date: dueDateSchema.optional(),
	shuffle_exercises: z.boolean().optional(),
	// Anciennes options d'affichage (ADR 0030) : plus lues, mais encore acceptées.
	// La config d'une fiche existante les renvoie telles quelles ; les retirer du
	// schéma les effacerait de la base au prochain envoi, et retirer ces données
	// est une étape à part, avec l'accord de David.
	correction_detail: z.enum(['concise', 'detailed']).optional(),
	show_title: z.boolean().optional(),
	show_date: z.boolean().optional(),
	show_class: z.boolean().optional(),
	numbering_style: numberingStyleSchema.optional(),
	// Case retirée (D6) mais clé encore acceptée : un client ancien ou un script
	// l'envoie, et la config d'une fiche existante la renvoie telle quelle — la
	// retirer du schéma la ferait disparaître de la base au prochain envoi.
	shuffle_within_sections: z.boolean().optional(),
	page_layout: z.enum(['A4', 'Letter']).optional(),
	font_size: z
		.number()
		.int('La taille de police doit être un nombre entier')
		.min(8, 'Taille de police trop petite')
		.max(24, 'Taille de police trop grande')
		.optional(),
	margins: z
		.object({
			top: z.number().min(0).max(100),
			bottom: z.number().min(0).max(100),
			left: z.number().min(0).max(100),
			right: z.number().min(0).max(100)
		})
		.optional()
});

/**
 * Worksheet config schema for CREATE (with default empty object)
 */
export const worksheetConfigSchema = worksheetConfigObjectSchema.optional().default({});

/**
 * Worksheet config schema for UPDATE (no default - only include if explicitly provided)
 */
export const worksheetConfigSchemaForUpdate = worksheetConfigObjectSchema.optional();

/**
 * Variant config schema (for JSONB column)
 */
export const variantConfigSchema = z
	.object({
		mode: variantModeSchema.optional(),
		n_versions: z
			.number()
			.int('Le nombre de versions doit être entier')
			.positive('Le nombre de versions doit être positif')
			.max(50, '50 versions au maximum')
			.optional(),
		group_size: z
			.number()
			.int('La taille de groupe doit être un nombre entier')
			.positive('La taille de groupe doit être positive')
			.max(100, '100 élèves au maximum par groupe')
			.optional(),
		seed_base: z.number().int().optional(),
		parameter_overrides: z.record(z.string(), z.unknown()).optional()
	})
	.optional()
	.default({});

// ============================================================================
// WORKSHEET CRUD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new worksheet (POST /api/worksheets)
 */
export const createWorksheetSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	description: z.string().trim().max(5000, 'Description trop longue').optional().nullable(),
	translations: rowTranslationsSchema.optional().nullable(),
	type: worksheetTypeSchema.default('worksheet'),
	config: worksheetConfigSchema,
	template_id: uuidSchema.optional().nullable(),
	// Le style de la fiche (lot 3) ; son accès est vérifié en base (trigger)
	style_id: uuidSchema.optional().nullable(),
	estimated_duration_minutes: z
		.number()
		.int('La durée doit être un nombre entier')
		.positive('La durée doit être positive')
		.max(600, 'Durée trop longue (600 minutes au maximum)')
		.optional()
		.nullable(),
	total_points: z
		.number()
		.int('Le nombre de points doit être entier')
		.positive('Le nombre de points doit être positif')
		.max(10000, 'Nombre de points trop grand')
		.optional()
		.nullable(),
	grades: z
		.array(z.string().trim().min(1).max(10))
		.max(20, '20 niveaux au maximum')
		.optional()
		.default([]),
	tags: z
		.array(z.string().trim().min(1).max(50))
		.max(30, '30 mots-clés au maximum')
		.optional()
		.default([])
});

/**
 * Schema for updating a worksheet (PUT /api/worksheets/[id])
 * All fields are optional for partial updates.
 * IMPORTANT: No defaults are applied - only explicitly provided fields are included.
 * This prevents overwriting DB values when a field is not in the request.
 */
export const updateWorksheetSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long').optional(),
	description: z.string().trim().max(5000, 'Description trop longue').optional().nullable(),
	type: worksheetTypeSchema.optional(),
	config: worksheetConfigSchemaForUpdate, // No default - won't be set if not in request
	template_id: uuidSchema.optional().nullable(),
	// Le style de la fiche (lot 3) ; son accès est vérifié en base (trigger)
	style_id: uuidSchema.optional().nullable(),
	estimated_duration_minutes: z
		.number()
		.int('La durée doit être un nombre entier')
		.positive('La durée doit être positive')
		.max(600, 'Durée trop longue (600 minutes au maximum)')
		.optional()
		.nullable(),
	total_points: z
		.number()
		.int('Le nombre de points doit être entier')
		.positive('Le nombre de points doit être positif')
		.max(10000, 'Nombre de points trop grand')
		.optional()
		.nullable(),
	grades: z.array(gradeCodeSchema).max(20, '20 niveaux au maximum').optional(), // No default - won't be set if not in request
	tags: z.array(z.string().trim().min(1).max(50)).max(30, '30 mots-clés au maximum').optional(), // No default - won't be set if not in request
	status: worksheetStatusSchema.optional(),
	translations: rowTranslationsSchema.optional().nullable()
});

/**
 * Schema for listing worksheets query parameters (GET /api/worksheets)
 */
export const listWorksheetsQuerySchema = z.object({
	page: z.coerce
		.number()
		.int('La page doit être un nombre entier')
		.positive('La page doit être positive')
		.max(1000, 'Numéro de page trop grand')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un nombre entier')
		.positive('La limite doit être positive')
		.max(100, '100 éléments au maximum par page')
		.default(50),
	status: worksheetStatusSchema.optional(),
	type: worksheetTypeSchema.optional(),
	search: z.string().trim().max(200, 'Recherche trop longue').optional()
});

// ============================================================================
// WORKSHEET SECTION SCHEMAS
// ============================================================================

/**
 * Schema for creating a worksheet section (POST /api/worksheets/[id]/sections)
 */
export const createWorksheetSectionSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	instructions: z.string().trim().max(5000, 'Consignes trop longues').optional().nullable(),
	translations: rowTranslationsSchema.optional().nullable(),
	position: z
		.number()
		.int('La position doit être un nombre entier')
		.nonnegative('La position ne peut pas être négative')
		.max(100, 'Position trop grande'),
	points_total: z
		.number()
		.int('Le nombre de points doit être entier')
		.positive('Le nombre de points doit être positif')
		.max(10000, 'Nombre de points trop grand')
		.optional()
		.nullable()
});

/**
 * Schema for updating a worksheet section
 */
export const updateWorksheetSectionSchema = createWorksheetSectionSchema.partial();

// ============================================================================
// WORKSHEET EXERCISE SCHEMAS
// ============================================================================

/**
 * Schema for adding an exercise to a worksheet (POST /api/worksheets/[id]/exercises)
 */
export const createWorksheetExerciseSchema = z.object({
	exercise_id: uuidSchema,
	section_id: uuidSchema.optional().nullable(),
	position: z
		.number()
		.int('La position doit être un nombre entier')
		.nonnegative('La position ne peut pas être négative')
		.max(1000, 'Position trop grande'),
	points: z
		.number()
		.int('Le nombre de points doit être entier')
		.positive('Le nombre de points doit être positif')
		.max(1000, 'Nombre de points trop grand')
		.optional()
		.nullable(),
	variant_mode: variantModeSchema.default('none'),
	variant_config: variantConfigSchema,
	custom_instructions: z.string().trim().max(5000, 'Consignes trop longues').optional().nullable(),
	translations: rowTranslationsSchema.optional().nullable(),
	is_essential: z.boolean().optional().default(false)
});

/**
 * Schema for updating a worksheet exercise
 */
export const updateWorksheetExerciseSchema = createWorksheetExerciseSchema.partial();

/**
 * Schema for reordering exercises (PUT /api/worksheets/[id]/exercises)
 */
export const reorderExercisesSchema = z.object({
	exercises: z
		.array(
			z.object({
				id: uuidSchema,
				position: z.number().int().nonnegative().max(1000),
				section_id: uuidSchema.optional().nullable()
			})
		)
		.min(1, 'Au moins un exercice requis')
		.max(200, '200 exercices au maximum par envoi')
});

/**
 * Schema for reordering sections (PUT /api/worksheets/[id]/sections)
 */
export const reorderSectionsSchema = z.object({
	sections: z
		.array(
			z.object({
				id: uuidSchema,
				position: z.number().int().nonnegative().max(100)
			})
		)
		.min(1, 'Au moins une section requise')
		.max(50, '50 sections au maximum par envoi')
});

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * URL parameter validation for worksheet ID
 */
export const worksheetIdParamSchema = z.object({
	id: uuidSchema
});

/**
 * URL parameter validation for section ID
 */
export const sectionIdParamSchema = z.object({
	id: uuidSchema,
	sectionId: uuidSchema
});

/**
 * URL parameter validation for exercise ID in worksheet
 */
export const worksheetExerciseIdParamSchema = z.object({
	id: uuidSchema,
	exerciseId: uuidSchema
});

// ============================================================================
// STUDENT WORKSHEET API SCHEMAS
// ============================================================================

/**
 * Query params for student worksheets list (GET /api/student/worksheets)
 */
export const studentWorksheetsQuerySchema = z.object({
	class_id: uuidSchema.optional(),
	/**
	 * Restreint aux fiches rattachées à ce chapitre de « Mon cours ».
	 *
	 * Le filtre passe par `chapter_worksheets`, dont la policy élève exige déjà
	 * `student_has_worksheet_access` : une fiche rangée dans le chapitre mais pas
	 * encore distribuée n'en ressort donc pas.
	 */
	chapter_id: uuidSchema.optional(),
	page: z.coerce
		.number()
		.int('La page doit être un nombre entier')
		.positive('La page doit être positive')
		.max(1000, 'Numéro de page trop grand')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un nombre entier')
		.positive('La limite doit être positive')
		.max(100, '100 éléments au maximum par page')
		.default(50)
});

/**
 * URL param for student worksheet detail
 */
export const studentWorksheetParamSchema = z.object({
	assignmentId: uuidSchema
});

// ============================================================================
// ASSIGNMENT STUDENT MANAGEMENT SCHEMAS (Teacher API)
// ============================================================================

/**
 * Schema for adding individual students to assignment
 * POST /api/worksheets/[id]/assignments/[assignmentId]/students
 */
export const addAssignmentStudentsSchema = z.object({
	student_ids: z
		.array(uuidSchema)
		.min(1, 'Au moins un élève requis')
		.max(200, '200 élèves au maximum par envoi')
});

/**
 * Schema for removing individual student from assignment
 * DELETE /api/worksheets/[id]/assignments/[assignmentId]/students
 */
export const removeAssignmentStudentSchema = z.object({
	student_id: uuidSchema
});

// ============================================================================
// CORRECTION SETTINGS SCHEMAS (Teacher API)
// ============================================================================

/**
 * Schema for updating global correction setting
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections
 */
export const updateCorrectionSettingsSchema = z.object({
	show_corrections: z.boolean()
});

/**
 * Schema for updating per-exercise correction setting
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections/exercises
 */
export const updateExerciseCorrectionSchema = z.object({
	worksheet_exercise_id: uuidSchema,
	show_correction: z.boolean()
});

/**
 * Schema for bulk updating exercise correction settings
 */
export const bulkUpdateExerciseCorrectionsSchema = z.object({
	settings: z
		.array(
			z.object({
				worksheet_exercise_id: uuidSchema,
				show_correction: z.boolean()
			})
		)
		.min(1, 'Au moins un réglage requis')
		.max(200, '200 réglages au maximum par envoi')
});

// ============================================================================
// ASSIGNMENT URL PARAMS (extended)
// ============================================================================

/**
 * URL params for assignment-level operations
 */
export const assignmentParamSchema = z.object({
	id: uuidSchema,
	assignmentId: uuidSchema
});

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create worksheet request body
 */
export function validateCreateWorksheet(data: unknown) {
	return createWorksheetSchema.safeParse(data);
}

/**
 * Validate update worksheet request body
 */
export function validateUpdateWorksheet(data: unknown) {
	return updateWorksheetSchema.safeParse(data);
}

/**
 * Validate list worksheets query parameters
 */
export function validateListWorksheetsQuery(params: URLSearchParams) {
	return listWorksheetsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate create section request body
 */
export function validateCreateWorksheetSection(data: unknown) {
	return createWorksheetSectionSchema.safeParse(data);
}

/**
 * Validate update section request body
 */
export function validateUpdateWorksheetSection(data: unknown) {
	return updateWorksheetSectionSchema.safeParse(data);
}

/**
 * Validate create worksheet exercise request body
 */
export function validateCreateWorksheetExercise(data: unknown) {
	return createWorksheetExerciseSchema.safeParse(data);
}

/**
 * Validate update worksheet exercise request body
 */
export function validateUpdateWorksheetExercise(data: unknown) {
	return updateWorksheetExerciseSchema.safeParse(data);
}

/**
 * Validate reorder exercises request body
 */
export function validateReorderExercises(data: unknown) {
	return reorderExercisesSchema.safeParse(data);
}

/**
 * Validate reorder sections request body
 */
export function validateReorderSections(data: unknown) {
	return reorderSectionsSchema.safeParse(data);
}

/**
 * Validate worksheet ID URL parameter
 */
export function validateWorksheetId(params: Record<string, string>) {
	return worksheetIdParamSchema.safeParse(params);
}

/**
 * Validate student worksheets query params
 */
export function validateStudentWorksheetsQuery(params: URLSearchParams) {
	return studentWorksheetsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student worksheet assignment ID param
 */
export function validateStudentWorksheetParam(params: Record<string, string>) {
	return studentWorksheetParamSchema.safeParse(params);
}

/**
 * Validate add students to assignment request
 */
export function validateAddAssignmentStudents(data: unknown) {
	return addAssignmentStudentsSchema.safeParse(data);
}

/**
 * Validate remove student from assignment request
 */
export function validateRemoveAssignmentStudent(data: unknown) {
	return removeAssignmentStudentSchema.safeParse(data);
}

/**
 * Validate correction settings update
 */
export function validateUpdateCorrectionSettings(data: unknown) {
	return updateCorrectionSettingsSchema.safeParse(data);
}

/**
 * Validate exercise correction update
 */
export function validateUpdateExerciseCorrection(data: unknown) {
	return updateExerciseCorrectionSchema.safeParse(data);
}

/**
 * Validate bulk exercise corrections update
 */
export function validateBulkUpdateExerciseCorrections(data: unknown) {
	return bulkUpdateExerciseCorrectionsSchema.safeParse(data);
}

/**
 * Validate assignment URL params
 */
export function validateAssignmentParams(params: Record<string, string>) {
	return assignmentParamSchema.safeParse(params);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Single worksheet response schema
 */
// Helper for Supabase timestamps (accepts both Z and +00:00 formats)
const timestampSchema = z
	.string()
	.refine((val) => !isNaN(Date.parse(val)), { message: 'Date invalide' });

export const worksheetResponseSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	description: z.string().nullable(),
	type: worksheetTypeSchema,
	config: z.record(z.string(), z.unknown()),
	status: worksheetStatusSchema,
	version: z.number().int(),
	published_at: timestampSchema.nullable(),
	archived_at: timestampSchema.nullable(),
	template_id: z.string().uuid().nullable(),
	// Optionnel : une route qui choisit ses colonnes peut ne pas le lire
	style_id: z.string().uuid().nullable().optional(),
	estimated_duration_minutes: z.number().int().nullable(),
	total_points: z.number().nullable(),
	grades: z.array(gradeCodeSchema),
	tags: z.array(z.string()),
	created_by: z.string().uuid(),
	school_id: z.string().uuid().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Worksheet section response schema
 */
export const worksheetSectionResponseSchema = z.object({
	id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	instructions: z.string().nullable(),
	position: z.number().int(),
	points_total: z.number().int().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Worksheet exercise response schema
 */
export const worksheetExerciseResponseSchema = z.object({
	id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	section_id: z.string().uuid().nullable(),
	position: z.number().int(),
	points: z.number().int().nullable(),
	variant_mode: variantModeSchema,
	variant_config: z.record(z.string(), z.unknown()),
	custom_instructions: z.string().nullable(),
	is_essential: z.boolean(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Worksheet exercise with joined exercise data
 * Note: statement_md/solution_md are now in variations (single source of truth)
 */
export const worksheetExerciseWithDataResponseSchema = worksheetExerciseResponseSchema.extend({
	correction_visible: z.boolean().optional(),
	variation_index: z.number().int().nullable().optional(),
	exercise: z
		.object({
			id: z.string().uuid(),
			title: z.string().nullable(),
			variables: z.unknown().nullable(),
			shared: z.unknown().nullable(),
			variations: z.array(z.unknown()).nullable(),
			// Lettres déclarées comme fonctions : sans cette clé, le schéma la
			// retire en silence et le PDF imprime `C'(x)` en erreur.
			generic_functions: z.array(z.string()).nullable().optional(),
			// Thème : décide du sens de `AB` dans le PDF (Q-J). Même piège que
			// ci-dessus : sans la clé, le schéma la retire en silence.
			topic: z.string().nullable().optional()
		})
		.nullable()
		.optional()
});

/**
 * Worksheet list item schema (includes exercise_count)
 */
export const worksheetListItemSchema = worksheetResponseSchema.extend({
	exercise_count: z.number().int().nonnegative()
});

/**
 * Worksheet list response schema (GET /api/worksheets)
 */
export const worksheetListResponseSchema = z.object({
	worksheets: z.array(worksheetListItemSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Worksheet with sections, exercises and template response schema (GET /api/worksheets/[id])
 */
export const worksheetDetailResponseSchema = z.object({
	worksheet: worksheetResponseSchema.extend({
		sections: z.array(worksheetSectionResponseSchema).optional(),
		exercises: z.array(worksheetExerciseWithDataResponseSchema).optional(),
		// La fiche d'un style du prof (`loadStyleTemplate`) : son Typst sert au PDF
		template: z
			.object({
				id: z.string().uuid(),
				name: z.string(),
				description: z.string().nullable(),
				template_content: z.string().optional(),
				style_id: z.string().uuid().nullable().optional()
			})
			.nullable()
			.optional()
	})
});

/**
 * Create worksheet response schema (POST /api/worksheets)
 */
export const createWorksheetResponseSchema = z.object({
	worksheet: worksheetResponseSchema
});

/**
 * Delete worksheet response schema
 */
export const deleteWorksheetResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

// ============================================================================
// WORKSHEET TEMPLATE SCHEMAS
// ============================================================================

/**
 * Placeholder definition schema
 */
export const templatePlaceholderSchema = z.object({
	key: z.string().trim().min(1, 'Clé requise').max(50, 'Clé trop longue'),
	type: z.enum(['text', 'date', 'dynamic']),
	label: z.string().trim().max(100, 'Libellé trop long').optional(),
	default_value: z.string().trim().max(500, 'Valeur par défaut trop longue').optional()
});

/**
 * Schema for creating a new template (POST /api/worksheets/templates)
 */
export const createTemplateSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(255, 'Nom trop long'),
	description: z.string().trim().max(2000, 'Description trop longue').optional().nullable(),
	template_content: z.string().min(1, 'Contenu du modèle requis').max(50000, 'Modèle trop long'),
	placeholders: z
		.array(templatePlaceholderSchema)
		.max(50, '50 champs à remplir au maximum')
		.optional()
		.default([])
});

/**
 * Schema for updating a template (PUT /api/worksheets/templates/[id])
 */
export const updateTemplateSchema = createTemplateSchema.partial();

/**
 * Schema for listing templates query parameters (GET /api/worksheets/templates)
 */
export const listWorksheetTemplatesQuerySchema = z.object({
	page: z.coerce
		.number()
		.int('La page doit être un nombre entier')
		.positive('La page doit être positive')
		.max(1000, 'Numéro de page trop grand')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un nombre entier')
		.positive('La limite doit être positive')
		.max(100, '100 éléments au maximum par page')
		.default(50),
	search: z.string().trim().max(200, 'Recherche trop longue').optional()
});

/**
 * Template response schema
 */
export const templateResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	template_content: z.string(),
	placeholders: z.array(templatePlaceholderSchema),
	created_by: z.string().uuid().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Template list response schema
 */
export const templateListResponseSchema = z.object({
	templates: z.array(templateResponseSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Create template response schema
 */
export const createTemplateResponseSchema = z.object({
	template: templateResponseSchema
});

/**
 * Delete template response schema
 */
export const deleteTemplateResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

// ============================================================================
// TEMPLATE VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create template request body
 */
export function validateCreateTemplate(data: unknown) {
	return createTemplateSchema.safeParse(data);
}

/**
 * Validate update template request body
 */
export function validateUpdateTemplate(data: unknown) {
	return updateTemplateSchema.safeParse(data);
}

/**
 * Validate list templates query parameters
 */
export function validateListTemplatesQuery(params: URLSearchParams) {
	return listWorksheetTemplatesQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Sections list response schema
 */
export const worksheetSectionsResponseSchema = z.object({
	sections: z.array(worksheetSectionResponseSchema)
});

/**
 * Create section response schema
 */
export const createSectionResponseSchema = z.object({
	section: worksheetSectionResponseSchema
});

/**
 * Exercises list response schema
 */
export const worksheetExercisesResponseSchema = z.object({
	exercises: z.array(worksheetExerciseWithDataResponseSchema)
});

/**
 * Create worksheet exercise response schema
 */
export const createWorksheetExerciseResponseSchema = z.object({
	exercise: worksheetExerciseResponseSchema
});

/**
 * Reorder exercises response schema
 */
export const reorderExercisesResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	updated_count: z.number().int().nonnegative()
});

/**
 * Reorder sections response schema
 */
export const reorderSectionsResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	updated_count: z.number().int().nonnegative()
});

// ============================================================================
// STUDENT WORKSHEET RESPONSE SCHEMAS
// ============================================================================

/**
 * Student worksheet list item response
 */
export const studentWorksheetListItemSchema = z.object({
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	type: worksheetTypeSchema,
	class_id: z.string().uuid().nullable(),
	class_name: z.string().nullable(),
	available_from: timestampSchema,
	closes_at: timestampSchema.nullable(),
	show_corrections: z.boolean(),
	exercise_count: z.number().int().nonnegative()
});

/**
 * Student worksheets list response
 */
export const studentWorksheetsListResponseSchema = z.object({
	worksheets: z.array(studentWorksheetListItemSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Schema for exercise resources (videos, PDFs, links, etc.)
 */
export const exerciseResourceSchema = z.object({
	type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image'], {
		message: 'Type de ressource invalide (video, pdf, link, geogebra ou image)'
	}),
	url: z.string().url('Adresse invalide').max(2000, 'Adresse trop longue'),
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	description: z.string().trim().max(500, 'Description trop longue').optional()
});

/**
 * Student exercise view response
 */
export const studentExerciseViewSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	/** Exercise title (displayed next to the exercise number) */
	title: z.string().nullable(),
	position: z.number().int().nonnegative(),
	points: z.number().int().nullable(),
	custom_instructions: z.string().nullable(),
	statement: z.string(),
	correction: z.string().nullable(),
	correction_visible: z.boolean(),
	/** Réponses seules, sous la même condition que la correction ; sans la clé, retirée en silence */
	answers: z.string().nullable().optional(),
	/** Section ID if exercise belongs to a section */
	section_id: z.string().uuid().nullable(),
	/** Hints from selected variation (for guided exercises) */
	hints: z.array(exerciseHintSchema).optional(),
	/** Supplementary resources (videos, PDFs, links) */
	resources: z.array(exerciseResourceSchema).optional(),
	/** Exercise tags for categorization */
	tags: z.array(z.string()).optional(),
	/** Indicates if this exercise is essential/priority */
	is_essential: z.boolean().optional(),
	/**
	 * Lettres déclarées comme fonctions par l'exercice. Sans cette clé, le schéma
	 * la retire en silence et le PDF imprime `C'(x)` en erreur.
	 */
	generic_functions: z.array(z.string()).nullable().optional(),
	/**
	 * Sens de deux majuscules collées (`AB`), résolu par le serveur depuis le thème
	 * de l'exercice (Q-J). Sans cette clé, le schéma la retire en silence et l'élève
	 * lit `AB` comme un produit.
	 */
	capital_pairs: capitalPairsSchema.optional(),
	/** Tailles des cadres de réponse ; sans cette clé, le schéma la retire en silence */
	answer_frame_estimate: answerFrameEstimateSchema.optional()
});

/**
 * Student section view response
 */
export const studentSectionViewSchema = z.object({
	id: z.string().uuid(),
	title: z.string(),
	instructions: z.string().nullable(),
	position: z.number().int().nonnegative()
});

/**
 * Student worksheet detail response
 */
export const studentWorksheetDetailResponseSchema = z.object({
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	title: z.string(),
	/** Langue de la fiche : contenu et habillage du PDF de l'élève */
	language: contentLocaleSchema.optional(),
	/** Options du type de la fiche (ADR 0030) : sans ces clés, le schéma les retire */
	show_student_name: z.boolean().optional(),
	show_points: z.boolean().optional(),
	calculator: calculatorRuleSchema.optional(),
	answers_on_sheet: z.boolean().optional(),
	answer_frames: answerFrameModeSchema.optional(),
	due_date: dueDateSchema.optional(),
	description: z.string().nullable(),
	type: worksheetTypeSchema,
	instructions: z.string().nullable(),
	available_from: timestampSchema,
	closes_at: timestampSchema.nullable(),
	show_corrections: z.boolean(),
	class_name: z.string().nullable(),
	/**
	 * Consultation seule : l'élève relit une fiche d'une classe qu'il a quittée.
	 * Il n'a alors aucun droit d'écriture — ni réponse, ni signalement d'erreur.
	 * Le serveur refuse déjà ces écritures ; ce drapeau sert à ne pas les
	 * proposer.
	 */
	read_only: z.boolean(),
	/** Ordre tiré (« mélanger les exercices ») : sans cette clé, le schéma la retire */
	shuffled: z.boolean().optional(),
	exercises: z.array(studentExerciseViewSchema),
	/** Sections for grouping exercises */
	sections: z.array(studentSectionViewSchema),
	/** Le style de la fiche (lot 4b) : sans ces clés, le schéma les retire */
	style_id: z.string().uuid().nullable().optional(),
	template_id: z.string().uuid().nullable().optional(),
	/** La mise en page d'un style de l'auteur de la fiche (D11) : son Typst seul */
	template: z.object({ template_content: z.string() }).nullable().optional(),
	/** Cartouche du gabarit (lot 4b) : sans ces clés, le schéma les retire */
	total_points: z.number().nullable().optional(),
	estimated_duration_minutes: z.number().int().nullable().optional()
});

// ============================================================================
// TEACHER MANAGEMENT RESPONSE SCHEMAS
// ============================================================================

/**
 * Assignment students response
 */
export const assignmentStudentsResponseSchema = z.object({
	students: z.array(
		z.object({
			id: z.string().uuid(),
			student_id: z.string().uuid(),
			first_name: z.string().nullable(),
			last_name: z.string().nullable(),
			created_at: timestampSchema
		})
	)
});

/**
 * Add students response
 */
export const addStudentsResponseSchema = z.object({
	success: z.literal(true),
	added_count: z.number().int().nonnegative()
});

/**
 * Remove student response
 */
export const removeStudentResponseSchema = z.object({
	success: z.literal(true),
	message: z.string()
});

/**
 * Correction settings response
 */
export const correctionSettingsResponseSchema = z.object({
	show_corrections: z.boolean(),
	exercise_settings: z.array(
		z.object({
			worksheet_exercise_id: z.string().uuid(),
			show_correction: z.boolean()
		})
	)
});

/**
 * Update correction settings response
 */
export const updateCorrectionSettingsResponseSchema = z.object({
	success: z.literal(true),
	show_corrections: z.boolean()
});

/**
 * Update exercise correction response
 */
export const updateExerciseCorrectionResponseSchema = z.object({
	success: z.literal(true),
	worksheet_exercise_id: z.string().uuid(),
	show_correction: z.boolean()
});

// ============================================================================
// WORKSHEET ERROR REPORTS SCHEMAS
// ============================================================================

/**
 * Error report status enum
 */
export const errorReportStatusSchema = z.enum(['pending', 'fixed', 'rejected'], {
	message: 'Statut de signalement invalide'
});

/**
 * Schema for creating an error report (POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report)
 */
export const createErrorReportSchema = z.object({
	// Description is HTML from RichTextEditor with math support
	// Frontend validates plain text length (1000 chars max for UX)
	// Backend accepts up to 5000 chars to accommodate HTML markup + math formulas
	description: z
		.string()
		.trim()
		.min(10, 'La description doit contenir au moins 10 caractères')
		.max(5000, 'La description ne peut pas dépasser 5000 caractères')
});

/**
 * Schema for student updating their own pending report
 * Only allows updating description (status remains pending)
 */
export const updateStudentErrorReportSchema = z.object({
	description: z
		.string()
		.trim()
		.min(10, 'La description doit contenir au moins 10 caractères')
		.max(1000, 'La description ne peut pas dépasser 1000 caractères')
});

/**
 * Schema for teacher reviewing an error report
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * When status is 'fixed':
 * - statement_md is required (updated exercise content)
 * - solution_md is optional (can be null)
 * - response is optional
 *
 * When status is 'rejected':
 * - response is required (rejection reason)
 * - statement_md and solution_md are ignored
 */
/**
 * Variation schema for review error report
 */
const reviewVariationSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	// La page renvoie la variation entière : sans ces clés, les réponses et la
	// traduction seraient retirées en silence, puis effacées à l'enregistrement.
	answers_md: z.string().trim().max(50000, 'Réponses trop longues').optional(),
	translations: exerciseTranslationsSchema.optional(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

export const reviewErrorReportSchema = z
	.object({
		status: z.enum(['fixed', 'rejected'], {
			message: 'Le statut doit être « corrigé » ou « rejeté »'
		}),
		response: z
			.string()
			.trim()
			.min(1, 'La réponse ne peut pas être vide')
			.max(2000, 'La réponse ne peut pas dépasser 2000 caractères')
			.nullable()
			.optional()
			.default(null),
		// New: Accept full variations array
		variations: z.array(reviewVariationSchema).optional(),
		// Legacy: Keep for backwards compatibility
		statement_md: z
			.string()
			.trim()
			.min(1, 'L’énoncé ne peut pas être vide')
			.max(50000, 'L’énoncé ne peut pas dépasser 50000 caractères')
			.optional(),
		solution_md: z
			.string()
			.trim()
			.max(50000, 'La correction ne peut pas dépasser 50000 caractères')
			.nullable()
			.optional()
	})
	.refine(
		(data) => {
			// If status is 'rejected', response is required
			if (data.status === 'rejected') {
				return data.response !== null && data.response !== undefined && data.response.length > 0;
			}
			return true;
		},
		{
			message: 'Le motif de rejet est requis',
			path: ['response']
		}
	)
	.refine(
		(data) => {
			// If status is 'fixed', either variations or statement_md is required
			if (data.status === 'fixed') {
				// New format: variations array
				if (data.variations && data.variations.length > 0) {
					return true;
				}
				// Legacy format: statement_md
				return (
					data.statement_md !== undefined &&
					data.statement_md !== null &&
					data.statement_md.length > 0
				);
			}
			return true;
		},
		{
			message: 'Les niveaux de guidage ou l’énoncé corrigé sont requis pour valider la correction',
			path: ['variations']
		}
	);

/**
 * Query params for listing error reports (GET /api/worksheets/[id]/assignments/[assignmentId]/reports)
 */
export const errorReportsQuerySchema = z.object({
	status: errorReportStatusSchema.optional(),
	page: z.coerce
		.number()
		.int('La page doit être un nombre entier')
		.positive('La page doit être positive')
		.max(1000, 'Numéro de page trop grand')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un nombre entier')
		.positive('La limite doit être positive')
		.max(100, '100 éléments au maximum par page')
		.default(50)
});

/**
 * URL params for error report operations
 */
export const errorReportParamSchema = z.object({
	id: uuidSchema,
	assignmentId: uuidSchema,
	reportId: uuidSchema
});

/**
 * URL params for student error report creation
 */
export const studentErrorReportParamSchema = z.object({
	assignmentId: uuidSchema,
	exerciseId: uuidSchema
});

// ============================================================================
// WORKSHEET ERROR REPORTS RESPONSE SCHEMAS
// ============================================================================

/**
 * Student view of their own error report
 */
export const studentErrorReportViewSchema = z.object({
	id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	// Numéro dans la copie de l'élève ; null : inconnu (D6)
	exercise_position: z.number().int().positive().nullable(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Teacher view of an error report
 */
export const teacherErrorReportViewSchema = z.object({
	id: z.string().uuid(),
	assignment_id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	exercise_position: z.number().int().nonnegative(),
	student_id: z.string().uuid(),
	student_first_name: z.string().nullable(),
	student_last_name: z.string().nullable(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	/** Index of the variation the student saw (0-based). NULL for legacy reports. */
	variation_index: z.number().int().nonnegative().nullable(),
	/** Seed used to generate the student instance. NULL for legacy reports. */
	seed: z.number().int().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Student error reports list response
 */
export const studentErrorReportsListResponseSchema = z.object({
	reports: z.array(studentErrorReportViewSchema)
});

/**
 * Teacher error reports list response with pagination and counts
 */
export const teacherErrorReportsListResponseSchema = z.object({
	reports: z.array(teacherErrorReportViewSchema),
	counts: z.object({
		pending: z.number().int().nonnegative(),
		fixed: z.number().int().nonnegative(),
		rejected: z.number().int().nonnegative(),
		total: z.number().int().nonnegative()
	}),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Create error report response
 */
export const createErrorReportResponseSchema = z.object({
	report: studentErrorReportViewSchema
});

/**
 * Review error report response
 */
export const reviewErrorReportResponseSchema = z.object({
	success: z.literal(true),
	report: teacherErrorReportViewSchema
});

/**
 * Exercise variation schema for error report detail response
 */
const exerciseVariationSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	// Sans ces clés, le schéma les retire en silence (puis la page les efface)
	answers_md: z.string().optional(),
	translations: z.unknown().optional(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

/**
 * Get single error report detail response (for teacher review page)
 * GET /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Now returns the full exercise with all variations for editing
 */
export const getErrorReportDetailResponseSchema = z.object({
	report: teacherErrorReportViewSchema,
	exercise: z.object({
		id: z.string().uuid(),
		slug: z.string(),
		variations: z.array(exerciseVariationSchema),
		shared: z.unknown().nullable(),
		generic_functions: z.array(z.string()).nullable(),
		// Thème : décide du sens de `AB` (Q-J) ; sans la clé, le schéma la retire en silence
		topic: z.string().nullable().optional()
	}),
	context: z.object({
		worksheet_title: z.string(),
		student_name: z.string(),
		exercise_position: z.number().int().nonnegative(),
		// L'auteur est-il encore destinataire ? null : inconnu (lecture en panne)
		student_is_recipient: z.boolean().nullable()
	}),
	next_pending_report_id: z.string().uuid().nullable()
});

// ============================================================================
// WORKSHEET ERROR REPORTS VALIDATION HELPERS
// ============================================================================

/**
 * Validate create error report request body
 */
export function validateCreateErrorReport(data: unknown) {
	return createErrorReportSchema.safeParse(data);
}

/**
 * Validate student update error report request body
 */
export function validateUpdateStudentErrorReport(data: unknown) {
	return updateStudentErrorReportSchema.safeParse(data);
}

/**
 * Validate teacher review error report request body
 */
export function validateReviewErrorReport(data: unknown) {
	return reviewErrorReportSchema.safeParse(data);
}

/**
 * Validate error reports query params
 */
export function validateErrorReportsQuery(params: URLSearchParams) {
	return errorReportsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate error report URL params (teacher)
 */
export function validateErrorReportParams(params: Record<string, string>) {
	return errorReportParamSchema.safeParse(params);
}

/**
 * Validate student error report URL params
 */
export function validateStudentErrorReportParams(params: Record<string, string>) {
	return studentErrorReportParamSchema.safeParse(params);
}

// ============================================================================
// STUDENT ERROR REPORTS API SCHEMAS (GET /api/student/reports)
// ============================================================================

/**
 * Status filter for student reports query
 * 'all' returns all statuses
 */
export const studentReportsStatusFilterSchema = z.enum(['pending', 'fixed', 'rejected', 'all'], {
	message: 'Filtre de statut invalide'
});

/**
 * Query params for student reports list (GET /api/student/reports)
 */
export const studentReportsQuerySchema = z.object({
	status: studentReportsStatusFilterSchema.default('all'),
	assignmentId: uuidSchema.optional(),
	page: z.coerce
		.number()
		.int('La page doit être un nombre entier')
		.positive('La page doit être positive')
		.max(1000, 'Numéro de page trop grand')
		.default(1),
	limit: z.coerce
		.number()
		.int('La limite doit être un nombre entier')
		.positive('La limite doit être positive')
		.max(50, '50 éléments au maximum par page')
		.default(10)
});

/**
 * URL param for student report ID (DELETE /api/student/reports/[reportId])
 */
export const studentReportIdParamSchema = z.object({
	reportId: uuidSchema
});

// ============================================================================
// STUDENT ERROR REPORTS RESPONSE SCHEMAS
// ============================================================================

// Helper for Supabase timestamps (accepts both Z and +00:00 formats)
const studentReportsTimestampSchema = z
	.string()
	.refine((val) => !isNaN(Date.parse(val)), { message: 'Date invalide' });

/**
 * Extended student error report view with display information
 */
export const studentErrorReportWithDisplaySchema = z.object({
	id: z.string().uuid(),
	worksheet_exercise_id: z.string().uuid(),
	// Numéro dans la copie de l'élève ; null : inconnu (D6)
	exercise_position: z.number().int().positive().nullable(),
	description: z.string(),
	status: errorReportStatusSchema,
	response: z.string().nullable(),
	created_at: studentReportsTimestampSchema,
	updated_at: studentReportsTimestampSchema,
	// Extended display fields
	assignment_id: z.string().uuid(),
	worksheet_id: z.string().uuid(),
	worksheet_title: z.string(),
	assignment_title: z.string().nullable()
});

/**
 * Student reports list response with pagination
 */
export const studentReportsListResponseSchema = z.object({
	reports: z.array(studentErrorReportWithDisplaySchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Delete report success response
 */
export const deleteStudentReportResponseSchema = z.object({
	success: z.literal(true)
});

// ============================================================================
// STUDENT ERROR REPORTS VALIDATION HELPERS
// ============================================================================

/**
 * Validate student reports query params
 */
export function validateStudentReportsQuery(params: URLSearchParams) {
	return studentReportsQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student report ID URL param
 */
export function validateStudentReportIdParam(params: Record<string, string>) {
	return studentReportIdParamSchema.safeParse(params);
}
