/**
 * Google Classroom Material Sharing Endpoint
 * ==========================================
 *
 * Endpoint: POST/DELETE /api/google/materials/[id]/share
 * Purpose: Share or unshare course work materials with classes
 *
 * POST Flow:
 * 1. Verify user is a teacher
 * 2. Validate request body (classIds, categoryId, topicId, etc.)
 * 3. Verify material exists and belongs to teacher
 * 4. Verify teacher owns all selected classes
 * 5. Create shared_materials records (upsert)
 *
 * DELETE Flow:
 * 1. Verify user is a teacher
 * 2. Validate request body (classIds)
 * 3. Verify material ownership
 * 4. Delete shared_materials records
 *
 * Security:
 * - Teacher role required
 * - Verify material belongs to teacher
 * - Verify teacher owns all classes
 * - All input validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	materialIdParamSchema,
	shareMaterialSchema,
	unshareMaterialSchema
} from '$lib/server/validation';

/**
 * POST /api/google/materials/[id]/share
 * Share a course work material with one or more classes
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Validate material ID parameter
	const paramValidation = materialIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const materialId = paramValidation.data.id;

	// Parse and validate request body
	const body = await request.json();
	const validation = shareMaterialSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classIds, categoryId, topicId, descriptionOverride, visible } = validation.data;

	// Verify material exists and belongs to teacher
	const { data: material, error: materialError } = await locals.supabase
		.from('google_classroom_materials')
		.select(
			`
			id,
			google_classroom_courses!inner(id, teacher_id)
		`
		)
		.eq('id', materialId)
		.single();

	if (materialError || !material) {
		if (materialError?.code === 'PGRST116') {
			throw error(404, 'Material not found');
		}
		console.error('[Material Share] Error fetching material:', materialError);
		throw error(500, 'Failed to fetch material');
	}

	// Handle nested course data (Supabase JOIN types)
	const courseData = material.google_classroom_courses as unknown as
		| { teacher_id: string }
		| { teacher_id: string }[];
	const teacherId = Array.isArray(courseData) ? courseData[0]?.teacher_id : courseData?.teacher_id;

	if (teacherId !== user.id) {
		throw error(403, 'You do not own this material');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, teacher_id')
		.in('id', classIds)
		.eq('is_active', true);

	if (classesError) {
		console.error('[Material Share] Error fetching classes:', classesError);
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'Invalid request');
	}

	const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
	if (invalidClasses.length > 0) {
		console.error(
			`[Material Share] Unauthorized class access attempt by teacher ${user.id}:`,
			invalidClasses.map((c) => c.id)
		);
		throw error(403, 'Access denied');
	}

	// Create shared_materials records
	const sharesToInsert = classIds.map((classId) => ({
		material_id: materialId,
		class_id: classId,
		category_id: categoryId || null,
		topic_id: topicId || null,
		shared_by: user.id,
		description_override: descriptionOverride || null,
		visible: visible
	}));

	const { error: insertError } = await locals.supabase
		.from('shared_materials')
		.upsert(sharesToInsert, {
			onConflict: 'material_id,class_id'
		});

	if (insertError) {
		console.error('[Material Share] Error sharing material:', insertError);
		throw error(500, 'Failed to share material');
	}

	return json({ success: true, classesShared: classIds.length });
};

/**
 * DELETE /api/google/materials/[id]/share
 * Unshare a material from one or more classes
 */
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Validate material ID parameter
	const paramValidation = materialIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const materialId = paramValidation.data.id;

	// Parse and validate request body
	const body = await request.json();
	const validation = unshareMaterialSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classIds } = validation.data;

	// Verify ownership
	const { data: material, error: materialError } = await locals.supabase
		.from('google_classroom_materials')
		.select(
			`
			id,
			google_classroom_courses!inner(teacher_id)
		`
		)
		.eq('id', materialId)
		.single();

	if (materialError || !material) {
		if (materialError?.code === 'PGRST116') {
			throw error(404, 'Material not found');
		}
		console.error('[Material Unshare] Error fetching material:', materialError);
		throw error(500, 'Failed to fetch material');
	}

	// Handle nested course data
	const courseData = material.google_classroom_courses as unknown as
		| { teacher_id: string }
		| { teacher_id: string }[];
	const teacherId = Array.isArray(courseData) ? courseData[0]?.teacher_id : courseData?.teacher_id;

	if (teacherId !== user.id) {
		throw error(403, 'Unauthorized');
	}

	// Delete shares
	const { error: deleteError } = await locals.supabase
		.from('shared_materials')
		.delete()
		.eq('material_id', materialId)
		.in('class_id', classIds);

	if (deleteError) {
		console.error('[Material Unshare] Error unsharing material:', deleteError);
		throw error(500, 'Failed to unshare material');
	}

	return json({ success: true, classesUnshared: classIds.length });
};
