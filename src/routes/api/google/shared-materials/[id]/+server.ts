/**
 * Google Classroom Shared Material by ID Endpoint
 * =================================================
 *
 * Endpoint: DELETE/PATCH /api/google/shared-materials/[id]
 * Purpose: Manage individual shared material records
 *
 * DELETE - Unshare material from a single class using shared_materials record ID
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate ID parameter
 * 3. Verify record exists and belongs to teacher
 * 4. Delete shared_materials record
 * 5. Return success
 *
 * PATCH - Update shared material settings by record ID
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate ID parameter and update fields
 * 3. Verify record exists and belongs to teacher
 * 4. Verify categoryId/topicId if provided
 * 5. Update fields (only provided fields)
 * 6. Return updated record
 *
 * Security:
 * - Teacher role required
 * - Verify record ownership via RLS (class belongs to teacher)
 * - Verify category/topic belongs to teacher's classes/courses
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { updateSharedMaterialByIdSchema, uuidSchema } from '$lib/server/validation';

/**
 * Delete shared material record by ID
 *
 * Security: Teacher role required, ownership verified via RLS
 *
 * Deletes a single shared_materials record (idempotent)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid shared material ID: ' + idValidation.error.issues[0].message);
	}

	const sharedMaterialId = idValidation.data;

	// Verify record exists and belongs to teacher (via RLS - class ownership)
	// Note: RLS policy ensures only teacher's shared materials are accessible
	const { data: existingRecord, error: fetchError } = await locals.supabase
		.from('shared_materials')
		.select('id, material_id, class_id')
		.eq('id', sharedMaterialId)
		.eq('shared_by', user.id)
		.single();

	if (fetchError || !existingRecord) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Shared material not found or access denied');
		}
		console.error('[Delete Shared Material] Record verification error:', fetchError);
		throw error(403, 'You do not have permission to delete this record');
	}

	// Delete the record (idempotent)
	const { error: deleteError } = await locals.supabase
		.from('shared_materials')
		.delete()
		.eq('id', sharedMaterialId)
		.eq('shared_by', user.id);

	if (deleteError) {
		console.error('[Delete Shared Material] Delete error:', deleteError);
		throw error(500, 'Failed to delete shared material');
	}

	return json({
		success: true,
		message: 'Shared material deleted successfully'
	});
};

/**
 * Update shared material settings by record ID
 *
 * Security: Teacher role required, ownership verified
 *
 * Updates visibility, category, topic, or description override
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid shared material ID: ' + idValidation.error.issues[0].message);
	}

	const sharedMaterialId = idValidation.data;

	// Parse and validate request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const validation = updateSharedMaterialByIdSchema.safeParse(requestBody);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const updates = validation.data;

	// Verify record exists and belongs to teacher
	// Note: RLS policy ensures only teacher's shared materials are accessible
	const { data: existingRecord, error: fetchError } = await locals.supabase
		.from('shared_materials')
		.select('id, material_id, class_id')
		.eq('id', sharedMaterialId)
		.eq('shared_by', user.id)
		.single();

	if (fetchError || !existingRecord) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Shared material not found or access denied');
		}
		console.error('[Update Shared Material] Record verification error:', fetchError);
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
		.from('shared_materials')
		.update(updateObject)
		.eq('id', sharedMaterialId)
		.eq('shared_by', user.id)
		.select(
			`
			id,
			material_id,
			class_id,
			visible,
			category_id,
			topic_id,
			description_override,
			created_at,
			updated_at
		`
		)
		.single();

	if (updateError) {
		console.error('[Update Shared Material] Update error:', updateError);
		throw error(500, 'Failed to update shared material');
	}

	// Transform to camelCase
	return json({
		success: true,
		sharedMaterial: {
			id: updatedRecord.id,
			materialId: updatedRecord.material_id,
			classId: updatedRecord.class_id,
			visible: updatedRecord.visible,
			categoryId: updatedRecord.category_id,
			topicId: updatedRecord.topic_id,
			descriptionOverride: updatedRecord.description_override,
			sharedAt: updatedRecord.created_at,
			updatedAt: updatedRecord.updated_at
		}
	});
};
