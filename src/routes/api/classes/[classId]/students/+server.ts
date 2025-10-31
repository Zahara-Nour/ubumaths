import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { getClassGidouillesSchema } from '$lib/server/validation/classes';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/classes/[classId]/students
 *
 * Fetches student profiles for all students in a class.
 *
 * FEATURES:
 * - Test mode aware (respects teacher's test_mode preference)
 *
 * SECURITY:
 * - Verifies user is authenticated
 * - Verifies user is a teacher
 * - Verifies teacher owns the class
 *
 * RETURNS:
 * Object with students array: { students: [...] }
 * Each student has: id, firstname, lastname, avatar_url, role, gender
 *
 * @example
 * fetch('/api/classes/abc-123/students')
 *   .then(res => res.json())
 *   .then(data => {
 *     console.log('Students:', data.students);
 *   });
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	// ✅ SECURITY: Validate class ID with Zod
	const validation = getClassGidouillesSchema.safeParse({
		classId: params.classId
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { classId } = validation.data;

	try {
		// Get teacher's test mode preference
		const isTestMode = await getTeacherTestMode(user.id, locals.supabase);

		// Verify teacher owns the class (security check)
		const { data: classCheck, error: classError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.maybeSingle();

		if (classError) {
			console.error('[GET /api/classes/students] Error verifying class ownership:', classError);
			throw error(500, `Failed to verify class ownership: ${classError.message}`);
		}

		if (!classCheck) {
			console.error('[GET /api/classes/students] Teacher does not own class:', classId);
			throw error(403, 'You do not have permission to view this class');
		}

		// Fetch student profiles via class_members join
		const { data: members, error: membersError } = await locals.supabase
			.from('class_members')
			.select(
				`
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					firstname,
					lastname,
					avatar_url,
					role,
					gender,
					is_test
				)
			`
			)
			.eq('class_id', classId)
			.eq('profiles.is_test', isTestMode);

		if (membersError) {
			console.error('[GET /api/classes/students] Error fetching students:', membersError);
			throw error(500, `Failed to fetch students: ${membersError.message}`);
		}

		// Transform to students array
		const students = (members || [])
			.map((member) => {
				const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
				if (!profile) return null;

				return {
					id: profile.id,
					firstname: profile.firstname,
					lastname: profile.lastname ?? undefined,
					avatar_url: profile.avatar_url ?? undefined,
					role: profile.role ?? undefined,
					gender: profile.gender ?? undefined
				};
			})
			.filter(
				(
					s
				): s is {
					id: string;
					firstname: string;
					lastname?: string;
					avatar_url?: string;
					role?: string;
					gender?: string;
				} => s !== null
			)
			.sort((a, b) => a.firstname.localeCompare(b.firstname)); // Sort alphabetically by firstname

		return json({ students });
	} catch (err) {
		console.error('[API /api/classes/students] Error:', err);

		// Re-throw SvelteKit errors (they have proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error for unexpected issues
		throw error(500, 'Erreur interne du serveur');
	}
};
