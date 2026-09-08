/**
 * Cahier de texte public — résolution du lien de partage.
 *
 * Accessible SANS COMPTE : c'est tout l'objet de la page. Le jeton dans l'URL est
 * le seul secret, et il ne donne que la lecture des entrées publiées.
 *
 * Un jeton invalide renvoie 404, jamais un message qui distinguerait révoqué,
 * expiré ou inexistant — le dire confirmerait qu'un jeton a existé.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import { resolveShareToken } from '$lib/server/journal-share-tokens';

/** Même forme que la contrainte SQL : 16 à 64 caractères alphanumériques. */
const tokenSchema = z
	.string()
	.min(16)
	.max(64)
	.regex(/^[A-Za-z0-9]+$/);

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	// Le contenu d'une classe n'a pas à se retrouver dans un index de moteur de
	// recherche : le lien est destiné à circuler entre familles, pas à être trouvé.
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });

	const parsed = tokenSchema.safeParse(params.token);
	if (!parsed.success) {
		throw error(404, 'Ce lien est invalide ou a expiré');
	}

	const journal = await resolveShareToken(locals.supabase, parsed.data);
	if (!journal) {
		throw error(404, 'Ce lien est invalide ou a expiré');
	}

	return { journal };
};
