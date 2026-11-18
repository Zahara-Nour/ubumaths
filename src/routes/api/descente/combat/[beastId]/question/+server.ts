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

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { combatQuestionSchema } from '$lib/server/validation/descente';
import { drawCombatQuestion } from '$lib/server/descente/combat';
import { combatErrorResponse } from '$lib/server/descente/combat-http';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const beastId = validateUuidParam(params.beastId, 'beastId');
	const { user } = await requireRole(locals, 'student');

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
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
		return json({ instance });
	} catch (err) {
		return combatErrorResponse(err, 'question');
	}
};
