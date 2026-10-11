/**
 * Une fiche d'exercices, ouverte depuis le lien du cours (ADR 0025).
 *
 * Accessible SANS COMPTE. Le jeton n'ouvre que les fiches PUBLIÉES dans un
 * chapitre visible de la classe ET distribuées à cette classe — vérifié en
 * base par une fonction `security definer` ; ici, on valide la forme.
 *
 * Jeton invalide, fiche inexistante, fiche non publiée : le MÊME 404.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { z } from 'zod';
import {
	courseShareTokenSchema,
	INVALID_COURSE_LINK,
	resolveCourseWorksheetByShareToken
} from '$lib/server/course-share-tokens';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });

	const token = courseShareTokenSchema.safeParse(params.token);
	const worksheetId = z.string().uuid().safeParse(params.id);
	if (!token.success || !worksheetId.success) {
		throw error(404, INVALID_COURSE_LINK);
	}

	const worksheet = await resolveCourseWorksheetByShareToken(
		locals.supabase,
		token.data,
		worksheetId.data
	);
	if (!worksheet) {
		throw error(404, INVALID_COURSE_LINK);
	}

	return { worksheet, token: token.data };
};
