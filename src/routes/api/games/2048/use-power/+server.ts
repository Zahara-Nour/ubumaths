/**
 * 2048 Use Power (Gidouilles Fallback) API
 * ==========================================
 *
 * Endpoint: POST /api/games/2048/use-power
 * Purpose: Debit gidouilles when student uses a 2048 power without a VIP card.
 *
 * This is the fallback path when the student doesn't have a VIP card.
 * If they DO have a VIP card, the client calls /api/vip-cards/use-card instead.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';

const POWER_COSTS: Record<string, number> = {
	undo: 5,
	bomb_4: 3,
	bomb_16: 8,
	bomb_64: 15,
	freeze_spawn: 3
};

const usePowerSchema = z.object({
	power_type: z.enum(['undo', 'bomb_4', 'bomb_16', 'bomb_64', 'freeze_spawn'])
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'purchase_items');
	const supabase = locals.supabase;

	// Validate input
	const body = await request.json();
	const validation = usePowerSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { power_type } = validation.data;
	const cost = POWER_COSTS[power_type];

	// Get student's active class membership (needed for gidouilles RPC)
	const { data: membership } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', user.id)
		.eq('status', 'active')
		.limit(1)
		.maybeSingle();

	if (!membership) {
		throw error(400, 'Pas de classe active trouvee');
	}

	// Debit gidouilles
	const { data: newValue, error: rpcError } = await supabase.rpc('update_student_gidouilles', {
		p_student_id: user.id,
		p_class_id: membership.class_id,
		p_delta: -cost,
		p_reason: `2048 power: ${power_type}`,
		p_created_by: user.id
	});

	if (rpcError) {
		// The RPC returns an error if insufficient gidouilles
		if (rpcError.message?.includes('insufficient') || rpcError.message?.includes('Pas assez')) {
			throw error(400, 'Pas assez de gidouilles');
		}
		console.error('[2048-use-power] RPC error:', rpcError);
		throw error(500, 'Erreur lors du debit des gidouilles');
	}

	return json({
		success: true,
		source: 'gidouilles' as const,
		gidouilles_spent: cost,
		gidouilles_remaining: newValue
	});
};
