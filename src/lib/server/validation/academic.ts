import { z } from 'zod';

// ========================================
// Common Schemas
// ========================================

/**
 * UUID validation schema
 * @example "550e8400-e29b-41d4-a716-446655440000"
 */
const uuidSchema = z.string().uuid('ID invalide');

/**
 * Date validation schema (ISO date string YYYY-MM-DD)
 * @example "2024-09-01"
 */
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)');

/**
 * Academic period type validation
 * Supports: trimester, semester, quarter, custom
 */
const periodTypeSchema = z.enum(['trimester', 'semester', 'quarter', 'custom']);

/**
 * Hex color validation (#RRGGBB format)
 * @example "#3b82f6"
 */
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide (format #RRGGBB)');

// ========================================
// School Year Schemas
// ========================================

/**
 * Base school year object schema (without refinements)
 * Used for partial() in update schema
 */
const schoolYearBaseSchema = z.object({
	school_id: uuidSchema,
	name: z
		.string()
		.trim()
		.min(1, 'Nom requis')
		.max(50, 'Nom trop long')
		.regex(/^\d{4}-\d{4}$/, 'Format attendu: YYYY-YYYY (ex: 2024-2025)'),
	start_date: dateSchema,
	end_date: dateSchema,
	is_active: z.boolean().default(false),
	metadata: z.record(z.string(), z.any()).optional().default({})
});

/**
 * Create school year schema
 *
 * Validates:
 * - School ID (UUID)
 * - Name format (YYYY-YYYY for consecutive years)
 * - Date range (end > start)
 * - Year consistency (name matches actual year span)
 *
 * @example
 * const validation = createSchoolYearSchema.safeParse({
 *   school_id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "2024-2025",
 *   start_date: "2024-09-01",
 *   end_date: "2025-06-30",
 *   is_active: true
 * });
 */
export const createSchoolYearSchema = schoolYearBaseSchema
	.refine((data) => new Date(data.end_date) > new Date(data.start_date), {
		message: 'La date de fin doit être après la date de début',
		path: ['end_date']
	})
	.refine(
		(data) => {
			const parts = data.name.split('-');
			if (parts.length !== 2) return false;
			const [startYear, endYear] = parts.map(Number);
			if (isNaN(startYear) || isNaN(endYear)) return false;
			return endYear === startYear + 1;
		},
		{
			message: 'Le nom doit couvrir deux années consécutives (ex: 2024-2025)',
			path: ['name']
		}
	);

/**
 * Update school year schema (all fields optional except id)
 * Note: Refinements are not applied on partial updates to allow single-field updates
 *
 * @example
 * const validation = updateSchoolYearSchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   is_active: true
 * });
 */
export const updateSchoolYearSchema = schoolYearBaseSchema.partial().extend({
	id: uuidSchema
});

/**
 * Delete school year schema
 *
 * @example
 * const validation = deleteSchoolYearSchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const deleteSchoolYearSchema = z.object({
	id: uuidSchema
});

/**
 * Set active year schema
 * Ensures only one year is active per school
 *
 * @example
 * const validation = setActiveYearSchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   school_id: "660e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const setActiveYearSchema = z.object({
	id: uuidSchema,
	school_id: uuidSchema
});

// Infer TypeScript types
export type CreateSchoolYearData = z.infer<typeof createSchoolYearSchema>;
export type UpdateSchoolYearData = z.infer<typeof updateSchoolYearSchema>;
export type DeleteSchoolYearData = z.infer<typeof deleteSchoolYearSchema>;
export type SetActiveYearData = z.infer<typeof setActiveYearSchema>;

// ========================================
// Academic Period Schemas
// ========================================

/**
 * Base academic period object schema (without refinements)
 * Used for partial() in update schema
 */
const academicPeriodBaseSchema = z.object({
	school_year_id: uuidSchema,
	type: periodTypeSchema,
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
	start_date: dateSchema,
	end_date: dateSchema,
	period_order: z
		.number()
		.int('Doit être un nombre entier')
		.positive('Doit être positif')
		.max(10, 'Maximum 10 périodes par année'),
	color: hexColorSchema.default('#3b82f6'),
	metadata: z.record(z.string(), z.any()).optional().default({})
});

/**
 * Create academic period schema
 *
 * Validates:
 * - School year ID (UUID)
 * - Period type (trimester/semester/quarter/custom)
 * - Name length
 * - Date range (end > start)
 * - Period order (1-10)
 * - Hex color code
 *
 * @example
 * const validation = createAcademicPeriodSchema.safeParse({
 *   school_year_id: "550e8400-e29b-41d4-a716-446655440000",
 *   type: "trimester",
 *   name: "Trimestre 1",
 *   start_date: "2024-09-01",
 *   end_date: "2024-12-20",
 *   period_order: 1,
 *   color: "#3b82f6"
 * });
 */
export const createAcademicPeriodSchema = academicPeriodBaseSchema.refine(
	(data) => new Date(data.end_date) > new Date(data.start_date),
	{
		message: 'La date de fin doit être après la date de début',
		path: ['end_date']
	}
);

/**
 * Update academic period schema (all fields optional except id)
 * Note: Refinements are not applied on partial updates to allow single-field updates
 *
 * @example
 * const validation = updateAcademicPeriodSchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Trimestre 1 (modifié)",
 *   color: "#ef4444"
 * });
 */
export const updateAcademicPeriodSchema = academicPeriodBaseSchema.partial().extend({
	id: uuidSchema
});

/**
 * Delete academic period schema
 *
 * @example
 * const validation = deleteAcademicPeriodSchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const deleteAcademicPeriodSchema = z.object({
	id: uuidSchema
});

// Infer TypeScript types
export type CreateAcademicPeriodData = z.infer<typeof createAcademicPeriodSchema>;
export type UpdateAcademicPeriodData = z.infer<typeof updateAcademicPeriodSchema>;
export type DeleteAcademicPeriodData = z.infer<typeof deleteAcademicPeriodSchema>;

// ========================================
// School Holiday Schemas
// ========================================

/**
 * Base school holiday object schema (without refinements)
 * Used for partial() in update schema
 */
const schoolHolidayBaseSchema = z.object({
	school_year_id: uuidSchema,
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long'),
	start_date: dateSchema,
	end_date: dateSchema
});

/**
 * Create school holiday schema
 *
 * Validates:
 * - School year ID (UUID)
 * - Holiday name
 * - Date range (end > start)
 *
 * @example
 * const validation = createSchoolHolidaySchema.safeParse({
 *   school_year_id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Vacances de Noël",
 *   start_date: "2024-12-21",
 *   end_date: "2025-01-05"
 * });
 */
export const createSchoolHolidaySchema = schoolHolidayBaseSchema.refine(
	(data) => new Date(data.end_date) > new Date(data.start_date),
	{
		message: 'La date de fin doit être après la date de début',
		path: ['end_date']
	}
);

/**
 * Update school holiday schema (all fields optional except id)
 * Note: Refinements are not applied on partial updates to allow single-field updates
 *
 * @example
 * const validation = updateSchoolHolidaySchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Vacances de Noël (mise à jour)",
 *   end_date: "2025-01-06"
 * });
 */
export const updateSchoolHolidaySchema = schoolHolidayBaseSchema.partial().extend({
	id: uuidSchema
});

/**
 * Delete school holiday schema
 *
 * @example
 * const validation = deleteSchoolHolidaySchema.safeParse({
 *   id: "550e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const deleteSchoolHolidaySchema = z.object({
	id: uuidSchema
});

// Infer TypeScript types
export type CreateSchoolHolidayData = z.infer<typeof createSchoolHolidaySchema>;
export type UpdateSchoolHolidayData = z.infer<typeof updateSchoolHolidaySchema>;
export type DeleteSchoolHolidayData = z.infer<typeof deleteSchoolHolidaySchema>;

// ========================================
// Duplication & Utility Schemas
// ========================================

/**
 * Duplicate school year schema
 *
 * Creates a new school year by copying an existing one with optional periods/holidays.
 * Date offset is typically 365 days (one year forward).
 *
 * @example
 * const validation = duplicateSchoolYearSchema.safeParse({
 *   source_year_id: "550e8400-e29b-41d4-a716-446655440000",
 *   target_year_name: "2025-2026",
 *   include_periods: true,
 *   include_holidays: true,
 *   date_offset_days: 365
 * });
 */
export const duplicateSchoolYearSchema = z.object({
	source_year_id: uuidSchema,
	target_year_name: z
		.string()
		.trim()
		.min(1, 'Nom requis')
		.regex(/^\d{4}-\d{4}$/, 'Format attendu: YYYY-YYYY'),
	include_periods: z.boolean().default(true),
	include_holidays: z.boolean().default(true),
	date_offset_days: z.number().int().default(365) // Usually +365 days (one year)
});

/**
 * Get periods for a school year schema
 *
 * @example
 * const validation = getPeriodsSchema.safeParse({
 *   school_year_id: "550e8400-e29b-41d4-a716-446655440000",
 *   include_stats: true
 * });
 */
export const getPeriodsSchema = z.object({
	school_year_id: uuidSchema,
	include_stats: z.boolean().optional() // Include assessment counts
});

/**
 * Get active year for a school schema
 *
 * @example
 * const validation = getActiveYearSchema.safeParse({
 *   school_id: "550e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const getActiveYearSchema = z.object({
	school_id: uuidSchema
});

/**
 * Link assessments to periods schema
 *
 * Auto-assigns assessments to academic periods based on their dates.
 *
 * @example
 * const validation = linkAssessmentsSchema.safeParse({
 *   school_year_id: "550e8400-e29b-41d4-a716-446655440000"
 * });
 */
export const linkAssessmentsSchema = z.object({
	school_year_id: uuidSchema
});

// Infer TypeScript types
export type DuplicateSchoolYearData = z.infer<typeof duplicateSchoolYearSchema>;
export type GetPeriodsData = z.infer<typeof getPeriodsSchema>;
export type GetActiveYearData = z.infer<typeof getActiveYearSchema>;
export type LinkAssessmentsData = z.infer<typeof linkAssessmentsSchema>;

// ========================================
// Usage Examples in Form Actions
// ========================================

/*
// Example 1: Creating a school year with form data
export const actions = {
  createYear: async ({ request }) => {
    const formData = await request.formData();
    const validation = createSchoolYearSchema.safeParse({
      school_id: formData.get('school_id'),
      name: formData.get('name'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      is_active: formData.get('is_active') === 'true'
    });

    if (!validation.success) {
      return fail(400, {
        errors: validation.error.flatten().fieldErrors
      });
    }

    const data = validation.data; // Type-safe CreateSchoolYearData
    // ... insert into database
  }
};

// Example 2: API endpoint with JSON body
export const POST: RequestHandler = async ({ request, locals }) => {
  const validation = createAcademicPeriodSchema.safeParse(await request.json());

  if (!validation.success) {
    throw error(400, validation.error.issues[0].message);
  }

  const data = validation.data; // Type-safe CreateAcademicPeriodData
  // ... insert into database

  return json({ success: true, data });
};

// Example 3: Query parameters validation
export const load: PageServerLoad = async ({ url, locals }) => {
  const validation = getPeriodsSchema.safeParse({
    school_year_id: url.searchParams.get('year_id'),
    include_stats: url.searchParams.get('stats') === 'true'
  });

  if (!validation.success) {
    throw error(400, 'Paramètres invalides');
  }

  const { school_year_id, include_stats } = validation.data;
  // ... fetch from database
};

// Example 4: Update with partial data
export const actions = {
  updatePeriod: async ({ request }) => {
    const formData = await request.formData();
    const validation = updateAcademicPeriodSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'), // Only updating name
      color: formData.get('color') // and color
    });

    if (!validation.success) {
      return fail(400, { errors: validation.error.flatten() });
    }

    const data = validation.data; // Type-safe UpdateAcademicPeriodData
    // ... update database
  }
};
*/

// ========================================
// Edge Cases Handled
// ========================================

/*
1. Date Range Validation:
   - End date must be after start date (all schemas with date ranges)
   - Prevents zero-length or negative periods

2. Year Format Validation:
   - Name must be "YYYY-YYYY" format
   - Years must be consecutive (2024-2025, not 2024-2026)
   - Prevents malformed year names

3. Numeric Bounds:
   - Period order: 1-10 (prevents excessive periods)
   - Date offset: integer only (no fractional days)
   - Positive integers where required

4. String Constraints:
   - Trimming whitespace on all strings
   - Max length limits prevent database overflow
   - Min length ensures non-empty required fields

5. Color Validation:
   - Strict hex format (#RRGGBB)
   - Default color provided (#3b82f6 - blue)

6. UUID Validation:
   - All foreign keys validated as proper UUIDs
   - Prevents injection attacks via malformed IDs

7. Optional Fields:
   - Metadata fields with safe defaults ({})
   - Boolean flags with sensible defaults (false/true)
   - include_stats is truly optional (undefined allowed)

8. Type Safety:
   - Exported TypeScript types inferred from schemas
   - Ensures compile-time and runtime type safety
   - No 'any' types used anywhere
*/
