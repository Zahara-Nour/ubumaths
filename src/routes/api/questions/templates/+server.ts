/**
 * Question Templates API
 * ======================
 *
 * CRUD endpoints for question templates
 *
 * GET /api/questions/templates - List templates with filters
 * POST /api/questions/templates - Create new template
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QuestionTemplate, QuestionType, GradeLevel } from '$lib/questions/types';
import { validateTemplate } from '$lib/questions';
import { detectCircularDependencies } from '$lib/questions';
import { checkCategoryUniqueness, getNextAvailableLevel } from '$lib/questions/category-validation';

/**
 * GET /api/questions/templates
 *
 * List question templates with optional filters
 *
 * Query parameters:
 * - type: QuestionType (filter by question type)
 * - grades: GradeLevel[] (comma-separated, filter by grade)
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 *
 * Returns: { templates: QuestionTemplate[], total: number }
 */
export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Check role (teachers and admins can view)
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
		throw error(403, 'Only teachers and admins can access question templates');
	}

	try {
		// Parse query parameters
		const typeParam = url.searchParams.get('type');
		const gradesParam = url.searchParams.get('grades');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Build query
		let query = supabase.from('question_templates').select('*', { count: 'exact' });

		// Apply filters
		if (typeParam) {
			query = query.eq('type', typeParam);
		}

		if (gradesParam) {
			const grades = gradesParam.split(',').map((g) => g.trim());
			query = query.overlaps('grades', grades);
		}

		// Apply pagination
		query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

		const { data: templates, error: queryError, count } = await query;

		if (queryError) {
			console.error('Error fetching templates:', queryError);
			throw error(500, 'Failed to fetch templates');
		}

		return json({
			templates: templates || [],
			total: count || 0
		});
	} catch (err) {
		console.error('Error in GET /api/questions/templates:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};

/**
 * POST /api/questions/templates
 *
 * Create a new question template
 *
 * Body: QuestionTemplate (without id, timestamps)
 *
 * Returns: { success: true, template: QuestionTemplate } | { success: false, errors: string[] }
 */
export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Check role (only admins can create)
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Only admins can create question templates');
	}

	try {
		const templateData = (await request.json()) as Partial<QuestionTemplate>;

		// Validate required fields
		if (!templateData.title || templateData.title.trim().length === 0) {
			return json(
				{
					success: false,
					errors: ['Title is required']
				},
				{ status: 400 }
			);
		}

		// Only validate if status is 'published'
		if (templateData.status === 'published') {
			// Validate template structure
			const validationErrors = validateTemplate(templateData as QuestionTemplate);
			if (validationErrors.length > 0) {
				return json(
					{
						success: false,
						errors: validationErrors
					},
					{ status: 400 }
				);
			}

			// Detect circular dependencies in each variation
			const allCircularErrors: string[] = [];
			if (templateData.variations) {
				templateData.variations.forEach((variation, index) => {
					const circularErrors = detectCircularDependencies(variation.variables);
					if (circularErrors.length > 0) {
						allCircularErrors.push(
							...circularErrors.map((err) => `Variation ${index + 1}: ${err}`)
						);
					}
				});
			}

			if (allCircularErrors.length > 0) {
				return json(
					{
						success: false,
						errors: allCircularErrors
					},
					{ status: 400 }
				);
			}
		}

		// Category uniqueness validation and auto-adjustment (only for published templates)
		let adjustedLevel = templateData.level;
		let levelAdjusted = false;

		if (templateData.status === 'published') {
			const categoryCheck = await checkCategoryUniqueness(supabase, {
				theme: templateData.theme!,
				domain: templateData.domain!,
				subdomain: templateData.subdomain,
				level: templateData.level!
			});

			if (!categoryCheck.isUnique) {
				// Category exists - auto-adjust level to next available (max + 1)
				const nextLevel = await getNextAvailableLevel(supabase, {
					theme: templateData.theme!,
					domain: templateData.domain!,
					subdomain: templateData.subdomain
				});

				adjustedLevel = nextLevel;
				levelAdjusted = true;
			}
		}

		// Insert template (map camelCase to snake_case for database)
		const { data: template, error: insertError } = await supabase
			.from('question_templates')
			.insert({
				type: templateData.type,
				title: templateData.title,
				description: templateData.description || null,
				variations: templateData.variations,
				exercise_instruction: templateData.exerciseInstruction || null,
				precision: templateData.precision || { type: 'none' },
				options: templateData.options || null,
				grades: templateData.grades,
				// Categorization fields (independent from grades)
				// - theme: Broad subject area (e.g., "Algèbre", "Géométrie") [required]
				// - domain: Specific topic (e.g., "Équations", "Triangles") [required]
				// - subdomain: Optional sub-topic (e.g., "Linéaires") [nullable]
				// - level: Difficulty (positive integer, 1=easy, higher=harder) [required]
				theme: templateData.theme,
				domain: templateData.domain,
				subdomain: templateData.subdomain || null,
				level: adjustedLevel,
				status: templateData.status || 'published',
				delay: templateData.delay || null,
				transform_type: templateData.transformType || null,
				multiple_answers: templateData.multipleAnswers ?? null,
				created_by: user.id
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error inserting template:', insertError);
			throw error(500, 'Failed to create template');
		}

		return json(
			{
				success: true,
				template,
				levelAdjusted,
				adjustedLevel: levelAdjusted ? adjustedLevel : undefined
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('Error in POST /api/questions/templates:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		return json({
			success: false,
			errors: ['Internal server error']
		});
	}
};
