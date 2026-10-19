/**
 * POST /api/short-links — le lien court d'une adresse du site, pour son QR code.
 * Prof et admin (le panier est public : une table que des inconnus remplissent
 * serait une réserve à spam).
 *
 * Corps : { target: '/chemin?requête' } (lien de série seulement, ASCII imprimable).
 * Réponse 200 : { code, path } — la même cible rend toujours le même code.
 * Phase 0 : docs/wip/liens-courts-phase0.md.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { createShortLink, ShortLinkError } from '$lib/server/short-links';
import { createShortLinkSchema, shortLinkPath } from '$lib/validation/short-link';

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = createShortLinkSchema.safeParse(body);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	try {
		const code = await createShortLink(locals.supabase, validation.data.target);
		return json({ code, path: shortLinkPath(code) });
	} catch (e) {
		if (e instanceof ShortLinkError) return json({ error: e.message }, { status: e.status });
		throw e;
	}
};
