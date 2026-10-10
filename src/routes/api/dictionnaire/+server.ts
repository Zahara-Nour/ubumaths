/**
 * GET /api/dictionnaire — les entrées visibles du dictionnaire (ADR 0022)
 *
 * Public, comme l'était le fichier du dictionnaire envoyé au navigateur. La
 * réponse est la même pour tous : mise en cache par le navigateur (1 min) et
 * par le CDN (90 s), au plus 4 minutes de retard en tout avec la mémoire du
 * serveur. `?frais` : relecture de la base, pour l'admin seulement (sinon
 * ignoré : n'importe qui ne doit pas pouvoir faire relire la base à volonté).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	DICTIONARY_ADMIN_CACHE,
	DICTIONARY_PUBLIC_CACHE,
	isDictionaryAdmin,
	loadDictionary
} from '$lib/server/dictionary/load';

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const fresh = url.searchParams.has('frais') && isDictionaryAdmin(locals);
	let entries;
	try {
		entries = await loadDictionary(locals.supabase, { fresh });
	} catch (cause) {
		console.error('[dictionnaire] lecture impossible', cause);
		return json({ message: 'Dictionnaire indisponible' }, { status: 503 });
	}
	setHeaders({ 'cache-control': fresh ? DICTIONARY_ADMIN_CACHE : DICTIONARY_PUBLIC_CACHE });
	return json(entries);
};
