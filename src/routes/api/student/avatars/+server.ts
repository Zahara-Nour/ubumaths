/**
 * GET /api/student/avatars
 * ========================
 *
 * La boutique d'avatars vue par l'élève (onglet « Avatars » du Marché) : les
 * avatars en vente, ceux qu'il possède (même retirés de la vente), et celui
 * qu'il porte. Décisions de David du 2026-11-06 (docs/wip/boutique-avatars-progress.md).
 *
 * AUTH : élève seulement (la boutique est réservée aux élèves, Q4). Lecture au
 * client de l'élève (RLS : catalogue lisible par tout connecté, collection par
 * l'élève seul).
 *
 * Réponses : 200 `AvatarShop` ; 403 pas élève ; 500 panne.
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { readAvatarShop } from '$lib/server/avatars/shop';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/avatars/+server');

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRole(locals, 'student');
	try {
		return json(await readAvatarShop(locals.supabase, user.id, profile.worn_avatar ?? null));
	} catch (err) {
		logger.error('Boutique d’avatars illisible :', err);
		throw error(500, 'Boutique indisponible pour l’instant : réessaie dans un moment.');
	}
};
