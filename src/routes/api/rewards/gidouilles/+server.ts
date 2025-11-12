/**
 * DEPRECATED: This endpoint is deprecated and will be removed in a future version.
 *
 * MIGRATION PATH:
 * Please use `/api/teacher/rewards/update-student` instead. The new endpoint:
 * - Uses RPC-based approach (more secure)
 * - Handles both gidouilles and bonus updates
 * - Has better error handling
 * - Maintains audit trail
 *
 * Example migration:
 * ```typescript
 * // Before (this endpoint)
 * await fetch('/api/rewards/gidouilles', {
 *   method: 'POST',
 *   body: JSON.stringify({ studentId, amount })
 * });
 *
 * // After (new endpoint)
 * await fetch('/api/teacher/rewards/update-student', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     studentId,
 *     gidouillesDelta: amount,
 *     bonusDelta: 0
 *   })
 * });
 * ```
 *
 * See: src/routes/api/teacher/rewards/update-student/+server.ts
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { awardGidouillesSchema } from '$lib/server/validation/rewards';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

export const POST: RequestHandler = async ({ request, locals }) => {
	// DEPRECATION WARNING: Log usage of this deprecated endpoint
	console.warn(
		'[DEPRECATED] /api/rewards/gidouilles endpoint called. ' +
			'Please migrate to /api/teacher/rewards/update-student. ' +
			'This endpoint will be removed in a future version.'
	);
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = awardGidouillesSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { studentId, amount } = validation.data;

		// Verify the user is a teacher or admin
		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, 'Only teachers and admins can award gidouilles');
		}

		// Verify teacher-student relationship (admins bypass this check)
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
		if (!hasAccess) {
			throw error(403, 'You can only award gidouilles to your own students');
		}

		// Fetch current gidouilles amount
		const { data: currentProfile, error: fetchError } = await supabase
			.from('profiles')
			.select('gidouilles')
			.eq('id', studentId)
			.single();

		if (fetchError) {
			throw error(500, 'Failed to fetch student profile');
		}

		// Calculate new amount
		const newAmount = (currentProfile.gidouilles || 0) + amount;

		// Update gidouilles
		const { error: updateError } = await supabase
			.from('profiles')
			.update({ gidouilles: newAmount })
			.eq('id', studentId);

		if (updateError) {
			throw error(500, 'Failed to update gidouilles');
		}

		return json({ success: true, newAmount });
	} catch (err) {
		console.error('Error awarding gidouilles:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
