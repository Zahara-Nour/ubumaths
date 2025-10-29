import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClassGidouilles } from '$lib/server/cache/gidouilles';

/**
 * GET /api/classes/[classId]/gidouilles
 *
 * Fetches gidouilles and vip_cards data for all students in a class.
 * Uses Redis caching with automatic fallback for performance.
 *
 * FEATURES:
 * - Redis caching (5-minute TTL)
 * - Test mode aware (respects teacher's test_mode preference)
 * - Graceful fallback on Redis errors
 *
 * SECURITY:
 * - Verifies user is authenticated
 * - Verifies user is a teacher
 * - Verifies teacher owns the class (handled in getClassGidouilles)
 *
 * RETURNS:
 * Array of { student_id, gidouilles, vip_cards } objects
 *
 * @example
 * fetch('/api/classes/abc-123/gidouilles')
 *   .then(res => res.json())
 *   .then(data => {
 *     console.log('Gidouilles data:', data.gidouilles);
 *   });
 */
export const GET: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	const { classId } = params;

	if (!classId) {
		throw error(400, 'ID de classe requis');
	}

	try {
		// Fetch user's profile to verify role
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profileError || !profile) {
			throw error(500, 'Échec de récupération du profil utilisateur');
		}

		// Only teachers can access this endpoint (admins not supported yet)
		if (profile.role !== 'teacher') {
			throw error(403, 'Seuls les enseignants peuvent accéder aux gidouilles de classe');
		}

		// Fetch gidouilles data with caching
		// getClassGidouilles verifies teacher owns the class
		const gidouilles = await getClassGidouilles(classId, user.id, supabase);

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
