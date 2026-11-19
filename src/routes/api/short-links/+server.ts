/**
 * POST /api/short-links — le lien court d'une adresse du site, pour son QR code.
 * Prof et admin (le panier est public : une table que des inconnus remplissent
 * serait une réserve à spam).
 *
 * Corps : { target: '/chemin?requête' } (lien de série seulement, ASCII imprimable).
 * Réponse 200 : { code, path } — la même cible rend toujours le même code.
 * Phase 0 : docs/archive/wip/liens-courts-phase0.md.
 */

import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { createShortLink, ShortLinkError } from '#lib/server/short-links.ts';
import { createShortLinkSchema, shortLinkPath } from '#lib/validation/short-link.ts';

export const POST: RequestHandler = async ({ locals, request }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = createShortLinkSchema.safeParse(body);
	if (!validation.success) {
		return Response.json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	try {
		const code = await createShortLink(locals.supabase, validation.data.target);
		return Response.json({ code, path: shortLinkPath(code) });
	} catch (e) {
		if (e instanceof ShortLinkError)
			return Response.json({ error: e.message }, { status: e.status });
		throw e;
	}
};
