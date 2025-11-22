import { z } from 'zod';
import { GRADE_CODES, type GradeCode } from '$lib/types/grades';
import { parseGradeCode, hasAccessToGrade } from '$lib/utils/grades';

/**
 * Strict schema - only accepts canonical codes
 */
export const gradeCodeSchema = z.enum(GRADE_CODES);

/**
 * Flexible schema - accepts variations and normalizes to canonical
 */
export const gradeFlexibleSchema = z.string().transform((val, ctx) => {
	const parsed = parseGradeCode(val);
	if (!parsed) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Niveau invalide : ${val}`
		});
		return z.NEVER;
	}
	return parsed;
});

/**
 * Array of grades (for multi-grade fields like question_templates.grades)
 */
export const gradeArraySchema = z
	.array(gradeCodeSchema)
	.min(1, 'Au moins un niveau requis')
	.max(18, 'Maximum 18 niveaux')
	.refine((arr) => new Set(arr).size === arr.length, {
		message: 'Les niveaux ne peuvent pas contenir de doublons'
	});

/**
 * Flexible array (accepts variations)
 */
export const gradeArrayFlexibleSchema = z
	.array(gradeFlexibleSchema)
	.min(1, 'Au moins un niveau requis')
	.max(18, 'Maximum 18 niveaux')
	.refine((arr) => new Set(arr).size === arr.length, {
		message: 'Les niveaux ne peuvent pas contenir de doublons'
	});

/**
 * Comma-separated grades string (for query params)
 */
export const gradeCommaSeparatedSchema = z
	.string()
	.transform((val) =>
		val
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	)
	.pipe(gradeArrayFlexibleSchema);

/**
 * Optional grade with "all" option
 */
export const gradeWithAllSchema = z.union([gradeCodeSchema, z.literal('all')]);

/**
 * Optional grade (nullable)
 */
export const gradeCodeOptionalSchema = gradeCodeSchema.nullable();

/**
 * Single grade or array of grades (flexible input)
 */
export const gradeOrArraySchema = z.union([gradeFlexibleSchema, gradeArrayFlexibleSchema]);

/**
 * Grade filter for API queries (single, multiple, or all)
 */
export const gradeFilterSchema = z.union([
	z.literal('all'),
	gradeFlexibleSchema.transform((val) => [val]), // Single grade becomes array
	gradeArrayFlexibleSchema
]);

/**
 * Grade range schema (from/to)
 */
export const gradeRangeSchema = z.object({
	from: gradeCodeSchema,
	to: gradeCodeSchema
});

/**
 * Grade with metadata (for API responses)
 */
export const gradeWithMetadataSchema = z.object({
	code: gradeCodeSchema,
	displayName: z.string(),
	shortName: z.string(),
	level: z.enum(['primary', 'middle', 'high']),
	schoolYear: z.number().int().min(1).max(12),
	track: z.enum(['general', 'spe_maths', 'stmg']).optional(),
	mathsIntensity: z.enum(['basic', 'standard', 'advanced', 'expert']),
	prerequisites: z.array(gradeCodeSchema)
});

/**
 * Validate grade access (user grade can access content grade)
 */
export const gradeAccessSchema = z
	.object({
		userGrade: gradeFlexibleSchema,
		contentGrade: gradeFlexibleSchema
	})
	.refine((data) => hasAccessToGrade(data.userGrade, data.contentGrade), {
		message: "L'utilisateur n'a pas acces a ce niveau"
	});

/**
 * School level schema
 */
export const schoolLevelSchema = z.enum(['primary', 'middle', 'high']);

/**
 * High school track schema
 */
export const highSchoolTrackSchema = z.enum(['general', 'spe_maths', 'stmg']);

/**
 * Maths intensity schema
 */
export const mathsIntensitySchema = z.enum(['basic', 'standard', 'advanced', 'expert']);

/**
 * Grade selection for forms (with display data)
 */
export const gradeSelectionSchema = z.object({
	value: gradeCodeSchema,
	label: z.string()
});

/**
 * Batch grade validation
 */
export const batchGradeValidationSchema = z.array(z.string()).transform((vals) => {
	const results: { input: string; valid: boolean; parsed: GradeCode | null; error?: string }[] = [];

	for (const val of vals) {
		const parsed = parseGradeCode(val);
		results.push({
			input: val,
			valid: parsed !== null,
			parsed,
			error: parsed ? undefined : `Format de niveau invalide : ${val}`
		});
	}

	return results;
});

/**
 * Grade update schema (for PATCH operations)
 */
export const gradeUpdateSchema = z
	.object({
		grades: gradeArrayFlexibleSchema.optional(),
		addGrades: gradeArrayFlexibleSchema.optional(),
		removeGrades: gradeArrayFlexibleSchema.optional()
	})
	.refine(
		(data) => {
			// At least one field must be provided
			return (
				data.grades !== undefined || data.addGrades !== undefined || data.removeGrades !== undefined
			);
		},
		{
			message: 'Au moins une operation sur les niveaux doit etre specifiee'
		}
	)
	.refine(
		(data) => {
			// Cannot use grades with add/remove
			if (
				data.grades !== undefined &&
				(data.addGrades !== undefined || data.removeGrades !== undefined)
			) {
				return false;
			}
			return true;
		},
		{
			message: 'Impossible d\'utiliser "grades" avec "addGrades" ou "removeGrades"'
		}
	);

/**
 * Export type inference helpers
 */
export type GradeCodeInput = z.input<typeof gradeCodeSchema>;
export type GradeFlexibleInput = z.input<typeof gradeFlexibleSchema>;
export type GradeArrayInput = z.input<typeof gradeArraySchema>;
export type GradeFilterInput = z.input<typeof gradeFilterSchema>;
export type GradeRangeInput = z.input<typeof gradeRangeSchema>;
export type GradeUpdateInput = z.input<typeof gradeUpdateSchema>;
