/**
 * Exercise Assignment Page - Server Load
 *
 * Loads exercise details, existing assignments, teacher's classes and students
 * for creating and managing exercise assignments.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAssignmentTargets } from '$lib/server/students';

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

	// Use unified helper to get classes with students
	// Automatically handles test mode filtering
	const classesWithStudents = await getAssignmentTargets(user.id, supabase);

	// Format for UI: classes with counts
	const classesWithCount = classesWithStudents.map((c) => ({
		id: c.id,
		name: c.name,
		student_count: c.students.length
	}));

	// Extract unique students across all classes
	const studentsMap = new Map<
		string,
		{
			id: string;
			full_name: string | null;
			email: string;
		}
	>();

	classesWithStudents.forEach((cls) => {
		cls.students.forEach((student) => {
			if (!studentsMap.has(student.id)) {
				studentsMap.set(student.id, {
					id: student.id,
					full_name: student.full_name,
					email: '' // Email not available in StudentFull type
				});
			}
		});
	});

	const students = Array.from(studentsMap.values());

	return {
		exercise,
		assignments,
		classes: classesWithCount,
		students
	};
};
