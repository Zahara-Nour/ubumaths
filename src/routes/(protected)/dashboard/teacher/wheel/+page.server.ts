import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, parent }) => {
	// Get authenticated user and profile from parent layout
	const { user, profile } = await parent();

	if (!user || !profile) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers and admins can access the wheel
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Forbidden: Only teachers can access this page');
	}

	// Fetch teacher's classes with students
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select(
			`
			id,
			name,
			description,
			is_active
		`
		)
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to fetch classes');
	}

	// For each class, fetch students
	const classesWithStudents = await Promise.all(
		(classes || []).map(async (classItem) => {
			const { data: members, error: membersError } = await supabase
				.from('class_members')
				.select(
					`
					student_id,
					profiles!class_members_student_id_fkey (
						id,
						firstname,
						lastname,
						avatar_url
					)
				`
				)
				.eq('class_id', classItem.id);

			if (membersError) {
				console.error('Error fetching class members:', membersError);
				return {
					...classItem,
					students: []
				};
			}

			// Transform members to students array
			const students = (members || [])
				.map((member) => {
					const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
					if (!profile) return null;

					return {
						id: profile.id,
						firstname: profile.firstname || '',
						lastname: profile.lastname || '',
						avatar_url: profile.avatar_url || ''
					};
				})
				.filter((s): s is NonNullable<typeof s> => s !== null);

			return {
				...classItem,
				students
			};
		})
	);

	return {
		classes: classesWithStudents
	};
};
