import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is a student
	await requireRole(locals, 'student');

	// Fetch shared coursework for this student's classes
	// Note: Requires Google Classroom integration tables from Phase 1 migration
	const { data: coursework, error } = await locals.supabase
		.from('shared_coursework')
		.select(
			`
      id,
      visible,
      description_override,
      display_order,
      coursework:google_classroom_coursework (
        id,
        title,
        description,
        due_date,
        due_time,
        max_points,
        state,
        materials:coursework_materials (
          id,
          material_type,
          file_name,
          file_url,
          thumbnail_url,
          title
        )
      ),
      class:classes (
        id,
        name
      ),
      category:coursework_categories (
        id,
        name,
        icon,
        color
      )
    `
		)
		.eq('visible', true)
		.in('class_id', [
			// Get class IDs where student is a member
			// This is a simplified query - in production, use a proper subquery or view
			// For now, return empty array to avoid errors before migration
		])
		.order('display_order');

	// If error (likely because tables don't exist yet), return empty array
	if (error) {
		console.error('Error fetching coursework:', error);
		return {
			coursework: [],
			needsMigration: true
		};
	}

	return {
		coursework: coursework || [],
		needsMigration: false
	};
};
