import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageServerLoad } from './$types';

/**
 * Lève une vraie erreur HTTP pour la page de démonstration `/dev/erreurs/page` :
 * `/dev/erreurs/page/404?message=Exercice introuvable` rend la page d'erreur du
 * site avec ce code et ce message, comme le ferait une route réelle.
 */
const paramsSchema = z.object({
	code: z.coerce.number().int().min(400).max(599),
	message: z.string().trim().max(200).optional()
});

export const load: PageServerLoad = ({ params, url }) => {
	const parsed = paramsSchema.safeParse({
		code: params.code,
		message: url.searchParams.get('message') ?? undefined
	});
	if (!parsed.success) error(400, 'Code d’erreur de démonstration invalide');

	const { code, message } = parsed.data;
	// Sans message : une formule générique, que la page d'erreur masque
	error(code, message || 'Erreur serveur');
};
