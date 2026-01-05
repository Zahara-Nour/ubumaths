/**
 * API Route: /api/worksheets/[id]/duplicate
 * POST - Duplicate a worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateWorksheetId,
	createWorksheetResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

/**
 * POST /api/worksheets/[id]/duplicate
 * Duplicate an existing worksheet
 * Teachers and admins only
 */
export const POST: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate URL parameter
	const paramValidation = validateWorksheetId(params);
	if (!paramValidation.success) {
		throw error(400, 'Invalid worksheet ID');
	}

	const { id: worksheetId } = paramValidation.data;

	// Get the original worksheet
	const { data: original, error: fetchError } = await locals.supabase
		.from('worksheets')
		.select('*')
		.eq('id', worksheetId)
		.single();

	if (fetchError || !original) {
		throw error(404, 'Worksheet not found');
	}

	// Verify access (user must be creator or admin from same school)
	if (original.created_by !== user.id) {
		if (profile.role !== 'admin' || original.school_id !== profile.school_id) {
			throw error(403, 'Access denied');
		}
	}

	// Create duplicate with new title
	const { data: duplicate, error: createError } = await locals.supabase
		.from('worksheets')
		.insert({
			title: `${original.title} (copie)`,
			description: original.description,
			type: original.type,
			config: original.config,
			status: 'draft', // Always start as draft
			version: 1,
			template_id: original.template_id,
			estimated_duration_minutes: original.estimated_duration_minutes,
			total_points: original.total_points,
			grades: original.grades,
			tags: original.tags,
			created_by: user.id,
			school_id: profile.school_id
		})
		.select()
		.single();

	if (createError) {
		console.error('Failed to duplicate worksheet:', createError);
		throw error(500, 'Failed to duplicate worksheet');
	}

	// Duplicate sections
	const { data: sections } = await locals.supabase
		.from('worksheet_sections')
		.select('*')
		.eq('worksheet_id', worksheetId)
		.order('position');

	if (sections && sections.length > 0) {
		const sectionMapping: Record<string, string> = {};

		for (const section of sections) {
			const { data: newSection } = await locals.supabase
				.from('worksheet_sections')
				.insert({
					worksheet_id: duplicate.id,
					title: section.title,
					instructions: section.instructions,
					position: section.position,
					points_total: section.points_total
				})
				.select()
				.single();

			if (newSection) {
				sectionMapping[section.id] = newSection.id;
			}
		}

		// Duplicate exercises with section mapping
		const { data: exercises } = await locals.supabase
			.from('worksheet_exercises')
			.select('*')
			.eq('worksheet_id', worksheetId)
			.order('position');

		if (exercises && exercises.length > 0) {
			const exerciseInserts = exercises.map((ex) => ({
				worksheet_id: duplicate.id,
				exercise_id: ex.exercise_id,
				section_id: ex.section_id ? sectionMapping[ex.section_id] || null : null,
				position: ex.position,
				points: ex.points,
				variant_mode: ex.variant_mode,
				variant_config: ex.variant_config,
				custom_instructions: ex.custom_instructions
			}));

			await locals.supabase.from('worksheet_exercises').insert(exerciseInserts);
		}
	} else {
		// No sections, duplicate exercises directly
		const { data: exercises } = await locals.supabase
			.from('worksheet_exercises')
			.select('*')
			.eq('worksheet_id', worksheetId)
			.order('position');

		if (exercises && exercises.length > 0) {
			const exerciseInserts = exercises.map((ex) => ({
				worksheet_id: duplicate.id,
				exercise_id: ex.exercise_id,
				section_id: null,
				position: ex.position,
				points: ex.points,
				variant_mode: ex.variant_mode,
				variant_config: ex.variant_config,
				custom_instructions: ex.custom_instructions
			}));

			await locals.supabase.from('worksheet_exercises').insert(exerciseInserts);
		}
	}

	// Validate response
	const validated = validateJsonResponse(
		createWorksheetResponseSchema,
		{ worksheet: duplicate },
		'POST /api/worksheets/[id]/duplicate'
	);

	return json(validated, { status: 201 });
};
