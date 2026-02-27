/**
 * API Endpoint: Remove Multiple Warnings
 * ========================================
 *
 * Bulk remove warnings from a student's record.
 *
 * POST /api/warnings/remove-multiple
 *
 * Request body:
 *   - studentId (string, UUID): Student's profile ID
 *   - warningIds (string[], UUIDs): Array of warning IDs to remove (1-10)
 *   - vipCardInstanceId (string, UUID, optional): VIP card instance to mark as used
 *
 * Response:
 *   - 200: { removed: number, warningIds: string[] }
 *   - 400: Validation error
 *   - 401: Not authenticated
 *   - 403: Unauthorized (not teacher/admin or student not in class)
 *   - 404: Warning not found
 *   - 500: Server error
 *
 * SECURITY:
 * - Requires authentication (teacher/admin OR student with approved card)
 * - Teacher must teach the student (class_members check)
 * - Student must have teacher-approved VIP card for activation
 * - All input validated with Zod schema
 * - Uses existing removeWarning() function for each warning
 * - Marks VIP card as used and clears approval metadata after successful removal
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { removeWarningsSchema } from '$lib/server/validation/remove-warnings';
import { removeWarning } from '$lib/server/warnings';
import type { StudentVipCards } from '$lib/types/vip-card';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate request body
	const body = await request.json();
	const validation = removeWarningsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, warningIds, vipCardInstanceId } = validation.data;

	// Authorization logic (two modes: teacher OR student with approved card)
	const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
	const isStudent = user.id === studentId;

	if (isTeacher) {
		// Teacher flow: verify they teach this student
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
		if (!hasAccess) {
			throw error(403, 'You can only remove warnings for students in your classes');
		}
	} else if (!isStudent) {
		// Neither teacher nor the student themselves
		throw error(403, 'You can only remove warnings for yourself or your students');
	}
	// If isStudent, authorization check will happen after fetching the VIP card (approval required)

	// If VIP card provided, fetch and validate it
	let vipCardToMark: StudentVipCards[string] | null = null;

	if (vipCardInstanceId) {
		// Fetch student's VIP cards
		const { data: studentProfile, error: fetchError } = await supabase
			.from('profiles')
			.select('vip_cards')
			.eq('id', studentId)
			.single();

		if (fetchError) {
			console.error('[remove-multiple] Error fetching student profile:', fetchError);
			throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
		}

		const studentVipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;
		vipCardToMark = studentVipCards[vipCardInstanceId];

		if (!vipCardToMark) {
			throw error(404, `VIP card instance not found: ${vipCardInstanceId}`);
		}

		if (vipCardToMark.usedAt) {
			throw error(400, `VIP card already used: ${vipCardInstanceId}`);
		}

		// If student flow: require teacher approval
		if (isStudent && vipCardToMark.activationRequestedAt && !vipCardToMark.activationApprovedAt) {
			throw error(
				400,
				'This card activation has not been approved yet. Please wait for teacher approval.'
			);
		}
	}

	// Fetch warnings to verify they belong to the student
	const { data: warnings, error: fetchError } = await supabase
		.from('student_warnings')
		.select('id, student_id')
		.in('id', warningIds);

	if (fetchError) {
		console.error('[remove-multiple] Error fetching warnings:', fetchError);
		throw error(500, `Failed to fetch warnings: ${fetchError.message}`);
	}

	if (!warnings || warnings.length === 0) {
		throw error(404, 'No warnings found with the provided IDs');
	}

	// Verify all warnings belong to the specified student
	const invalidWarnings = warnings.filter((w) => w.student_id !== studentId);
	if (invalidWarnings.length > 0) {
		throw error(
			400,
			`Warning(s) do not belong to student: ${invalidWarnings.map((w) => w.id).join(', ')}`
		);
	}

	// Remove each warning using the existing removeWarning function
	const removedIds: string[] = [];
	const errors: Array<{ warningId: string; error: string }> = [];

	for (const warning of warnings) {
		try {
			// skipCreatorCheck: this endpoint already verified authorization above
			// (teacher teaches student OR student has approved VIP card)
			await removeWarning({
				warningId: warning.id,
				teacherId: user.id,
				skipCreatorCheck: true,
				supabase
			});
			removedIds.push(warning.id);
		} catch (err) {
			console.error(`[remove-multiple] Error removing warning ${warning.id}:`, err);
			errors.push({
				warningId: warning.id,
				error: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	// If all removals failed, return error
	if (removedIds.length === 0) {
		throw error(500, `Failed to remove any warnings: ${errors.map((e) => e.error).join(', ')}`);
	}

	// Mark VIP card as used atomically via RPC (FOR UPDATE + audit trail)
	if (vipCardInstanceId && vipCardToMark) {
		const { data: useResult, error: useError } = await supabase.rpc('use_vip_card', {
			p_student_id: studentId,
			p_instance_id: vipCardInstanceId,
			p_metadata: {
				action_type: 'remove_warnings',
				warnings_removed: removedIds.length
			}
		});

		if (useError) {
			console.error('[remove-multiple] RPC use_vip_card error:', useError);
			throw error(500, `Failed to mark VIP card as used: ${useError.message}`);
		}

		const rpcResult = useResult as { success: boolean; error?: string };
		if (!rpcResult.success) {
			console.error('[remove-multiple] use_vip_card failed:', rpcResult.error);
			throw error(500, rpcResult.error || 'Failed to mark VIP card as used');
		}
	}

	// If some removals failed, return partial success with warnings
	if (errors.length > 0) {
		return json({
			removed: removedIds.length,
			warningIds: removedIds,
			partialSuccess: true,
			errors
		});
	}

	// All removals succeeded
	return json({
		removed: removedIds.length,
		warningIds: removedIds
	});
};
