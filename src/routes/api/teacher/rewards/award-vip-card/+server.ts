/**
 * Award VIP Card API
 * ==================
 *
 * Endpoint: POST /api/teacher/rewards/award-vip-card
 * Purpose: Award a random VIP card to a student (costs 3 gidouilles)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const schema = z.object({
	studentId: z.string().uuid()
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

	const { studentId } = validation.data;
	const supabase = locals.supabase;

	try {
		// Call RPC to award random VIP card
		// Returns JSONB: { cardId, instanceId, earnedAt }
		const { data: cardData, error: rpcError } = await supabase.rpc('award_random_vip_card', {
			p_student_id: studentId
		});

		if (rpcError) {
			console.error('[API] RPC Error:', rpcError);
			throw error(500, rpcError.message || 'Failed to award VIP card');
		}

		// Parse the JSONB response
		const { cardId, instanceId, earnedAt } = cardData as {
			cardId: string;
			instanceId: string;
			earnedAt: string;
		};

		return json({
			success: true,
			message: 'Carte VIP attribuée avec succès !',
			cardId,
			instanceId,
			earnedAt
		});
	} catch (err) {
		console.error('[API] Error awarding VIP card:', err);
		throw error(500, 'An error occurred while awarding VIP card');
	}
};
