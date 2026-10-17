/**
 * Exercise API validation schemas
 *
 * Comprehensive Zod validation for all exercise-related API endpoints.
 * Re-exports existing validation from $lib/exercises/validation.ts and adds
 * additional schemas for API endpoints.
 */

import { z } from 'zod';
import { gradeCodeSchema, gradeFlexibleSchema } from './grades';
import { SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE } from '$lib/server/exercise-search-indexed';

// ============================================================================
// RE-EXPORT EXISTING VALIDATION
// ============================================================================

// Re-export existing excellent validation from exercise import/export
export {
	exerciseExportSchema,
	exerciseFrontmatterSchema,
	exerciseExportArraySchema,
	templateDataSchema,
	templateCreateSchema,
	validateExerciseExport,
	validateExerciseExportArray,
	validateExercisesArray,
	validateFrontmatter,
	validateTemplateCreate,
	sanitizeExerciseForInsert,
	type ValidatedExerciseExport,
	type ValidatedExerciseFrontmatter,
	type ValidatedTemplateCreate
} from '$lib/exercises/validation';

// ============================================================================
// API ENDPOINT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new exercise (POST /api/exercises)
 */
/**
 * Schema for valid function identifier names.
 * Must start with a letter, followed by letters, numbers, or underscores.
 */
const functionIdentifierSchema = z
	.string()
	.min(1, 'Le nom de fonction ne peut pas être vide')
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_]*$/,
		'Le nom de fonction doit commencer par une lettre et ne contenir que des lettres, des chiffres ou des tirets bas'
	);

// ============================================================================
// VARIATIONS SYSTEM SCHEMAS
// ============================================================================

/**
 * Schema for exercise variables (used in variations and shared defaults)
 */
export const variableSchema = z.object({
	name: z.string().trim().min(1, 'Nom de variable requis').max(50, 'Nom de variable trop long'),
	expression: z.string().trim().min(1, 'Expression requise').max(1000, 'Expression trop longue'),
	displayOptions: z.record(z.string(), z.any()).optional()
});

/**
 * Schema for exercise hints (videos, PDFs, links, GeoGebra, images, ubumark)
 *
 * - For ubumark hints: `content` is required, `url` is not used
 * - For other hints: `url` is required, `content` is not used
 */
export const exerciseHintSchema = z
	.object({
		id: z
			.string()
			.trim()
			.min(1, 'Identifiant d’indice requis')
			.max(50, 'Identifiant d’indice trop long')
			.regex(
				/^[a-zA-Z][a-zA-Z0-9_-]*$/,
				'L’identifiant d’indice doit commencer par une lettre et ne contenir que des lettres, des chiffres, des tirets ou des tirets bas'
			),
		type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image', 'ubumark'], {
			message: 'Type d’indice invalide (video, pdf, link, geogebra, image ou ubumark)'
		}),
		url: z.string().url('Adresse invalide').max(2000, 'Adresse trop longue').optional(),
		content: z.string().trim().max(5000, 'Contenu trop long').optional(),
		title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
		description: z.string().trim().max(500, 'Description trop longue').optional()
	})
	.refine(
		(data) => {
			if (data.type === 'ubumark') {
				return data.content && data.content.trim().length > 0;
			}
			return data.url && data.url.trim().length > 0;
		},
		{
			message: 'Un indice ubumark demande un contenu, les autres indices une adresse'
		}
	);

/**
 * Schema for a translated variation or shared defaults.
 *
 * Every field is optional: a translation carries only what it overrides, and
 * what it leaves out falls back to French at resolution time. `strict()`
 * rejects an unknown locale key rather than storing a language nothing will
 * ever read.
 */
export const exerciseTranslationsSchema = z
	.object({
		en: z
			.object({
				statement_md: z.string().trim().max(50000, 'Énoncé trop long').optional(),
				solution_md: z.string().trim().max(50000, 'Correction trop longue').optional(),
				answers_md: z.string().trim().max(50000, 'Réponses trop longues').optional(),
				// Keyed by hint id, and carrying text only: id/type/url stay in the
				// French hint so a translation can never break a {{hint:id}} reference.
				hints: z
					.record(
						z
							.string()
							.regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Identifiant d’indice invalide')
							.max(50, 'Identifiant d’indice trop long'),
						z
							.object({
								title: z.string().trim().max(200, 'Titre d’indice trop long').optional(),
								description: z
									.string()
									.trim()
									.max(1000, 'Description d’indice trop longue')
									.optional(),
								content: z.string().trim().max(5000, 'Contenu d’indice trop long').optional()
							})
							.strict()
					)
					.refine(
						(hints) => Object.keys(hints).length <= 20,
						'20 indices au maximum par niveau de guidage'
					)
					.optional()
			})
			.strict()
			.optional()
	})
	.strict();

/**
 * Schema for exercise variations (alternative versions of an exercise)
 */
export const exerciseVariationSchema = z
	.object({
		label: z.string().trim().min(1, 'Libellé requis').max(50, 'Libellé trop long'),
		statement_md: z.string().trim().min(1, 'Énoncé requis').max(50000, 'Énoncé trop long'),
		solution_md: z
			.string()
			.trim()
			.min(1, 'Correction requise')
			.max(50000, 'Correction trop longue'),
		// Réponses seules (PDF « Réponses ») : facultatives
		answers_md: z.string().trim().max(50000, 'Réponses trop longues').optional(),
		variables: z
			.array(variableSchema)
			.max(100, '100 variables au maximum par niveau de guidage')
			.optional(),
		hints: z
			.array(exerciseHintSchema)
			.max(20, '20 indices au maximum par niveau de guidage')
			.optional(),
		translations: exerciseTranslationsSchema.optional()
	})
	.refine(
		(data) => {
			// Validate that all {{hint:id}} references in content have corresponding hints defined
			if (!data.hints?.length) {
				// Check if there are any hint references without hints
				const hintRefs = [
					...data.statement_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g),
					...data.solution_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g)
				];
				return hintRefs.length === 0; // No hints defined means no references allowed
			}

			const hintIds = new Set(data.hints.map((h) => h.id));
			const referencedIds = [
				...data.statement_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g),
				...data.solution_md.matchAll(/\{\{hint:([a-zA-Z][a-zA-Z0-9_-]*)\}\}/g)
			].map((m) => m[1]);

			return referencedIds.every((id) => hintIds.has(id));
		},
		{ message: 'Chaque référence {{hint:id}} doit renvoyer à un indice défini' }
	);

/**
 * Schema for shared exercise defaults (applied to all variations)
 */
export const sharedExerciseDefaultsSchema = z
	.object({
		variables: z.array(variableSchema).max(100, '100 variables partagées au maximum').optional(),
		statement_md: z.string().trim().max(50000, 'Énoncé trop long').optional(),
		solution_md: z.string().trim().max(50000, 'Correction trop longue').optional(),
		translations: exerciseTranslationsSchema.optional()
	})
	.optional();

// Base schema without refinement (needed for .partial() in Zod v4)
const exerciseBaseSchema = z.object({
	// Statement and solution are optional when using variations system
	statement_md: z.string().trim().max(50000, 'Énoncé trop long').optional(),
	solution_md: z.string().trim().max(50000, 'Correction trop longue').optional(),
	category: z.enum(
		[
			'automatisme',
			'application',
			'adaptation',
			'recherche',
			'tache_complexe',
			'situation_probleme',
			'challenge',
			'mission',
			'synthese'
		],
		{ message: 'Catégorie invalide' }
	),
	slug: z
		.string()
		.trim()
		.min(3, 'Le slug doit compter au moins 3 caractères')
		.max(100, 'Slug trop long')
		.regex(
			/^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
			'Le slug ne doit contenir que des minuscules, des chiffres et des tirets'
		)
		.optional()
		.nullable(),
	tags: z
		.array(z.string().trim().min(1).max(50))
		.max(20, '20 mots-clés au maximum')
		.default([])
		.optional()
		.nullable(),
	grades: z
		.array(z.string().trim().min(1).max(20))
		.max(7, '7 niveaux au maximum')
		.optional()
		.nullable()
		.default([]),
	topic: z.string().trim().max(100, 'Notion trop longue').optional().nullable(),
	source: z.string().trim().max(200, 'Source trop longue').optional().nullable(),
	title: z.string().trim().max(200, 'Titre trop long').optional().nullable(),
	// Legacy variables format (kept for backward compatibility)
	variables: z
		.union([z.array(z.any()), z.record(z.string(), z.any())])
		.optional()
		.nullable(),
	// Visibilité et « Afficher sur Google » (refine plus bas, CHECK en base).
	// Pas de `.default()` ici : sous `.partial()`, Zod 4 l'appliquerait aussi à
	// une mise à jour qui ne parle pas de la case, et dépublierait / décocherait
	// en silence. Les défauts de création sont posés par `createExerciseSchema`.
	is_public: z.boolean().optional(),
	search_indexed: z.boolean().optional(),
	resources: z
		.array(
			z.object({
				type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image'], {
					message: 'Type de ressource invalide (video, pdf, link, geogebra ou image)'
				}),
				// http(s) seulement : `url()` accepte `javascript:` et `mailto:`, et la
				// ressource est rendue en lien.
				url: z
					.string()
					.url('Adresse invalide')
					.max(2000, 'Adresse trop longue')
					.refine((url) => /^https?:\/\//i.test(url), 'Adresse http(s) attendue'),
				title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
				description: z.string().trim().max(500, 'Description trop longue').optional()
			})
		)
		.max(20, '20 ressources au maximum')
		.optional()
		.nullable()
		.default([]),
	/**
	 * Custom function identifiers to recognize in math expressions.
	 * When set, these identifiers will be parsed as function calls (e.g., P(x), Q'(x))
	 * instead of implicit multiplication.
	 *
	 * - undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
	 * - null: Use parser defaults
	 * - []: Disable generic function parsing entirely
	 * - ['f', 'P', 'Q']: Recognize only these identifiers as functions
	 */
	generic_functions: z
		.array(functionIdentifierSchema)
		.max(50, '50 noms de fonction au maximum')
		.optional()
		.nullable(),
	// NEW: Variations system
	shared: sharedExerciseDefaultsSchema,
	variations: z
		.array(exerciseVariationSchema)
		.min(1, 'Au moins un niveau de guidage requis')
		.max(10, '10 niveaux de guidage au maximum')
		.optional()
});

/** « Afficher sur Google » n'a de sens que pour un exercice public. */
const searchIndexedRequiresPublic = {
	check: (data: { is_public?: boolean; search_indexed?: boolean }) =>
		data.search_indexed !== true || data.is_public === true,
	params: { message: SEARCH_INDEXED_REQUIRES_PUBLIC_MESSAGE, path: ['search_indexed'] }
};

export const createExerciseSchema = exerciseBaseSchema
	.refine(
		(data) => {
			// Either use variations OR legacy fields (statement_md + solution_md)
			const hasVariations = data.variations && data.variations.length > 0;
			const hasLegacy = data.statement_md && data.solution_md;

			return hasVariations || hasLegacy;
		},
		{ message: 'Il faut des niveaux de guidage, ou un énoncé et une correction' }
	)
	.refine(searchIndexedRequiresPublic.check, searchIndexedRequiresPublic.params)
	// Non coché à la création tant que le professeur ne le demande pas.
	.transform((data) => ({
		...data,
		is_public: data.is_public ?? false,
		search_indexed: data.search_indexed ?? false
	}));

/**
 * Schema for updating an exercise (PUT /api/exercises/[id])
 * All fields are optional for partial updates
 * Note: Uses base schema without refinement (Zod v4 limitation)
 */
export const updateExerciseSchema = exerciseBaseSchema
	.partial()
	.refine(searchIndexedRequiresPublic.check, searchIndexedRequiresPublic.params);

/**
 * Schema for listing exercises query parameters (GET /api/exercises)
 */
export const listExercisesQuerySchema = z.object({
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
	category: z
		.enum([
			'automatisme',
			'application',
			'adaptation',
			'recherche',
			'tache_complexe',
			'situation_probleme',
			'challenge',
			'mission',
			'synthese'
		])
		.optional(),
	grades: z
		.string()
		.max(200)
		.optional()
		.transform((val) => {
			if (!val) return undefined;
			const grades = val
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (grades.length === 0) return undefined;
			return grades;
		})
		.pipe(z.array(gradeFlexibleSchema).optional()), // Validates grade codes
	topic: z.string().trim().max(100).optional(),
	tags: z.string().max(500).optional(), // Comma-separated
	search: z.string().trim().max(200, 'Recherche trop longue').optional()
});

/**
 * Schema for bulk assignment (POST /api/exercises/[id]/assign - bulk mode)
 */
export const bulkAssignSchema = z
	.object({
		students: z
			.array(z.string().uuid('Identifiant d’élève invalide'))
			.max(200, '200 élèves au maximum')
			.optional(),
		classes: z
			.array(z.string().uuid('Identifiant de classe invalide'))
			.max(50, '50 classes au maximum')
			.optional(),
		make_public: z.boolean().optional(),
		optional_deadline: z.string().datetime('Date invalide').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes trop longues').optional()
	})
	.refine(
		(data) =>
			(data.students && data.students.length > 0) ||
			(data.classes && data.classes.length > 0) ||
			data.make_public === true,
		{
			message: 'Choisir au moins un élève ou une classe, ou rendre l’exercice public'
		}
	);

/**
 * Schema for single assignment (POST /api/exercises/[id]/assign - single mode)
 */
export const singleAssignSchema = z
	.object({
		assigned_to_type: z.enum(['student', 'class', 'public'], {
			message: 'Type d’affectation invalide'
		}),
		student_id: z.string().uuid('Identifiant d’élève invalide').optional(),
		class_id: z.string().uuid('Identifiant de classe invalide').optional(),
		optional_deadline: z.string().datetime('Date invalide').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes trop longues').optional()
	})
	.refine(
		(data) => {
			if (data.assigned_to_type === 'student') return !!data.student_id;
			if (data.assigned_to_type === 'class') return !!data.class_id;
			return true; // public doesn't need student_id or class_id
		},
		{
			message:
				'Une affectation à un élève demande un élève, une affectation à une classe demande une classe'
		}
	);

/**
 * Schema for assignment query parameters (GET /api/exercises/[id]/assign)
 */
export const assignmentQuerySchema = z.object({
	type: z
		.enum(['student', 'class', 'public'], {
			message: 'Filtre de type invalide'
		})
		.optional(),
	active: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	has_deadline: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
});

/**
 * Schema for student exercise filters (GET /api/exercises/assigned)
 */
export const studentExerciseFiltersSchema = z.object({
	completed: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	assigned_only: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	public: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	has_deadline: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	search: z.string().trim().max(200, 'Recherche trop longue').optional()
});

/**
 * Schema for export request body (POST /api/exercises/export)
 */
export const exportExercisesSchema = z.object({
	exercise_ids: z
		.array(z.string().uuid('Identifiant d’exercice invalide'))
		.min(1, 'Au moins un exercice requis')
		.max(100, '100 exercices au maximum par export'),
	format: z.enum(['json', 'markdown'], {
		message: 'Le format doit être « json » ou « markdown »'
	}),
	pretty_print: z.boolean().default(true).optional()
});

/**
 * Schema for marking exercise as viewed (POST /api/exercises/[id]/view)
 */
export const viewExerciseSchema = z.object({
	assignment_id: z.string().uuid('Identifiant d’affectation invalide').optional()
});

/**
 * Schema for importing exercises (POST /api/exercises/import)
 * Supports both JSON and Markdown formats with import options
 */
export const importExercisesSchema = z.object({
	format: z.enum(['json', 'markdown'], {
		message: 'Le format doit être « json » ou « markdown »'
	}),
	content: z.union([z.string().min(1, 'Contenu requis'), z.record(z.string(), z.any())]),
	options: z
		.object({
			on_duplicate: z
				.enum(['skip', 'replace', 'create-copy'], {
					message: 'Option de doublon invalide (« skip », « replace » ou « create-copy »)'
				})
				.default('skip')
				.optional(),
			validate: z.boolean().default(true).optional()
		})
		.optional()
});

/**
 * Schema for updating assignment (PATCH /api/exercises/assignments/[assignmentId])
 */
export const updateAssignmentSchema = z
	.object({
		optional_deadline: z.string().datetime('Date invalide').optional().nullable(),
		notes: z.string().trim().max(1000, 'Notes trop longues').optional(),
		is_active: z.boolean().optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Aucune modification demandée'
	});

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create exercise request body
 */
export function validateCreateExercise(data: unknown) {
	return createExerciseSchema.safeParse(data);
}

/**
 * Validate update exercise request body
 */
export function validateUpdateExercise(data: unknown) {
	return updateExerciseSchema.safeParse(data);
}

/**
 * Validate list exercises query parameters
 */
export function validateListExercisesQuery(params: URLSearchParams) {
	return listExercisesQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate bulk assignment request body
 */
export function validateBulkAssign(data: unknown) {
	return bulkAssignSchema.safeParse(data);
}

/**
 * Validate single assignment request body
 */
export function validateSingleAssign(data: unknown) {
	return singleAssignSchema.safeParse(data);
}

/**
 * Validate assignment query parameters
 */
export function validateAssignmentQuery(params: URLSearchParams) {
	return assignmentQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate student exercise filters
 */
export function validateStudentExerciseFilters(params: URLSearchParams) {
	return studentExerciseFiltersSchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate export exercises request body
 */
export function validateExportExercises(data: unknown) {
	return exportExercisesSchema.safeParse(data);
}

/**
 * Validate view exercise request body
 */
export function validateViewExercise(data: unknown) {
	return viewExerciseSchema.safeParse(data);
}

/**
 * Validate update assignment request body
 */
export function validateUpdateAssignment(data: unknown) {
	return updateAssignmentSchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Exercise variation schema for response
 */
const exerciseVariationResponseSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	// Sans ces clés, le schéma les retire en silence de la réponse
	answers_md: z.string().optional(),
	translations: z.unknown().optional(),
	hints: z.array(z.unknown()).optional(),
	variables: z.array(z.unknown()).optional()
});

/**
 * Single exercise response schema
 * Note: statement_md/solution_md are now in variations (single source of truth)
 */
export const exerciseResponseSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().nullable().optional(),
	category: z.enum([
		'automatisme',
		'application',
		'adaptation',
		'recherche',
		'tache_complexe',
		'situation_probleme',
		'challenge',
		'mission',
		'synthese'
	]),
	tags: z.array(z.string()).optional(),
	grades: z.array(gradeCodeSchema).optional(),
	topic: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	title: z.string().nullable().optional(),
	// Variables can be an array (from DB) or a record - accept both
	variables: z
		.union([z.array(z.any()), z.record(z.string(), z.any())])
		.nullable()
		.optional(),
	// Generic function identifiers for math parsing
	generic_functions: z.array(z.string()).nullable().optional(),
	// Variations contain statement_md and solution_md
	variations: z.array(exerciseVariationResponseSchema).nullable().optional(),
	// Shared content across variations
	shared: z.unknown().nullable().optional(),
	// Resources (images, files)
	resources: z.unknown().nullable().optional(),
	is_public: z.boolean(),
	search_indexed: z.boolean(),
	created_by: z.string().uuid(),
	// Supabase returns datetime with +00:00 offset, not Z suffix
	created_at: z.string(),
	updated_at: z.string(),
	// Optional field returned by some queries
	distribution_mode: z.string().optional()
});

/**
 * Exercise list response schema (GET /api/exercises)
 */
export const exerciseListResponseSchema = z.object({
	exercises: z.array(exerciseResponseSchema),
	pagination: z.object({
		page: z.number().int().positive(),
		limit: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative()
	})
});

/**
 * Exercise detail response schema (GET /api/exercises/[id])
 */
export const exerciseDetailResponseSchema = z.object({
	exercise: exerciseResponseSchema
});

/**
 * Create exercise response schema (POST /api/exercises)
 */
export const createExerciseResponseSchema = z.object({
	exercise: exerciseResponseSchema
});

/**
 * Exercise assignment schema
 */
export const exerciseAssignmentSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	assigned_to_type: z.enum(['student', 'class', 'public']),
	student_id: z.string().uuid().nullable().optional(),
	class_id: z.string().uuid().nullable().optional(),
	assigned_by: z.string().uuid(),
	optional_deadline: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	is_active: z.boolean(),
	created_at: z.string().datetime()
});

/**
 * Exercise assignments response schema
 */
export const exerciseAssignmentsResponseSchema = z.object({
	assignments: z.array(exerciseAssignmentSchema)
});

/**
 * Assigned exercise (for student view) schema
 */
export const assignedExerciseSchema = z.object({
	id: z.string().uuid(),
	statement_md: z.string(),
	solution_md: z.string(),
	category: z.enum([
		'automatisme',
		'application',
		'adaptation',
		'recherche',
		'tache_complexe',
		'situation_probleme',
		'challenge',
		'mission',
		'synthese'
	]),
	tags: z.array(z.string()).optional(),
	grades: z.array(gradeCodeSchema).optional(),
	topic: z.string().nullable().optional(),
	title: z.string().nullable().optional(),
	assignment_id: z.string().uuid().nullable().optional(),
	optional_deadline: z.string().datetime().nullable().optional(),
	notes: z.string().nullable().optional(),
	completed: z.boolean().optional(),
	completed_at: z.string().datetime().nullable().optional()
});

/**
 * Student exercises response schema (GET /api/exercises/assigned)
 */
export const studentExercisesResponseSchema = z.object({
	exercises: z.array(assignedExerciseSchema)
});

/**
 * Exercise export response schema
 */
export const exerciseExportResponseSchema = z.object({
	exercise: exerciseResponseSchema,
	format: z.enum(['json', 'markdown'])
});

/**
 * Bulk assignment response schema
 */
export const bulkAssignmentResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	assignments_created: z.number().int().nonnegative()
});

/**
 * View exercise response schema (POST /api/exercises/[id]/view)
 */
export const viewExerciseResponseSchema = z.object({
	success: z.literal(true),
	viewed_at: z.string().datetime()
});

/**
 * Complete exercise response schema (POST /api/exercises/[id]/complete)
 */
export const completeExerciseResponseSchema = z.object({
	success: z.literal(true),
	completed_at: z.string().datetime()
});

// ============================================================================
// SHARE TOKEN SCHEMAS
// ============================================================================

/**
 * Schema for share token query parameter (GET /exercice/[slug]?token=...)
 */
export const shareTokenQuerySchema = z.object({
	token: z
		.string()
		.length(16, 'Le jeton doit compter exactement 16 caractères')
		.regex(/^[A-Za-z0-9]+$/, 'Le jeton ne doit contenir que des lettres et des chiffres')
		.optional()
});

/**
 * Schema for creating a share token (POST /api/exercises/[id]/share)
 */
export const createShareTokenSchema = z.object({
	expires_in_days: z
		.number()
		.int('Le nombre de jours doit être entier')
		.min(1, '1 jour au minimum')
		.max(365, '365 jours au maximum')
		.optional()
		.nullable()
});

/**
 * Schema for revoking a share token (DELETE /api/exercises/[id]/share/[tokenId])
 */
export const revokeShareTokenSchema = z.object({
	token_id: z.string().uuid('Identifiant de jeton invalide')
});

/**
 * Share token response schema
 */
export const shareTokenResponseSchema = z.object({
	id: z.string().uuid(),
	exercise_id: z.string().uuid(),
	token: z.string().length(16),
	created_by: z.string().uuid(),
	created_at: z.string(),
	expires_at: z.string().nullable(),
	is_active: z.boolean(),
	access_count: z.number().int().nonnegative(),
	last_accessed_at: z.string().nullable()
});

/**
 * Share tokens list response schema (GET /api/exercises/[id]/share)
 */
export const shareTokensListResponseSchema = z.object({
	tokens: z.array(shareTokenResponseSchema)
});

/**
 * Create share token response schema (POST /api/exercises/[id]/share)
 */
export const createShareTokenResponseSchema = z.object({
	token: shareTokenResponseSchema,
	share_url: z.string().url()
});

// ============================================================================
// SHARE TOKEN VALIDATION HELPERS
// ============================================================================

/**
 * Validate share token query parameter
 */
export function validateShareTokenQuery(params: URLSearchParams) {
	return shareTokenQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate create share token request body
 */
export function validateCreateShareToken(data: unknown) {
	return createShareTokenSchema.safeParse(data);
}

/**
 * Validate revoke share token params
 */
export function validateRevokeShareToken(data: unknown) {
	return revokeShareTokenSchema.safeParse(data);
}
