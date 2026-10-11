/**
 * « Mon cours » public — résolution du lien du cours (ADR 0025).
 *
 * Accessible SANS COMPTE : le jeton dans l'URL est le seul secret, et il ne
 * donne que la lecture des chapitres visibles et des contenus publiés.
 *
 * Un jeton invalide renvoie 404, jamais un message qui distinguerait révoqué,
 * expiré, inexistant ou classe archivée.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	buildPublicCourseView,
	courseShareTokenSchema,
	INVALID_COURSE_LINK,
	resolveCourseShareToken
} from '$lib/server/course-share-tokens';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	// Le contenu d'une classe circule entre familles ; il n'a pas à être trouvé.
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });

	const parsed = courseShareTokenSchema.safeParse(params.token);
	if (!parsed.success) {
		throw error(404, INVALID_COURSE_LINK);
	}

	const course = await resolveCourseShareToken(locals.supabase, parsed.data);
	if (!course) {
		throw error(404, INVALID_COURSE_LINK);
	}

	// Le jeton redescend au rendu : il donne une adresse aux fiches et aux
	// documents. Il est déjà dans l'URL, le transmettre n'expose rien de plus.
	return { course: buildPublicCourseView(course), token: parsed.data };
};
