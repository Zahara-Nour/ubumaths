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
import { assertGoogleClassroomEnabled } from '$lib/server/google/feature-guard';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	materialIdParamSchema,
	shareMaterialSchema,
	unshareMaterialSchema
} from '$lib/server/validation';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/google/materials/[id]/share/+server');

/**
 * POST /api/google/materials/[id]/share
 * Share a course work material with one or more classes
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	assertGoogleClassroomEnabled();

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
			throw error(404, 'Support introuvable');
		}
		logger.error('[Material Share] Error fetching material:', materialError);
		throw error(500, 'Impossible de charger le support');
	}

	// Handle nested course data (Supabase JOIN types)
	const courseData = material.google_classroom_courses as unknown as
		{ teacher_id: string } | { teacher_id: string }[];
	const teacherId = Array.isArray(courseData) ? courseData[0]?.teacher_id : courseData?.teacher_id;

	if (teacherId !== user.id) {
		throw error(403, 'Accès refusé à ce support');
	}

	// Verify teacher owns all classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id')
		.in('id', classIds)
		.eq('is_active', true);

	if (classesError) {
		logger.error('[Material Share] Error fetching classes:', classesError);
		throw error(500, 'Impossible de vérifier les classes');
	}

	if (!classes || classes.length !== classIds.length) {
		throw error(400, 'Une ou plusieurs classes introuvables ou inactives');
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
		logger.error('[Material Share] Error sharing material:', insertError);
		throw error(500, 'Impossible de partager le support');
	}

	return json({ success: true, classesShared: classIds.length });
};

/**
 * DELETE /api/google/materials/[id]/share
 * Unshare a material from one or more classes
 */
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	assertGoogleClassroomEnabled();

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
			throw error(404, 'Support introuvable');
		}
		logger.error('[Material Unshare] Error fetching material:', materialError);
		throw error(500, 'Impossible de charger le support');
	}

	// Handle nested course data
	const courseData = material.google_classroom_courses as unknown as
		{ teacher_id: string } | { teacher_id: string }[];
	const teacherId = Array.isArray(courseData) ? courseData[0]?.teacher_id : courseData?.teacher_id;

	if (teacherId !== user.id) {
		throw error(403, 'Accès refusé à ce support');
	}

	// Delete shares
	const { error: deleteError } = await locals.supabase
		.from('shared_materials')
		.delete()
		.eq('material_id', materialId)
		.in('class_id', classIds);

	if (deleteError) {
		logger.error('[Material Unshare] Error unsharing material:', deleteError);
		throw error(500, 'Impossible de retirer le partage du support');
	}

	return json({ success: true, classesUnshared: classIds.length });
};
