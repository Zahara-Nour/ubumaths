/**
 * 2048 Use Power (Gidouilles Fallback) API
 * ==========================================
 *
 * Endpoint: POST /api/games/2048/use-power
 * Purpose: Debit gidouilles when student uses a 2048 power without a VIP card.
 *
 * This is the fallback path when the student doesn't have a VIP card.
 * If they DO have a VIP card, the client calls /api/vip-cards/use-card instead.
 *
 * Uses a dedicated SECURITY DEFINER RPC (use_2048_power) that handles
 * validation, debit, and logging atomically.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';

const usePowerSchema = z.object({
	power_type: z.enum([
		'undo',
		'bomb_4',
		'bomb_16',
		'bomb_64',
		'freeze_spawn',
		'fusion',
		'joker',
		'vision',
		'multiplier_1_5',
		'multiplier_2'
	])
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
		.rpc('use_2048_power', { p_power_type: power_type })
		.single();

	if (rpcError) {
		if (rpcError.message?.includes('Pas assez')) {
			throw error(400, 'Pas assez de gidouilles');
		}
		console.error('[2048-use-power] RPC error:', rpcError);
		throw error(500, 'Erreur lors du debit des gidouilles');
	}

	return json(data);
};
