/**
 * Exercise Assignment Page - Server Load
 *
 * Loads exercise details, existing assignments, teacher's classes and students
 * for creating and managing exercise assignments.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const exerciseId = params.id;

	// Fetch exercise details
	const { data: exercise, error: exerciseError } = await supabase
		.from('exercises')
		.select('*')
		.eq('id', exerciseId)
		.single();

	if (exerciseError || !exercise) {
		throw error(404, 'Exercise not found');
	}

	// Check ownership
	if (exercise.created_by !== user.id) {
		throw error(403, 'Not authorized');
	}

	// Fetch existing assignments via API
	const assignmentsResponse = await fetch(`/api/exercises/${exerciseId}/assign`);

	let assignments = [];
	if (assignmentsResponse.ok) {
		assignments = await assignmentsResponse.json();
	}

	// Fetch teacher's classes with student count
	const { data: classes } = await supabase
		.from('classes')
		.select(
			`
			id,
			name,
			class_members (
				student_id
			)
		`
		)
		.eq('teacher_id', user.id);

	// Transform classes to include student count
	const classesWithCount =
		classes?.map((c) => ({
			id: c.id,
			name: c.name,
			student_count: c.class_members.length
		})) || [];

	// Fetch all unique students from teacher's classes
	const { data: classMembers } = await supabase
		.from('class_members')
		.select(
			`
			student:profiles!class_members_student_id_fkey (
				id,
				full_name,
				email
			),
			class:classes!class_members_class_id_fkey (
				teacher_id
			)
		`
		)
		.eq('class.teacher_id', user.id);

	// Extract unique students
	const studentsMap = new Map<
		string,
		{
			id: string;
			full_name: string | null;
			email: string;
		}
	>();

	classMembers?.forEach((member) => {
		// Handle Supabase join result (student can be null or an object)
		const studentData = Array.isArray(member.student) ? member.student[0] : member.student;

		if (
			studentData &&
			typeof studentData === 'object' &&
			'id' in studentData &&
			!studentsMap.has(studentData.id)
		) {
			studentsMap.set(studentData.id, {
				id: studentData.id,
				full_name: studentData.full_name,
				email: studentData.email
			});
		}
	});

	const students = Array.from(studentsMap.values());

	return {
		exercise,
		assignments,
		classes: classesWithCount,
		students
	};
};
