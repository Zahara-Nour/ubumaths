/**
 * Question Instance Generator API
 * ================================
 *
 * POST /api/questions/generate/[id] - Generate instance from template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateInstance } from '$lib/questions';

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
export const POST: RequestHandler = async ({
	params,
	request,
	locals: { safeGetSession, supabase }
}) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Check role
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
		throw error(403, 'Only teachers and admins can generate question instances');
	}

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

		// Parse request body for seed (optional)
		let seed: number | undefined;
		try {
			const body = await request.json();
			seed = body.seed;
		} catch {
			// No body or invalid JSON - use random seed
		}

		// Convert database format (snake_case) to QuestionTemplate type (camelCase)
		const questionTemplate = {
			id: template.id,
			type: template.type,
			statement: template.statement,
			variables: template.variables || [],
			answer: template.answer,
			precision: template.precision || { type: 'none' },
			grades: template.grades,
			delay: template.delay,
			correction: template.correction,
			transform_type: template.transform_type,
			blanks: template.blanks,
			choices: template.choices,
			multiple_answers: template.multiple_answers,
			created_at: template.created_at,
			updated_at: template.updated_at,
			created_by: template.created_by
		};

		// Generate instance
		const result = generateInstance(questionTemplate as any, seed);

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
