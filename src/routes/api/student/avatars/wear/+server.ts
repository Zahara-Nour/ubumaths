/**
 * POST /api/student/avatars/wear
 * ==============================
 *
 * Porte un avatar de sa collection (son image remplace la photo partout), ou le
 * retire (`avatar: null` : la photo Google revient, ou l'emblème par défaut).
 * Gratuit. Décisions de David du 2026-11-06 (docs/wip/boutique-avatars-progress.md,
 * comportements 3, 5, 10 à 12, 15).
 *
 * AUTH : élève seulement. Pas de consentement exigé : rien ne s'achète ici, et
 * un avatar se porte seulement s'il a été acheté (comportement 11). ENTRÉE
 * (Zod) : la clé du catalogue, ou `null`. L'élève vient de la session.
 *
 * Réponses : 200 `{ avatarUrl }` ; 400 entrée invalide ; 403 pas élève ; 409
 * avatar pas acheté ; 429 trop d’appels ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	AVATAR_RATE_MAX,
	avatarRefusalMessage,
	avatarRefusalStatus,
	wearAvatar,
	type WearAvatarOutcome
} from '$lib/server/avatars/shop';
import { AVATAR_KEY_PATTERN } from '$lib/avatars/shop';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/avatars/wear/+server');

const bodySchema = z.object({ avatar: z.string().regex(AVATAR_KEY_PATTERN).nullable() });

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireRole(locals, 'student');
	await rateLimit(`avatar_shop:${user.id}`, AVATAR_RATE_MAX, 60_000);

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) throw error(400, 'Requête invalide');

	let outcome: WearAvatarOutcome;
	try {
		outcome = await wearAvatar(createServiceRoleClient(), user.id, parsed.data.avatar);
	} catch (err) {
		logger.error('Port d’avatar en échec :', err);
		throw error(500, 'Changement d’avatar impossible pour l’instant : réessaie dans un moment.');
	}

	if (!outcome.ok)
		throw error(avatarRefusalStatus(outcome.reason), avatarRefusalMessage(outcome.reason));
	return json({ avatarUrl: outcome.avatarUrl });
};
