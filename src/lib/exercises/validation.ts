/**
 * Validation schemas for Exercise Bank import/export
 *
 * Uses Zod for runtime validation of exercise data during import operations.
 * Ensures data integrity and provides helpful error messages.
 *
 * @module exercises/validation
 */

import { z } from 'zod';
import { GRADE_CODES } from '$lib/types/grades';

// Grade validation schema - uses centralized GRADE_CODES from unified grade system
const gradeCodeSchema = z.enum(GRADE_CODES);

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Schema for difficulty level (1, 2, or 3)
 *
 * @example Valid values
 * ```typescript
 * difficultySchema.parse(1); // ✅ Easy
 * difficultySchema.parse(2); // ✅ Medium
 * difficultySchema.parse(3); // ✅ Hard
 * ```
 *
 * @example Invalid values
 * ```typescript
 * difficultySchema.parse(0);   // ❌ Throws ZodError
 * difficultySchema.parse(4);   // ❌ Throws ZodError
 * difficultySchema.parse('2'); // ❌ Throws ZodError (must be number, not string)
 * ```
 */
const difficultySchema = z
	.union([z.literal(1), z.literal(2), z.literal(3)])
	.describe('Difficulty must be 1 (easy), 2 (medium), or 3 (hard)');

/**
 * Schema for tags array
 */
const tagsSchema = z
	.array(z.string().trim().min(1, 'Tag cannot be empty'))
	.default([])
	.transform((tags) => tags.filter(Boolean)); // Remove empty strings

/**
 * Schema for grades array - uses centralized grade validation
 * Accepts only valid GradeCode values from the unified grade system
 */
const gradesSchema = z.array(gradeCodeSchema).optional();

// ============================================================================
// EXPORT FORMAT SCHEMA
// ============================================================================

/**
 * Schema for exercise variable (from ubumark)
 */
const variableSchema = z.object({
	name: z.string(),
	expression: z.string()
});

/**
 * Schema for exercise hint
 */
const exerciseHintSchema = z.object({
	id: z.string(),
	type: z.enum(['video', 'pdf', 'link', 'geogebra', 'image', 'ubumark']),
	url: z.string().optional(),
	title: z.string(),
	description: z.string().optional(),
	content: z.string().optional()
});

/**
 * Schema for exercise variation
 */
const exerciseVariationSchema = z.object({
	label: z.string(),
	statement_md: z.string(),
	solution_md: z.string(),
	variables: z.array(variableSchema).optional(),
	hints: z.array(exerciseHintSchema).optional()
});

/**
 * Schema for shared exercise defaults
 */
const sharedExerciseDefaultsSchema = z.object({
	variables: z.array(variableSchema).optional(),
	statement_md: z.string().optional(),
	solution_md: z.string().optional()
});

/**
 * Schema for ExerciseExport v1.0 (legacy format without variations)
 *
 * @example Valid v1.0 exercise
 * ```typescript
 * const exercise = {
 *   version: '1.0',
 *   title: 'Équations du premier degré',
 *   difficulty: 2,
 *   tags: ['algèbre', 'équations'],
 *   statement_md: '# Résoudre\n\nRésoudre l\'équation: $2x + 5 = 13$',
 *   solution_md: '# Solution\n\n$2x = 8$\n\n$x = 4$'
 * };
 * exerciseExportSchemaV1.parse(exercise); // ✅ Valid
 * ```
 */
const exerciseExportSchemaV1 = z.object({
	version: z.literal('1.0'),

	// Metadata
	title: z.string().trim().optional(),
	source: z.string().trim().optional(),
	difficulty: difficultySchema,
	tags: tagsSchema,

	// Content (required)
	statement_md: z.string().trim().min(1, 'Exercise statement cannot be empty'),
	solution_md: z.string().trim().min(1, 'Exercise solution cannot be empty'),

	// Additional metadata
	grades: gradesSchema,
	topic: z.string().trim().optional()
});

/**
 * Schema for ExerciseExport v2.0 (with variations support)
 *
 * @example Valid v2.0 exercise with variations
 * ```typescript
 * const exercise = {
 *   version: '2.0',
 *   difficulty: 2,
 *   tags: ['algèbre'],
 *   statement_md: 'Base statement',
 *   solution_md: 'Base solution',
 *   variations: [
 *     { label: 'guided', statement_md: 'Guided', solution_md: 'Solution' }
 *   ]
 * };
 * exerciseExportSchemaV2.parse(exercise); // ✅ Valid
 * ```
 */
const exerciseExportSchemaV2 = z.object({
	version: z.literal('2.0'),

	// Metadata
	title: z.string().trim().optional(),
	source: z.string().trim().optional(),
	difficulty: difficultySchema,
	tags: tagsSchema,

	// Content (required - preserved for backward compatibility)
	statement_md: z.string().trim().min(1, 'Exercise statement cannot be empty'),
	solution_md: z.string().trim().min(1, 'Exercise solution cannot be empty'),

	// Additional metadata
	grades: gradesSchema,
	topic: z.string().trim().optional(),

	// Variations system
	variations: z.array(exerciseVariationSchema).optional(),
	shared: sharedExerciseDefaultsSchema.optional()
});

/**
 * Schema for ExerciseExport (clean export format)
 * Supports both v1.0 (legacy) and v2.0 (with variations) formats
 *
 * Used for JSON import/export with automatic version detection
 *
 * @example Valid v1.0 exercise (legacy)
 * ```typescript
 * const v1Exercise = {
 *   version: '1.0',
 *   difficulty: 2,
 *   tags: ['algèbre'],
 *   statement_md: 'Question',
 *   solution_md: 'Answer'
 * };
 * exerciseExportSchema.parse(v1Exercise); // ✅ Valid
 * ```
 *
 * @example Valid v2.0 exercise (with variations)
 * ```typescript
 * const v2Exercise = {
 *   version: '2.0',
 *   difficulty: 2,
 *   tags: ['algèbre'],
 *   statement_md: 'Base',
 *   solution_md: 'Base solution',
 *   variations: [
 *     { label: 'guided', statement_md: 'Guided', solution_md: 'Solution' }
 *   ]
 * };
 * exerciseExportSchema.parse(v2Exercise); // ✅ Valid
 * ```
 */
export const exerciseExportSchema = z.union([exerciseExportSchemaV1, exerciseExportSchemaV2]);

/**
 * Type inferred from export schema (union of v1.0 and v2.0)
 */
export type ValidatedExerciseExport = z.infer<typeof exerciseExportSchema>;

// ============================================================================
// FRONTMATTER SCHEMA
// ============================================================================

/**
 * Schema for ExerciseFrontmatter (YAML frontmatter in Markdown files)
 */
export const exerciseFrontmatterSchema = z.object({
	version: z.literal('1.0'),

	// Metadata
	title: z.string().trim().optional(),
	source: z.string().trim().optional(),
	difficulty: difficultySchema,
	tags: tagsSchema,
	grades: gradesSchema,
	topic: z.string().trim().optional()
});

/**
 * Type inferred from frontmatter schema
 */
export type ValidatedExerciseFrontmatter = z.infer<typeof exerciseFrontmatterSchema>;

// ============================================================================
// ARRAY SCHEMAS (for bulk import)
// ============================================================================

/**
 * Schema for array of exercises (for bulk JSON import)
 */
export const exerciseExportArraySchema = z
	.array(exerciseExportSchema)
	.min(1, 'At least one exercise is required');

// ============================================================================
// TEMPLATE SCHEMA
// ============================================================================

/**
 * Schema for exercise template data
 */
export const templateDataSchema = exerciseExportSchema;

/**
 * Schema for template creation
 */
export const templateCreateSchema = z.object({
	title: z.string().trim().min(1, 'Template title is required'),
	description: z.string().trim().optional(),
	template_data: templateDataSchema,
	is_system: z.boolean().default(false)
});

/**
 * Type inferred from template create schema
 */
export type ValidatedTemplateCreate = z.infer<typeof templateCreateSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate a single exercise export
 *
 * Safely validates exercise data with detailed error messages.
 * Always use this before inserting exercise data into the database.
 *
 * @param data - Exercise data to validate (typically from request.json() or file upload)
 * @returns Validation result with success flag and data or error
 * @returns result.success - `true` if valid, `false` if validation failed
 * @returns result.data - Validated and typed exercise data (only if success=true)
 * @returns result.error - Human-readable error message (only if success=false)
 *
 * @example Successful validation
 * ```typescript
 * const exerciseData = {
 *   version: '1.0',
 *   difficulty: 2,
 *   tags: ['algèbre'],
 *   statement_md: '# Question\n\nRésoudre $x + 5 = 10$',
 *   solution_md: '# Solution\n\n$x = 5$'
 * };
 *
 * const result = validateExerciseExport(exerciseData);
 * if (result.success) {
 *   // result.data is fully typed and validated
 *   const exercise = result.data; // Type: ValidatedExerciseExport
 *   console.log(exercise.difficulty); // 2
 * }
 * ```
 *
 * @example Failed validation
 * ```typescript
 * const invalid = {
 *   version: '1.0',
 *   difficulty: 5, // ❌ Invalid (must be 1, 2, or 3)
 *   statement_md: '',  // ❌ Empty statement
 *   solution_md: 'Solution'
 * };
 *
 * const result = validateExerciseExport(invalid);
 * if (!result.success) {
 *   console.log(result.error);
 *   // Output: "difficulty: Invalid literal value, expected 1 | 2 | 3; statement_md: String must contain at least 1 character(s)"
 * }
 * ```
 *
 * @example In API endpoint
 * ```typescript
 * export const POST: RequestHandler = async ({ request }) => {
 *   const data = await request.json();
 *
 *   const validation = validateExerciseExport(data);
 *   if (!validation.success) {
 *     return json({ error: validation.error }, { status: 400 });
 *   }
 *
 *   // Safe to use validation.data - it's fully validated
 *   const sanitized = sanitizeExerciseForInsert(validation.data);
 *   // Insert into database...
 * };
 * ```
 */
export function validateExerciseExport(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseExport;
	error?: string;
} {
	try {
		const validated = exerciseExportSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Validate an array of exercise exports (bulk import)
 *
 * Validates multiple exercises at once, useful for bulk JSON imports.
 * If ANY exercise fails validation, the entire operation fails (all-or-nothing).
 *
 * @param data - Array of exercise data to validate
 * @returns Validation result with success flag and data or error
 * @returns result.success - `true` if all exercises valid, `false` if any failed
 * @returns result.data - Array of validated exercises (only if success=true)
 * @returns result.error - Error message with path to first failed exercise (only if success=false)
 *
 * @example Successful bulk validation
 * ```typescript
 * const exercises = [
 *   {
 *     version: '1.0',
 *     difficulty: 1,
 *     tags: ['géométrie'],
 *     statement_md: 'Calculate the area of a square with side 5cm',
 *     solution_md: 'Area = 5 × 5 = 25 cm²'
 *   },
 *   {
 *     version: '1.0',
 *     difficulty: 2,
 *     tags: ['algèbre'],
 *     statement_md: 'Solve: x + 3 = 7',
 *     solution_md: 'x = 4'
 *   }
 * ];
 *
 * const result = validateExerciseExportArray(exercises);
 * if (result.success) {
 *   console.log(`Validated ${result.data.length} exercises`);
 *   // result.data is ValidatedExerciseExport[]
 * }
 * ```
 *
 * @example Failed validation (one bad exercise)
 * ```typescript
 * const exercises = [
 *   { version: '1.0', difficulty: 1, statement_md: 'Q1', solution_md: 'A1' },
 *   { version: '1.0', difficulty: 99, statement_md: 'Q2', solution_md: 'A2' }, // ❌ Invalid difficulty
 *   { version: '1.0', difficulty: 2, statement_md: 'Q3', solution_md: 'A3' }
 * ];
 *
 * const result = validateExerciseExportArray(exercises);
 * if (!result.success) {
 *   console.log(result.error);
 *   // Output: "1.difficulty: Invalid literal value, expected 1 | 2 | 3"
 *   // Shows which exercise (index 1) and which field failed
 * }
 * ```
 *
 * @example In bulk import API
 * ```typescript
 * export const POST: RequestHandler = async ({ request }) => {
 *   const data = await request.json();
 *
 *   const validation = validateExerciseExportArray(data);
 *   if (!validation.success) {
 *     return json({
 *       error: 'Validation failed',
 *       details: validation.error
 *     }, { status: 400 });
 *   }
 *
 *   // All exercises are valid - safe to bulk insert
 *   const exercises = validation.data.map(sanitizeExerciseForInsert);
 *   // Bulk insert into database...
 * };
 * ```
 */
export function validateExerciseExportArray(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseExport[];
	error?: string;
} {
	try {
		const validated = exerciseExportArraySchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Alias for validateExerciseExportArray (shorter name for convenience)
 */
export const validateExercisesArray = validateExerciseExportArray;

/**
 * Validate frontmatter data from markdown file
 *
 * @param data - Frontmatter data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateFrontmatter(data: unknown): {
	success: boolean;
	data?: ValidatedExerciseFrontmatter;
	error?: string;
} {
	try {
		const validated = exerciseFrontmatterSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Validate template data
 *
 * @param data - Template data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateTemplateCreate(data: unknown): {
	success: boolean;
	data?: ValidatedTemplateCreate;
	error?: string;
} {
	try {
		const validated = templateCreateSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize and prepare exercise data for database insertion
 * Removes any extra fields that aren't in the schema
 *
 * **IMPORTANT**: Only use this AFTER validating with `validateExerciseExport()`.
 * This function assumes data is already validated and only removes the version field.
 *
 * @param data - Validated exercise export data (from validateExerciseExport().data)
 * @returns Clean data ready for DB insertion (without version field)
 *
 * @example Typical workflow
 * ```typescript
 * // 1. Validate first
 * const validation = validateExerciseExport(rawData);
 * if (!validation.success) {
 *   return { error: validation.error };
 * }
 *
 * // 2. Sanitize for database
 * const exerciseData = sanitizeExerciseForInsert(validation.data);
 *
 * // 3. Insert into database
 * const { data, error } = await supabase
 *   .from('exercises')
 *   .insert({
 *     ...exerciseData,
 *     created_by: userId,
 *     is_public: false
 *   })
 *   .select()
 *   .single();
 * ```
 *
 * @example What gets removed
 * ```typescript
 * const validated = {
 *   version: '1.0',  // ← This will be removed
 *   difficulty: 2,
 *   tags: ['algèbre'],
 *   statement_md: 'Question',
 *   solution_md: 'Answer'
 * };
 *
 * const sanitized = sanitizeExerciseForInsert(validated);
 * // Result: { difficulty: 2, tags: [...], statement_md: '...', solution_md: '...' }
 * // The 'version' field is removed because it's not stored in the database
 * ```
 */
export function sanitizeExerciseForInsert(
	data: ValidatedExerciseExport
): Omit<ValidatedExerciseExport, 'version'> {
	// Remove version field as it's not stored in the database
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { version, ...exerciseData } = data;
	return exerciseData;
}
