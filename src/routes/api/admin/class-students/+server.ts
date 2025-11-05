import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { classStudentsQuerySchema } from '$lib/server/validation/admin';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/admin/class-students
 *
 * Fetches all students in a specific class (admin-only endpoint).
 *
 * FEATURES:
 * - Returns students with their profile data and school information
 * - Includes class_ids array for frontend use
 *
 * SECURITY:
 * - Verifies user is authenticated
 * - Verifies user is an admin (no teacher ownership check)
 *
 * QUERY PARAMETERS:
 * - class_id: UUID of the class to filter students (optional but typically required)
 *
 * RETURNS:
 * Object with users array: { users: [...] }
 * Each user has: id, firstname, lastname, email, role, gender, avatar_url, schools, class_members, class_ids
 *
 * @example
 * fetch('/api/admin/class-students?class_id=abc-123')
 *   .then(res => res.json())
 *   .then(data => {
 *     console.log('Students:', data.users);
 *   });
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRole(locals, 'admin');

	// ✅ SECURITY: Validate query parameters with Zod
	const validation = classStudentsQuerySchema.safeParse({
		class_id: url.searchParams.get('class_id')
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { class_id: classId } = validation.data;

	if (!classId) {
		// Return empty array if no class_id provided
		return json({ users: [] });
	}

	try {
		// Query class_members table and join with profiles
		// Filter for students only (role = 'student')
		const { data: members, error: queryError } = await locals.supabase
			.from('class_members')
			.select(
				`
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					firstname,
					lastname,
					email,
					avatar_url,
					role,
					gender,
					school_id,
					is_test,
					schools (name),
					class_members (class_id)
				)
			`
			)
			.eq('class_id', classId);

		if (queryError) {
			console.error('[GET /api/admin/class-students] Error fetching students:', queryError);
			throw error(500, `Failed to fetch class students: ${queryError.message}`);
		}

		// Transform the nested structure to flat user objects
		const users = (members || [])
			.map((member) => {
				const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
				if (!profile) return null;

				// Only include students (admin endpoint may have joined other roles)
				if (profile.role !== 'student') return null;

				return {
					...profile,
					// Transform class_members array to class_ids array for easier use
					class_ids: profile.class_members?.map((cm: { class_id: string }) => cm.class_id) || []
				};
			})
			.filter((user) => user !== null)
			.sort((a, b) => (a?.firstname || '').localeCompare(b?.firstname || '')); // Sort alphabetically

		return json({ users });
	} catch (err) {
		console.error('[GET /api/admin/class-students] Error:', err);

		// Re-throw SvelteKit errors (they have proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error for unexpected issues
		throw error(500, 'Erreur interne du serveur');
	}
};
