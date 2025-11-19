/**
 * API endpoint for completing a multiplayer Minesweeper match
 * POST /api/games/minesweeper/multiplayer/[id]/complete
 *
 * Validates win condition server-side, distributes rewards, updates ELO
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { completeMatchSchema } from '$lib/server/validation/minesweeper-multiplayer';

/**
 * Complete a multiplayer match with server-side win validation
 *
 * @security Requires authentication (student role)
 * @security Validates grid state matches win conditions
 * @security Prevents double completion
 * @security Calculates rewards and ELO server-side only
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	await requireRole(locals, 'student');

	// Validate match ID format
	if (!params.id || !/^[0-9a-f-]{36}$/i.test(params.id)) {
		throw error(400, 'ID de match invalide');
	}

	// Validate request body
	const validation = completeMatchSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { time_seconds, grid_state } = validation.data;

	// Call database function for server-side validation and completion
	const { data, error: rpcError } = await locals.supabase.rpc('complete_multiplayer_match', {
		p_match_id: params.id,
		p_time_seconds: time_seconds,
		p_grid_state: grid_state
	});

	if (rpcError) {
		console.error('complete_multiplayer_match error:', rpcError);

		// Handle specific error cases
		if (rpcError.message.includes('introuvable')) {
			throw error(404, 'Match introuvable');
		}
		if (rpcError.message.includes('ne participez pas')) {
			throw error(403, 'Vous ne participez pas à ce match');
		}
		if (rpcError.message.includes('pas en cours')) {
			throw error(409, "Le match n'est pas en cours");
		}
		if (rpcError.message.includes('déjà terminé')) {
			throw error(409, 'Le match est déjà terminé');
		}
		if (rpcError.message.includes('Temps invalide')) {
			throw error(400, 'Temps de jeu invalide');
		}
		if (rpcError.message.includes('pas une victoire valide')) {
			throw error(400, "La grille soumise n'est pas une victoire valide");
		}

		// Generic error
		throw error(500, 'Erreur lors de la complétion du match');
	}

	return json(data);
};
