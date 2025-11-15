/**
 * Google Classroom Coursework Sharing Endpoint
 * ==============================================
 *
 * Endpoint: POST/DELETE /api/google/courses/[courseId]/share
 * Purpose: Share or unshare coursework with UbuMaths classes
 *
 * POST - Share coursework with a class
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate input (courseworkId, classId, visibility, category, description)
 * 3. Verify coursework exists and belongs to teacher
 * 4. Verify class exists and belongs to teacher
 * 5. Upsert into shared_coursework
 * 6. Return created/updated record
 *
 * DELETE - Unshare coursework from a class
 * Flow:
 * 1. Verify user is a teacher
 * 2. Validate query params (courseworkId, classId)
 * 3. Verify ownership
 * 4. Delete from shared_coursework
 * 5. Return success
 *
 * Security:
 * - Teacher role required
 * - Verify coursework belongs to teacher
 * - Verify class belongs to teacher
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { shareCourseworkRequestSchema, unshareCourseworkSchema } from '$lib/server/validation';

/**
 * Share coursework with a class
 *
 * Security: Teacher role required, ownership verified
 *
 * Creates or updates a shared_coursework record
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	// Only teachers can share coursework
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const validation = shareCourseworkRequestSchema.safeParse(requestBody);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkId, classId, visible, categoryId, customDescription } = validation.data;

	try {
		// Verify coursework exists and belongs to teacher
		const { data: coursework, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select('id, google_course_id')
			.eq('id', courseworkId)
			.eq('teacher_id', user.id)
			.single();

		if (courseworkError || !coursework) {
			if (courseworkError?.code === 'PGRST116') {
				throw error(404, 'Coursework not found or access denied');
			}
			console.error('[Google Share] Coursework verification error:', courseworkError);
			throw error(403, 'Coursework does not belong to you');
		}

		// Verify class exists and belongs to teacher
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.single();

		if (classError || !classData) {
			if (classError?.code === 'PGRST116') {
				throw error(404, 'Class not found or access denied');
			}
			console.error('[Google Share] Class verification error:', classError);
			throw error(403, 'Class does not belong to you');
		}

		// If categoryId is provided, verify it belongs to teacher (via class)
		if (categoryId) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id, class_id')
				.eq('id', categoryId)
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

		// Upsert into shared_coursework
		// Note: Schema uses 'shared_by' not 'teacher_id', 'description_override' not 'custom_description'
		const { data: sharedCoursework, error: upsertError } = await locals.supabase
			.from('shared_coursework')
			.upsert(
				{
					coursework_id: courseworkId,
					class_id: classId,
					shared_by: user.id,
					visible,
					category_id: categoryId || null,
					description_override: customDescription || null,
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'coursework_id,class_id',
					ignoreDuplicates: false
				}
			)
			.select(
				'id, coursework_id, class_id, visible, category_id, description_override, created_at, updated_at'
			)
			.single();

		if (upsertError) {
			console.error('[Google Share] Upsert error:', upsertError);
			throw error(500, 'Failed to share coursework');
		}

		// Transform to camelCase
		return json({
			success: true,
			sharedCoursework: {
				id: sharedCoursework.id,
				courseworkId: sharedCoursework.coursework_id,
				classId: sharedCoursework.class_id,
				visible: sharedCoursework.visible,
				categoryId: sharedCoursework.category_id,
				customDescription: sharedCoursework.description_override,
				sharedAt: sharedCoursework.created_at,
				updatedAt: sharedCoursework.updated_at
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Share] Error sharing coursework:', err);
		throw error(500, 'An error occurred while sharing coursework');
	}
};

/**
 * Unshare coursework from a class
 *
 * Security: Teacher role required, ownership verified
 *
 * Deletes shared_coursework record (idempotent)
 */
export const DELETE: RequestHandler = async ({ locals, url }) => {
	// Only teachers can unshare coursework
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate query params
	const courseworkId = url.searchParams.get('courseworkId');
	const classId = url.searchParams.get('classId');

	const validation = unshareCourseworkSchema.safeParse({ courseworkId, classId });
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkId: validCourseworkId, classId: validClassId } = validation.data;

	try {
		// Verify coursework belongs to teacher (for security)
		const { data: coursework, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select('id')
			.eq('id', validCourseworkId)
			.eq('teacher_id', user.id)
			.single();

		if (courseworkError || !coursework) {
			if (courseworkError?.code === 'PGRST116') {
				throw error(404, 'Coursework not found or access denied');
			}
			console.error('[Google Unshare] Coursework verification error:', courseworkError);
			throw error(403, 'Coursework does not belong to you');
		}

		// Verify class belongs to teacher (for security)
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', validClassId)
			.eq('teacher_id', user.id)
			.single();

		if (classError || !classData) {
			if (classError?.code === 'PGRST116') {
				throw error(404, 'Class not found or access denied');
			}
			console.error('[Google Unshare] Class verification error:', classError);
			throw error(403, 'Class does not belong to you');
		}

		// Delete from shared_coursework (idempotent - no error if not found)
		// Note: Schema uses 'shared_by' column, not 'teacher_id'
		const { error: deleteError } = await locals.supabase
			.from('shared_coursework')
			.delete()
			.eq('coursework_id', validCourseworkId)
			.eq('class_id', validClassId)
			.eq('shared_by', user.id);

		if (deleteError) {
			console.error('[Google Unshare] Delete error:', deleteError);
			throw error(500, 'Failed to unshare coursework');
		}

		return json({
			success: true,
			message: 'Coursework unshared successfully'
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Google Unshare] Error unsharing coursework:', err);
		throw error(500, 'An error occurred while unsharing coursework');
	}
};
