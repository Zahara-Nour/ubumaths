import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { getClassGidouillesSchema } from '$lib/server/validation/classes';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * GET /api/classes/[classId]/gidouilles
 *
 * Fetches gidouilles, bonus, and vip_cards data for all students in a class.
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
 * Array of { student_id, gidouilles, bonus, vip_cards } objects
 *
 * @example
 * fetch('/api/classes/abc-123/gidouilles')
 *   .then(res => res.json())
 *   .then(data => {
 *     console.log('Rewards data:', data.gidouilles);
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
			console.error('[GET /api/classes/gidouilles] Error verifying class ownership:', classError);
			throw error(500, `Failed to verify class ownership: ${classError.message}`);
		}

		if (!classCheck) {
			console.error('[GET /api/classes/gidouilles] Teacher does not own class:', classId);
			throw error(403, 'You do not have permission to view this class');
		}

		// Fetch gidouilles data via class_members join
		const { data: members, error: membersError } = await locals.supabase
			.from('class_members')
			.select(
				`
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					gidouilles,
					bonus,
					vip_cards,
					is_test
				)
			`
			)
			.eq('class_id', classId)
			.eq('profiles.is_test', isTestMode);

		if (membersError) {
			console.error('[GET /api/classes/gidouilles] Error fetching gidouilles:', membersError);
			throw error(500, `Failed to fetch gidouilles: ${membersError.message}`);
		}

		// Transform to gidouilles array
		const gidouilles = (members || [])
			.map((member) => {
				const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
				if (!profile) return null;

				return {
					student_id: profile.id,
					gidouilles: profile.gidouilles || 0,
					bonus: profile.bonus || 0,
					vip_cards: profile.vip_cards || {}
				};
			})
			.filter(
				(
					g
				): g is {
					student_id: string;
					gidouilles: number;
					bonus: number;
					vip_cards: Record<string, number>;
				} => g !== null
			);

		return json({ gidouilles });
	} catch (err) {
		console.error('[API /api/classes/gidouilles] Error:', err);

		// Re-throw SvelteKit errors (they have proper status codes)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Generic error for unexpected issues
		throw error(500, 'Erreur interne du serveur');
	}
};
