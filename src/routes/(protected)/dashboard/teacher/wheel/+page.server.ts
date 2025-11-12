import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeacherClassesWithStudents } from '$lib/server/students';

export const load: PageServerLoad = async ({ locals, parent: _parent }) => {
	// Get authenticated user and profile from parent layout
	const { user, profile, supabase } = locals;

	if (!user || !profile) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers and admins can access the wheel
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Forbidden: Only teachers can access this page');
	}

	// Use unified helper to get classes with students
	// Automatically handles test mode filtering
	const classesWithStudents = await getTeacherClassesWithStudents(user.id, supabase);

	// Filter for active classes only and format for UI
	const activeClasses = classesWithStudents
		.filter((c) => c.is_active)
		.map((c) => ({
			id: c.id,
			name: c.name,
			description: c.description,
			is_active: c.is_active,
			students: c.students.map((s) => ({
				id: s.id,
				firstname: s.firstname,
				lastname: s.lastname || '',
				avatar_url: s.avatar_url || ''
			}))
		}));

	return {
		classes: activeClasses
	};
};
