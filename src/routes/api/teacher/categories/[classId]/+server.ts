/**
 * Teacher Categories API
 * =====================
 *
 * Endpoint: GET /api/teacher/categories/[classId]
 * Purpose: Fetch coursework categories for a specific class
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Verify class belongs to teacher
 * 3. Fetch categories for class
 * 4. Return categories ordered by display_order
 *
 * Security:
 * - Teacher role required
 * - Verify class ownership
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation';

/**
 * Fetch categories for a specific class
 *
 * Security: Teacher role required, class ownership verified
 *
 * Returns categories ordered by display_order
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	// Only teachers can fetch categories
	const { user } = await requireRole(locals, 'teacher');

	// Validate classId parameter
	const validation = uuidSchema.safeParse(params.classId);
	if (!validation.success) {
		throw error(400, 'Invalid class ID format');
	}

	const classId = validation.data;

	try {
		// Verify class belongs to teacher
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
			console.error('[Categories] Class verification error:', classError);
			throw error(403, 'Class does not belong to you');
		}

		// Fetch categories for this class
		const { data: categories, error: categoriesError } = await locals.supabase
			.from('coursework_categories')
			.select('id, class_id, name, icon, color, display_order')
			.eq('class_id', classId)
			.order('display_order');

		if (categoriesError) {
			console.error('[Categories] Fetch error:', categoriesError);
			throw error(500, 'Failed to fetch categories');
		}

		// Transform to camelCase for frontend
		return json({
			categories: (categories || []).map((cat) => ({
				id: cat.id,
				classId: cat.class_id,
				name: cat.name,
				icon: cat.icon,
				color: cat.color,
				displayOrder: cat.display_order
			}))
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		console.error('[Categories] Error fetching categories:', err);
		throw error(500, 'An error occurred while fetching categories');
	}
};
