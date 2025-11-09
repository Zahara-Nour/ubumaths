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

// ============================================================================
// GET HANDLER
// ============================================================================

export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	const studentId = params.id;

	// Authorization: student can access their own cards, teachers can access their students' cards
	const isStudent = user.id === studentId;
	const isTeacher = profile.role === 'teacher' || profile.role === 'admin';

	if (isTeacher) {
		// Verify teacher teaches this student
		const { data: classCheck } = await supabase
			.from('class_members')
			.select(
				`
				class_id,
				classes!inner(teacher_id)
			`
			)
			.eq('student_id', studentId);

		const teachesStudent = classCheck?.some((cm) => {
			const classes = cm.classes as unknown;
			if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
				return (classes as { teacher_id: string }).teacher_id === user.id;
			}
			return false;
		});

		if (!teachesStudent) {
			throw error(403, 'You can only access VIP cards of students you teach');
		}
	} else if (!isStudent) {
		// Neither teacher nor the student themselves
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
