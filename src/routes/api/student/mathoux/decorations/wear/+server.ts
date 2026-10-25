/**
 * POST /api/student/mathoux/decorations/wear
 * ==========================================
 *
 * Pose une décoration de panse achetée sur un Mathou (en la retirant de celui qui
 * la portait : une décoration n'orne qu'un Mathou à la fois), ou retire celle
 * qu'il porte (`decoration: null`). Gratuit (lot B des accessoires, décisions de
 * David du 2026-10-24). Les colliers : `decorations/wear-collar` ; les
 * lunettes et le chapeau : `wear-glasses`, `wear-hat`.
 *
 * AUTH : élève seulement. Pas de consentement exigé : rien ne s'achète ici, et
 * une décoration se porte seulement si elle a été achetée. ENTRÉE (Zod) : l'UUID
 * de la notion du Mathou et la clé du catalogue, ou `null`. L'élève vient de la
 * session.
 *
 * Réponses : 200 `{}` ; 400 entrée invalide ; 404 Mathou pas né ; 409 décoration
 * pas achetée ; 429 trop d’appels ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { wearMathouDecoration, type DecorationOutcome } from '$lib/server/mathoux/decorations';
import { refusalMessage, refusalStatus } from '$lib/server/mathoux/decoration-errors';
import { MATHOU_DECORATION_IDS } from '$lib/mathoux/decorations';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/mathoux/decorations/wear/+server');

const bodySchema = z.object({
	notionId: z.string().uuid(),
	decoration: z.enum(MATHOU_DECORATION_IDS).nullable()
});

/** Achats et poses par minute et par élève : large pour un humain, borne une boucle. */
const DECORATION_RATE_MAX = 30;

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireRole(locals, 'student');
	// Partagée par l'achat et la pose : chaque appel verrouille la ligne `profiles` de l'élève
	rateLimit(`mathou_decoration:${user.id}`, DECORATION_RATE_MAX, 60_000);

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');
	const { notionId, decoration } = parsed.data;

	let outcome: DecorationOutcome;
	try {
		outcome = await wearMathouDecoration(createServiceRoleClient(), user.id, notionId, decoration);
	} catch (err) {
		logger.error('Pose de décoration en échec :', err);
		throw error(500, 'Impossible de décorer ce Mathou pour l’instant : réessaie dans un moment.');
	}

	if (!outcome.ok) throw error(refusalStatus(outcome.reason), refusalMessage(outcome.reason));
	return json({});
};
