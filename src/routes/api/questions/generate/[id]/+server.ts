/**
 * Question Instance Generator API
 * ================================
 *
 * POST /api/questions/generate/[id] - Generate instance from template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateInstance } from '$lib/questions';
import { generateQuestionSchema } from '$lib/server/validation/questions';
import type { QuestionTemplate } from '$lib/questions/types';
import type { Database } from '$lib/types/database';
import { requireRole } from '$lib/server/middleware/auth';

type DbQuestionTemplate = Database['public']['Tables']['question_templates']['Row'];

/**
 * Transform database row to QuestionTemplate type
 * Database uses snake_case and Json types, application uses camelCase and specific types
 * Safe: Database schema guarantees these Json fields match the expected structures
 */
function dbRowToQuestionTemplate(row: DbQuestionTemplate): QuestionTemplate {
	return {
		id: row.id,
		type: row.type as unknown as QuestionTemplate['type'],
		title: row.title,
		description: row.description ?? undefined,
		variations: row.variations as unknown as QuestionTemplate['variations'],
		exerciseInstruction: row.exercise_instruction ?? undefined,
		options: (row.options as unknown as QuestionTemplate['options']) ?? undefined,
		precision: (row.precision as unknown as QuestionTemplate['precision']) ?? { type: 'none' },
		grades: row.grades as unknown as QuestionTemplate['grades'],
		theme: row.theme,
		domain: row.domain,
		subdomain: row.subdomain ?? undefined,
		level: row.level,
		status: row.status as unknown as QuestionTemplate['status'],
		delay: row.delay ?? undefined,
		transformType:
			(row.transform_type as unknown as QuestionTemplate['transformType']) ?? undefined,
		multipleAnswers: row.multiple_answers ?? undefined,
		created_at: row.created_at ?? undefined,
		updated_at: row.updated_at ?? undefined,
		created_by: row.created_by ?? undefined
	};
}

/**
 * POST /api/questions/generate/[id]
 *
 * Generate a question instance from a template
 *
 * Body (optional):
 * - seed?: number - Seed for reproducible generation
 *
 * Returns: GenerationResult { success, instance? | errors? }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	try {
		// Fetch template
		const { data: template, error: queryError } = await supabase
			.from('question_templates')
			.select('*')
			.eq('id', params.id)
			.single();

		if (queryError || !template) {
			throw error(404, 'Template not found');
		}

		// ====================================================================
		// SECURITY: Validate input with Zod
		// ====================================================================
		let seed: number | undefined;
		try {
			const body = await request.json();
			const validation = generateQuestionSchema.safeParse(body);
			if (!validation.success) {
				throw error(400, validation.error.issues[0].message);
			}
			seed = validation.data.seed;
			// Note: variationIndex is validated but not currently used in generateInstance
		} catch (err) {
			// No body or invalid JSON - use random seed
			if (err && typeof err === 'object' && 'status' in err) {
				throw err; // Re-throw validation errors
			}
		}

		// Transform database row to application type
		const questionTemplate = dbRowToQuestionTemplate(template);

		// Generate instance
		const result = generateInstance(questionTemplate, seed);

		// Return appropriate status code
		if (result.success) {
			return json(result, { status: 200 });
		} else {
			return json(result, { status: 400 });
		}
	} catch (err) {
		console.error('Error in POST /api/questions/generate/[id]:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		return json({
			success: false,
			errors: ['Internal server error: ' + (err instanceof Error ? err.message : String(err))]
		});
	}
};
