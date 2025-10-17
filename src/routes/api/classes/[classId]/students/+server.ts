import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/classes/[classId]/students
 *
 * Fetches all students in a specific class.
 * Used by the Wheel of Fortune modal to get student data on-demand.
 *
 * SECURITY:
 * - Verifies user is authenticated
 * - Verifies user is a teacher or admin
 * - For teachers: verifies they own the class
 *
 * RETURNS:
 * Array of students with { id, firstname, lastname, avatar_url }
 */
export const GET: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { classId } = params;

	if (!classId) {
		throw error(400, 'Class ID is required');
	}

	try {
		// Fetch user's profile to check role
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profileError || !profile) {
			throw error(500, 'Failed to fetch user profile');
		}

		// Only teachers and admins can access this endpoint
		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, 'Only teachers and admins can access class students');
		}

		// For teachers: verify they own this class
		if (profile.role === 'teacher') {
			const { data: classData, error: classError } = await supabase
				.from('classes')
				.select('teacher_id')
				.eq('id', classId)
				.single();

			if (classError) {
				throw error(404, 'Class not found');
			}

			if (classData.teacher_id !== user.id) {
				throw error(403, 'You can only access students from your own classes');
			}
		}

		// Fetch students in this class
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
			.eq('class_id', classId);

		if (membersError) {
			throw error(500, 'Failed to fetch class members');
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

		return json({ students });
	} catch (err) {
		console.error('Error fetching class students:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
