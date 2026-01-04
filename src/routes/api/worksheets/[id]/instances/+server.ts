/**
 * API endpoint for worksheet instances management
 * ================================================
 *
 * POST: Generate instances for a class
 * GET: List instances for a worksheet
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { generateWorksheetInstance } from '$lib/server/worksheets/instance-generator';
import type { WorksheetExerciseWithExercise, WorksheetInstanceInsert } from '$lib/types/worksheets';

// Input validation schema for POST
const createInstancesSchema = z.object({
	classId: z.string().uuid()
});

/**
 * POST: Generate worksheet instances for all students in a class
 */
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
		const validation = createInstancesSchema.safeParse(await request.json());
		if (!validation.success) {
			return error(400, validation.error.issues[0].message);
		}

		const { classId } = validation.data;

		// Check if user is a teacher
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, school_id')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'teacher') {
			return error(403, 'Only teachers can generate worksheet instances');
		}

		// Check if user has access to the class
		const { data: classData, error: classError } = await supabase
			.from('classes')
			.select('id, name')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.single();

		if (classError || !classData) {
			return error(403, 'Class not found or access denied');
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
				school_id,
				status
			`
			)
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			return error(404, 'Worksheet not found');
		}

		// Check if worksheet is published
		if (worksheet.status !== 'published') {
			return error(400, 'Worksheet must be published before generating instances');
		}

		// Check if user has access to this worksheet
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
					difficulty,
					variables,
					shared,
					variations
				)
			`
			)
			.eq('worksheet_id', worksheetId)
			.order('section_id', { ascending: true, nullsFirst: true })
			.order('position', { ascending: true });

		if (exercisesError || !worksheetExercises || worksheetExercises.length === 0) {
			return error(400, 'Worksheet has no exercises');
		}

		// Fetch students in the class
		const { data: students, error: studentsError } = await supabase
			.from('profiles')
			.select('id, first_name, last_name')
			.eq('class_id', classId)
			.eq('role', 'student');

		if (studentsError || !students || students.length === 0) {
			return error(400, 'No students found in the class');
		}

		// Check for existing instances to avoid duplicates
		const { data: existingInstances } = await supabase
			.from('worksheet_instances')
			.select('student_id')
			.eq('worksheet_id', worksheetId)
			.in(
				'student_id',
				students.map((s) => s.id)
			);

		const existingStudentIds = new Set(existingInstances?.map((i) => i.student_id) || []);
		const newStudents = students.filter((s) => !existingStudentIds.has(s.id));

		if (newStudents.length === 0) {
			return json({
				message: 'All students already have instances',
				created: 0,
				skipped: students.length,
				total: students.length
			});
		}

		// Generate instances for each new student
		const instances: WorksheetInstanceInsert[] = [];
		const errors: Array<{ studentId: string; error: string }> = [];

		for (const student of newStudents) {
			try {
				// Generate the instance data
				const instanceData = generateWorksheetInstance({
					worksheetId,
					studentId: student.id,
					exercises: worksheetExercises as WorksheetExerciseWithExercise[],
					config: worksheet.config || {}
				});

				// Get the variant seed from the instance data
				const variantSeed = instanceData.variant_info?.seed || 0;

				// Prepare the instance for insertion
				instances.push({
					worksheet_id: worksheetId,
					student_id: student.id,
					instance_data: instanceData,
					variant_seed: variantSeed,
					variant_version: instanceData.variant_info?.version || null,
					status: 'generated'
				});
			} catch (err) {
				errors.push({
					studentId: student.id,
					error: err instanceof Error ? err.message : 'Unknown error'
				});
			}
		}

		// Batch insert all instances
		if (instances.length > 0) {
			const { error: insertError } = await supabase.from('worksheet_instances').insert(instances);

			if (insertError) {
				console.error('Error inserting instances:', insertError);
				return error(500, 'Failed to create worksheet instances');
			}
		}

		// Return summary
		return json({
			message: `Successfully created ${instances.length} worksheet instances`,
			created: instances.length,
			skipped: existingStudentIds.size,
			errors: errors.length > 0 ? errors : undefined,
			total: students.length,
			worksheet: {
				id: worksheet.id,
				title: worksheet.title
			},
			class: {
				id: classData.id,
				name: classData.name
			}
		});
	} catch (err) {
		console.error('Error creating worksheet instances:', err);
		return error(500, err instanceof Error ? err.message : 'Internal server error');
	}
};

/**
 * GET: List worksheet instances
 */
export const GET: RequestHandler = async ({ params, url, locals: { supabase, user } }) => {
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

		// Check if user is a teacher
		const { data: profile } = await supabase
			.from('profiles')
			.select('role, school_id')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'teacher') {
			return error(403, 'Only teachers can view worksheet instances');
		}

		// Fetch worksheet to check access
		const { data: worksheet, error: worksheetError } = await supabase
			.from('worksheets')
			.select('id, title, created_by, school_id')
			.eq('id', worksheetId)
			.single();

		if (worksheetError || !worksheet) {
			return error(404, 'Worksheet not found');
		}

		// Check if user has access to this worksheet
		const hasAccess =
			worksheet.created_by === user.id ||
			(worksheet.school_id && profile.school_id === worksheet.school_id);

		if (!hasAccess) {
			return error(403, 'Access denied to this worksheet');
		}

		// Parse query parameters
		const classId = url.searchParams.get('classId');
		const status = url.searchParams.get('status');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		// Build query
		let query = supabase
			.from('worksheet_instances')
			.select(
				`
				id,
				student_id,
				variant_seed,
				variant_version,
				status,
				generated_at,
				accessed_at,
				submitted_at,
				time_spent_seconds,
				student:profiles!worksheet_instances_student_id_fkey (
					id,
					first_name,
					last_name,
					class_id
				)
			`
			)
			.eq('worksheet_id', worksheetId)
			.order('generated_at', { ascending: false })
			.range(offset, offset + limit - 1);

		// Apply filters
		if (status) {
			query = query.eq('status', status);
		}

		// Filter by class if specified
		if (classId) {
			// First get student IDs in the class
			const { data: classStudents } = await supabase
				.from('profiles')
				.select('id')
				.eq('class_id', classId)
				.eq('role', 'student');

			if (classStudents && classStudents.length > 0) {
				query = query.in(
					'student_id',
					classStudents.map((s) => s.id)
				);
			}
		}

		const { data: instances, error: instancesError, count } = await query;

		if (instancesError) {
			console.error('Error fetching instances:', instancesError);
			return error(500, 'Failed to fetch worksheet instances');
		}

		// Calculate statistics
		const stats = {
			total: count || 0,
			generated: 0,
			in_progress: 0,
			submitted: 0,
			graded: 0
		};

		if (instances) {
			for (const instance of instances) {
				stats[instance.status as keyof typeof stats]++;
			}
		}

		return json({
			instances: instances || [],
			worksheet: {
				id: worksheet.id,
				title: worksheet.title
			},
			stats,
			pagination: {
				limit,
				offset,
				total: count || 0
			}
		});
	} catch (err) {
		console.error('Error fetching worksheet instances:', err);
		return error(500, err instanceof Error ? err.message : 'Internal server error');
	}
};
