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
import { toQuestionTemplate } from '$lib/types/question-template';
import { requireRoles } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

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
	const id = validateUuidParam(params.id);
	// L'aperçu est une page admin : le rôle admin doit passer, pas seulement teacher.
	await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	try {
		// Fetch template
		const { data: template, error: queryError } = await supabase
			.from('question_templates')
			.select('*')
			.eq('id', id)
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

		// Conversion commune (`shared` et `default_display_options` compris)
		const questionTemplate = toQuestionTemplate(template);

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
