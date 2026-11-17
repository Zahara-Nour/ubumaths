/**
 * POST /api/student/avatars/buy
 * =============================
 *
 * Achète un avatar de la boutique, sans l'équiper (décisions de David du
 * 2026-11-06, docs/wip/boutique-avatars-progress.md, comportements 2, 8 à 11, 15, 16).
 *
 * AUTH : élève seulement, avec consentement parental (comme la boutique VIP et
 * les décorations des Mathoux : sans consentement, l'élève voit mais n'achète
 * pas). ENTRÉE (Zod) : la clé du catalogue. L'élève vient de la session, jamais
 * du corps.
 *
 * Le débit est fait par la base (`buy_avatar`, client service) : en vente, pas
 * déjà possédé, solde vérifié, débit, avatar dans la collection, ligne au
 * journal, en une transaction. Un double clic ne débite qu'une fois.
 *
 * Réponses : 200 `{ balance }` ; 400 entrée invalide ou avatar inconnu ; 403 pas
 * élève ou sans consentement ; 409 déjà acheté, plus en vente ou solde
 * insuffisant (« Il te manque N gidouilles ») ; 429 trop d’appels ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { requireConsent } from '$lib/server/middleware/consent';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	AVATAR_RATE_MAX,
	avatarRefusalMessage,
	avatarRefusalStatus,
	buyAvatar,
	type BuyAvatarOutcome
} from '$lib/server/avatars/shop';
import { AVATAR_KEY_PATTERN } from '$lib/avatars/shop';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/avatars/buy/+server');

const bodySchema = z.object({ avatar: z.string().regex(AVATAR_KEY_PATTERN) });

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireRole(locals, 'student');
	requireConsent(profile, 'purchase_items');
	// Partagée par l'achat et le port : chaque appel verrouille la ligne `profiles` de l'élève
	await rateLimit(`avatar_shop:${user.id}`, AVATAR_RATE_MAX, 60_000);

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');

	let outcome: BuyAvatarOutcome;
	try {
		outcome = await buyAvatar(createServiceRoleClient(), user.id, parsed.data.avatar);
	} catch (err) {
		logger.error('Achat d’avatar en échec :', err);
		throw error(500, 'Achat impossible pour l’instant : réessaie dans un moment.');
	}

	if (!outcome.ok)
		throw error(
			avatarRefusalStatus(outcome.reason),
			avatarRefusalMessage(outcome.reason, outcome.missing)
		);
	return json({ balance: outcome.balance });
};
