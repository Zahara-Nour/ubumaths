/**
 * API Endpoint: Get Student VIP Cards
 * =====================================
 *
 * Retrieves the VIP cards owned by a specific student.
 *
 * GET /api/students/{id}/vip-cards
 *
 * SECURITY:
 * - Requires authentication
 * - Student can only access their own cards
 * - Teachers can access cards of students they teach
 *
 * RETURNS:
 * - vipCards: StudentVipCards object (JSONB from profiles table)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { validateUuidParam } from '$lib/server/validation/params';

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
	const studentId = validateUuidParam(params.id);
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Authorization: student can access their own cards, teachers can access their students' cards
	const isStudent = user.id === studentId;
	const isTeacherOrAdmin = profile.role === 'teacher' || profile.role === 'admin';

	if (isTeacherOrAdmin) {
		// Verify teacher-student relationship (admins bypass this check)
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
		if (!hasAccess) {
			throw error(403, 'You can only access VIP cards of students you teach');
		}
	} else if (!isStudent) {
		// Neither teacher/admin nor the student themselves
		throw error(403, 'You can only access your own VIP cards');
	}

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[vip-cards] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile?.vip_cards || {}) as unknown as StudentVipCards;

	return json({
		vipCards
	});
};
