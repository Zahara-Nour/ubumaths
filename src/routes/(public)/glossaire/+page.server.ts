/**
 * Glossaire : les entrées visibles du dictionnaire, lues en base (ADR 0022).
 * L'admin lit une version fraîche : il voit ses modifications tout de suite.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isDictionaryAdmin, loadDictionary } from '$lib/server/dictionary/load';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		return {
			entries: await loadDictionary(locals.supabase, { fresh: isDictionaryAdmin(locals) })
		};
	} catch (cause) {
		console.error('[glossaire] dictionnaire illisible', cause);
		throw error(503, 'Le glossaire est momentanément indisponible.');
	}
};
