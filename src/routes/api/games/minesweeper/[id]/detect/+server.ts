import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/middleware/auth';
import { sanitizeRPCError, sanitizePostgresError } from '$lib/server/utils/error-handler';

interface UseDetectorResult {
	success: boolean;
	hints_used: number;
	hints_remaining: number;
	source: 'vip_card' | 'gidouilles';
	vip_card_consumed: boolean;
	gidouilles_spent: number;
	remaining_gidouilles?: number;
	penalty_notice: string;
}

/**
 * Use Detector in Minesweeper Game
 * POST /api/games/minesweeper/[id]/detect
 *
 * Flags a random mine cell. Shares the hint counter (max 3 per game).
 * Priority: VIP detector card first, then gidouilles (10g).
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	await requireRole(locals, 'student');

	const gameIdSchema = z.string().uuid('ID de partie invalide');
	const validation = gameIdSchema.safeParse(params.id);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const gameId = validation.data;

	try {
		const { data, error: rpcError } = await locals.supabase
			.rpc('use_detector', {
				p_game_id: gameId
			})
			.single();

		if (rpcError) {
			sanitizeRPCError(rpcError, 'use_detector');
		}

		if (!data) {
			throw error(500, 'Aucune donnée retournée par la fonction de détection');
		}

		const result = data as UseDetectorResult;

		return json({
			success: result.success,
			hints_used: result.hints_used,
			hints_remaining: result.hints_remaining,
			source: result.source,
			vip_card_consumed: result.vip_card_consumed,
			gidouilles_spent: result.gidouilles_spent,
			remaining_gidouilles: result.remaining_gidouilles,
			penalty_notice: result.penalty_notice
		});
	} catch (err) {
		sanitizePostgresError(err, 'MINESWEEPER_DETECT');
	}
};
