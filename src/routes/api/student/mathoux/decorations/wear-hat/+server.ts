/**
 * POST /api/student/mathoux/decorations/wear-hat
 * ==============================================
 *
 * Pose un chapeau acheté sur un Mathou (en le retirant de celui qui le portait :
 * un chapeau n'orne qu'un Mathou à la fois), ou retire celui qu'il porte
 * (`hat: null`). Gratuit (lot D des accessoires, décisions de David du
 * 2026-10-25). Les lunettes : `decorations/wear-glasses`.
 *
 * AUTH : élève seulement. Pas de consentement exigé : rien ne s'achète ici, et
 * un chapeau se porte seulement s'il a été acheté. ENTRÉE (Zod) : l'UUID de la
 * notion du Mathou et la clé du chapeau, ou `null`. L'élève vient de la
 * session.
 *
 * Réponses : 200 `{}` ; 400 entrée invalide ; 404 Mathou pas né ; 409 chapeau pas
 * acheté ; 429 trop d’appels ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { wearMathouHat, type DecorationOutcome } from '$lib/server/mathoux/decorations';
import { refusalMessage, refusalStatus } from '$lib/server/mathoux/decoration-errors';
import { MATHOU_HAT_IDS } from '$lib/mathoux/decorations';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/mathoux/decorations/wear-hat/+server');

const bodySchema = z.object({
	notionId: z.string().uuid(),
	hat: z.enum(MATHOU_HAT_IDS).nullable()
});

/** Achats et poses par minute et par élève : large pour un humain, borne une boucle. */
const DECORATION_RATE_MAX = 30;

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireRole(locals, 'student');
	// Partagée par l'achat et la pose : chaque appel verrouille la ligne `profiles` de l'élève
	rateLimit(`mathou_decoration:${user.id}`, DECORATION_RATE_MAX, 60_000);

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');
	const { notionId, hat } = parsed.data;

	let outcome: DecorationOutcome;
	try {
		outcome = await wearMathouHat(createServiceRoleClient(), user.id, notionId, hat);
	} catch (err) {
		logger.error('Pose de chapeau en échec :', err);
		throw error(500, 'Impossible de décorer ce Mathou pour l’instant : réessaie dans un moment.');
	}

	if (!outcome.ok) throw error(refusalStatus(outcome.reason), refusalMessage(outcome.reason));
	return json({});
};
