/**
 * API Endpoint: Remove VIP Card
 * ===============================
 *
 * Allows teachers to remove VIP card instances from students' collections.
 * Delegates to the remove_vip_card RPC for atomic operation + audit trail.
 *
 * POST /api/vip-cards/remove
 *
 * @param studentId - UUID of the student who owns the card
 * @param cardId - ID of the card type to remove (e.g., "bonus", "captain")
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

const removeCardSchema = z.object({
	studentId: z.string().uuid('Invalid student ID format'),
	cardId: z.string().min(1, 'Card ID is required'),
	reason: z.string().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can remove student VIP cards');
	}

	const body = await request.json();
	const validation = removeCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId, reason } = validation.data;

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only remove cards for students in your classes');
	}

	const { data: result, error: rpcError } = await supabase.rpc('remove_vip_card', {
		p_student_id: studentId,
		p_card_id: cardId,
		p_reason: reason ?? null
	});

	if (rpcError) {
		console.error('[remove-card] RPC error:', rpcError);
		throw error(500, 'Failed to remove card');
	}

	const rpcResult = result as {
		success: boolean;
		error?: string;
		cardName?: string;
		instanceId?: string;
	};

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to remove card');
	}

	return json({
		success: true,
		message: 'Card removed successfully',
		cardName: rpcResult.cardName,
		instanceId: rpcResult.instanceId
	});
};
