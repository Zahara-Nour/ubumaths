/**
 * Use VIP Card API
 * ================
 *
 * Endpoint: POST /api/teacher/rewards/use-vip-card
 * Purpose: Mark a student's VIP card as used
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const schema = z.object({
	studentId: z.string().uuid(),
	cardId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = locals;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	// Validate input
	const validation = schema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId } = validation.data;
	const supabase = locals.supabase;

	try {
		// Call RPC to use VIP card
		const { data: success, error: rpcError } = await supabase.rpc('use_vip_card', {
			p_student_id: studentId,
			p_card_id: cardId
		});

		if (rpcError) {
			console.error('[API] RPC Error:', rpcError);
			throw error(500, rpcError.message || 'Failed to use VIP card');
		}

		if (!success) {
			throw error(404, 'No unused card found');
		}

		return json({
			success: true,
			message: 'Carte VIP utilisée avec succès'
		});
	} catch (err) {
		console.error('[API] Error using VIP card:', err);
		throw error(500, 'An error occurred while using VIP card');
	}
};
