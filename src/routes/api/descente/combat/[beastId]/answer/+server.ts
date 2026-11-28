/**
 * POST /api/descente/combat/[beastId]/answer — réponse à une question de combat
 * =============================================================================
 *
 * Élève seul. La réponse compte comme du travail (trace au lieu `descente`,
 * FSRS, deck Programme) ; un coup réussi blesse la Bête (PV tenus par le
 * serveur) ; à 0, victoire et gidouilles plafonnées.
 *
 * Corps : `{ purpose, province, template_id, success, seed?, answer_parts?,
 * part_verdicts? }`. Réponse : `{ beastHp, recorded, victory: { paid,
 * capReached } | null }` ; `beastHp` à 0 et `victory` nul : victoire à renvoyer
 * par `…/victory`.
 *
 * 400 corps invalide · 404 Bête ou question introuvable · 409 Bête vaincue ou
 * repartie (`{ error: <code> }`) · 500.
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { combatAnswerSchema } from '#lib/server/validation/descente.ts';
import { recordCombatAnswer } from '#lib/server/descente/combat.ts';
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
	const parsed = combatAnswerSchema.safeParse(raw);
	if (!parsed.success) throw error(400, parsed.error.issues[0].message);
	const body = parsed.data;

	try {
		const result = await recordCombatAnswer(locals.supabase, user.id, {
			beastId,
			purpose: body.purpose,
			province: body.province,
			templateId: body.template_id,
			success: body.success,
			seed: body.seed,
			answerParts: body.answer_parts,
			partVerdicts: body.part_verdicts
		});
		return Response.json(result);
	} catch (err) {
		return combatErrorResponse(err, 'réponse');
	}
};
