/**
 * Pages du glossaire listées dans `sitemap.xml` : une par terme visible, sauf les
 * renvois nus (leur adresse redirige vers le terme cité).
 *
 * La lecture passe par un client ANONYME, comme pour les exercices : le plan ne
 * contient que ce qu'un visiteur non connecté peut lire. Une panne rend une liste
 * vide — le plan se sert alors sans le glossaire, jamais en 500.
 *
 * @module lib/server/sitemap-glossary
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { loadGlossary } from '$lib/server/dictionary/load';
import { glossaryPath, isBareRedirect, termKey } from '$lib/dictionary/glossary-page';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/sitemap-glossary');

// Types

export interface GlossarySitemapEntry {
	/** Chemin de la page : `/glossaire/<slug>`. */
	path: string;
	/** Date de dernière modification de l'entrée, AAAA-MM-JJ (UTC). */
	lastmod: string;
}

// Functions

export async function fetchGlossaryPages(
	supabase: SupabaseClient<Database>
): Promise<GlossarySitemapEntry[]> {
	try {
		const { entries, addresses } = await loadGlossary(supabase);
		return entries.flatMap((term) => {
			const address = addresses.get(termKey(term));
			if (!address || isBareRedirect(term)) return [];
			return [{ path: glossaryPath(address.slug), lastmod: address.lastmod }];
		});
	} catch (e) {
		logger.error('[sitemap] Glossaire illisible, plan servi sans lui :', e);
		return [];
	}
}
