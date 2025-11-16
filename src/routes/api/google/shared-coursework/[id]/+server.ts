/**
 * Google Classroom Shared Coursework by ID Endpoint
 * ==================================================
 *
 * Endpoint: PATCH/DELETE /api/google/shared-coursework/[id]
 * Purpose: Update or delete specific shared coursework records
 *
 * PATCH - Update shared coursework settings by ID
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate ID parameter
 * 3. Validate update fields
 * 4. Verify record exists and belongs to teacher
 * 5. Update fields (only provided fields)
 * 6. Return updated record
 *
 * DELETE - Delete shared coursework record by ID
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate ID parameter
 * 3. Verify record exists and belongs to teacher
 * 4. Delete record
 * 5. Return success
 *
 * Security:
 * - Teacher role required
 * - Verify record ownership via class ownership
 * - Verify category belongs to teacher's classes (if updated)
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	sharedCourseworkIdParamSchema,
	updateSharedCourseworkByIdSchema
} from '$lib/server/validation/google';

/**
 * Update shared coursework settings by record ID
 *
 * Security: Teacher role required, ownership verified
 *
 * Updates visibility, category, or description override
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Only teachers can update shared coursework
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID parameter
	const paramValidation = sharedCourseworkIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, 'Invalid shared coursework ID: ' + paramValidation.error.issues[0].message);
	}

	const { id: sharedCourseworkId } = paramValidation.data;

	// Parse and validate request body
	const body = await request.json();
	const validation = updateSharedCourseworkByIdSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	try {
		// Verify record exists and belongs to teacher
		// Note: RLS policy handles ownership via class_id
		const { data: existingRecord, error: fetchError } = await locals.supabase
			.from('shared_coursework')
			.select(
				`
				id,
				class_id,
				classes!inner(
					id,
					teacher_id
				)
			`
			)
			.eq('id', sharedCourseworkId)
			.single();

		if (fetchError || !existingRecord) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Shared coursework not found or access denied');
			}
			console.error('[Update Shared Coursework] Record verification error:', fetchError);
			throw error(404, 'Shared coursework not found');
		}

		// Verify the teacher owns the class
		const classDataForAuth = existingRecord.classes as unknown as
			| { id: string; teacher_id: string }
			| { id: string; teacher_id: string }[];
		const teacherId = Array.isArray(classDataForAuth)
			? classDataForAuth[0]?.teacher_id
			: classDataForAuth?.teacher_id;

		if (teacherId !== user.id) {
			console.error(
				`[Update Shared Coursework] Unauthorized access attempt by teacher ${user.id}: record ${sharedCourseworkId}`
			);
			throw error(403, 'You do not have permission to update this record');
		}

		// If categoryId is being updated and is not null, verify it belongs to teacher (via class)
		if (updates.categoryId !== undefined && updates.categoryId !== null) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id, class_id')
				.eq('id', updates.categoryId)
				.single();

			if (categoryError || !category) {
				throw error(400, 'Category not found');
			}

			// Verify the category's class belongs to the teacher
			const { data: categoryClass, error: categoryClassError } = await locals.supabase
				.from('classes')
				.select('id')
				.eq('id', category.class_id)
				.eq('teacher_id', user.id)
				.single();

			if (categoryClassError || !categoryClass) {
				throw error(400, 'Category does not belong to one of your classes');
			}
		}

		// If topicId is being updated and is not null, verify it belongs to teacher's course
		if (updates.topicId !== undefined && updates.topicId !== null) {
			const { data: topic, error: topicError } = await locals.supabase
				.from('google_classroom_topics')
				.select('id, google_course_id')
				.eq('id', updates.topicId)
				.single();

			if (topicError || !topic) {
				throw error(400, 'Topic not found');
			}

			// Verify topic belongs to a course owned by teacher
			const { data: topicCourse, error: topicCourseError } = await locals.supabase
				.from('google_classroom_courses')
				.select('id')
				.eq('google_course_id', topic.google_course_id)
				.eq('teacher_id', user.id)
				.single();

			if (topicCourseError || !topicCourse) {
				throw error(400, 'Topic does not belong to one of your courses');
			}
		}

		// Build update object (only include provided fields)
		// Note: Database uses 'description_override' but API uses 'descriptionOverride'
		const updateObject: Record<string, unknown> = {
			updated_at: new Date().toISOString()
		};

		if (updates.visible !== undefined) {
			updateObject.visible = updates.visible;
		}

		if (updates.categoryId !== undefined) {
			updateObject.category_id = updates.categoryId;
		}

		if (updates.topicId !== undefined) {
			updateObject.topic_id = updates.topicId;
		}

		if (updates.descriptionOverride !== undefined) {
			updateObject.description_override = updates.descriptionOverride;
		}

		// Update the record
		const { data: updatedRecord, error: updateError } = await locals.supabase
			.from('shared_coursework')
			.update(updateObject)
			.eq('id', sharedCourseworkId)
			.select(
				`
				id,
				coursework_id,
				class_id,
				visible,
				category_id,
				topic_id,
				description_override,
				display_order,
				created_at,
				updated_at,
				google_classroom_coursework!inner(
					title,
					description,
					work_type,
					max_points,
					due_date,
					due_time
				),
				classes!inner(
					name
				),
				coursework_categories(
					name
				)
			`
			)
			.single();

		if (updateError) {
			console.error('[Update Shared Coursework] Update error:', updateError);
			throw error(500, 'Failed to update shared coursework');
		}

		// Handle nested data from JOINs
		const courseworkData = updatedRecord.google_classroom_coursework as unknown as
			| {
					title: string;
					description: string | null;
					work_type: string;
					max_points: number | null;
					due_date: string | null;
					due_time: string | null;
			  }
			| {
					title: string;
					description: string | null;
					work_type: string;
					max_points: number | null;
					due_date: string | null;
					due_time: string | null;
			  }[];

		const coursework = Array.isArray(courseworkData) ? courseworkData[0] : courseworkData;

		const classData = updatedRecord.classes as unknown as { name: string } | { name: string }[];
		const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;

		const categoryData = updatedRecord.coursework_categories as unknown as { name: string } | null;

		// Transform to camelCase and include enriched data
		return json({
			success: true,
			sharedCoursework: {
				id: updatedRecord.id,
				courseworkId: updatedRecord.coursework_id,
				courseworkTitle: coursework?.title || 'Untitled',
				courseworkDescription: coursework?.description || null,
				workType: coursework?.work_type || 'ASSIGNMENT',
				maxPoints: coursework?.max_points || null,
				dueDate: coursework?.due_date || null,
				dueTime: coursework?.due_time || null,
				classId: updatedRecord.class_id,
				className: className || 'Unknown Class',
				visible: updatedRecord.visible,
				categoryId: updatedRecord.category_id,
				categoryName: categoryData?.name || null,
				topicId: updatedRecord.topic_id,
				descriptionOverride: updatedRecord.description_override,
				displayOrder: updatedRecord.display_order,
				sharedAt: updatedRecord.created_at,
				updatedAt: updatedRecord.updated_at
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Update Shared Coursework] Error updating record:', err);
		throw error(500, 'An error occurred while updating shared coursework');
	}
};

/**
 * Delete shared coursework record by ID
 *
 * Security: Teacher role required, ownership verified
 *
 * Removes a single shared coursework record
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Only teachers can delete shared coursework
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID parameter
	const paramValidation = sharedCourseworkIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, 'Invalid shared coursework ID: ' + paramValidation.error.issues[0].message);
	}

	const { id: sharedCourseworkId } = paramValidation.data;

	try {
		// Verify record exists and belongs to teacher
		const { data: existingRecord, error: fetchError } = await locals.supabase
			.from('shared_coursework')
			.select(
				`
				id,
				classes!inner(
					id,
					teacher_id
				)
			`
			)
			.eq('id', sharedCourseworkId)
			.single();

		if (fetchError || !existingRecord) {
			if (fetchError?.code === 'PGRST116') {
				throw error(404, 'Shared coursework not found or access denied');
			}
			console.error('[Delete Shared Coursework] Record verification error:', fetchError);
			throw error(404, 'Shared coursework not found');
		}

		// Verify the teacher owns the class
		const classDataForDelete = existingRecord.classes as unknown as
			| { id: string; teacher_id: string }
			| { id: string; teacher_id: string }[];
		const teacherId = Array.isArray(classDataForDelete)
			? classDataForDelete[0]?.teacher_id
			: classDataForDelete?.teacher_id;

		if (teacherId !== user.id) {
			console.error(
				`[Delete Shared Coursework] Unauthorized access attempt by teacher ${user.id}: record ${sharedCourseworkId}`
			);
			throw error(403, 'You do not have permission to delete this record');
		}

		// Delete the record
		const { error: deleteError } = await locals.supabase
			.from('shared_coursework')
			.delete()
			.eq('id', sharedCourseworkId);

		if (deleteError) {
			console.error('[Delete Shared Coursework] Delete error:', deleteError);
			throw error(500, 'Failed to delete shared coursework');
		}

		return json({
			success: true
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Delete Shared Coursework] Error deleting record:', err);
		throw error(500, 'An error occurred while deleting shared coursework');
	}
};
