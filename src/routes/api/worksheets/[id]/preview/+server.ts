/**
 * API endpoint for worksheet variant preview
 * ===========================================
 *
 * Allows teachers to preview what students will see with resolved parameters
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generatePreviewInstance } from '$lib/server/worksheets/instance-generator';
import type { WorksheetExerciseWithExercise } from '$lib/types/worksheets';

// Input validation schema
const previewRequestSchema = z.object({
	studentId: z.string().uuid().optional(),
	variantSeed: z.number().int().min(0).max(2147483647).optional()
});

export const POST: RequestHandler = async ({ params, request, locals: { supabase, user } }) => {
	try {
		// Authenticate user
		if (!user) {
			return error(401, 'Unauthorized');
		}

		// Validate worksheet ID
		const worksheetId = params.id;
		if (!worksheetId) {
			return error(400, 'Worksheet ID is required');
		}

		// Parse and validate request body
		const validation = previewRequestSchema.safeParse(await request.json());
		if (!validation.success) {
			return error(400, validation.error.issues[0].message);
		}

		const { studentId, variantSeed } = validation.data;

		// Check if user is a teacher (has permission to preview)
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, school_id')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'teacher') {
			return error(403, 'Only teachers can preview worksheet variants');
		}

		// Fetch worksheet details
		const { data: worksheet, error: worksheetError } = await supabase
			.from('worksheets')
			.select(
				`
				id,
				title,
				config,
				created_by,
				school_id
			`
			)
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			return error(404, 'Worksheet not found');
		}

		// Check if user has access to this worksheet
		// (either creator or from same school)
		const hasAccess =
			worksheet.created_by === user.id ||
			(worksheet.school_id && profile.school_id === worksheet.school_id);

		if (!hasAccess) {
			return error(403, 'Access denied to this worksheet');
		}

		// Fetch worksheet exercises with exercise details
		const { data: worksheetExercises, error: exercisesError } = await supabase
			.from('worksheet_exercises')
			.select(
				`
				*,
				exercise:exercises (
					id,
					title,
					variables,
					shared,
					variations
				)
			`
			)
			.eq('worksheet_id', worksheetId)
			.order('section_id', { ascending: true, nullsFirst: true })
			.order('position', { ascending: true });

		if (exercisesError) {
			console.error('Error fetching exercises:', exercisesError);
			return error(500, 'Failed to fetch worksheet exercises');
		}

		if (!worksheetExercises || worksheetExercises.length === 0) {
			return json({
				instanceData: {
					exercises: [],
					variant_info: {
						seed: 0,
						version: 'Preview'
					}
				},
				worksheet: {
					id: worksheet.id,
					title: worksheet.title
				}
			});
		}

		// If a specific student is provided, fetch their details
		let studentInfo = null;
		if (studentId) {
			const { data: student } = await supabase
				.from('profiles')
				.select('id, first_name, last_name')
				.eq('id', studentId)
				.single();

			if (student) {
				studentInfo = {
					id: student.id,
					name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'
				};
			}
		}

		// Generate the preview instance
		const instanceData = generatePreviewInstance({
			worksheetId,
			studentId,
			variantSeed,
			exercises: worksheetExercises as WorksheetExerciseWithExercise[],
			config: worksheet.config || {}
		});

		// Return the preview data
		return json({
			instanceData,
			worksheet: {
				id: worksheet.id,
				title: worksheet.title,
				config: worksheet.config
			},
			student: studentInfo,
			metadata: {
				generatedAt: new Date().toISOString(),
				totalExercises: instanceData.exercises.length,
				variantMode: worksheetExercises[0]?.variant_mode || 'none',
				seed: variantSeed || instanceData.variant_info?.seed
			}
		});
	} catch (err) {
		console.error('Error generating worksheet preview:', err);
		return error(500, err instanceof Error ? err.message : 'Internal server error');
	}
};
