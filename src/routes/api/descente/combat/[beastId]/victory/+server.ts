/**
 * POST /api/descente/combat/[beastId]/victory — renvoi d'une victoire
 * ===================================================================
 *
 * Élève seul, sans corps. Quand la réponse qui a achevé la Bête n'a pas pu
 * enregistrer la victoire (Bête à 0, pas encore vaincue). Réponse :
 * `{ paid, capReached }`.
 *
 * 404 Bête introuvable · 409 Bête déjà vaincue, repartie, ou encore debout
 * (`{ error: <code> }`) · 500.
 */

import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { claimBeastVictory } from '#lib/server/descente/combat.ts';
import { combatErrorResponse } from '#lib/server/descente/combat-http.ts';

export const POST: RequestHandler = async ({ params, locals }) => {
	const beastId = validateUuidParam(params.beastId, 'beastId');
	const { user } = await requireRole(locals, 'student');

	try {
		return Response.json(await claimBeastVictory(locals.supabase, user.id, beastId));
	} catch (err) {
		return combatErrorResponse(err, 'victoire');
	}
};
