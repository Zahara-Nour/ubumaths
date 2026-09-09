/**
 * Une fiche d'exercices, ouverte depuis le lien de consultation du cahier.
 *
 * Accessible SANS COMPTE, comme le cahier lui-même. Le jeton n'ouvre pas « les
 * fiches » : il ouvre celles que le professeur a CITÉES dans une séance
 * visible. La vérification est faite en base, par une fonction
 * `security definer` — ici on ne fait que valider la forme des paramètres.
 *
 * Un jeton invalide, une fiche inexistante et une fiche non citée renvoient le
 * MÊME 404 : distinguer les cas apprendrait quelque chose à qui essaie des
 * identifiants au hasard.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { resolveWorksheetByShareToken } from '$lib/server/journal-share-tokens';

/** Même forme que la contrainte SQL : 16 à 64 caractères alphanumériques. */
const tokenSchema = z
	.string()
	.min(16)
	.max(64)
	.regex(/^[A-Za-z0-9]+$/);

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });

	const token = tokenSchema.safeParse(params.token);
	const worksheetId = z.string().uuid().safeParse(params.id);
	if (!token.success || !worksheetId.success) {
		throw error(404, 'Ce lien est invalide ou a expiré');
	}

	const worksheet = await resolveWorksheetByShareToken(
		locals.supabase,
		token.data,
		worksheetId.data
	);
	if (!worksheet) {
		throw error(404, 'Ce lien est invalide ou a expiré');
	}

	return { worksheet, token: token.data };
};
