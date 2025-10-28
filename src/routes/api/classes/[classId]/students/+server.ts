import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeacherTestMode } from '$lib/server/test-mode';

/**
 * GET /api/classes/[classId]/students
 *
 * Fetches all students in a specific class.
 * Used by the Wheel of Fortune modal and teacher students cache.
 *
 * QUERY PARAMETERS:
 * - full=true: Include gidouilles, vip_cards, role, gender (for rewards page)
 * - full=false or omitted: Basic data only (id, firstname, lastname, avatar_url)
 *
 * SECURITY:
 * - Verifies user is authenticated
 * - Verifies user is a teacher or admin
 * - For teachers: verifies they own the class
 *
 * TEST MODE FILTERING:
 * - Respects teacher's test mode preference
 * - Only returns test students when test mode is ON
 * - Only returns real students when test mode is OFF
 *
 * RETURNS:
 * Array of students with fields based on 'full' parameter
 */
export const GET: RequestHandler = async ({
	params,
	url,
	locals: { safeGetSession, supabase }
}) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { classId } = params;

	if (!classId) {
		throw error(400, 'Class ID is required');
	}

	// Check if full data is requested
	const full = url.searchParams.get('full') === 'true';

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

		// Get teacher's test mode (admins default to false - see real students)
		const isTestMode =
			profile.role === 'teacher' ? await getTeacherTestMode(user.id, supabase) : false;

		// Build select query based on 'full' parameter
		// IMPORTANT: Always include is_test field for filtering
		const selectFields = full
			? `
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					firstname,
					lastname,
					full_name,
					avatar_url,
					gidouilles,
					vip_cards,
					role,
					gender,
					is_test
				)
			`
			: `
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					firstname,
					lastname,
					avatar_url,
					is_test
				)
			`;

		// Fetch students in this class, filtered by test mode
		const { data: members, error: membersError } = await supabase
			.from('class_members')
			.select(selectFields)
			.eq('class_id', classId)
			.eq('profiles.is_test', isTestMode); // Filter by test mode

		if (membersError) {
			console.error('[API /api/classes/students] Query error:', membersError);
			throw error(500, 'Failed to fetch class members');
		}

		// Transform members to students array
		const students = (members || [])
			.map((member) => {
				const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
				if (!profile) return null;

				// Base student data (always included)
				const student = {
					id: profile.id,
					firstname: profile.firstname || '',
					lastname: profile.lastname || '',
					avatar_url: profile.avatar_url || ''
				} as Record<string, unknown>;

				// Add full data if requested
				if (full) {
					student.full_name = profile.full_name || '';
					student.gidouilles = profile.gidouilles || 0;
					student.vip_cards = profile.vip_cards || {};
					student.role = profile.role || '';
					student.gender = profile.gender || '';
				}

				return student;
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
