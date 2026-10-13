/**
 * Google Classroom Coursework Sharing Endpoint
 * ==============================================
 *
 * Endpoint: POST/DELETE /api/google/courses/[courseId]/share
 * Purpose: Share or unshare coursework with Chiphre classes
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
 * - Verify the class is accessible (mono-teacher: RLS scopes to teacher/admin)
 * - All inputs validated with Zod
 */

import { json, error } from '@sveltejs/kit';
import { assertGoogleClassroomEnabled } from '$lib/server/google/feature-guard';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	shareCourseworkRequestSchema,
	unshareCourseworkSchema,
	unshareSingleMaterialSchema
} from '$lib/server/validation';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/google/courses/[courseId]/share/+server');

/**
 * Share coursework with a class
 *
 * Security: Teacher role required, ownership verified
 *
 * Creates or updates a shared_coursework record
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	assertGoogleClassroomEnabled();

	// Only teachers can share coursework
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let requestBody: unknown;
	try {
		requestBody = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = shareCourseworkRequestSchema.safeParse(requestBody);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { courseworkId, classId, visible, categoryId, customDescription } = validation.data;

	try {
		// Verify coursework exists and belongs to teacher (via RLS)
		// Note: google_classroom_coursework doesn't have teacher_id column.
		// Ownership is verified via RLS policy that joins with google_classroom_courses.
		const { data: coursework, error: courseworkError } = await locals.supabase
			.from('google_classroom_coursework')
			.select('id, google_course_id')
			.eq('id', courseworkId)
			.single();

		if (courseworkError || !coursework) {
			if (courseworkError?.code === 'PGRST116') {
				throw error(404, 'Devoir Classroom introuvable ou accès refusé');
			}
			logger.error('[Google Share] Coursework verification error:', courseworkError);
			throw error(403, 'Accès refusé à ce devoir Classroom');
		}

		// Verify class exists and belongs to teacher
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.single();

		if (classError || !classData) {
			if (classError?.code === 'PGRST116') {
				throw error(404, 'Classe introuvable ou accès refusé');
			}
			logger.error('[Google Share] Class verification error:', classError);
			throw error(403, 'Accès refusé à cette classe');
		}

		// If categoryId is provided, verify it belongs to teacher (via class)
		if (categoryId) {
			const { data: category, error: categoryError } = await locals.supabase
				.from('coursework_categories')
				.select('id, class_id')
				.eq('id', categoryId)
				.single();

			if (categoryError || !category) {
				throw error(400, 'Catégorie introuvable');
			}

			// Verify the category's class is accessible (mono-teacher: RLS-scoped)
			const { data: categoryClass, error: categoryClassError } = await locals.supabase
				.from('classes')
				.select('id')
				.eq('id', category.class_id)
				.single();

			if (categoryClassError || !categoryClass) {
				throw error(400, 'Cette catégorie n’appartient à aucune classe accessible');
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
			logger.error('[Google Share] Upsert error:', upsertError);
			throw error(500, 'Impossible de partager le devoir Classroom');
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
		logger.error('[Google Share] Error sharing coursework:', err);
		throw error(500, 'Une erreur inattendue s’est produite');
	}
};

/**
 * Unshare coursework OR material from a class
 *
 * Security: Teacher role required, ownership verified
 *
 * Deletes shared_coursework or shared_materials record (idempotent)
 *
 * Query params:
 * - For coursework: ?courseworkId=xxx&classId=xxx
 * - For materials: ?materialId=xxx&classId=xxx
 */
export const DELETE: RequestHandler = async ({ locals, url }) => {
	assertGoogleClassroomEnabled();

	// Only teachers can unshare coursework/materials
	const { user } = await requireRole(locals, 'teacher');

	// Parse query params
	const courseworkId = url.searchParams.get('courseworkId');
	const materialId = url.searchParams.get('materialId');
	const classId = url.searchParams.get('classId');

	// Validate: must have EITHER courseworkId OR materialId (but not both)
	if (courseworkId && materialId) {
		throw error(400, 'Préciser courseworkId ou materialId, pas les deux');
	}

	if (!courseworkId && !materialId) {
		throw error(400, 'courseworkId ou materialId requis');
	}

	// Handle coursework unsharing
	if (courseworkId) {
		const validation = unshareCourseworkSchema.safeParse({ courseworkId, classId });
		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { courseworkId: validCourseworkId, classId: validClassId } = validation.data;

		try {
			// Verify coursework belongs to teacher (via RLS)
			// Note: google_classroom_coursework doesn't have teacher_id column.
			// Ownership is verified via RLS policy that joins with google_classroom_courses.
			const { data: coursework, error: courseworkError } = await locals.supabase
				.from('google_classroom_coursework')
				.select('id')
				.eq('id', validCourseworkId)
				.single();

			if (courseworkError || !coursework) {
				if (courseworkError?.code === 'PGRST116') {
					throw error(404, 'Devoir Classroom introuvable ou accès refusé');
				}
				logger.error('[Google Unshare] Coursework verification error:', courseworkError);
				throw error(403, 'Accès refusé à ce devoir Classroom');
			}

			// Verify the class is accessible (mono-teacher: RLS-scoped)
			const { data: classData, error: classError } = await locals.supabase
				.from('classes')
				.select('id')
				.eq('id', validClassId)
				.single();

			if (classError || !classData) {
				if (classError?.code === 'PGRST116') {
					throw error(404, 'Classe introuvable ou accès refusé');
				}
				logger.error('[Google Unshare] Class verification error:', classError);
				throw error(403, 'Accès refusé à cette classe');
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
				logger.error('[Google Unshare] Delete error:', deleteError);
				throw error(500, 'Impossible de retirer le partage du devoir Classroom');
			}

			return json({
				success: true,
				message: 'Partage du devoir Classroom retiré'
			});
		} catch (err) {
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Handle other errors
			logger.error('[Google Unshare] Error unsharing coursework:', err);
			throw error(500, 'Une erreur inattendue s’est produite');
		}
	}

	// Handle material unsharing
	if (materialId) {
		const validation = unshareSingleMaterialSchema.safeParse({ materialId, classId });
		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { materialId: validMaterialId, classId: validClassId } = validation.data;

		try {
			// Verify material belongs to teacher (via RLS)
			// Note: google_classroom_materials doesn't have teacher_id column.
			// Ownership is verified via RLS policy that joins with google_classroom_courses.
			const { data: material, error: materialError } = await locals.supabase
				.from('google_classroom_materials')
				.select('id')
				.eq('id', validMaterialId)
				.single();

			if (materialError || !material) {
				if (materialError?.code === 'PGRST116') {
					throw error(404, 'Support introuvable ou accès refusé');
				}
				logger.error('[Google Unshare] Material verification error:', materialError);
				throw error(403, 'Accès refusé à ce support');
			}

			// Verify the class is accessible (mono-teacher: RLS-scoped)
			const { data: classData, error: classError } = await locals.supabase
				.from('classes')
				.select('id')
				.eq('id', validClassId)
				.single();

			if (classError || !classData) {
				if (classError?.code === 'PGRST116') {
					throw error(404, 'Classe introuvable ou accès refusé');
				}
				logger.error('[Google Unshare] Class verification error:', classError);
				throw error(403, 'Accès refusé à cette classe');
			}

			// Delete from shared_materials (idempotent - no error if not found)
			// Note: Schema uses 'shared_by' column, not 'teacher_id'
			const { error: deleteError } = await locals.supabase
				.from('shared_materials')
				.delete()
				.eq('material_id', validMaterialId)
				.eq('class_id', validClassId)
				.eq('shared_by', user.id);

			if (deleteError) {
				logger.error('[Google Unshare] Delete error:', deleteError);
				throw error(500, 'Impossible de retirer le partage du support');
			}

			return json({
				success: true,
				message: 'Partage du support retiré'
			});
		} catch (err) {
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}

			// Handle other errors
			logger.error('[Google Unshare] Error unsharing material:', err);
			throw error(500, 'Une erreur inattendue s’est produite');
		}
	}

	// Should never reach here due to validation above
	throw error(500, 'Une erreur inattendue s’est produite');
};
