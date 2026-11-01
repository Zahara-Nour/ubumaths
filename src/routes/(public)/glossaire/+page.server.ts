/**
 * Glossaire : les entrées visibles du dictionnaire, lues en base (ADR 0022),
 * avec l'adresse de la page de chacune (`/glossaire/<slug>`).
 * L'admin lit une version fraîche : il voit ses modifications tout de suite.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isDictionaryAdmin, loadGlossary } from '$lib/server/dictionary/load';
import type { GlossarySlugs } from '$lib/dictionary/glossary-page';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/glossaire/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const { entries, addresses } = await loadGlossary(locals.supabase, {
			fresh: isDictionaryAdmin(locals)
		});
		const slugs: GlossarySlugs = Object.fromEntries(
			[...addresses].map(([key, address]) => [key, address.slug])
		);
		return { entries, slugs };
	} catch (cause) {
		logger.error('[glossaire] dictionnaire illisible', cause);
		throw error(503, 'Le glossaire est momentanément indisponible.');
	}
};
