/**
 * POST /api/student/mathoux/decorations/buy
 * =========================================
 *
 * Achète une décoration de panse et la pose sur le Mathou choisi (lot B des
 * accessoires, décisions de David du 2026-10-24).
 *
 * AUTH : élève seulement, avec consentement parental (comme la boutique VIP :
 * sans consentement, l'élève voit mais n'achète pas). ENTRÉE (Zod) : la clé du
 * catalogue et l'UUID de la notion du Mathou. L'élève vient de la session.
 *
 * Le débit est fait par la base (`buy_mathou_decoration`, client service) :
 * solde vérifié, débit, décoration donnée, ligne au journal, en une transaction.
 * Un double clic ne débite qu'une fois (le second appel rend `already_owned`).
 *
 * Réponses : 200 `{ balance }` ; 400 entrée invalide ; 403 sans consentement ;
 * 404 Mathou pas né ; 409 déjà achetée ou solde insuffisant (« Il te manque N
 * gidouilles ») ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { buyMathouDecoration, type DecorationOutcome } from '$lib/server/mathoux/decorations';
import { refusalMessage, refusalStatus } from '$lib/server/mathoux/decoration-errors';
import { MATHOU_DECORATION_IDS } from '$lib/mathoux/decorations';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/mathoux/decorations/buy/+server');

const bodySchema = z.object({
	decoration: z.enum(MATHOU_DECORATION_IDS),
	notionId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'purchase_items');

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');
	const { decoration, notionId } = parsed.data;

	let outcome: DecorationOutcome;
	try {
		outcome = await buyMathouDecoration(createServiceRoleClient(), user.id, decoration, notionId);
	} catch (err) {
		logger.error('Achat de décoration en échec :', err);
		throw error(500, 'Achat impossible pour l’instant : réessaie dans un moment.');
	}

	if (!outcome.ok)
		throw error(refusalStatus(outcome.reason), refusalMessage(outcome.reason, outcome.missing));
	return json({ balance: outcome.balance ?? null });
};
