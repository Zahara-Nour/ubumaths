/**
 * /l/<code> — le lien court d'un QR code : redirige vers sa cible (chemin du site).
 *
 * Code inconnu et code mal formé rendent la même 404 : rien ne dit qu'un code
 * « presque pareil » existe. Ni la redirection ni la 404 ne sont indexées.
 * Phase 0 : docs/wip/liens-courts-phase0.md.
 */

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveShortLink } from '$lib/server/short-links';
import { shortLinkCodeSchema } from '$lib/validation/short-link';

const NOT_FOUND = 'Ce lien n’existe pas';

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
	setHeaders({ 'X-Robots-Tag': 'noindex' });

	const code = shortLinkCodeSchema.safeParse(params.code);
	if (!code.success) error(404, NOT_FOUND);

	const target = await resolveShortLink(locals.supabase, code.data);
	if (target === null) error(404, NOT_FOUND);

	// 302 et non 301 : un navigateur garde une 301 pour toujours, sans revenir ici
	redirect(302, target);
};
