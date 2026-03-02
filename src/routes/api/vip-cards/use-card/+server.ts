/**
 * API Endpoint: Use VIP Card (Unified)
 * =====================================
 *
 * Unified endpoint for using a VIP card instance.
 * Supports both student self-use and teacher/admin use.
 *
 * POST /api/vip-cards/use-card
 *
 * Student:
 *   - studentId from session (body studentId ignored)
 *   - Requires parental consent for 'purchase_items'
 *   - context optional (for cards with action.context)
 *
 * Teacher/admin:
 *   - studentId required in body
 *   - Class relationship verified
 *   - context optional
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { useCardSchema } from '$lib/server/validation/vip-cards';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import type { UseCardResult } from '$lib/types/vip-card';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = useCardSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, context } = validation.data;
	let studentId: string;

	if (profile.role === 'student') {
		// Student: use their own ID, verify consent
		studentId = user.id;
		requireConsent(profile, 'purchase_items');
	} else if (profile.role === 'teacher' || profile.role === 'admin') {
		// Teacher/admin: studentId required from body
		if (!validation.data.studentId) {
			throw error(400, 'studentId is required for teacher/admin');
		}
		studentId = validation.data.studentId;

		// Verify class relationship (admins bypass via verifyTeacherStudentWithRole)
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
		if (!hasAccess) {
			throw error(403, 'You can only use cards for students in your classes');
		}
	} else {
		throw error(403, 'Unauthorized role');
	}

	// Call unified use_vip_card RPC
	const { data: result, error: rpcError } = await supabase.rpc('use_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId,
		p_context: context
	});

	if (rpcError) {
		console.error('[use-card] RPC error:', rpcError);
		throw error(500, 'Failed to use card');
	}

	const rpcResult = result as UseCardResult;

	if (!rpcResult.success) {
		const errorMessage = rpcResult.error || 'Failed to use card';

		if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
			throw error(404, errorMessage);
		}
		if (errorMessage.includes('Unauthorized')) {
			throw error(403, errorMessage);
		}
		// All other business logic errors → 400
		throw error(400, errorMessage);
	}

	return json({
		success: true,
		cardName: rpcResult.cardName,
		instanceId: rpcResult.instanceId,
		cardId: rpcResult.cardId,
		usesRemaining: rpcResult.usesRemaining,
		isFullyConsumed: rpcResult.isFullyConsumed,
		usedAt: rpcResult.usedAt
	});
};
