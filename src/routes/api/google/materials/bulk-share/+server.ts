/**
 * Google Classroom Bulk Material Sharing Endpoint
 * ================================================
 *
 * Endpoint: POST /api/google/materials/bulk-share
 * Purpose: Share multiple course work materials with multiple classes in a single request
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate request body (materialIds, classIds, categoryId, topicId, etc.)
 * 3. Verify ALL materials exist and belong to teacher (single query with IN clause)
 * 4. Verify teacher owns all selected classes (single query with IN clause)
 * 5. Create shared_materials records for all material+class combinations (bulk upsert)
 *
 * Security:
 * - Teacher role required
 * - Verify ALL materials belong to teacher (fail if any don't)
 * - Verify teacher owns ALL classes (fail if any don't)
 * - All input validated with Zod
 * - Array limits (max 50 each) to prevent DoS
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { bulkShareMaterialsSchema } from '$lib/server/validation';

/**
 * POST /api/google/materials/bulk-share
 * Share multiple course work materials with multiple classes
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require teacher role
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = bulkShareMaterialsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { materialIds, classIds, categoryId, topicId, descriptionOverride, visible } =
		validation.data;

	// Verify ALL materials exist and belong to teacher (single query)
	const { data: materials, error: materialsError } = await locals.supabase
		.from('google_classroom_materials')
		.select(
			`
			id,
			google_classroom_courses!inner(id, teacher_id)
		`
		)
		.in('id', materialIds);

	if (materialsError) {
		console.error('[Bulk Material Share] Error fetching materials:', materialsError);
		throw error(500, 'Failed to fetch materials');
	}

	if (!materials || materials.length !== materialIds.length) {
		throw error(404, 'One or more materials not found');
	}

	// Verify ALL materials belong to the teacher
	const invalidMaterials = materials.filter((m) => {
		// Handle nested course data (Supabase JOIN types)
		const courseData = m.google_classroom_courses as unknown as
			| { teacher_id: string }
			| { teacher_id: string }[];
		const teacherId = Array.isArray(courseData)
			? courseData[0]?.teacher_id
			: courseData?.teacher_id;
		return teacherId !== user.id;
	});

	if (invalidMaterials.length > 0) {
		console.error(
			`[Bulk Material Share] Unauthorized material access attempt by teacher ${user.id}:`,
			invalidMaterials.map((m) => m.id)
		);
		throw error(403, 'You do not own all selected materials');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, teacher_id')
		.in('id', classIds)
		.eq('is_active', true);

	if (classesError) {
		console.error('[Bulk Material Share] Error fetching classes:', classesError);
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'One or more classes not found or inactive');
	}

	const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
	if (invalidClasses.length > 0) {
		console.error(
			`[Bulk Material Share] Unauthorized class access attempt by teacher ${user.id}:`,
			invalidClasses.map((c) => c.id)
		);
		throw error(403, 'You do not own all selected classes');
	}

	// Create shared_materials records for all combinations
	const sharesToInsert = [];
	for (const materialId of materialIds) {
		for (const classId of classIds) {
			sharesToInsert.push({
				material_id: materialId,
				class_id: classId,
				category_id: categoryId || null,
				topic_id: topicId || null,
				shared_by: user.id,
				description_override: descriptionOverride || null,
				visible: visible
			});
		}
	}

	const { error: insertError } = await locals.supabase
		.from('shared_materials')
		.upsert(sharesToInsert, {
			onConflict: 'material_id,class_id'
		});

	if (insertError) {
		console.error('[Bulk Material Share] Error sharing materials:', insertError);
		throw error(500, 'Failed to share materials');
	}

	return json({
		success: true,
		materialsShared: materialIds.length,
		sharesCreated: sharesToInsert.length
	});
};
