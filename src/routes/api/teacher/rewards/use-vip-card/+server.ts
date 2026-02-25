/**
 * Use VIP Card API
 * ================
 *
 * Endpoint: POST /api/teacher/rewards/use-vip-card
 * Purpose: Mark a student's VIP card as used (by template ID, FIFO order)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

const schema = z.object({
	studentId: z.string().uuid(),
	cardId: z
		.string()
		.min(1)
		.max(50)
		.regex(/^[a-zA-Z0-9_-]+$/, 'Invalid card ID format')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Only teachers/admins can use this endpoint
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can use VIP cards for students');
	}

	// Validate input
	const validation = schema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId } = validation.data;

	// Verify teacher-student relationship
	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only use cards for students in your classes');
	}

	// Call use_vip_card RPC (lookup by template ID → FIFO)
	const { data: result, error: rpcError } = await supabase.rpc('use_vip_card', {
		p_student_id: studentId,
		p_card_id: cardId
	});

	if (rpcError) {
		console.error('[API] RPC Error:', rpcError);
		throw error(500, 'Failed to use VIP card');
	}

	const rpcResult = result as { success: boolean; error?: string };

	if (!rpcResult.success) {
		throw error(404, rpcResult.error || 'No unused card found');
	}

	return json({
		success: true,
		message: 'Carte VIP utilisée avec succès'
	});
};
