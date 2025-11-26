import type { PageServerLoad } from './$types';

/**
 * Tuteur Page Server Load
 * =======================
 *
 * Loads student grade information for grade-level adapted tutoring.
 *
 * SECURITY:
 * - Protected route (requires authentication via layout)
 * - User data from locals.profile (validated in layout)
 *
 * RETURNS:
 * - studentGrade: Grade code for adaptation (defaults to '6' if not set)
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = locals;

	return {
		studentGrade: profile?.grade || '6'
	};
};
