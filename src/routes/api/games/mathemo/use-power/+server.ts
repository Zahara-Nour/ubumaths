/**
 * Mathemo Use Power (Gidouilles Fallback) API
 * =============================================
 *
 * Endpoint: POST /api/games/mathemo/use-power
 * Purpose: Debit gidouilles when student uses a Mathemo power without a VIP card.
 *
 * If they DO have a VIP card, the client calls /api/vip-cards/use-card instead.
 * Uses a dedicated SECURITY DEFINER RPC (use_mathemo_power) that handles
 * validation, debit, and logging atomically.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';

const usePowerSchema = z.object({
	power_type: z.enum(['letter', 'undo', 'vowels', 'multiplier'])
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'purchase_items');

	const body = await request.json();
	const validation = usePowerSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { power_type } = validation.data;

	const { data, error: rpcError } = await locals.supabase
		.rpc('use_mathemo_power', { p_power_type: power_type })
		.single();

	if (rpcError) {
		if (rpcError.message?.includes('Pas assez')) {
			throw error(400, 'Pas assez de gidouilles');
		}
		console.error('[mathemo-use-power] RPC error:', rpcError);
		throw error(500, 'Erreur lors du debit des gidouilles');
	}

	return json(data);
};
