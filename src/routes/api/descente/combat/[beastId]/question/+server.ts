/**
 * POST /api/descente/combat/[beastId]/question — question d'un coup ou d'une esquive
 * ==================================================================================
 *
 * Élève seul. Corps : `{ purpose: 'attack' | 'dodge', province, recent: uuid[] }`.
 * Réponse : `{ instance }`, question courte générée par le serveur (correction
 * comprise : la correction se fait côté client, ADR 0001).
 *
 * 400 corps invalide · 404 Bête introuvable · 409 Bête vaincue ou repartie,
 * coup fermé, aucune question (`{ error: <code> }`) · 500.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { combatQuestionSchema } from '#lib/server/validation/descente.ts';
import { drawCombatQuestion } from '#lib/server/descente/combat.ts';
import { combatErrorResponse } from '#lib/server/descente/combat-http.ts';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const beastId = validateUuidParam(params.beastId, 'beastId');
	const { user } = await requireRole(locals, 'student');

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}
	const parsed = combatQuestionSchema.safeParse(raw);
	if (!parsed.success) throw error(400, parsed.error.issues[0].message);

	try {
		const { instance } = await drawCombatQuestion(locals.supabase, user.id, {
			beastId,
			purpose: parsed.data.purpose,
			province: parsed.data.province,
			recentTemplateIds: parsed.data.recent
		});
		return Response.json({ instance });
	} catch (err) {
		return combatErrorResponse(err, 'question');
	}
};
