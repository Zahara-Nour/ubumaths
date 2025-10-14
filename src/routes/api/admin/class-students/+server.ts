/**
 * API: Get Students in a Class
 *
 * Returns all students enrolled in a specific class by querying the class_members table.
 * This is the source of truth for class memberships.
 *
 * Query Parameters:
 * - class_id: UUID of the class
 *
 * Returns:
 * - users: Array of student profiles with their full class memberships
 *   Each profile includes class_ids array (derived from class_members for backward compatibility)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const classId = url.searchParams.get('class_id');

	if (!classId) {
		return json({ users: [] });
	}

	// First, get the student IDs in this class
	const { data: memberships, error: membershipsError } = await supabase
		.from('class_members')
		.select('student_id')
		.eq('class_id', classId);

	if (membershipsError) {
		console.error('Error fetching class members:', membershipsError);
		return json({ error: membershipsError.message, users: [] });
	}

	if (!memberships || memberships.length === 0) {
		return json({ users: [] });
	}

	const studentIds = memberships.map((m) => m.student_id);

	// Then get full profiles for these students with ALL their classes
	const { data: students, error: studentsError } = await supabase
		.from('profiles')
		.select('*, schools(name), class_members(class_id)')
		.in('id', studentIds)
		.order('lastname', { ascending: true })
		.order('firstname', { ascending: true });

	if (studentsError) {
		console.error('Error fetching students:', studentsError);
		return json({ error: studentsError.message, users: [] });
	}

	// Transform class_members array to class_ids array for easier use
	const studentsWithClasses = students?.map((student) => ({
		...student,
		class_ids: student.class_members?.map((cm: any) => cm.class_id) || []
	}));

	return json({ users: studentsWithClasses || [] });
};
